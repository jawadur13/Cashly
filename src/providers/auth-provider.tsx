'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ID } from 'appwrite'
import { account } from '@/lib/appwrite/client'
import { createAccount } from '@/lib/appwrite/collections'
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

const APPWRITE_CONNECTION_HINT =
  'Cashly could not reach Appwrite from this domain. In Appwrite Cloud, add your Vercel domain under Platforms > Web and verify the endpoint, project id, and database id.'

function normalizeAuthError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    const message = error.message.trim()
    if (/failed to fetch|networkerror|cors|fetch/i.test(message)) {
      return new Error(`${fallbackMessage} ${APPWRITE_CONNECTION_HINT}`)
    }
    return error
  }

  return new Error(fallbackMessage)
}

async function seedNewUser(userId: string): Promise<void> {
  await account.updatePrefs({ defaultCurrency: DEFAULT_CURRENCY })
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
      const res = await account.get()
      setUser({ $id: res.$id, name: res.name, email: res.email, prefs: res.prefs })
      setStatus('authenticated')
    } catch {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password)
      await refresh()
    } catch (error) {
      throw normalizeAuthError(error, 'Log in failed.')
    }
  }, [refresh])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      await account.create(ID.unique(), email, password, name)
      await account.createEmailPasswordSession(email, password)
      const res = await account.get()
      await seedNewUser(res.$id)
      await refresh()
    } catch (error) {
      throw normalizeAuthError(error, 'Registration failed.')
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await account.deleteSession('current')
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await account.createRecovery(email, `${window.location.origin}/auth/reset-password`)
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
