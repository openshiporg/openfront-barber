import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Flat 6px controls, 44px tall on phones. No pills. */
export function Btn({ variant = 'raised', className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'raised' | 'primary' | 'danger' }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:h-10',
        variant === 'raised' && 'border bg-background hover:bg-muted',
        variant === 'primary' && 'bg-foreground text-background hover:bg-foreground/85',
        variant === 'danger' && 'border border-red-300 bg-background text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400',
        className,
      )}
      {...props}
    />
  )
}

export const inputClass = 'h-11 w-full min-w-0 rounded-md border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:text-sm'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function Notice({ tone = 'status', children }: { tone?: 'status' | 'alert'; children: ReactNode }) {
  return <p role={tone} className={cn('rounded-md border px-3 py-2 text-sm', tone === 'alert' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted/50')}>{children}</p>
}

export const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
