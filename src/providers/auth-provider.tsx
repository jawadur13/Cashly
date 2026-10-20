'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { createAccount } from '@/lib/supabase/data'
import { DEFAULT_CURRENCY } from '@/lib/currency/currencies'
import { DEFAULT_ACCOUNTS } from '@/lib/constants'

interface User {
  $id: string
  name: string
  email: string
  prefs: Record<string, unknown>
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Supabase's messages, in words a user can act on. Unknown ones pass through. */
const FRIENDLY_AUTH_ERRORS: [RegExp, string][] = [
  [/failed to fetch|networkerror|cors|load failed/i, "Can't reach Cashly right now. Check your connection and try again."],
  [/invalid login credentials/i, 'That email and password don’t match. Check them and try again.'],
  [/user already registered|already been registered/i, 'An account with this email already exists. Try logging in instead.'],
  [/email.*invalid|invalid.*email/i, 'That email address doesn’t look right.'],
  [/rate limit|too many requests/i, 'Too many attempts. Wait a minute and try again.'],
  [/password should be at least/i, 'Use a password with at least 8 characters.'],
]

function normalizeAuthError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    const message = error.message.trim()
    const friendly = FRIENDLY_AUTH_ERRORS.find(([pattern]) => pattern.test(message))
    if (friendly) {
      if (/fetch|network|cors|load failed/i.test(message)) console.error('Auth request failed:', message)
      return new Error(friendly[1])
    }
    return error
  }

  return new Error(fallbackMessage)
}

/** The app's user: Supabase's login plus the name and preferences kept in `profiles`. */
async function loadUser(authUser: SupabaseUser): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, default_currency')
    .eq('id', authUser.id)
    .single()
  if (error) throw new Error(error.message)
  return {
    $id: authUser.id,
    name: data.name,
    email: authUser.email ?? '',
    prefs: { defaultCurrency: data.default_currency },
  }
}

async function seedNewUser(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ default_currency: DEFAULT_CURRENCY }).eq('id', userId)
  if (error) throw new Error(error.message)
  for (const acc of DEFAULT_ACCOUNTS) {
    await createAccount({
      userId,
      name: acc.name,
      type: acc.type,
      currency: DEFAULT_CURRENCY,
      isDefault: true,
    })
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) throw error ?? new Error('Not signed in')
      setUser(await loadUser(data.user))
      setStatus('authenticated')
    } catch {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    // A session can also end on its own (expired refresh token, sign-out in
    // another tab). Sign-ins are handled by the callers, which refresh.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setStatus('anonymous')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await refresh()
    } catch (error) {
      throw normalizeAuthError(error, 'Log in failed.')
    }
  }, [refresh])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
      if (error) throw error
      // No session means the project asks new users to confirm their email
      // first, which Cashly is not set up for.
      if (!data.session || !data.user) {
        throw new Error('Your account was created. Check your email to confirm it, then log in.')
      }
      await seedNewUser(data.user.id)
      await refresh()
    } catch (error) {
      throw normalizeAuthError(error, 'Registration failed.')
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
    } catch (error) {
      throw normalizeAuthError(error, 'Could not send reset email.')
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut, resetPassword, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
