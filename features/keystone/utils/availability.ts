import { businessDateKey, businessMinute, businessWallTime } from '../../shared/business-time'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export type Hours = { dayOfWeek: string; isWorking?: boolean | null; startMinute?: number | null; endMinute?: number | null; breakStartMinute?: number | null; breakEndMinute?: number | null }
export type Busy = { startsAt: Date; endsAt: Date }

export function dayOfWeekFor(date: string) {
  return DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())
}

/**
 * Start times (ISO) on one calendar day for a service of `duration` minutes.
 * Honors working hours, breaks, time off, booked appointments plus clean-up
 * time, notice and the booking window. All wall-clock maths is in the barber's
 * own timezone.
 */
export function openSlots(input: {
  date: string
  timeZone: string
  hours: Hours | undefined
  duration: number
  slotMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  busy: Busy[]
  now?: Date
}) {
  const { hours, date, timeZone, duration } = input
  const now = input.now ?? new Date()
  if (!hours?.isWorking) return []
  const start = hours.startMinute ?? 540
  const end = hours.endMinute ?? 1020
  const step = Math.max(5, input.slotMinutes)
  const earliest = now.getTime() + input.minNoticeHours * 3_600_000
  const latest = now.getTime() + input.maxAdvanceDays * 86_400_000
  const out: string[] = []
  for (let minute = start; minute + duration <= end; minute += step) {
    const breaks = typeof hours.breakStartMinute === 'number' && typeof hours.breakEndMinute === 'number'
      && minute < hours.breakEndMinute && hours.breakStartMinute < minute + duration
    if (breaks) continue
    let begins: Date
    try { begins = businessWallTime(date, minute, timeZone) } catch { continue }
    if (begins.getTime() < earliest || begins.getTime() > latest) continue
    const finishes = new Date(begins.getTime() + duration * 60_000)
    const clash = input.busy.some((b) => begins < new Date(b.endsAt.getTime() + input.bufferMinutes * 60_000) && b.startsAt < new Date(finishes.getTime() + input.bufferMinutes * 60_000))
    if (!clash) out.push(begins.toISOString())
  }
  return out
}

export { businessDateKey, businessMinute }
