import { graphql, list } from '@keystone-6/core'
import { relationship, select, text, timestamp, virtual } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const Client = list({
  hooks: { resolveInput: attachOwnProfile as never },
  access: {
    operation: {
      query: permissions.canManageClients,
      create: permissions.canManageClients,
      update: permissions.canManageClients,
      delete: permissions.canManageClients,
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter },
  },
  ui: { listView: { initialColumns: ['fullName', 'phone', 'email', 'lastVisitAt'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.clients', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    firstName: text({ validation: { isRequired: true } }),
    lastName: text(),
    phone: text(),
    email: text(),
    status: select({
      type: 'enum',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'VIP', value: 'vip' },
        { label: 'Blocked', value: 'blocked' },
      ],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
    preferences: text({ ui: { displayMode: 'textarea', description: 'Cut, guard numbers, products, anything to remember next time.' } }),
    lastVisitAt: timestamp(),
    fullName: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve: (item) => [item.firstName, item.lastName].filter(Boolean).join(' '),
      }),
    }),
    notes: relationship({ ref: 'ClientNote.client', many: true, access: { create: () => false, update: () => false } }),
    appointments: relationship({ ref: 'Appointment.client', many: true, access: { create: () => false, update: () => false } }),
    productSales: relationship({ ref: 'ProductSale.client', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
