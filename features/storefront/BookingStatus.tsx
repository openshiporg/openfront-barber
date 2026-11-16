'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Btn, Notice } from '@/features/platform/lib/ui'
import { cancelBooking, confirmDeposit, payDeposit } from './actions'

export function BookingStatus({ id, token, canPay, open, returning }: { id: string; token: string; canPay: boolean; open: boolean; returning: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!returning) return
    confirmDeposit(id, token).then((r) => { if (r.success) router.replace(`/booking/${id}?t=${encodeURIComponent(token)}`); router.refresh() })
  }, [returning, id, token, router])

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {canPay ? <Btn variant="primary" disabled={pending} onClick={() => { setError(null); start(async () => { const r = await payDeposit(id, token); if (r.success && r.data?.url) window.location.assign(r.data.url); else setError(r.error || 'The card page did not open.') }) }}>Pay deposit by card</Btn> : null}
        {open ? <Btn variant="danger" disabled={pending} onClick={() => { if (!window.confirm('Cancel this booking?')) return; setError(null); start(async () => { const r = await cancelBooking(id, token); if (!r.success) setError(r.error); else router.refresh() }) }}>Cancel booking</Btn> : null}
      </div>
      {error ? <Notice tone="alert">{error}</Notice> : null}
    </div>
  )
}
