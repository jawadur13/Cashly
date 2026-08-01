'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, FolderKanban, Settings, Landmark, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/theme-provider'

const items = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme } = useTheme()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-60 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-accent text-white">
          <Wallet className="size-5" />
        </span>
        <span className="text-lg font-bold text-text-primary">Cashly</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="px-5 py-4 text-xs text-text-tertiary">
        {resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}
      </div>
    </aside>
  )
}
