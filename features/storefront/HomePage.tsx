import Link from 'next/link'
import { Logo } from '@/features/dashboard/components/Logo'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { BusinessHeader, HoursList, type Business } from './BusinessHeader'
import { ServiceList } from './ServiceList'

const linkClass = 'inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium'

/** The barber's front page when one is set up; otherwise the sign-up page for a new barber. */
export default async function HomePage() {
  const r = await keystoneClient<{ homeBusiness: Business | null }>(`query { homeBusiness }`)
  const b = r.success ? r.data.homeBusiness : null
  if (!b) {
    return (
      <main className="mx-auto grid min-h-screen max-w-xl content-center gap-6 px-4 py-12">
        <Logo className="text-2xl" />
        <h1 className="text-3xl font-semibold tracking-tight">Run your own chair.</h1>
        <p className="text-muted-foreground">Bookings, deposits, tips, products and what you actually keep, for the barber who works for themselves.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className={`${linkClass} bg-foreground text-background`}>Barber sign in</Link>
          <Link href="/dashboard/signup" className={`${linkClass} border`}>Create your account</Link>
        </div>
      </main>
    )
  }
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8">
      <BusinessHeader b={b} />
      <div className="flex flex-wrap gap-2">
        <Link href={`/book/${b.slug}#book`} className={`${linkClass} bg-foreground text-background`}>Book a time</Link>
        {b.phone ? <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className={`${linkClass} border`}>Call {b.phone}</a> : null}
      </div>
      {b.services.length ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Services</h2>
          <ServiceList slug={b.slug} services={b.services} currency={b.currencyCode} />
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Hours</h2>
        <HoursList hours={b.hours} />
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <Logo className="text-sm" />
        <Link href="/dashboard" className="underline">Barber sign in</Link>
      </footer>
    </main>
  )
}
