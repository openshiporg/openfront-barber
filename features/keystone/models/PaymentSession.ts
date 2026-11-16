import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

/** An online deposit started with a provider. Written by booking commands only. */
export const PaymentSession = list({
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['appointment', 'status', 'amountCents', 'expiresAt'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.paymentSessions' }),
    appointment: relationship({ ref: 'Appointment.paymentSessions' }),
    paymentProvider: relationship({ ref: 'PaymentProvider.paymentSessions' }),
    status: select({
      type: 'enum',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Captured', value: 'captured' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'pending',
      validation: { isRequired: true },
    }),
    amountCents: integer({ validation: { isRequired: true, min: 0 } }),
    currencyCode: text({ defaultValue: 'USD' }),
    providerPaymentId: text(),
    expiresAt: timestamp(),
    capturedAt: timestamp(),
    ...trackingFields,
  },
})
