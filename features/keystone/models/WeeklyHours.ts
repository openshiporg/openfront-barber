import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, select } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const WeeklyHours = list({
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
  graphql: { plural: 'WeeklyHoursRows' },
  ui: { listView: { initialColumns: ['dayOfWeek', 'startMinute', 'endMinute', 'isWorking'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.weeklyHours', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    dayOfWeek: select({
      type: 'enum',
      options: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
      validation: { isRequired: true },
    }),
    isWorking: checkbox({ defaultValue: true }),
    startMinute: integer({ defaultValue: 540, validation: { isRequired: true, min: 0, max: 1439 }, ui: { description: 'Minutes after midnight (540 = 9:00 AM).' } }),
    endMinute: integer({ defaultValue: 1020, validation: { isRequired: true, min: 1, max: 1440 }, ui: { description: 'Minutes after midnight (1020 = 5:00 PM).' } }),
    breakStartMinute: integer({ validation: { min: 0, max: 1439 } }),
    breakEndMinute: integer({ validation: { min: 1, max: 1440 } }),
    ...trackingFields,
  },
})
