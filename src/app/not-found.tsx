'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-hover text-text-tertiary">
        <Wallet className="size-7" />
      </span>
      <h1 className="text-xl font-bold text-text-primary">Page not found</h1>
      <p className="max-w-xs text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/app">
        <Button>Go home</Button>
      </Link>
    </div>
  )
}
