'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar } from '@/components/nav/sidebar'
import { MeSheet } from '@/components/nav/me-sheet'
import { detailRoute, initials } from '@/components/nav/nav-config'
import { QuickAddProvider } from '@/components/transactions/quick-add'
import { Logo } from '@/components/brand/logo'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { BalanceVisibilityProvider } from '@/providers/balance-visibility-provider'

const COLLAPSE_KEY = 'cashly-sidebar-collapsed'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [meOpen, setMeOpen] = useState(false)
  const detail = detailRoute(pathname)

  useEffect(() => {
    if (status === 'anonymous') router.replace('/auth/login')
  }, [status, router])

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === 'true')
    } catch {
      // keep the default
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeOpen(false)
  }, [pathname])

  function toggleCollapsed() {
    setSidebarCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(!value))
      } catch {
        // session only
      }
      return !value
    })
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader text="Loading Cashly" />
      </div>
    )
  }

  return (
    <BalanceVisibilityProvider>
      <QuickAddProvider>
        <div className="min-h-dvh bg-bg">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[var(--radius-md)] focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-on-primary"
          >
            Skip to content
          </a>
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleCollapsed} />

          <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
            <div className="flex h-14 items-center justify-between gap-2 px-2">
              {detail ? (
                <button
                  type="button"
                  onClick={() => (window.history.length > 1 ? router.back() : router.push(detail.parent))}
                  className="pressable flex min-h-11 min-w-0 items-center gap-1 rounded-[var(--radius-md)] pl-1 pr-3 text-[0.9375rem] font-semibold text-text-primary hover:bg-surface-hover"
                >
                  <ChevronLeft className="size-6 shrink-0" aria-hidden />
                  <span className="truncate">{detail.title}</span>
                  <span className="sr-only">, go back</span>
                </button>
              ) : (
                <Link href="/app" aria-label="Cashly home" className="flex min-h-11 items-center px-2 text-text-primary">
                  <Logo markClassName="size-7" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMeOpen(true)}
                aria-label="Open your menu: accounts, categories, settings"
                className="pressable flex size-11 items-center justify-center rounded-full"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                  {initials(user?.name, user?.email)}
                </span>
              </button>
            </div>
          </header>

          <div
            className={cn(
              'pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] md:pb-16 md:pt-0',
              sidebarCollapsed ? 'md:pl-[4.5rem]' : 'md:pl-64'
            )}
          >
            <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-8 md:pt-10">
              {children}
            </main>
          </div>

          {/* Form screens have their own sticky save bar. */}
          {!detail?.title.match(/transaction/i) && (
            <div className="md:hidden">
              <BottomNav />
            </div>
          )}
          <MeSheet open={meOpen} onClose={() => setMeOpen(false)} />
        </div>
      </QuickAddProvider>
    </BalanceVisibilityProvider>
  )
}
