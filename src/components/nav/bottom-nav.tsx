'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, FolderKanban, Settings, Landmark, PieChart, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/summary', label: 'Summary', icon: PieChart },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
  { href: '/app/people', label: 'People', icon: Users },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch gap-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                'flex min-h-14 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 py-1.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                active ? 'bg-primary-soft text-primary' : 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary'
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 1.8} />
              {active && <span className="max-w-full truncate text-[0.625rem] font-semibold">{item.label}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
