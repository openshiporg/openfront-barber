import { PageContainer } from '@/features/dashboard/components/PageContainer'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { Notice, money } from '../lib/ui'
import { TodayControls } from './TodayControls'
import Link from 'next/link'

type Row = { id: string; startsAt: string; serviceNameSnapshot: string | null; priceCents: number; depositCents: number; status: string; paymentStatus: string; source: string; clientNotes: string | null; client: { fullName: string | null; phone: string | null; preferences: string | null } | null }

const crumbs = [{ type: 'link' as const, label: 'Dashboard', href: '/dashboard' }, { type: 'page' as const, label: 'Today' }]

export default async function TodayPage() {
  const result = await keystoneClient<{ barberProfiles: Array<{ businessName: string; slug: string; timezone: string }>; appointments: Row[]; products: Array<{ id: string; name: string; priceCents: number; stock: number }> }>(`
    query {
      barberProfiles { businessName slug timezone }
      appointments(where: { status: { in: [requested, confirmed] } }, orderBy: { startsAt: asc }, take: 60) {
        id startsAt serviceNameSnapshot priceCents depositCents status paymentStatus source clientNotes
        client { fullName phone preferences }
      }
      products(where: { active: { equals: true } }, orderBy: { name: asc }) { id name priceCents stock }
    }`)
  const profile = result.success ? result.data.barberProfiles[0] : null
  if (!profile) {
    return (
      <PageContainer title="Today" breadcrumbs={crumbs}>
        <div className="flex flex-col gap-3 px-4 pb-24 md:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Today</h1>
          <Notice>Set up your business to take bookings. <Link className="underline" href="/dashboard/platform/setup">Set up business</Link></Notice>
        </div>
      </PageContainer>
    )
  }
  const tz = profile.timezone
  const day = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
  const time = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  const rows = result.success ? result.data.appointments : []
  const products = result.success ? result.data.products : []
  return (
    <PageContainer title="Today" breadcrumbs={crumbs}>
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-24 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Open appointments</h1>
          <p className="text-sm text-muted-foreground">Your booking page: <Link className="underline" href={`/book/${profile.slug}`}>/book/{profile.slug}</Link></p>
        </div>
        {!rows.length ? <p className="py-4 text-sm text-muted-foreground">No open appointments. Share your booking page or add one from Models → Appointments.</p> : (
          <ul className="grid gap-3">
            {rows.map((a) => (
              <li key={a.id} className="grid min-w-0 gap-3 rounded-md border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 font-medium">{day(a.startsAt)} · {time(a.startsAt)} · {a.serviceNameSnapshot || 'Appointment'}</p>
                  <p className="text-sm tabular-nums">{money(a.priceCents)}{a.paymentStatus === 'deposit_paid' ? ` · ${money(a.depositCents)} deposit paid` : ''}</p>
                </div>
                <p className="text-sm text-muted-foreground">{a.client?.fullName || 'Client'}{a.client?.phone ? ` · ${a.client.phone}` : ''}{a.status === 'requested' ? ' · waiting on deposit' : ''}</p>
                {a.clientNotes ? <p className="text-sm">“{a.clientNotes}”</p> : null}
                {a.client?.preferences ? <p className="text-sm text-muted-foreground">Remember: {a.client.preferences}</p> : null}
                <TodayControls id={a.id} priceCents={a.priceCents} depositPaid={a.paymentStatus === 'deposit_paid'} products={products} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  )
}
