'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Btn, Field, Notice, inputClass, money } from '@/features/platform/lib/ui'
import { book, loadSlots } from './actions'

type Service = { id: string; name: string; description: string | null; priceCents: number; durationMinutes: number; depositCents: number }
type Props = { slug: string; timezone: string; currency: string; maxAdvanceDays: number; services: Service[] }

const dateKey = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

export function BookingFlow({ slug, timezone, currency, maxAdvanceDays, services }: Props) {
  const router = useRouter()
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone])
  const maxDate = useMemo(() => dateKey(new Date(Date.now() + maxAdvanceDays * 86_400_000), timezone), [maxAdvanceDays, timezone])
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slot, setSlot] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const service = services.find((s) => s.id === serviceId)

  useEffect(() => {
    let live = true
    setSlots(null); setSlot('')
    if (serviceId && date) loadSlots(slug, serviceId, date).then((r) => { if (live) { setSlots(r.success ? r.data ?? [] : []); if (!r.success) setError(r.error) } })
    return () => { live = false }
  }, [slug, serviceId, date])

  const time = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        const f = new FormData(event.currentTarget)
        setError(null)
        start(async () => {
          const r = await book(slug, serviceId, slot, { name: String(f.get('name') || ''), phone: String(f.get('phone') || ''), email: String(f.get('email') || ''), notes: String(f.get('notes') || '') })
          if (!r.success || !r.data) { setError(r.error || 'The booking could not be made.'); return }
          router.push(`/booking/${r.data.appointmentId}?t=${encodeURIComponent(r.data.token)}`)
        })
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Service</legend>
        {services.map((s) => (
          <label key={s.id} className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${s.id === serviceId ? 'border-foreground' : ''}`}>
            <span className="flex min-w-0 items-center gap-3">
              <input type="radio" name="service" checked={s.id === serviceId} onChange={() => setServiceId(s.id)} className="size-4" />
              <span className="min-w-0"><span className="block font-medium">{s.name}</span><span className="block text-xs text-muted-foreground">{s.durationMinutes} min{s.depositCents ? ` · ${money(s.depositCents, currency)} deposit` : ''}</span></span>
            </span>
            <span className="tabular-nums">{money(s.priceCents, currency)}</span>
          </label>
        ))}
      </fieldset>
      <Field label="Day"><input type="date" value={date} min={today} max={maxDate} onChange={(e) => setDate(e.target.value)} className={inputClass} required /></Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Time</legend>
        {slots === null ? <p className="text-sm text-muted-foreground">Loading times…</p> : slots.length === 0 ? <p className="text-sm text-muted-foreground">No times open this day. Try another day.</p> : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((iso) => (
              <button key={iso} type="button" aria-pressed={slot === iso} onClick={() => setSlot(iso)} className={`h-11 rounded-md border text-sm tabular-nums ${slot === iso ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted'}`}>{time(iso)}</button>
            ))}
          </div>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name"><input name="name" required maxLength={120} autoComplete="name" className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" type="tel" autoComplete="tel" className={inputClass} /></Field>
        <Field label="Email" hint="Phone or email, so your barber can reach you."><input name="email" type="email" autoComplete="email" className={inputClass} /></Field>
        <Field label="Notes (optional)"><input name="notes" maxLength={500} className={inputClass} /></Field>
      </div>
      {error ? <Notice tone="alert">{error}</Notice> : null}
      <div><Btn type="submit" variant="primary" className="w-full sm:w-auto" disabled={pending || !slot || !service}>{pending ? 'Booking…' : service?.depositCents ? `Book and pay ${money(service.depositCents, currency)} deposit` : 'Book appointment'}</Btn></div>
    </form>
  )
}
