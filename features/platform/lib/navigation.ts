import { CalendarDays, Settings, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PlatformNavItem { title: string; href: string; icon: LucideIcon }

/** Hrefs are relative to the dashboard base path. */
export const platformNavItems: PlatformNavItem[] = [
  { title: 'Today', href: '/platform/today', icon: CalendarDays },
  { title: 'Earnings', href: '/platform/earnings', icon: Wallet },
  { title: 'Settings', href: '/platform/setup', icon: Settings },
]
