'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Btn, Field, Notice, inputClass } from '../lib/ui'
import { saveSettings } from './actions'

export type Settings = {
  id: string; businessName: string; phone: string | null; email: string | null; location: string | null; bio: string | null
  bookingOpen: boolean; minNoticeHours: number; maxAdvanceDays: number; bufferMinutes: number; cancellationWindowHours: number; unpaidHoldHours: number
}

const num = (name: string, value: number, min: number, max: number, suffix: string) => (
  <div className="flex items-center gap-2"><input name={name} type="number" inputMode="numeric" required min={min} max={max} step={1} defaultValue={value} className={inputClass.replace("w-full", "w-28")} /><span className="text-sm font-normal text-muted-foreground">{suffix}</span></div>
)

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const router = useRouter()
  const [message, setMessage] = useState<{ tone: 'status' | 'alert'; text: string } | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid max-w-xl gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setMessage(null)
        start(async () => {
          const result = await saveSettings(s.id, form)
          setMessage(result.success ? { tone: 'status', text: 'Saved.' } : { tone: 'alert', text: result.error || 'This could not be saved.' })
          if (result.success) router.refresh()
        })
      }}
    >
      <section className="grid gap-4">
        <h2 className="text-base font-semibold">Business</h2>
        <Field label="Business name"><input name="businessName" required maxLength={120} defaultValue={s.businessName} className={inputClass} /></Field>
        <Field label="Address" hint="Shown on your booking page and on every confirmation."><input name="location" maxLength={200} defaultValue={s.location ?? ''} className={inputClass} placeholder="Shop, booth or mobile area" /></Field>
        <Field label="Phone"><input name="phone" type="tel" maxLength={40} defaultValue={s.phone ?? ''} className={inputClass} /></Field>
        <Field label="Email"><input name="email" type="email" maxLength={200} defaultValue={s.email ?? ''} className={inputClass} /></Field>
        <Field label="About you"><textarea name="bio" rows={3} maxLength={600} defaultValue={s.bio ?? ''} className={`${inputClass} h-auto py-2`} /></Field>
      </section>
      <section className="grid gap-4">
        <h2 className="text-base font-semibold">Booking rules</h2>
        <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium">
          <input type="checkbox" name="bookingOpen" defaultChecked={s.bookingOpen} className="size-4" /> Clients can book online
        </label>
        <Field label="Hold unpaid bookings for" hint="A client who books a service with a deposit has this long to pay it. After that the booking is cancelled and the time opens for other clients. 1 to 72 hours.">{num('unpaidHoldHours', s.unpaidHoldHours, 1, 72, 'hours')}</Field>
        <Field label="Clients can cancel up to" hint="Before the appointment, from their booking link. A paid deposit is refunded.">{num('cancellationWindowHours', s.cancellationWindowHours, 0, 720, 'hours before')}</Field>
        <Field label="Shortest notice">{num('minNoticeHours', s.minNoticeHours, 0, 720, 'hours')}</Field>
        <Field label="Book up to">{num('maxAdvanceDays', s.maxAdvanceDays, 1, 365, 'days ahead')}</Field>
        <Field label="Clean-up time after each client">{num('bufferMinutes', s.bufferMinutes, 0, 120, 'minutes')}</Field>
      </section>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <div><Btn type="submit" variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Btn></div>
    </form>
  )
}
