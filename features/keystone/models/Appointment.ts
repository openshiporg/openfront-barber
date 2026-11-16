import { graphql, list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp, virtual } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const Appointment = list({
  hooks: { resolveInput: attachOwnProfile as never },
  access: {
    operation: {
      query: permissions.canManageAppointments,
      create: permissions.canManageAppointments,
      update: permissions.canManageAppointments,
      delete: permissions.canManageAppointments,
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['client', 'service', 'startsAt', 'status', 'paymentStatus'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.appointments', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    client: relationship({ ref: 'Client.appointments' }),
    service: relationship({ ref: 'Service.appointments' }),
    startsAt: timestamp({ validation: { isRequired: true } }),
    endsAt: timestamp(),
    serviceNameSnapshot: text({ access: { update: () => false } }),
    priceCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 }, ui: { description: 'Price in cents, copied from the service when booked.' } }),
    depositCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 }, access: { update: () => false } }),
    status: select({
      type: 'enum',
      options: [
        { label: 'Requested', value: 'requested' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'No-show', value: 'no_show' },
      ],
      defaultValue: 'confirmed',
      validation: { isRequired: true },
    }),
    source: select({
      type: 'enum',
      options: [
        { label: 'Booking page', value: 'online' },
        { label: 'Phone or text', value: 'phone' },
        { label: 'Walk-in', value: 'walk_in' },
      ],
      defaultValue: 'phone',
      validation: { isRequired: true },
    }),
    paymentStatus: select({
      access: { create: () => false, update: () => false },
      type: 'enum',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Deposit paid', value: 'deposit_paid' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'unpaid',
      validation: { isRequired: true },
    }),
    clientNotes: text({ ui: { displayMode: 'textarea', description: 'What the client asked for when booking.' } }),
    internalNotes: text({ ui: { displayMode: 'textarea' } }),
    cancellationReason: text(),
    publicAccessTokenHash: text({
      access: { read: () => false, create: () => false, update: () => false },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    notes: relationship({ ref: 'ClientNote.appointment', many: true, access: { create: () => false, update: () => false } }),
    productSales: relationship({ ref: 'ProductSale.appointment', many: true, access: { create: () => false, update: () => false } }),
    payments: relationship({ ref: 'Payment.appointment', many: true, access: { create: () => false, update: () => false } }),
    paymentSessions: relationship({ ref: 'PaymentSession.appointment', many: true, access: { create: () => false, update: () => false } }),
    summary: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve: (item) => `${item.serviceNameSnapshot || 'Appointment'}`,
      }),
    }),
    ...trackingFields,
  },
})
