import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

/** A settled payment: written by the checkout command only, read by the barber. */
export const Payment = list({
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['appointment', 'method', 'amountCents', 'tipCents', 'status', 'paidAt'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.payments' }),
    appointment: relationship({ ref: 'Appointment.payments' }),
    method: select({
      type: 'enum',
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'Card (reader or app)', value: 'card' },
        { label: 'Zelle / Venmo / Cash App', value: 'transfer' },
        { label: 'Online (Stripe)', value: 'stripe' },
      ],
      defaultValue: 'cash',
      validation: { isRequired: true },
    }),
    kind: select({
      type: 'enum',
      options: [
        { label: 'Deposit', value: 'deposit' },
        { label: 'Service', value: 'service' },
        { label: 'Refund', value: 'refund' },
        { label: 'No-show fee', value: 'no_show_fee' },
      ],
      defaultValue: 'service',
      validation: { isRequired: true },
    }),
    status: select({
      type: 'enum',
      options: [{ label: 'Paid', value: 'paid' }, { label: 'Refunded', value: 'refunded' }],
      defaultValue: 'paid',
      validation: { isRequired: true },
    }),
    amountCents: integer({ validation: { isRequired: true, min: 0 }, ui: { description: 'Service and product amount, tip not included.' } }),
    tipCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    productsCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    providerReference: text({ ui: { description: 'Stripe Checkout Session id for online payments.' } }),
    paidAt: timestamp({ defaultValue: { kind: 'now' } }),
    ...trackingFields,
  },
})
