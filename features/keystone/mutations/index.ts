import { mergeSchemas } from '@graphql-tools/schema'
import type { GraphQLSchema } from 'graphql'
import type { Context } from '.keystone/types'
import type { PrismaClient } from '@prisma/client'

import redirectToInit from './redirectToInit'
import type { Session } from '../access'
import { CommandError, fail, ok, requireOwnProfile } from '../utils/business'
import { bookAppointment, cancelByClient, confirmDeposit, depositProvider, publicSlots, readBooking, releaseUnpaidHolds, startDepositCheckout } from '../utils/commands'
import { cancelByBarber, checkoutAppointment, earnings, markNoShow, setupBusiness } from '../utils/staffCommands'

const graphql = String.raw

type Ctx = Context & { prisma: PrismaClient; session?: Session }

const run = async <T>(work: () => Promise<T>) => {
  try { return ok(await work()) } catch (error) {
    if (!(error instanceof CommandError)) console.error('barber command failed', error instanceof Error ? error.message : 'unknown')
    return fail(error)
  }
}

async function publicBusiness(prisma: PrismaClient, where: { slug: string }) {
  const p = await prisma.barberProfile.findUnique({ where, include: { services: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }, weeklyHours: true } })
  if (!p) return null
  const takesDeposits = Boolean(await depositProvider(prisma, p.id))
  return {
    slug: p.slug, businessName: p.businessName, bio: p.bio, photoPath: p.photoPath, phone: p.phone, location: p.location, timezone: p.timezone, bookingOpen: p.bookingOpen, currencyCode: p.currencyCode,
    maxAdvanceDays: p.maxAdvanceDays, cancellationWindowHours: p.cancellationWindowHours, unpaidHoldHours: p.unpaidHoldHours,
    services: p.services.map((s) => ({ id: s.id, name: s.name, description: s.description, photoPath: s.photoPath, priceCents: s.priceCents, durationMinutes: s.durationMinutes, depositCents: takesDeposits ? s.depositCents : 0 })),
    hours: p.weeklyHours.map((h) => ({ dayOfWeek: h.dayOfWeek, isWorking: h.isWorking, startMinute: h.startMinute, endMinute: h.endMinute })),
  }
}

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      type CommandResult { success: Boolean!, error: String, data: JSON }
      input GuestInput { name: String!, phone: String, email: String, notes: String }
      input SaleLineInput { productId: ID!, quantity: Int! }

      type Query {
        redirectToInit: Boolean
        publicBusiness(slug: String!): JSON
        homeBusiness: JSON
        publicSlots(slug: String!, serviceId: ID!, date: String!): CommandResult!
        publicBooking(id: ID!, token: String!): CommandResult!
        myEarnings(from: String!, to: String!): CommandResult!
      }
      type Mutation {
        setUpMyBusiness(businessName: String!, slug: String!, timezone: String!, phone: String, location: String, workStyle: String, starterMenu: Boolean): CommandResult!
        bookOnline(slug: String!, serviceId: ID!, startsAt: String!, guest: GuestInput!): CommandResult!
        payDepositOnline(id: ID!, token: String!): CommandResult!
        confirmDepositOnline(id: ID!, token: String!): CommandResult!
        cancelMyBooking(id: ID!, token: String!): CommandResult!
        checkOutAppointment(appointmentId: ID!, method: String!, tipCents: Int, priceCents: Int, products: [SaleLineInput!]): CommandResult!
        markAppointmentNoShow(appointmentId: ID!): CommandResult!
        cancelAppointmentAsBarber(appointmentId: ID!, reason: String): CommandResult!
      }
    `,
    resolvers: {
      Query: {
        redirectToInit,
        publicBusiness: (_r: unknown, { slug }: { slug: string }, c: Ctx) => publicBusiness(c.prisma, { slug }),
        // The home page shows the first barber who set up a booking page on this deployment.
        homeBusiness: async (_r: unknown, _a: unknown, c: Ctx) => {
          const first = await c.prisma.barberProfile.findFirst({ where: { bookingOpen: true }, orderBy: { createdAt: 'asc' }, select: { slug: true } })
          return first ? publicBusiness(c.prisma, { slug: first.slug }) : null
        },
        publicSlots: (_r: unknown, a: { slug: string; serviceId: string; date: string }, c: Ctx) => run(async () => {
          // Reading times is when bookings past the unpaid hold are released (there is no job runner).
          const owner = await c.prisma.barberProfile.findUnique({ where: { slug: a.slug }, select: { id: true } })
          if (owner) await releaseUnpaidHolds(c.prisma, owner.id).catch((e) => console.error('[barber] hold release failed', e instanceof Error ? e.message : e))
          return publicSlots(c.prisma, a.slug, a.serviceId, a.date)
        }),
        publicBooking: (_r: unknown, a: { id: string; token: string }, c: Ctx) => run(() => readBooking(c.prisma, a.id, a.token)),
        myEarnings: (_r: unknown, a: { from: string; to: string }, c: Ctx) => run(() => {
          const from = new Date(a.from); const to = new Date(a.to)
          if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw new CommandError('Choose a valid date range.')
          return earnings(c.prisma, c.session, from, to)
        }),
      },
      Mutation: {
        setUpMyBusiness: (_r: unknown, a: { businessName: string; slug: string; timezone: string; phone?: string; location?: string; workStyle?: string; starterMenu?: boolean }, c: Ctx) =>
          run(() => setupBusiness(c.prisma, c.session, { businessName: a.businessName, slug: a.slug, timezone: a.timezone, phone: a.phone ?? '', location: a.location ?? '', workStyle: a.workStyle ?? 'own_space', starterMenu: a.starterMenu ?? false })),
        bookOnline: (_r: unknown, a: { slug: string; serviceId: string; startsAt: string; guest: { name: string; phone?: string; email?: string; notes?: string } }, c: Ctx) =>
          run(() => bookAppointment(c.prisma, { slug: a.slug, serviceId: a.serviceId, startsAt: a.startsAt, guest: { name: a.guest.name, phone: a.guest.phone ?? '', email: a.guest.email ?? '', notes: a.guest.notes ?? '' } })),
        payDepositOnline: (_r: unknown, a: { id: string; token: string }, c: Ctx) => run(() => startDepositCheckout(c.prisma, a.id, a.token)),
        confirmDepositOnline: (_r: unknown, a: { id: string; token: string }, c: Ctx) => run(() => confirmDeposit(c.prisma, a.id, a.token)),
        cancelMyBooking: (_r: unknown, a: { id: string; token: string }, c: Ctx) => run(() => cancelByClient(c.prisma, a.id, a.token)),
        checkOutAppointment: (_r: unknown, a: { appointmentId: string; method: string; tipCents?: number; priceCents?: number; products?: Array<{ productId: string; quantity: number }> }, c: Ctx) =>
          run(() => checkoutAppointment(c.prisma, c.session, { appointmentId: a.appointmentId, method: a.method, tipCents: a.tipCents ?? 0, priceCents: a.priceCents ?? undefined, products: a.products ?? [] })),
        markAppointmentNoShow: (_r: unknown, a: { appointmentId: string }, c: Ctx) => run(() => markNoShow(c.prisma, c.session, a.appointmentId)),
        cancelAppointmentAsBarber: (_r: unknown, a: { appointmentId: string; reason?: string }, c: Ctx) => run(() => cancelByBarber(c.prisma, c.session, a.appointmentId, a.reason ?? '')),
      },
    },
  })
}

export { requireOwnProfile }
