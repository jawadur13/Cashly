'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/components/transactions/quick-add'
import { PRIMARY_NAV, isActive, type NavItem } from './nav-config'

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-xs font-medium transition-colors duration-[var(--dur-fast)]',
        active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0 h-[3px] w-6 rounded-b-full bg-gold transition-opacity duration-[var(--dur-base)]',
          active ? 'opacity-100' : 'opacity-0'
        )}
      />
      <Icon className="size-[1.375rem]" strokeWidth={active ? 2.2 : 1.75} aria-hidden />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  )
}

/** Four labelled tabs with the add action in the middle. Mobile only. */
export function BottomNav() {
  const pathname = usePathname()
  const { open } = useQuickAdd()
  const [first, second, third, fourth] = PRIMARY_NAV

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2">
        <Tab item={first} active={isActive(pathname, first.href)} />
        <Tab item={second} active={isActive(pathname, second.href)} />
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => open()}
            aria-label="Add transaction"
            className="pressable -mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-lg)] ring-4 ring-bg gold-hairline"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
        </div>
        <Tab item={third} active={isActive(pathname, third.href)} />
        <Tab item={fourth} active={isActive(pathname, fourth.href)} />
      </div>
    </nav>
  )
}
