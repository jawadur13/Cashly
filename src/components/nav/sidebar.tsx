'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Home, ArrowLeftRight, FolderKanban, Settings, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/theme-provider'

export const sidebarItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center px-3 py-5', collapsed ? 'justify-center' : 'justify-between gap-2.5 px-5')}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-9 shrink-0" />
          {!collapsed && <span className="text-lg font-bold text-text-primary">Cashly</span>}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden size-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary md:inline-flex"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
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
      <div className={cn('px-5 py-4 text-xs text-text-tertiary', collapsed && 'px-2 text-center')}>
        {collapsed ? '' : resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}
      </div>
    </aside>
  )
}
