'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email'
    if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signUp(name, email, password)
      router.replace('/app')
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Registration failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <h1 className="mb-1 text-xl font-bold text-text-primary">Create your account</h1>
      <p className="mb-5 text-sm text-text-secondary">Start tracking your money in minutes.</p>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          name="name"
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Input
          name="confirm"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        {errors.form && (
          <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-2.5 text-sm text-expense">{errors.form}</p>
        )}
        <Button type="submit" fullWidth loading={loading}>Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <span className="text-text-secondary">Already have an account? </span>
        <Link href="/auth/login" className="font-medium text-accent hover:underline">Log in</Link>
      </p>
    </div>
  )
}
