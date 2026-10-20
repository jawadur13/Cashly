 'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useAuth()
  // A password reset link signs the user in so they can set a new password;
  // sending them on to /app would skip the form.
  const isPasswordReset = pathname === '/auth/reset-password'

  useEffect(() => {
    if (status === 'authenticated' && !isPasswordReset) router.replace('/app')
  }, [router, status, isPasswordReset])

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-text-tertiary">
        Loading…
      </div>
    )
  }

  return (
    <div className="hero-panel flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-10 shrink-0" />
        <span className="text-2xl font-bold tracking-tight text-white">Cashly</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-6 text-xs text-white/50">Simple income and expense tracking</p>
    </div>
  )
}
