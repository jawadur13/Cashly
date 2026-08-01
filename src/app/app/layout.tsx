'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar } from '@/components/nav/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'anonymous') router.replace('/auth/login')
  }, [status, router])

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-text-tertiary">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="pb-28 md:pl-60 md:pb-12">
        <main className="mx-auto w-full max-w-2xl px-4 pt-6">
          <div key={pathname}>{children}</div>
        </main>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
