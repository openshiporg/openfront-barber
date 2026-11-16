import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const ChairRental = list({
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
  ui: { listView: { initialColumns: ['hostName', 'rentCents', 'period', 'status'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.chairRentals', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    hostName: text({ validation: { isRequired: true }, ui: { description: 'The shop or owner you rent from.' } }),
    hostContact: text(),
    rentCents: integer({ validation: { isRequired: true, min: 0 } }),
    period: select({
      type: 'enum',
      options: [{ label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }],
      defaultValue: 'weekly',
      validation: { isRequired: true },
    }),
    startsOn: timestamp(),
    endsOn: timestamp(),
    status: select({
      type: 'enum',
      options: [{ label: 'Active', value: 'active' }, { label: 'Ended', value: 'ended' }],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
    terms: text({ ui: { displayMode: 'textarea', description: 'Days, hours, supplies, notice to leave.' } }),
    ...trackingFields,
  },
})
