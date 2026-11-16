import { PageContainer } from '@/features/dashboard/components/PageContainer'
import { command } from '../lib/request'
import { Notice, money } from '../lib/ui'
import Link from 'next/link'

type Earnings = { servicesCents: number; tipsCents: number; productsCents: number; visits: number; rentCents: number; byMethod: Array<{ method: string; cents: number }> }
const crumbs = [{ type: 'link' as const, label: 'Dashboard', href: '/dashboard' }, { type: 'page' as const, label: 'Earnings' }]
const ranges = [{ key: 'week', label: 'Last 7 days', days: 7 }, { key: 'month', label: 'Last 30 days', days: 30 }, { key: 'year', label: 'Last 365 days', days: 365 }]
const methodLabel: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Zelle / Venmo / Cash App', stripe: 'Online (Stripe)' }

export default async function EarningsPage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  const wanted = (await searchParams)?.range
  const chosen = ranges.find((r) => r.key === wanted) ?? ranges[1]
  const to = new Date(); const from = new Date(to.getTime() - chosen.days * 86_400_000)
  const result = await command<Earnings>(`query($f: String!, $t: String!) { myEarnings(from: $f, to: $t) { success error data } }`, { f: from.toISOString(), t: to.toISOString() }, 'myEarnings')
  const e = result.data
  return (
    <PageContainer title="Earnings" breadcrumbs={crumbs}>
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-24 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Earnings</h1>
        <nav aria-label="Range" className="flex flex-wrap gap-2">
          {ranges.map((r) => <Link key={r.key} href={`?range=${r.key}`} aria-current={r.key === chosen.key ? 'page' : undefined} className={`inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium md:h-10 ${r.key === chosen.key ? 'border-foreground' : 'text-muted-foreground'}`}>{r.label}</Link>)}
        </nav>
        {!result.success || !e ? <Notice tone="alert">{result.error || 'Earnings could not be loaded.'}</Notice> : (
          <>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
              {[['Services', money(e.servicesCents)], ['Tips', money(e.tipsCents)], ['Products', money(e.productsCents)], ['Visits', String(e.visits)]].map(([k, v]) => (
                <div key={k} className="bg-background px-4 py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <p className="text-sm">Taken in: <strong className="tabular-nums">{money(e.servicesCents + e.tipsCents + e.productsCents)}</strong>{e.rentCents ? <> · Chair rent for the period: <strong className="tabular-nums">{money(e.rentCents)}</strong> · Kept: <strong className="tabular-nums">{money(e.servicesCents + e.tipsCents + e.productsCents - e.rentCents)}</strong></> : null}</p>
            {e.byMethod.length ? <ul className="grid gap-1 text-sm">{e.byMethod.map((m) => <li key={m.method} className="flex justify-between gap-3 border-b py-1.5"><span>{methodLabel[m.method] || m.method}</span><span className="tabular-nums">{money(m.cents)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No payments in this period.</p>}
          </>
        )}
      </div>
    </PageContainer>
  )
}
