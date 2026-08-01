'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <h1 className="mb-1 text-xl font-bold text-text-primary">Reset your password</h1>
      <p className="mb-5 text-sm text-text-secondary">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 className="size-10 text-income" />
          <p className="text-sm text-text-secondary">
            If an account exists for <span className="font-medium text-text-primary">{email}</span>, a reset link
            is on its way.
          </p>
          <Button variant="secondary" onClick={() => setSent(false)}>Send again</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-2.5 text-sm text-expense">{error}</p>
          )}
          <Button type="submit" fullWidth loading={loading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <span className="text-text-secondary">Remembered it? </span>
        <Link href="/auth/login" className="font-medium text-accent hover:underline">Log in</Link>
      </p>
    </div>
  )
}
