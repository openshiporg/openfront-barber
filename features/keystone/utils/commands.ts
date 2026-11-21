import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'

import { createPayment, getPaymentStatus, refundPayment } from './paymentProviderAdapter'
import { getPaymentProviderRegistration } from '../../integrations/payment'
import { trustedOrigin } from '../../shared/trusted-origin'
import { businessDateKey, businessDayRange } from '../../shared/business-time'
import { dayOfWeekFor, isDateKey, openSlots } from './availability'
import { createPublicAccessToken, hashPublicAccessToken, publicAccessTokenMatches } from './publicAccessToken'
import { CommandError, type Db } from './business'

const OPEN = ['requested', 'confirmed'] as const

/** An online booking still waiting for its deposit. */
const UNPAID_HOLD = { status: 'requested', paymentStatus: 'unpaid', source: 'online', depositCents: { gt: 0 } } as const

const holdCutoff = (holdHours: number, now = Date.now()) => new Date(now - holdHours * 3_600_000)

/** When an unpaid online booking stops holding its time. */
export const holdEndsAt = (createdAt: Date, holdHours: number) => new Date(createdAt.getTime() + holdHours * 3_600_000)

/**
 * Releases online bookings whose deposit was not paid within the barber's hold ("Hold unpaid bookings for").
 * There is no job runner, so this runs whenever times are read or booked, like deposits are read back from Stripe.
 * Each one is checked with Stripe first: a deposit paid in a browser that never came back confirms the booking instead.
 */
export async function releaseUnpaidHolds(prisma: PrismaClient, profileId: string, appointmentId?: string) {
  const profile = await prisma.barberProfile.findUnique({ where: { id: profileId }, select: { unpaidHoldHours: true } })
  if (!profile) return 0
  const stale = await prisma.appointment.findMany({
    where: { profileId, ...UNPAID_HOLD, createdAt: { lt: holdCutoff(profile.unpaidHoldHours) }, ...(appointmentId ? { id: appointmentId } : {}) },
    select: { id: true, profileId: true, status: true, paymentStatus: true }, take: 50,
  })
  let released = 0
  for (const a of stale) {
    if ((await settleDeposit(prisma, a).catch(() => ({ paid: false }))).paid) continue
    const done = await prisma.appointment.updateMany({
      where: { id: a.id, ...UNPAID_HOLD },
      data: { status: 'cancelled', cancellationReason: `Deposit not paid within ${profile.unpaidHoldHours} hours; time released` },
    })
    if (!done.count) continue
    released++
    await prisma.paymentSession.updateMany({ where: { appointmentId: a.id, status: 'pending' }, data: { status: 'expired' } })
  }
  return released
}

/** Slots for one service on one day, from the barber's own hours, time off and bookings. */
export async function publicSlots(db: Db, slug: string, serviceId: string, date: string) {
  if (!isDateKey(date)) throw new CommandError('Choose a valid date.')
  const profile = await db.barberProfile.findUnique({ where: { slug } })
  if (!profile || !profile.bookingOpen) throw new CommandError('Online booking is closed.')
  const service = await db.service.findFirst({ where: { id: serviceId, profileId: profile.id, active: true } })
  if (!service) throw new CommandError('Choose a service.')
  const { start, end } = businessDayRange(date, profile.timezone)
  const [hours, appointments, off] = await Promise.all([
    db.weeklyHours.findFirst({ where: { profileId: profile.id, dayOfWeek: dayOfWeekFor(date) } }),
    // An appointment added by hand without an end time blocks its service length (30 minutes with no service).
    // An online booking whose deposit is past the hold no longer blocks its time, even before it is released.
    db.appointment.findMany({ where: { profileId: profile.id, status: { in: [...OPEN] }, NOT: { ...UNPAID_HOLD, createdAt: { lt: holdCutoff(profile.unpaidHoldHours) } }, startsAt: { lt: end }, OR: [{ endsAt: { gt: start } }, { endsAt: null, startsAt: { gt: new Date(start.getTime() - 86_400_000) } }] }, select: { startsAt: true, endsAt: true, service: { select: { durationMinutes: true } } } })
      .then((rows) => rows.map((row) => ({ startsAt: row.startsAt, endsAt: row.endsAt ?? new Date(row.startsAt.getTime() + (row.service?.durationMinutes ?? 30) * 60_000) }))),
    db.timeOff.findMany({ where: { profileId: profile.id, startsAt: { lt: end }, endsAt: { gt: start } }, select: { startsAt: true, endsAt: true } }),
  ])
  const busy = [...appointments, ...off].filter((row): row is { startsAt: Date; endsAt: Date } => Boolean(row.startsAt && row.endsAt))
  return openSlots({
    date, timeZone: profile.timezone, hours: hours ?? undefined, duration: service.durationMinutes ?? 30,
    slotMinutes: profile.slotMinutes ?? 15, bufferMinutes: profile.bufferMinutes ?? 0,
    minNoticeHours: profile.minNoticeHours ?? 0, maxAdvanceDays: profile.maxAdvanceDays ?? 60, busy,
  })
}

