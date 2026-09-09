'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function FAB() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/app/transactions/new')}
      aria-label="Add transaction"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-cta text-on-cta shadow-[var(--shadow-lg)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] active:translate-y-0 active:scale-95 md:bottom-8 md:right-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </button>
  )
}
