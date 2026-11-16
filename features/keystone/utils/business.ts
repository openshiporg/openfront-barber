import type { Prisma, PrismaClient } from '@prisma/client'

import type { Session } from '../access'

export type Db = PrismaClient | Prisma.TransactionClient

export class CommandError extends Error {}

export type CommandResult<T = unknown> = { success: boolean; error: string | null; data: T | null }

export const ok = <T>(data: T): CommandResult<T> => ({ success: true, error: null, data })
export const fail = (error: unknown): CommandResult<never> => ({
  success: false,
  error: error instanceof CommandError ? error.message : 'This could not be completed. Try again.',
  data: null,
})

/** The signed-in barber's own business, or a plain refusal. */
export async function requireOwnProfile(db: Db, session: Session | undefined, permission: keyof Session['data']['role']) {
  if (!session) throw new CommandError('Sign in first.')
  if (!session.data.role?.[permission]) throw new CommandError('Your role does not allow this.')
  const profile = await db.barberProfile.findFirst({ where: { ownerId: session.itemId } })
  if (!profile) throw new CommandError('Set up your business first.')
  return profile
}

export function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
