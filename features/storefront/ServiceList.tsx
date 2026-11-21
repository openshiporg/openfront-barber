import Link from 'next/link'
import { money } from '@/features/platform/lib/ui'
import type { PublicService } from './BusinessHeader'

/** Services with photo, length, price and deposit, each linking to the booking form. */
export function ServiceList({ slug, services, currency }: { slug: string; services: PublicService[]; currency: string }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => (
        <li key={s.id} className="overflow-hidden rounded-md border">
          {s.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoPath} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : null}
          <div className="grid gap-1 p-3">
            <div className="flex items-baseline justify-between gap-3"><h3 className="font-medium">{s.name}</h3><span className="tabular-nums">{money(s.priceCents, currency)}</span></div>
            {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
            <p className="text-xs text-muted-foreground">{s.durationMinutes} min{s.depositCents ? ` · ${money(s.depositCents, currency)} deposit holds your time` : ''}</p>
            <Link href={`/book/${slug}?service=${encodeURIComponent(s.id)}#book`} className="mt-2 inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted md:h-10">Book {s.name}</Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
