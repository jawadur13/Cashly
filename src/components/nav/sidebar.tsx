'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronsLeft, ChevronsRight, LogOut, Plus } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { useQuickAdd } from '@/components/transactions/quick-add'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { MANAGE_NAV, PRIMARY_NAV, initials, isActive, type NavItem } from './nav-config'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex min-h-11 items-center rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--dur-fast)]',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        active
          ? 'bg-primary-soft font-semibold text-text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-gold" />}
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.75} aria-hidden />
      {!collapsed && item.label}
    </Link>
  )
}

/** Desktop navigation: Overview and Manage groups, the add action, the user. */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { open } = useQuickAdd()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-[var(--dur-base)] md:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64'
      )}
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')}>
        <Link href="/app" aria-label="Cashly home" className="text-text-primary">
          {collapsed ? <LogoMark className="size-8" /> : <Logo />}
        </Link>
      </div>

      <div className={cn('pb-3 pt-1', collapsed ? 'px-3' : 'px-4')}>
        <button
          type="button"
          onClick={() => open()}
          title={collapsed ? 'New transaction' : undefined}
          aria-label={collapsed ? 'New transaction' : undefined}
          className={cn(
            'pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-on-primary shadow-[var(--shadow-sm)] gold-hairline hover:opacity-92',
            collapsed && 'px-0'
          )}
        >
          <Plus className="size-4" strokeWidth={2.4} aria-hidden />
          {!collapsed && 'New transaction'}
        </button>
      </div>

      <nav aria-label="Main" className={cn('flex-1 space-y-6 overflow-y-auto py-2', collapsed ? 'px-3' : 'px-4')}>
        <div className="space-y-1">
          {!collapsed && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">Overview</p>}
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
          ))}
        </div>
        <div className="space-y-1">
          {!collapsed && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">Manage</p>}
          {MANAGE_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className={cn('border-t border-border p-3', collapsed && 'flex flex-col items-center gap-2')}>
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-3')}>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
            title={collapsed ? user?.name : undefined}
          >
            {initials(user?.name, user?.email)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{user?.name || 'You'}</p>
              <p className="truncate text-xs text-text-tertiary">{user?.email}</p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut()
              router.replace('/auth/login')
            }}
            aria-label="Sign out"
            title="Sign out"
            className="pressable flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-text-secondary hover:bg-surface-hover hover:text-expense"
          >
            <LogOut className="size-[1.125rem]" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'pressable mt-2 flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-medium text-text-tertiary hover:bg-surface-hover hover:text-text-primary',
            collapsed ? 'size-11' : 'w-full'
          )}
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <><ChevronsLeft className="size-4" aria-hidden /> Collapse</>}
        </button>
      </div>
    </aside>
  )
}
