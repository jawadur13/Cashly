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
  // Pages that navigate themselves once signed in: a reset link signs the user
  // in so they can set a new password, and a new sign-up goes to onboarding.
  const handlesOwnRedirect = pathname === '/auth/reset-password' || pathname === '/auth/register'

  useEffect(() => {
    if (status === 'authenticated' && !handlesOwnRedirect) router.replace('/app')
  }, [router, status, handlesOwnRedirect])

  return (
    <AuthBackdrop>
      <Link href="/" className="mx-auto mb-8 flex min-h-11 w-fit items-center justify-center text-white" aria-label="Cashly home">
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