type Guest = { name: string; phone: string; email: string; notes: string }

function cleanGuest(guest: Guest) {
  const name = guest.name.trim().slice(0, 120)
  const phone = guest.phone.trim().slice(0, 40)
  const email = guest.email.trim().toLowerCase().slice(0, 200)
  if (!name) throw new CommandError('Enter your name.')
  if (!phone && !email) throw new CommandError('Enter a phone number or an email so your barber can reach you.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CommandError('Enter a valid email.')
  return { name, phone, email, notes: guest.notes.trim().slice(0, 500) }
}

/**
 * Books a slot. Serialized per barber with an advisory lock, and the slot is
 * re-checked inside the lock, so two clients can never hold the same time.
 */
export async function bookAppointment(prisma: PrismaClient, input: { slug: string; serviceId: string; startsAt: string; guest: Guest }) {
  const guest = cleanGuest(input.guest)
  const startsAt = new Date(input.startsAt)
  if (Number.isNaN(startsAt.getTime())) throw new CommandError('Choose a time.')
  const access = createPublicAccessToken()
  const owner = await prisma.barberProfile.findUnique({ where: { slug: input.slug }, select: { id: true } })
  if (owner) await releaseUnpaidHolds(prisma, owner.id)

  const appointment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const profile = await tx.barberProfile.findUnique({ where: { slug: input.slug } })
    if (!profile || !profile.bookingOpen) throw new CommandError('Online booking is closed.')
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', 'barber-booking', profile.id)
    const service = await tx.service.findFirst({ where: { id: input.serviceId, profileId: profile.id, active: true } })
    if (!service) throw new CommandError('Choose a service.')
    const date = businessDateKey(startsAt, profile.timezone)
    const free = await publicSlots(tx, input.slug, service.id, date)
    if (!free.includes(startsAt.toISOString())) throw new CommandError('That time was just taken. Choose another.')

    const contact = guest.phone ? { phone: guest.phone } : { email: guest.email }
    let client = await tx.client.findFirst({ where: { profileId: profile.id, ...contact } })
    if (client?.status === 'blocked') throw new CommandError('This time can’t be booked online. Contact your barber.')
    const [first, ...rest] = guest.name.split(/\s+/)
    client ??= await tx.client.create({ data: { profileId: profile.id, firstName: first, lastName: rest.join(' ') || undefined, phone: guest.phone || undefined, email: guest.email || undefined } })
    // With no online deposit provider the client cannot pay, so no deposit is asked and the booking is confirmed.
    const deposit = (await depositProvider(tx, profile.id)) ? service.depositCents ?? 0 : 0
    const created = await tx.appointment.create({
      data: {
        profileId: profile.id, clientId: client.id, serviceId: service.id,
        startsAt, endsAt: new Date(startsAt.getTime() + (service.durationMinutes ?? 30) * 60_000),
        serviceNameSnapshot: service.name, priceCents: service.priceCents, depositCents: deposit,
        status: deposit > 0 ? 'requested' : 'confirmed', source: 'online', paymentStatus: 'unpaid',
        clientNotes: guest.notes || undefined, publicAccessTokenHash: access.hash,
      },
    })
    return { id: created.id, depositCents: deposit }
  }, { isolationLevel: 'Serializable' })

  return { appointmentId: appointment.id, token: access.token, depositCents: appointment.depositCents }
}

async function ownedByToken(db: Db, id: string, token: string) {
  const appointment = await db.appointment.findUnique({ where: { id }, include: { profile: true, service: true, client: true } })
  if (!appointment || !publicAccessTokenMatches(token, appointment.publicAccessTokenHash)) throw new CommandError('This booking link is not valid.')
  return appointment
}

