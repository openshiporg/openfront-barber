'use server'

import { revalidatePath } from 'next/cache'
import { command } from '../lib/request'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export async function setUpBusiness(form: FormData) {
  const result = await command(
    `mutation($n: String!, $s: String!, $tz: String!, $p: String, $l: String, $w: String, $m: Boolean) { setUpMyBusiness(businessName: $n, slug: $s, timezone: $tz, phone: $p, location: $l, workStyle: $w, starterMenu: $m) { success error data } }`,
    { n: String(form.get('businessName') || ''), s: String(form.get('slug') || ''), tz: String(form.get('timezone') || ''), p: String(form.get('phone') || ''), l: String(form.get('location') || ''), w: String(form.get('workStyle') || ''), m: form.get('starterMenu') === 'on' },
    'setUpMyBusiness',
  )
  if (result.success) { revalidatePath('/dashboard', 'layout') }
  return { success: result.success, error: result.error }
}

const RULES = { unpaidHoldHours: [1, 72], cancellationWindowHours: [0, 720], minNoticeHours: [0, 720], maxAdvanceDays: [1, 365], bufferMinutes: [0, 120] } as const

/** Saves the barber's own business settings. The same limits are enforced again by the BarberProfile fields. */
export async function saveSettings(id: string, form: FormData) {
  const text = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max)
  const data: Record<string, unknown> = {
    businessName: text('businessName', 120), location: text('location', 200), phone: text('phone', 40), email: text('email', 200).toLowerCase(), bio: text('bio', 600),
    bookingOpen: form.get('bookingOpen') === 'on',
  }
  if (!data.businessName) return { success: false, error: 'Enter your business name.' }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) return { success: false, error: 'Enter a valid email.' }
  const labels: Record<string, string> = { unpaidHoldHours: 'Hold unpaid bookings for', cancellationWindowHours: 'Clients can cancel up to', minNoticeHours: 'Shortest notice', maxAdvanceDays: 'Book up to', bufferMinutes: 'Clean-up time' }
  for (const [k, [min, max]] of Object.entries(RULES)) {
    const n = Number(form.get(k))
    if (!Number.isInteger(n) || n < min || n > max) return { success: false, error: `${labels[k]}: enter a whole number from ${min} to ${max}.` }
    data[k] = n
  }
  const response = await keystoneClient<{ updateBarberProfile: { id: string } | null }>(`mutation($id: ID!, $data: BarberProfileUpdateInput!) { updateBarberProfile(where: { id: $id }, data: $data) { id } }`, { id, data })
  if (!response.success || !response.data.updateBarberProfile) return { success: false, error: 'This could not be saved. Try again.' }
  revalidatePath('/dashboard', 'layout'); revalidatePath('/', 'layout')
  return { success: true, error: null }
}
