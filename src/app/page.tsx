'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'

export default function Home() {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app')
    else if (status === 'anonymous') router.replace('/auth/login')
  }, [status, router])

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-text-tertiary">
      Redirecting…
    </div>
  )
}
