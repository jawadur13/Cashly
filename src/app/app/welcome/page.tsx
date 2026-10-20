'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountIcon } from '@/components/ui/category-icon'
import { CURRENCIES, type CurrencyCode } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/hooks/use-accounts'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useToast } from '@/providers/toast-provider'
import type { AccountType } from '@/lib/types'

const PLACES: { name: string; type: AccountType }[] = [
  { name: 'Cash', type: 'cash' },
  { name: 'Bank', type: 'bank' },
  { name: 'bKash', type: 'mobile-wallet' },
  { name: 'Nagad', type: 'mobile-wallet' },
  { name: 'Rocket', type: 'mobile-wallet' },
]

/**
 * First run: the user's main currency and where they keep money. Accounts are
 * created in that currency — an account's currency can never change, so it is
 * asked for before anything is created.
 */
export default function WelcomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency, setDefaultCurrency } = useSettings()
  const { accounts, add } = useAccounts()
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [currency, setCurrency] = useState<string>(defaultCurrency)
  const [picked, setPicked] = useState<Set<string>>(new Set(['Cash']))
  const [busy, setBusy] = useState(false)

  const firstName = user?.name?.trim().split(/\s+/)[0]
  const existing = new Set(accounts.map((a) => a.name.toLowerCase()))
  const toCreate = [...picked].filter((n) => !existing.has(n.toLowerCase())).length

  function toggle(name: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function finish() {
    setBusy(true)
    try {
      if (currency !== defaultCurrency) await setDefaultCurrency(currency as CurrencyCode)
      for (const place of PLACES) {
        if (!picked.has(place.name) || existing.has(place.name.toLowerCase())) continue
        await add({ name: place.name, type: place.type, currency })
      }
      toast("You're all set. Tap + to record your first transaction.", 'success')
      router.replace('/app')
    } catch {
      toast("Couldn't finish setting up. Please try again.", 'error')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <div>
        <p className="text-sm font-semibold text-gold">Step {step} of 2</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
          {step === 1 ? `Welcome${firstName ? `, ${firstName}` : ''}` : 'Where do you keep money?'}
        </h1>
        <p className="mt-2 text-text-secondary">
          {step === 1
            ? 'Which currency do you use most? Totals are shown in it.'
            : `Pick what you use — we'll create them in ${currency}. You can add more any time.`}
        </p>
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Main currency">
          {CURRENCIES.map((c) => {
            const selected = currency === c.code
            return (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCurrency(c.code)}
                className={cn(
                  'pressable flex min-h-[4.5rem] flex-col items-center justify-center rounded-[var(--radius-lg)] px-2',
                  selected ? 'bg-primary text-on-primary shadow-[var(--shadow-md)]' : 'bg-surface text-text-primary ring-1 ring-inset ring-border hover:bg-surface-hover'
                )}
              >
                <span className="text-lg font-semibold tracking-wide">{c.code}</span>
                <span className={cn('max-w-full truncate text-xs font-medium', selected ? 'opacity-80' : 'text-text-secondary')}>{c.name}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2" role="group" aria-label="Accounts to create">
          {PLACES.map((place) => {
            const already = existing.has(place.name.toLowerCase())
            const selected = picked.has(place.name) || already
            return (
              <button
                key={place.name}
                type="button"
                aria-pressed={selected}
                disabled={already}
                onClick={() => toggle(place.name)}
                className={cn(
                  'pressable flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 text-left',
                  selected ? 'bg-surface ring-2 ring-primary' : 'bg-surface ring-1 ring-border hover:bg-surface-hover',
                  already && 'opacity-60'
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-text-secondary">
                  <AccountIcon name={place.type} className="size-5" />
                </span>
                <span className="flex-1 font-medium text-text-primary">
                  {place.name}
                  {already && <span className="ml-2 text-sm font-normal text-text-tertiary">already added</span>}
                </span>
                <span className={cn('flex size-6 items-center justify-center rounded-full', selected ? 'bg-primary text-on-primary' : 'ring-1 ring-border-strong')}>
                  {selected && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {step === 1 ? (
          <Button fullWidth size="lg" onClick={() => setStep(2)}>Continue</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Back</Button>
            <Button fullWidth size="lg" loading={busy} onClick={finish}>
              {toCreate > 0 ? `Create ${toCreate} account${toCreate === 1 ? '' : 's'}` : 'Finish'}
            </Button>
          </div>
        )}
        <Link href="/app" className="flex min-h-11 items-center justify-center text-sm font-medium text-text-secondary hover:text-text-primary">
          I&apos;ll set this up later
        </Link>
      </div>
    </div>
  )
}
