import { ArrowLeftRight, FolderKanban, HelpCircle, Home, Landmark, PieChart, Settings, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/** Primary destinations: the mobile tab bar and the sidebar's Overview group. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/transactions', label: 'Activity', icon: ArrowLeftRight },
  { href: '/app/summary', label: 'Insights', icon: PieChart },
  { href: '/app/people', label: 'People', icon: Users },
]

/** Set-up screens: behind "Me" on mobile, the sidebar's Manage group on desktop. */
export const MANAGE_NAV: NavItem[] = [
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
  { href: '/app/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & guide', icon: HelpCircle },
]

/** Home matches only itself; every other item also owns its sub-routes. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app' || pathname === '/app/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Detail screens get a back button and a title in the mobile header. */
export function detailRoute(pathname: string): { title: string; parent: string } | null {
  if (pathname === '/app/transactions/new') return { title: 'New transaction', parent: '/app/transactions' }
  if (pathname.startsWith('/app/transactions/')) return { title: 'Edit transaction', parent: '/app/transactions' }
  if (pathname.startsWith('/app/people/')) return { title: 'Person', parent: '/app/people' }
  return null
}

export function initials(name: string | undefined, email: string | undefined): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}
