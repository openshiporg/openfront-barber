import type { Prisma, PrismaClient } from '@prisma/client'

import type { Session } from '../access'
import { CommandError, requireOwnProfile } from './business'
import { refundDeposit } from './commands'

const METHODS = ['cash', 'card', 'transfer'] as const
type Method = (typeof METHODS)[number]
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function cents(value: unknown, label: string) {
  const n = Number(value ?? 0)
  if (!Number.isSafeInteger(n) || n < 0 || n > 10_000_000) throw new CommandError(`${label} is not a valid amount.`)
  return n
}

/** First-run setup: the signed-in user gets their business, weekly hours and a way to be paid. */
export async function setupBusiness(prisma: PrismaClient, session: Session | undefined, input: { businessName: string; slug: string; timezone: string; phone: string; location: string; workStyle: string }) {
  if (!session) throw new CommandError('Sign in first.')
  const name = input.businessName.trim().slice(0, 120)
  const slug = input.slug.trim().toLowerCase()
  if (!name) throw new CommandError('Enter your business name.')
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) throw new CommandError('Booking address: 2 to 41 lowercase letters, numbers or hyphens.')
  try { new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }) } catch { throw new CommandError('Choose a valid timezone.') }
  const workStyle = ['own_space', 'chair_rental', 'mobile'].includes(input.workStyle) ? input.workStyle : 'own_space'
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (await tx.barberProfile.findFirst({ where: { ownerId: session.itemId } })) throw new CommandError('Your business is already set up.')
    if (await tx.barberProfile.findUnique({ where: { slug } })) throw new CommandError('That booking address is taken. Try another.')
    const profile = await tx.barberProfile.create({
      data: { ownerId: session.itemId, businessName: name, slug, timezone: input.timezone, phone: input.phone.trim() || undefined, location: input.location.trim() || undefined, workStyle: workStyle as never },
    })
    await tx.weeklyHours.createMany({
      data: DAYS.map((dayOfWeek, i) => ({ profileId: profile.id, dayOfWeek: dayOfWeek as never, isWorking: i >= 2 && i <= 6, startMinute: 600, endMinute: 1080 })),
    })
    await tx.paymentProvider.create({ data: { profileId: profile.id, name: 'In person', code: 'pp_manual' } })
    await tx.paymentProvider.create({ data: { profileId: profile.id, name: 'Card online', code: 'pp_stripe', createPaymentFunction: 'stripe', capturePaymentFunction: 'stripe', refundPaymentFunction: 'stripe', getPaymentStatusFunction: 'stripe', generatePaymentLinkFunction: 'stripe', handleWebhookFunction: 'stripe' } })
    await tx.user.update({ where: { id: session.itemId }, data: { onboardingStatus: 'done' } })
    return { slug: profile.slug }
  })
}

/** Takes payment for a visit: service, products sold, tip. One payment per visit. */
export async function checkoutAppointment(prisma: PrismaClient, session: Session | undefined, input: { appointmentId: string; method: string; tipCents: number; products: Array<{ productId: string; quantity: number }>; priceCents?: number }) {
  if (!METHODS.includes(input.method as Method)) throw new CommandError('Choose how the client paid.')
  const tip = cents(input.tipCents, 'Tip')
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const profile = await requireOwnProfile(tx, session, 'canManagePayments')
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', 'barber-checkout', input.appointmentId)
    const a = await tx.appointment.findFirst({ where: { id: input.appointmentId, profileId: profile.id } })
    if (!a) throw new CommandError('Appointment not found.')
    if (!['requested', 'confirmed'].includes(a.status)) throw new CommandError('Only an open appointment can be checked out.')
    const price = input.priceCents === undefined ? a.priceCents : cents(input.priceCents, 'Price')
    const deposit = a.paymentStatus === 'deposit_paid' ? a.depositCents : 0
    let productsTotal = 0
    for (const line of input.products) {
      const qty = Math.floor(Number(line.quantity))
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new CommandError('Product quantity is not valid.')
      const product = await tx.product.findFirst({ where: { id: line.productId, profileId: profile.id, active: true } })
      if (!product) throw new CommandError('A product was not found.')
      const taken = await tx.product.updateMany({ where: { id: product.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })
      if (!taken.count) throw new CommandError(`Not enough ${product.name} in stock.`)
      const total = product.priceCents * qty
      productsTotal += total
      await tx.productSale.create({ data: { profileId: profile.id, productId: product.id, clientId: a.clientId, appointmentId: a.id, productNameSnapshot: product.name, quantity: qty, unitPriceCents: product.priceCents, totalCents: total } })
    }
    const due = Math.max(0, price - deposit)
    await tx.payment.create({ data: { profileId: profile.id, appointmentId: a.id, method: input.method as never, kind: 'service', amountCents: due, productsCents: productsTotal, tipCents: tip } })
    await tx.appointment.update({ where: { id: a.id }, data: { status: 'completed', paymentStatus: 'paid', priceCents: price } })
    if (a.clientId) await tx.client.update({ where: { id: a.clientId }, data: { lastVisitAt: new Date() } })
    return { due, tip, productsTotal }
  }, { isolationLevel: 'Serializable' })
}

