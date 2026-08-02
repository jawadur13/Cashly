'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, FolderKanban, Settings, Landmark, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/summary', label: 'Summary', icon: PieChart },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/accounts', label: 'Accounts', icon: Landmark },
  { href: '/app/categories', label: 'Categories', icon: FolderKanban },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-2xl items-stretch">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[0.625rem] font-medium transition-colors',
                active ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
