'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'

type LinkState = 'checking' | 'valid' | 'invalid'

function ResetPasswordForm() {
  const router = useRouter()
  // The emailed link signs the user in with a short-lived recovery session,
  // which the Supabase client picks up from the URL on load.
  const [link, setLink] = useState<LinkState>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let settled = false
    const settle = (state: LinkState) => {
      if (settled) return
      settled = true
      setLink(state)
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) settle('valid')
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle('valid')
      else if (window.location.hash.includes('error')) settle('invalid')
    })
    // The URL is processed asynchronously; give it a moment before giving up.
    const timer = setTimeout(() => settle('invalid'), 4000)
    return () => {
      data.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Log in fresh with the new password, as before the move to Supabase.
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (link === 'checking' && !done) {
    return <p className="text-sm text-text-tertiary">Checking your reset link…</p>
  }

  if (link === 'invalid' && !done) {
    return (
      <p className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">
        Invalid or expired reset link. Request a new one from the forgot password page.
      </p>
    )
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Your password has been updated. You can now log in.</p>
        <Button fullWidth onClick={() => router.replace('/auth/login')}>Go to login</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        name="confirm"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <p className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">{error}</p>
      )}
      <Button type="submit" fullWidth loading={loading}>Update password</Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] md:p-8">
      <h1 className="mb-1 text-xl font-bold text-text-primary">Set a new password</h1>
      <p className="mb-5 text-sm text-text-secondary">Choose a strong password for your account.</p>
      <Suspense fallback={<p className="text-sm text-text-tertiary">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

