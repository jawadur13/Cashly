'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/providers/auth-provider'

/** Navy backdrop with a faint grid; the same in light and dark. */
export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-panel relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  )
}

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

  return (
    <AuthBackdrop>
      <Link href="/" className="mb-8 flex justify-center text-white" aria-label="Cashly home">
        <Logo markClassName="size-10" className="[&>span:last-child]:text-2xl" />
      </Link>
      {status === 'loading' ? (
        <div className="h-80 animate-pulse rounded-[var(--radius-xl)] bg-white/10" aria-busy="true" />
      ) : (
        <div className="rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-[var(--shadow-lg)] md:p-8 animate-[dialog-in_var(--dur-slow)_var(--ease-out)]">
          {children}
        </div>
      )}
      <p className="mt-6 text-center text-sm text-white/60">Your money, beautifully clear.</p>
    </AuthBackdrop>
  )
}
