import { list } from '@keystone-6/core'
import { checkbox, relationship, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

const adapter = { validation: { isRequired: true }, defaultValue: 'manual', ui: { description: 'Name of the payment adapter this operation uses.' } } as const

export const PaymentProvider = list({
  hooks: { resolveInput: attachOwnProfile as never },
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments,
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['name', 'code', 'isInstalled'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.paymentProviders', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    name: text({ validation: { isRequired: true } }),
    code: text({
      validation: { isRequired: true, match: { regex: /^pp_(manual|stripe)$/, explanation: 'Provider code is pp_manual or pp_stripe.' } },
    }),
    isInstalled: checkbox({ defaultValue: true }),
    createPaymentFunction: text(adapter),
    capturePaymentFunction: text(adapter),
    refundPaymentFunction: text(adapter),
    getPaymentStatusFunction: text(adapter),
    generatePaymentLinkFunction: text(adapter),
    handleWebhookFunction: text(adapter),
    paymentSessions: relationship({ ref: 'PaymentSession.paymentProvider', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
