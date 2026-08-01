'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function FAB() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/app/transactions/new')}
      aria-label="Add transaction"
      className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-md)] transition-transform active:scale-95 md:bottom-8 md:right-8 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </button>
  )
}
