'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Landmark, PieChart, ShieldCheck, Users, Wallet } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { Amount } from '@/components/ui/amount'
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const FEATURES = [
  {
    icon: Landmark,
    title: 'Every account in one place',
    body: 'Cash, bank, bKash and Nagad side by side, with one total that is always up to date.',
  },
  {
    icon: PieChart,
    title: 'See where it all goes',
    body: 'Monthly insights show your spending by category and how much you actually kept.',
  },
  {
    icon: Users,
    title: 'Settle up without the awkwardness',
    body: 'Track money you lend and borrow, and share a live summary with a friend.',
  },
]

/** A static illustration built from the app's own components. Example figures only. */
function ProductPreview() {
  const rows = [
    { icon: Wallet, title: 'Shwapno', sub: 'Food · Cash', value: -320000 },
    { icon: ArrowLeftRight, title: 'City Bank → bKash', sub: 'Transfer', value: 1000000, transfer: true },
    { icon: Landmark, title: 'Salary', sub: 'Income · City Bank', value: 8500000 },
  ]
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[40px] bg-[var(--gold-300)]/10 blur-2xl" />
      <div className="relative rounded-[32px] bg-bg p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/15" data-theme="light">
        <div className="rounded-[24px] bg-bg p-4">
          <div className="hero-panel gold-hairline rounded-[20px] p-4">
            <p className="text-xs text-white/70">Total balance · example</p>
            <Amount value={43716634} currency="BDT" className="mt-0.5 text-[1.75rem] font-semibold text-white" currencyClassName="text-[0.5em] opacity-70" />
            <div className="mt-3 flex justify-between border-t border-white/10 pt-2.5 text-xs text-white/70">
              <span>In <Amount value={13690311} currency="BDT" className="font-semibold text-white" /></span>
              <span className="font-semibold text-[var(--gold-300)]">76% saved</span>
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-[18px] bg-surface ring-1 ring-border">
            {rows.map((r, i) => (
              <div key={r.title} className={cn('flex items-center gap-3 px-3.5 py-3', i > 0 && 'border-t border-border')}>
                <span className={cn('flex size-9 items-center justify-center rounded-xl', r.transfer ? 'bg-exchange-soft text-exchange' : r.value < 0 ? 'bg-expense-soft text-expense' : 'bg-income-soft text-income')}>
                  <r.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{r.title}</span>
                  <span className="block text-xs text-text-tertiary">{r.sub}</span>
                </span>
                <Amount
                  value={r.value}
                  currency="BDT"
                  showPlus={!r.transfer}
                  className={cn('text-sm font-semibold', r.transfer ? 'text-exchange' : r.value < 0 ? 'text-text-primary' : 'text-income')}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app')
  }, [status, router])

  if (status !== 'anonymous') {
    return (
      <div className="hero-panel flex min-h-dvh items-center justify-center">
        <LogoMark className="size-14 animate-[pulse-scale_1.6s_ease-in-out_infinite]" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      <section className="hero-panel relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)',
          }}
        />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] md:px-8">
          <Logo className="text-white" markClassName="size-9" />
          <nav className="flex items-center gap-2">
            <Link href="/auth/login" className="flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-semibold text-white/85 hover:text-white">
              Log in
            </Link>
            <Link href="/auth/register" className={cn(BUTTON_BASE, BUTTON_VARIANTS.gold, BUTTON_SIZES.sm)}>
              Get started
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 md:grid-cols-2 md:px-8 md:pb-28 md:pt-20">
          <div className="text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--gold-300)]">Personal finance, made calm</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.08] tracking-tight md:text-[3.5rem]">
              Your money,
              <br />
              beautifully clear.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/75">
              Cashly brings your cash, bank and mobile wallets together, shows where every taka goes, and keeps track of
              who owes whom.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/register" className={cn(BUTTON_BASE, BUTTON_VARIANTS.gold, BUTTON_SIZES.lg)}>
                Create your free account
              </Link>
              <Link href="/auth/login" className={cn(BUTTON_BASE, BUTTON_SIZES.lg, 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15')}>
                I have an account
              </Link>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
          Everything you need to stay on top of your money — nothing you don&apos;t.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-sm)] ring-1 ring-border">
              <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-gold-soft text-gold">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 leading-relaxed text-text-secondary">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 rounded-[var(--radius-xl)] bg-surface-sunken p-6 md:flex-row md:items-center">
          <ShieldCheck className="size-8 shrink-0 text-income" aria-hidden />
          <p className="text-text-secondary">
            <span className="font-semibold text-text-primary">Private by design.</span> Only you can see your accounts
            and transactions. A summary is shared with someone only when you create a link — and you can stop it any
            time.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-text-tertiary md:flex-row md:px-8">
          <Logo className="text-text-primary" markClassName="size-7" />
          <nav className="flex items-center gap-1" aria-label="Footer">
            <Link href="/help" className="flex min-h-11 items-center px-3 font-medium text-text-secondary hover:text-text-primary">Help & guide</Link>
            <Link href="/auth/login" className="flex min-h-11 items-center px-3 font-medium text-text-secondary hover:text-text-primary">Log in</Link>
          </nav>
          <p>© {new Date().getFullYear()} Cashly</p>
        </div>
      </footer>
    </div>
  )
}
