'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar, sidebarItems } from '@/components/nav/sidebar'
import { Sheet } from '@/components/ui/sheet'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { BalanceVisibilityProvider } from '@/providers/balance-visibility-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'anonymous') router.replace('/auth/login')
  }, [status, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
  }, [pathname])

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader text="Loading Cashly" />
      </div>
    )
  }

  return (
    <BalanceVisibilityProvider>
      <div className="min-h-dvh bg-bg">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
        <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text-primary"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-8 shrink-0" />
            <span className="text-base font-bold text-text-primary">Cashly</span>
          </div>
          <div className="w-10" />
        </header>
        <div className={cn('pb-28 md:pb-12', sidebarCollapsed ? 'md:pl-16' : 'md:pl-60', 'pt-16 md:pt-6')}>
          <main className="mx-auto w-full max-w-2xl px-4 pt-6">
            <div key={pathname}>{children}</div>
          </main>
        </div>
        <div className="md:hidden">
          <BottomNav />
        </div>
        <Sheet open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="Cashly navigation">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    router.push(item.href)
                    setMobileMenuOpen(false)
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-3 text-left text-sm font-medium transition-colors',
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
          </div>
          <div className="mt-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => { signOut(); router.replace('/auth/login') }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-3 text-left text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-expense transition-colors"
            >
              <LogOut className="size-5" />
              Sign out
            </button>
          </div>
        </Sheet>
      </div>
    </BalanceVisibilityProvider>
  )
}
