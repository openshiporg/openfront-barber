import { notFound } from 'next/navigation'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { LogoIcon } from '@/features/dashboard/components/Logo'
import { Notice } from '@/features/platform/lib/ui'
import { BookingFlow } from './BookingFlow'

type Business = { businessName: string; bio: string | null; phone: string | null; location: string | null; timezone: string; bookingOpen: boolean; currencyCode: string; maxAdvanceDays: number; services: Array<{ id: string; name: string; description: string | null; priceCents: number; durationMinutes: number; depositCents: number }> }

export async function loadBusiness(slug: string) {
  const r = await keystoneClient<{ publicBusiness: Business | null }>(`query($s: String!) { publicBusiness(slug: $s) }`, { s: slug })
  return r.success ? r.data.publicBusiness : null
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await loadBusiness(slug)
  if (!b) notFound()
  return (
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <LogoIcon className="size-8" suffix="-book" />
        <h1 className="text-2xl font-semibold tracking-tight">{b.businessName}</h1>
        {b.bio ? <p className="text-sm text-muted-foreground">{b.bio}</p> : null}
        <p className="text-sm text-muted-foreground">{[b.location, b.phone].filter(Boolean).join(' · ')}</p>
      </header>
      {!b.bookingOpen ? <Notice>Online booking is closed right now.{b.phone ? ` Call ${b.phone}.` : ''}</Notice>
        : !b.services.length ? <Notice>No services are listed yet.</Notice>
        : <BookingFlow slug={slug} timezone={b.timezone} currency={b.currencyCode} maxAdvanceDays={b.maxAdvanceDays} services={b.services} />}
    </main>
  )
}
