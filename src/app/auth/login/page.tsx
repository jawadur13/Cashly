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
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <h1 className="mb-1 text-xl font-bold text-text-primary">Welcome back</h1>
      <p className="mb-5 text-sm text-text-secondary">Log in to your Cashly account.</p>
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
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-2.5 text-sm text-expense">{error}</p>
        )}
        <Button type="submit" fullWidth loading={loading}>Log in</Button>
      </form>
      <div className="mt-4 space-y-1.5 text-center text-sm">
        <div>
          <span className="text-text-secondary">Don&apos;t have an account? </span>
          <Link href="/auth/register" className="font-medium text-accent hover:underline">Register</Link>
        </div>
        <Link href="/auth/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
      </div>
    </div>
  )
}
