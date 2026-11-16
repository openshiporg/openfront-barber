'use server'

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export type Command<T = unknown> = { success: boolean; error: string | null; data: T | null }

/** One GraphQL command that answers { success, error, data }. */
export async function command<T = unknown>(query: string, variables: Record<string, unknown>, field: string): Promise<Command<T>> {
  const response = await keystoneClient<Record<string, Command<T>>>(query, variables)
  if (!response.success) return { success: false, error: 'Connection problem. Try again.', data: null }
  return response.data[field] ?? { success: false, error: 'No answer from the server.', data: null }
}
