'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-text-secondary">Log in to see where your money stands.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPasswordToggle
        />
        {error && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">{error}</p>
        )}
        <Button type="submit" fullWidth loading={loading}>Log in</Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-1 text-sm">
        <Link href="/auth/forgot-password" className="inline-flex min-h-11 items-center px-2 font-medium text-accent hover:underline">
          Forgot password?
        </Link>
        <p className="text-text-secondary">
          New to Cashly?{' '}
          <Link href="/auth/register" className="inline-flex min-h-11 items-center px-1 font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
