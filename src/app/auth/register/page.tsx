'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'

export default function RegisterPage() {
  const { signUp, status } = useAuth()
  const router = useRouter()
  // Set while this page is creating the account, so the redirect below
  // doesn't race the one to onboarding.
  const signingUp = useRef(false)

  useEffect(() => {
    if (status === 'authenticated' && !signingUp.current) router.replace('/app')
  }, [status, router])
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
    signingUp.current = true
    try {
      await signUp(name, email, password)
      router.replace('/app/welcome')
    } catch (err) {
      signingUp.current = false
      setErrors({ form: err instanceof Error ? err.message : 'Registration failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-text-secondary">Free, private, and set up in under a minute.</p>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          name="name"
          label="Name"
          autoComplete="name"
          autoFocus
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
          showPasswordToggle
        />
        <Input
          name="confirm"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          showPasswordToggle
        />
        {errors.form && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">{errors.form}</p>
        )}
        <Button type="submit" fullWidth loading={loading}>Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="inline-flex min-h-11 items-center px-1 font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