/** The barber's online deposit provider: Stripe when its key is set, otherwise none. */
export async function depositProvider(db: Db, profileId: string) {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return db.paymentProvider.findFirst({ where: { profileId, code: 'pp_stripe', isInstalled: true } })
}

/** What a client sees about their own booking. */
export async function readBooking(db: Db, id: string, token: string) {
  let a = await ownedByToken(db, id, token)
  // A client whose browser never came back from Stripe has still paid; read any open Checkout back.
  if (a.paymentStatus === 'unpaid' && a.depositCents > 0 && (await settleDeposit(db, a).catch(() => ({ paid: false }))).paid) a = await ownedByToken(db, id, token)
  if (a.status === 'requested' && (await releaseUnpaidHolds(db as PrismaClient, a.profileId, a.id))) a = await ownedByToken(db, id, token)
  const waiting = a.status === 'requested' && a.paymentStatus === 'unpaid' && a.depositCents > 0 && a.source === 'online'
  return {
    holdEndsAt: waiting ? holdEndsAt(a.createdAt, a.profile.unpaidHoldHours).toISOString() : null,
    released: a.status === 'cancelled' && Boolean(a.cancellationReason?.startsWith('Deposit not paid')),
    id: a.id, status: a.status, paymentStatus: a.paymentStatus, startsAt: a.startsAt.toISOString(), serviceName: a.serviceNameSnapshot,
    priceCents: a.priceCents, depositCents: a.depositCents, businessName: a.profile.businessName, location: a.profile.location,
    phone: a.profile.phone, timezone: a.profile.timezone, canPayDeposit: a.paymentStatus === 'unpaid' && a.depositCents > 0 && OPEN.includes(a.status as never) && Boolean(await depositProvider(db, a.profileId)),
  }
}

/** Opens (or reuses) a Stripe Checkout for the deposit and returns its URL. */
export async function startDepositCheckout(db: Db, id: string, token: string) {
  let a = await ownedByToken(db, id, token)
  if (a.status === 'requested' && (await releaseUnpaidHolds(db as PrismaClient, a.profileId, a.id))) a = await ownedByToken(db, id, token)
  if (a.status === 'cancelled' && a.cancellationReason?.startsWith('Deposit not paid')) throw new CommandError('The deposit was not paid in time, so this time was released. Book again from the booking page.')
  if (!OPEN.includes(a.status as never) || a.paymentStatus !== 'unpaid' || a.depositCents <= 0) throw new CommandError('This booking has no deposit to pay.')
  if ((await settleDeposit(db, a)).paid) throw new CommandError('Your deposit is already paid.')
  const provider = await depositProvider(db, a.profileId)
  if (!provider) throw new CommandError('Online deposits are not available. Pay your barber in person.')
  const origin = trustedOrigin()
  const back = `${origin}/booking/${encodeURIComponent(a.id)}?t=${encodeURIComponent(token)}`
  // The card page closes when the hold ends (Stripe allows 30 minutes to 24 hours), so nobody pays for a released time.
  const holdEnd = holdEndsAt(a.createdAt, a.profile.unpaidHoldHours).getTime()
  const expiresAt = new Date(Math.min(Math.max(holdEnd, Date.now() + 31 * 60_000), Date.now() + 23.5 * 3_600_000))
  const result = await createPayment({
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
    provider: { code: provider.code }, amount: a.depositCents, currency: a.profile.currencyCode.toLowerCase(),
    description: `Deposit · ${a.serviceNameSnapshot ?? 'Appointment'}`, idempotencyKey: randomUUID(),
    successUrl: `${back}&paid=1`, cancelUrl: `${back}&paid=0`, customerEmail: a.client?.email ?? '',
    metadata: { appointmentId: a.id },
  }) as { id?: string; url?: string | null }
  if (!result.id || !result.url) throw new CommandError('The card page did not open. Try again.')
  await db.paymentSession.create({ data: { profileId: a.profileId, appointmentId: a.id, paymentProviderId: provider.id, amountCents: a.depositCents, currencyCode: a.profile.currencyCode, providerPaymentId: result.id, expiresAt } })
  return { url: result.url, sessionId: result.id }
}

/** Confirms a deposit by reading the Checkout Session back from Stripe, never from the browser. */
export async function confirmDeposit(db: Db, id: string, token: string) {
  const a = await ownedByToken(db, id, token)
  return settleDeposit(db, a)
}

