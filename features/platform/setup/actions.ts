'use server'

import { revalidatePath } from 'next/cache'
import { command } from '../lib/request'

export async function setUpBusiness(form: FormData) {
  const result = await command(
    `mutation($n: String!, $s: String!, $tz: String!, $p: String, $l: String, $w: String) { setUpMyBusiness(businessName: $n, slug: $s, timezone: $tz, phone: $p, location: $l, workStyle: $w) { success error data } }`,
    { n: String(form.get('businessName') || ''), s: String(form.get('slug') || ''), tz: String(form.get('timezone') || ''), p: String(form.get('phone') || ''), l: String(form.get('location') || ''), w: String(form.get('workStyle') || '') },
    'setUpMyBusiness',
  )
  if (result.success) { revalidatePath('/dashboard', 'layout') }
  return { success: result.success, error: result.error }
}
