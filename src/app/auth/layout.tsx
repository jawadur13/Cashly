 'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app')
  }, [router, status])

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-text-tertiary">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-10 shrink-0" />
        <span className="text-2xl font-bold text-text-primary">Cashly</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
