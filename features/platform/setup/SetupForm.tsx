'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Btn, Field, Notice, inputClass } from '../lib/ui'
import { setUpBusiness } from './actions'

const zones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Karachi', 'Australia/Sydney']

export function SetupForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setError(null)
        start(async () => {
          const result = await setUpBusiness(form)
          if (!result.success) setError(result.error || 'This could not be saved.')
          else router.push('/dashboard/platform/today')
        })
      }}
    >
      <Field label="Business name"><input name="businessName" required maxLength={120} className={inputClass} placeholder="Marcus Cuts" /></Field>
      <Field label="Booking address" hint="Clients book at /book/your-address."><input name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,40}" className={inputClass} placeholder="marcus-cuts" /></Field>
      <Field label="Phone"><input name="phone" type="tel" className={inputClass} /></Field>
      <Field label="Where you work"><input name="location" className={inputClass} placeholder="Shop, booth or mobile area" /></Field>
      <Field label="How you work">
        <select name="workStyle" className={inputClass} defaultValue="own_space">
          <option value="own_space">My own space</option>
          <option value="chair_rental">I rent a chair</option>
          <option value="mobile">Mobile</option>
        </select>
      </Field>
      <Field label="Timezone">
        <select name="timezone" className={inputClass} defaultValue={zones[0]}>{zones.map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}</select>
      </Field>
      <label className="flex min-h-11 items-start gap-3 rounded-md border px-3 py-2.5 text-sm">
        <input type="checkbox" name="starterMenu" defaultChecked className="mt-0.5 size-4" />
        <span><span className="block font-medium">Start with a typical menu</span><span className="block text-xs text-muted-foreground">Haircut, skin fade, cut and beard, beard trim and hot towel shave with photos and deposits, plus three retail products. Change any price or remove them later.</span></span>
      </label>
      {error ? <Notice tone="alert">{error}</Notice> : null}
      <div><Btn type="submit" variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Create my business'}</Btn></div>
    </form>
  )
}