/**
 * Records a deposit Stripe has captured. Only a booking still waiting for its deposit becomes confirmed; a deposit
 * paid after the booking was cancelled is recorded and refunded, so a cancelled visit never comes back.
 */
async function settleDeposit(db: Db, a: { id: string; profileId: string; status: string; paymentStatus: string }) {
  if (String(a.paymentStatus) !== 'unpaid') return { paid: true }
  const sessions = await db.paymentSession.findMany({ where: { appointmentId: a.id, status: 'pending' }, include: { paymentProvider: true } })
  for (const session of sessions) {
    if (!session.providerPaymentId || !session.paymentProvider) continue
    const result = await getPaymentStatus({ provider: { code: session.paymentProvider.code }, paymentId: session.providerPaymentId }) as { status?: string; amount?: number }
    if (result.status === 'captured' && Number(result.amount) === session.amountCents) {
      await (db as PrismaClient).$transaction(async (tx) => {
        const claimed = await tx.paymentSession.updateMany({ where: { id: session.id, status: 'pending' }, data: { status: 'captured', capturedAt: new Date() } })
        if (!claimed.count) return
        await tx.payment.create({ data: { profileId: a.profileId, appointmentId: a.id, method: 'stripe', kind: 'deposit', amountCents: session.amountCents, providerReference: session.providerPaymentId } })
        await tx.appointment.update({ where: { id: a.id }, data: { paymentStatus: 'deposit_paid', ...(a.status === 'requested' ? { status: 'confirmed' as const } : {}) } })
      })
      // Stripe refusing the refund leaves the deposit recorded as paid on the cancelled visit, for the barber to see.
      if (a.status === 'cancelled') await refundDeposit(db, a.id, a.profileId).catch(() => console.error('[barber] late deposit refund failed'))
      return { paid: true }
    }
  }
  return { paid: false }
}

/**
 * Client cancels from their own link, inside the barber's cancellation window. A deposit paid online is refunded
 * through Stripe before the booking is cancelled; if Stripe refuses, the booking stays open and the client is told.
 */
export async function cancelByClient(db: Db, id: string, token: string) {
  let a = await ownedByToken(db, id, token)
  if (!OPEN.includes(a.status as never)) throw new CommandError('This booking can no longer be cancelled here.')
  const hoursLeft = (a.startsAt.getTime() - Date.now()) / 3_600_000
  if (hoursLeft < a.profile.cancellationWindowHours) throw new CommandError(`Cancellations close ${a.profile.cancellationWindowHours} hours before the appointment. Call ${a.profile.phone || 'your barber'}.`)
  // A deposit paid in a browser that never came back is read from Stripe first, so it is refunded too.
  if (a.paymentStatus === 'unpaid' && a.depositCents > 0 && (await settleDeposit(db, a).catch(() => ({ paid: false }))).paid) a = await ownedByToken(db, id, token)
  let refunded = false
  if (a.paymentStatus === 'deposit_paid') {
    try {
      await refundDeposit(db, a.id, a.profileId)
      refunded = true
    } catch (error) {
      if (error instanceof CommandError) throw error
      console.error('[barber] client cancel refund failed', error instanceof Error ? error.message : error)
      throw new CommandError(`Your deposit could not be refunded just now, so the booking is still on. Try again, or call ${a.profile.phone || 'your barber'}.`)
    }
  }
  await db.appointment.update({ where: { id: a.id }, data: { status: 'cancelled', cancellationReason: 'Cancelled by client' } })
  return { cancelled: true, refunded }
}

/** Refund a Stripe deposit through the adapter (barber side). */
export async function refundDeposit(db: Db, appointmentId: string, profileId: string) {
  const payment = await db.payment.findFirst({ where: { appointmentId, profileId, method: 'stripe', kind: 'deposit', status: 'paid' } })
  if (!payment?.providerReference) throw new CommandError('There is no online deposit to refund.')
  const claimed = await db.payment.updateMany({ where: { id: payment.id, status: 'paid' }, data: { status: 'refunded' } })
  if (!claimed.count) throw new CommandError('This deposit was already refunded.')
  try {
    await refundPayment({ provider: { code: 'pp_stripe' }, paymentId: payment.providerReference, amount: payment.amountCents, idempotencyKey: `refund-${payment.id}` })
  } catch (error) {
    await db.payment.updateMany({ where: { id: payment.id }, data: { status: 'paid' } })
    throw error
  }
  await db.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: 'refunded' } })
}

export { getPaymentProviderRegistration, hashPublicAccessToken }
