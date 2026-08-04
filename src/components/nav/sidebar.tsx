'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Home, ArrowLeftRight, FolderKanban, Settings, Landmark, PieChart, LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'

export const sidebarItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/summary', label: 'Summary', icon: PieChart },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
  { href: '/app/people', label: 'People', icon: Users },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { signOut } = useAuth()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center px-3 py-5', collapsed ? 'justify-center' : 'gap-2.5 px-5')}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-9 shrink-0" />
          {!collapsed && <span className="text-lg font-bold text-text-primary">Cashly</span>}
        </div>
      </div>
      <nav className={cn('flex-1 space-y-1 px-3', collapsed && 'px-2')}>
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex w-full items-center rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3.5',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              )}
            >
              <Icon className="size-5" />
              {!collapsed && item.label}
            </button>
          )
        })}
      </nav>
      <div className={cn('border-t border-border px-3 py-2', collapsed && 'px-2')}>
        <button
          onClick={() => { signOut(); router.replace('/auth/login') }}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center rounded-[var(--radius-md)] py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-expense',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
          )}
        >
          <LogOut className="size-5" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
      <div className={cn('border-t border-border px-3 py-3', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <span className="text-xs text-text-tertiary">{resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}</span>}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="inline-flex size-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
