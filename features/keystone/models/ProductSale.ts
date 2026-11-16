import { list } from '@keystone-6/core'
import { integer, relationship, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const ProductSale = list({
  hooks: { resolveInput: attachOwnProfile as never },
  access: {
    operation: {
      query: permissions.canManagePayments,
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments,
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['product', 'quantity', 'totalCents', 'createdAt'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.productSales', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    product: relationship({ ref: 'Product.sales' }),
    client: relationship({ ref: 'Client.productSales' }),
    appointment: relationship({ ref: 'Appointment.productSales' }),
    productNameSnapshot: text(),
    quantity: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    unitPriceCents: integer({ validation: { isRequired: true, min: 0 } }),
    totalCents: integer({ validation: { isRequired: true, min: 0 } }),
    ...trackingFields,
  },
})
