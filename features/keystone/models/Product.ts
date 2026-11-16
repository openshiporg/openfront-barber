import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const Product = list({
  hooks: { resolveInput: attachOwnProfile as never },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness,
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['name', 'priceCents', 'stock', 'active'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.products', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    name: text({ validation: { isRequired: true } }),
    priceCents: integer({ validation: { isRequired: true, min: 0 } }),
    stock: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    active: checkbox({ defaultValue: true }),
    sales: relationship({ ref: 'ProductSale.product', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
