import { notFound } from 'next/navigation'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { Notice } from '@/features/platform/lib/ui'
import { BookingFlow } from './BookingFlow'
import { BusinessHeader, HoursList, type Business } from './BusinessHeader'
import { ServiceList } from './ServiceList'

export async function loadBusiness(slug: string) {
  const r = await keystoneClient<{ publicBusiness: Business | null }>(`query($s: String!) { publicBusiness(slug: $s) }`, { s: slug })
  return r.success ? r.data.publicBusiness : null
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params
  const { service } = await searchParams
  const b = await loadBusiness(slug)
  if (!b) notFound()
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8">
      <BusinessHeader b={b} />
      {b.services.length ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Services</h2>
          <ServiceList slug={slug} services={b.services} currency={b.currencyCode} />
        </section>
      ) : null}
      <section id="book" className="grid gap-3 scroll-mt-4">
        <h2 className="text-lg font-semibold tracking-tight">Book a time</h2>
        {!b.bookingOpen ? <Notice>Online booking is closed right now.{b.phone ? ` Call ${b.phone}.` : ''}</Notice>
          : !b.services.length ? <Notice>No services are listed yet.</Notice>
          : <BookingFlow key={service ?? ''} slug={slug} timezone={b.timezone} currency={b.currencyCode} maxAdvanceDays={b.maxAdvanceDays} services={b.services} initialServiceId={service} />}
        {b.cancellationWindowHours ? <p className="text-xs text-muted-foreground">Cancel from your booking link up to {b.cancellationWindowHours} hours before your time and any deposit is refunded to your card.</p> : null}
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Hours</h2>
        <HoursList hours={b.hours} />
      </section>
    </main>
  )
}
