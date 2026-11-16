import { list } from '@keystone-6/core'
import { relationship, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { attachOwnProfile, ownProfileFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const ClientNote = list({
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
  ui: { listView: { initialColumns: ['client', 'body', 'createdAt'] } },
  fields: {
    profile: relationship({ ref: 'BarberProfile.clientNotes', db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll('?', '') }, access: { create: () => false, update: () => false } }),
    client: relationship({ ref: 'Client.notes' }),
    appointment: relationship({ ref: 'Appointment.notes' }),
    body: text({ validation: { isRequired: true }, ui: { displayMode: 'textarea' } }),
    ...trackingFields,
  },
})
