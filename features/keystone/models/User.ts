import { list } from '@keystone-6/core'
import { allOperations, denyAll } from '@keystone-6/core/access'
import { password, relationship, select, text } from '@keystone-6/core/fields'

import { isSignedIn, permissions, rules } from '../access'
import type { Session } from '../access'

export const User = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
      // Barbers create their own account; the Barber role is attached below, never chosen by the caller.
      create: () => true,
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
    },
  },
  ui: {
    hideCreate: args => !permissions.canManagePeople(args),
    hideDelete: args => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ['name', 'email', 'role'],
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        // canEditOtherPeople can edit other people
        if (session?.data.role?.canEditOtherPeople) return 'edit'

        // edit themselves
        if (session?.itemId === item?.id) return 'edit'

        // else, default all fields to read mode
        return 'read'
      },
    },
  },
  hooks: {
    resolveInput: async ({ operation, resolvedData, context }) => {
      if (operation !== 'create' || context.session?.data?.role?.canManagePeople) return resolvedData
      const sudo = context.sudo()
      const found = (await sudo.db.Role.findMany({ where: { name: { equals: 'Barber' } }, take: 1 }))[0]
      const role = found ?? (await sudo.db.Role.createOne({ data: { name: 'Barber', canAccessDashboard: true, canManageBusiness: true, canManageClients: true, canManageAppointments: true, canManagePayments: true, canViewEarnings: true } }))
      return { ...resolvedData, role: { connect: { id: role.id } } }
    },
  },
  fields: {
    name: text({
      validation: {
        isRequired: true,
      },
    }),
    email: text({
      isFilterable: false,
      isOrderable: false,
      isIndexed: 'unique',
      validation: {
        isRequired: true,
      },
    }),
    password: password({
      access: {
        read: denyAll,
        update: ({ session, item }) =>
          permissions.canManagePeople({ session }) || session?.itemId === item.id,
      },
      validation: { isRequired: true },
    }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople,
      },
      ui: {
        itemView: {
          fieldMode: args => (permissions.canManagePeople(args) ? 'edit' : 'read'),
        },
      },
    }),
    barberProfile: relationship({ ref: 'BarberProfile.owner', access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    onboardingStatus: select({
      type: 'enum',
      options: [
        { label: 'Not started', value: 'not_started' },
        { label: 'Done', value: 'done' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      defaultValue: 'not_started',
      access: { update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id },
    }),
  },
});