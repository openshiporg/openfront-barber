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
    db.appointment.findMany({ where: { profileId: profile.id, status: { in: [...OPEN] }, startsAt: { lt: end }, endsAt: { gt: start } }, select: { startsAt: true, endsAt: true } }),
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
    const deposit = service.depositCents ?? 0
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
  const a = await ownedByToken(db, id, token)
  return {
    id: a.id, status: a.status, paymentStatus: a.paymentStatus, startsAt: a.startsAt.toISOString(), serviceName: a.serviceNameSnapshot,
    priceCents: a.priceCents, depositCents: a.depositCents, businessName: a.profile.businessName, location: a.profile.location,
    phone: a.profile.phone, timezone: a.profile.timezone, canPayDeposit: a.paymentStatus === 'unpaid' && a.depositCents > 0 && OPEN.includes(a.status as never) && Boolean(await depositProvider(db, a.profileId)),
  }
}

/** Opens (or reuses) a Stripe Checkout for the deposit and returns its URL. */
export async function startDepositCheckout(db: Db, id: string, token: string) {
  const a = await ownedByToken(db, id, token)
  if (!OPEN.includes(a.status as never) || a.paymentStatus !== 'unpaid' || a.depositCents <= 0) throw new CommandError('This booking has no deposit to pay.')
  const provider = await depositProvider(db, a.profileId)
  if (!provider) throw new CommandError('Online deposits are not available. Pay your barber in person.')
  const origin = trustedOrigin()
  const back = `${origin}/booking/${encodeURIComponent(a.id)}?t=${encodeURIComponent(token)}`
  const result = await createPayment({
    provider: { code: provider.code }, amount: a.depositCents, currency: a.profile.currencyCode.toLowerCase(),
    description: `Deposit · ${a.serviceNameSnapshot ?? 'Appointment'}`, idempotencyKey: randomUUID(),
    successUrl: `${back}&paid=1`, cancelUrl: `${back}&paid=0`, customerEmail: a.client?.email ?? '',
    metadata: { appointmentId: a.id },
  }) as { id?: string; url?: string | null }
  if (!result.id || !result.url) throw new CommandError('The card page did not open. Try again.')
  await db.paymentSession.create({ data: { profileId: a.profileId, appointmentId: a.id, paymentProviderId: provider.id, amountCents: a.depositCents, currencyCode: a.profile.currencyCode, providerPaymentId: result.id, expiresAt: new Date(Date.now() + 23 * 3_600_000) } })
  return { url: result.url, sessionId: result.id }
}

/** Confirms a deposit by reading the Checkout Session back from Stripe, never from the browser. */
export async function confirmDeposit(db: Db, id: string, token: string) {
  const a = await ownedByToken(db, id, token)
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
        await tx.appointment.update({ where: { id: a.id }, data: { paymentStatus: 'deposit_paid', status: 'confirmed' } })
      })
      return { paid: true }
    }
  }
  return { paid: false }
}

/** Client cancels from their own link, inside the barber's cancellation window. */
export async function cancelByClient(db: Db, id: string, token: string) {
  const a = await ownedByToken(db, id, token)
  if (!OPEN.includes(a.status as never)) throw new CommandError('This booking can no longer be cancelled here.')
  const hoursLeft = (a.startsAt.getTime() - Date.now()) / 3_600_000
  if (hoursLeft < a.profile.cancellationWindowHours) throw new CommandError(`Cancellations close ${a.profile.cancellationWindowHours} hours before the appointment. Call ${a.profile.phone || 'your barber'}.`)
  await db.appointment.update({ where: { id: a.id }, data: { status: 'cancelled', cancellationReason: 'Cancelled by client' } })
  return { cancelled: true }
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
