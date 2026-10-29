'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Lightbulb, X } from 'lucide-react'

const DISMISSED_KEY = 'cashly-getting-started-dismissed'

const TIPS = [
  'Tap + to record anything — the amount comes first, and your last account is remembered.',
  'Tap any transaction to edit or delete it. Deleted by mistake? Tap Undo.',
  'Moving money between your own accounts? Use Transfer, so it isn’t counted as spending.',
]

/** A dismissible card for new users. Hidden for good once dismissed, or once they're up and running. */
export function GettingStarted({ transactionCount }: { transactionCount: number }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(window.localStorage.getItem(DISMISSED_KEY) === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed || transactionCount >= 5) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // shown again next visit
    }
  }

  return (
    <section aria-label="Getting started" className="relative rounded-[var(--radius-lg)] bg-gold-soft p-5 ring-1 ring-gold/25">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tips"
        className="pressable absolute right-1.5 top-1.5 flex size-11 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-2 pr-10">
        <Lightbulb className="size-5 text-gold" aria-hidden />
        <h2 className="font-semibold text-text-primary">Getting started</h2>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-text-secondary">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
            {tip}
          </li>
        ))}
      </ul>
      <Link href="/help#getting-started" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
        Read the guide <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}
