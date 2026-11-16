import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const Service = list({
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
  ui: { listView: { initialColumns: ['name', 'priceCents', 'durationMinutes', 'active'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.services', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    name: text({ validation: { isRequired: true } }),
    description: text({ ui: { displayMode: 'textarea' } }),
    priceCents: integer({ validation: { isRequired: true, min: 0 }, ui: { description: 'Price in cents.' } }),
    durationMinutes: integer({ defaultValue: 30, validation: { isRequired: true, min: 5, max: 600 } }),
    depositCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 }, ui: { description: 'Paid online to hold the slot. 0 means pay at the chair.' } }),
    active: checkbox({ defaultValue: true }),
    sortOrder: integer({ defaultValue: 0, validation: { isRequired: true } }),
    appointments: relationship({ ref: 'Appointment.service', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
