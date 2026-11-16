'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Btn, Field, Notice, inputClass } from '../lib/ui'
import { cancelAppointment, checkOut, noShow } from './actions'

type Product = { id: string; name: string; priceCents: number; stock: number }

export function TodayControls({ id, priceCents, depositPaid, products }: { id: string; priceCents: number; depositPaid: boolean; products: Product[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (work: () => Promise<{ success: boolean; error: string | null }>) => {
    setError(null)
    start(async () => {
      const result = await work()
      if (!result.success) setError(result.error || 'This could not be completed.')
      else { setOpen(false); router.refresh() }
    })
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Check out</Btn>
        <Btn disabled={pending} onClick={() => run(() => noShow(id))}>No-show</Btn>
        <Btn variant="danger" disabled={pending} onClick={() => { if (window.confirm('Cancel this appointment? An online deposit is refunded.')) run(() => cancelAppointment(id, '')) }}>Cancel</Btn>
      </div>
      {open ? (
        <form
          className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); run(() => checkOut(form)) }}
        >
          <input type="hidden" name="id" value={id} />
          <Field label="Price ($)" hint={depositPaid ? 'The online deposit is taken off what is owed.' : undefined}><input name="price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={(priceCents / 100).toFixed(2)} className={inputClass} /></Field>
          <Field label="Tip ($)"><input name="tip" type="number" inputMode="decimal" min="0" step="0.01" defaultValue="0" className={inputClass} /></Field>
          <Field label="Paid with">
            <select name="method" className={inputClass} defaultValue="cash">
              <option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Zelle / Venmo / Cash App</option>
            </select>
          </Field>
          {products.length ? (
            <Field label="Product sold">
              <select name="productId" className={inputClass} defaultValue="">
                <option value="">None</option>
                {products.filter((p) => p.stock > 0).map((p) => <option key={p.id} value={p.id}>{p.name} · ${(p.priceCents / 100).toFixed(2)}</option>)}
              </select>
            </Field>
          ) : null}
          <input type="hidden" name="quantity" value="1" />
          <div className="sm:col-span-2"><Btn type="submit" variant="primary" disabled={pending}>{pending ? 'Saving…' : 'Record payment'}</Btn></div>
        </form>
      ) : null}
      {error ? <Notice tone="alert">{error}</Notice> : null}
    </div>
  )
}
