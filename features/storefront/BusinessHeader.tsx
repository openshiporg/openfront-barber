import { LogoIcon } from '@/features/dashboard/components/Logo'

export type Hours = { dayOfWeek: string; isWorking: boolean; startMinute: number; endMinute: number }
export type PublicService = { id: string; name: string; description: string | null; photoPath: string | null; priceCents: number; durationMinutes: number; depositCents: number }
export type Business = {
  slug: string; businessName: string; bio: string | null; photoPath: string | null; phone: string | null; location: string | null; timezone: string
  bookingOpen: boolean; currencyCode: string; maxAdvanceDays: number; cancellationWindowHours: number; services: PublicService[]; hours: Hours[]
}

const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const clock = (m: number) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, 0, m)))

/** Photo, name, where and when: the top of every public page. */
export function BusinessHeader({ b }: { b: Business }) {
  return (
    <header className="grid gap-4">
      {b.photoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.photoPath} alt="" className="aspect-[16/9] w-full rounded-md border object-cover" />
      ) : null}
      <div className="flex items-center gap-3">
        <LogoIcon className="size-8 shrink-0" suffix="-book" />
        <h1 className="text-2xl font-semibold tracking-tight">{b.businessName}</h1>
      </div>
      {b.bio ? <p className="text-sm text-muted-foreground">{b.bio}</p> : null}
      <p className="text-sm text-muted-foreground">{[b.location, b.phone].filter(Boolean).join(' · ')}</p>
    </header>
  )
}

export function HoursList({ hours }: { hours: Hours[] }) {
  const sorted = [...hours].sort((a, b) => ORDER.indexOf(a.dayOfWeek) - ORDER.indexOf(b.dayOfWeek))
  if (!sorted.length) return null
  return (
    <dl className="grid gap-px overflow-hidden rounded-md border bg-border text-sm">
      {sorted.map((h) => (
        <div key={h.dayOfWeek} className="flex justify-between gap-4 bg-background px-4 py-2">
          <dt className="capitalize text-muted-foreground">{h.dayOfWeek}</dt>
          <dd className="tabular-nums">{h.isWorking ? `${clock(h.startMinute)} – ${clock(h.endMinute)}` : 'Closed'}</dd>
        </div>
      ))}
    </dl>
  )
}
