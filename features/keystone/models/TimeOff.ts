import { list } from '@keystone-6/core'
import { relationship, text, timestamp } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const TimeOff = list({
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
  ui: { listView: { initialColumns: ['startsAt', 'endsAt', 'reason'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.timeOff', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    startsAt: timestamp({ validation: { isRequired: true } }),
    endsAt: timestamp({ validation: { isRequired: true } }),
    reason: text(),
    ...trackingFields,
  },
})