/** No-show: keeps a Stripe deposit; charges nothing else automatically. */
export async function markNoShow(prisma: PrismaClient, session: Session | undefined, appointmentId: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const profile = await requireOwnProfile(tx, session, 'canManageAppointments')
    const a = await tx.appointment.findFirst({ where: { id: appointmentId, profileId: profile.id } })
    if (!a) throw new CommandError('Appointment not found.')
    if (!['requested', 'confirmed'].includes(a.status)) throw new CommandError('Only an open appointment can be marked a no-show.')
    await tx.appointment.update({ where: { id: a.id }, data: { status: 'no_show' } })
    return { depositKept: a.paymentStatus === 'deposit_paid' }
  })
}

/** Cancel by the barber; an online deposit is refunded through the provider. */
export async function cancelByBarber(prisma: PrismaClient, session: Session | undefined, appointmentId: string, reason: string) {
  const profile = await requireOwnProfile(prisma, session, 'canManageAppointments')
  const a = await prisma.appointment.findFirst({ where: { id: appointmentId, profileId: profile.id } })
  if (!a) throw new CommandError('Appointment not found.')
  if (!['requested', 'confirmed'].includes(a.status)) throw new CommandError('Only an open appointment can be cancelled.')
  if (a.paymentStatus === 'deposit_paid') await refundDeposit(prisma, a.id, profile.id)
  await prisma.appointment.update({ where: { id: a.id }, data: { status: 'cancelled', cancellationReason: reason.trim().slice(0, 300) || 'Cancelled by barber' } })
  return { refunded: a.paymentStatus === 'deposit_paid' }
}

/** Earnings from settled payments, minus chair rent, over a date range. */
export async function earnings(prisma: PrismaClient, session: Session | undefined, from: Date, to: Date) {
  const profile = await requireOwnProfile(prisma, session, 'canViewEarnings')
  const where = { profileId: profile.id, status: 'paid' as const, paidAt: { gte: from, lt: to } }
  const [sum, byMethod, visits, rentals] = await Promise.all([
    prisma.payment.aggregate({ where, _sum: { amountCents: true, tipCents: true, productsCents: true } }),
    prisma.payment.groupBy({ by: ['method'], where, _sum: { amountCents: true, tipCents: true, productsCents: true } }),
    prisma.appointment.count({ where: { profileId: profile.id, status: 'completed', startsAt: { gte: from, lt: to } } }),
    prisma.chairRental.findMany({ where: { profileId: profile.id, status: 'active' } }),
  ])
  const days = Math.max(1, (to.getTime() - from.getTime()) / 86_400_000)
  const rent = rentals.reduce((total, r) => total + Math.round(r.rentCents * (days / (r.period === 'weekly' ? 7 : 30))), 0)
  return {
    servicesCents: sum._sum.amountCents ?? 0, tipsCents: sum._sum.tipCents ?? 0, productsCents: sum._sum.productsCents ?? 0, visits, rentCents: rent,
    byMethod: byMethod.map((row) => ({ method: row.method, cents: (row._sum.amountCents ?? 0) + (row._sum.tipCents ?? 0) + (row._sum.productsCents ?? 0) })),
  }
}
