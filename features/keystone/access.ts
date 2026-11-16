export type Session = {
  itemId: string
  listKey: string
  data: {
    name: string
    onboardingStatus?: string | null
    role: {
      id: string
      name: string
      canSeeOtherPeople: boolean
      canEditOtherPeople: boolean
      canManagePeople: boolean
      canManageRoles: boolean
      canAccessDashboard: boolean
      canManageBusiness: boolean
      canManageClients: boolean
      canManageAppointments: boolean
      canManagePayments: boolean
      canViewEarnings: boolean
    }
  }
}

type AccessArgs = {
  session?: Session
}

export function isSignedIn({ session }: AccessArgs) {
  return Boolean(session)
}

const flag = (key: keyof Session['data']['role']) => ({ session }: AccessArgs) =>
  Boolean(session?.data.role?.[key])

export const permissions = {
  canManagePeople: flag('canManagePeople'),
  canManageRoles: flag('canManageRoles'),
  canManageBusiness: flag('canManageBusiness'),
  canManageClients: flag('canManageClients'),
  canManageAppointments: flag('canManageAppointments'),
  canManagePayments: flag('canManagePayments'),
  canViewEarnings: flag('canViewEarnings'),
  canReadPayments: ({ session }: AccessArgs) =>
    Boolean(session?.data.role?.canManagePayments || session?.data.role?.canViewEarnings),
}

export const rules = {
  canReadPeople: ({ session }: AccessArgs) => {
    if (!session) return false
    if (session.data.role?.canSeeOtherPeople) return true
    return { id: { equals: session.itemId } }
  },
  canUpdatePeople: ({ session }: AccessArgs) => {
    if (!session) return false
    if (session.data.role?.canEditOtherPeople) return true
    return { id: { equals: session.itemId } }
  },
}
