import { command } from '@/features/platform/lib/request'
import { Notice, money } from '@/features/platform/lib/ui'
import { BookingStatus } from './BookingStatus'

type Booking = { id: string; status: string; paymentStatus: string; startsAt: string; serviceName: string | null; priceCents: number; depositCents: number; businessName: string; location: string | null; phone: string | null; timezone: string; canPayDeposit: boolean; holdEndsAt: string | null; released: boolean }

const label: Record<string, string> = { requested: 'Waiting for deposit', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed' }

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const { id } = await params
  const { t = '', paid } = await searchParams
  const r = await command<Booking>(`query($i: ID!, $t: String!) { publicBooking(id: $i, token: $t) { success error data } }`, { i: id, t }, 'publicBooking')
  if (!r.success || !r.data) return <main className="mx-auto max-w-xl px-4 py-8"><Notice tone="alert">{r.error || 'This booking link is not valid.'}</Notice></main>
  const b = r.data
  const when = new Intl.DateTimeFormat('en-US', { timeZone: b.timezone, dateStyle: 'full', timeStyle: 'short' }).format(new Date(b.startsAt))
  const open = b.status === 'requested' || b.status === 'confirmed'
  return (
    <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{label[b.status] ?? b.status}</h1>
      <dl className="grid gap-px overflow-hidden rounded-md border bg-border text-sm">
        {[['Barber', b.businessName], ['Service', b.serviceName || 'Appointment'], ['When', when], ['Price', money(b.priceCents)], ...(b.depositCents ? [['Deposit', `${money(b.depositCents)} · ${b.paymentStatus === 'deposit_paid' ? 'paid' : b.paymentStatus === 'refunded' ? 'refunded' : 'not paid yet'}`]] : []), ...(b.location ? [['Where', b.location]] : []), ...(b.phone ? [['Phone', b.phone]] : [])].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 bg-background px-4 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
        ))}
      </dl>
      {b.released ? <Notice tone="alert">The deposit was not paid in time, so this time was released for other clients. Book again if you still want a visit.</Notice> : null}
      {b.holdEndsAt && b.canPayDeposit ? <Notice>Pay the deposit by {new Intl.DateTimeFormat('en-US', { timeZone: b.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(b.holdEndsAt))} to keep this time. After that it opens for other clients.</Notice> : null}
      {paid === '0' ? <Notice>Payment was not completed. You can try again below.</Notice> : null}
      {!b.depositCents && open ? <Notice>You are booked. Pay your barber in person.</Notice> : null}
      <BookingStatus id={b.id} token={t} canPay={b.canPayDeposit} open={open} returning={paid === '1' && b.paymentStatus === 'unpaid'} />
    </main>
  )
}
