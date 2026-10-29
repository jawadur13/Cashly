'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  Download,
  HelpCircle,
  PieChart,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { GUIDE, guideItemText, type GuideSection } from '@/lib/guide'
import { SUPPORT_EMAIL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const ICONS: Record<GuideSection['icon'], typeof Plus> = {
  sparkles: Sparkles,
  plus: Plus,
  transfer: ArrowLeftRight,
  people: Users,
  share: Share2,
  insights: PieChart,
  search: Search,
  install: Download,
  shield: ShieldCheck,
  help: HelpCircle,
}

/**
 * The public user guide. Works signed in or out: signed-in users get a way
 * back to the app, everyone else a way in. Deep links (/help#transfers or
 * /help#transfer-fees) scroll to and open the matching section or answer.
 */
export function HelpGuide() {
  const { status } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  // Open whatever the URL points at, on load and when the hash changes.
  useEffect(() => {
    function fromHash() {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const section = GUIDE.find((s) => s.id === id || s.items.some((i) => i.id === id))
      if (!section) return
      const ids = section.id === id ? section.items.map((i) => i.id) : [id]
      setOpen((prev) => new Set([...prev, ...ids]))
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const q = query.trim().toLowerCase()
  const sections = useMemo(
    () =>
      GUIDE.map((s) => ({
        ...s,
        items: q ? s.items.filter((i) => guideItemText(i).includes(q) || s.title.toLowerCase().includes(q)) : s.items,
      })).filter((s) => s.items.length > 0),
    [q]
  )
  const matches = sections.reduce((n, s) => n + s.items.length, 0)

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="hero-panel">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] md:px-8">
          <Link href="/" aria-label="Cashly home" className="flex min-h-11 items-center text-white">
            <Logo markClassName="size-8" />
          </Link>
          {status === 'authenticated' ? (
            <Link href="/app" className={cn(BUTTON_BASE, BUTTON_SIZES.sm, 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15')}>
              <ArrowLeft className="size-4" aria-hidden /> Back to Cashly
            </Link>
          ) : status === 'anonymous' ? (
            <Link href="/auth/login" className="flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-semibold text-white/85 hover:text-white">
              Log in
            </Link>
          ) : null}
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 text-white md:px-8 md:pb-14 md:pt-12">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">How can we help?</h1>
          <p className="mt-2 text-white/75">Short answers to everything Cashly does.</p>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-tertiary" aria-hidden />
            <input
              type="search"
              aria-label="Search the guide"
              placeholder="Search, e.g. transfer fee, settle up, export"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-13 min-h-12 w-full rounded-[var(--radius-full)] bg-surface pl-12 pr-12 text-base text-text-primary shadow-[var(--shadow-lg)] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--gold-300)] [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="pressable absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-[calc(3rem+env(safe-area-inset-bottom))] md:px-8 md:py-12">
        {!q && (
          <nav aria-label="Guide topics" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GUIDE.map((s) => {
              const Icon = ICONS[s.icon]
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="card-lift flex min-h-14 items-center gap-2.5 rounded-[var(--radius-lg)] bg-surface px-3 py-2.5 text-sm font-medium text-text-primary shadow-[var(--shadow-sm)] ring-1 ring-border"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gold-soft text-gold">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 leading-tight">{s.title}</span>
                </a>
              )
            })}
          </nav>
        )}

        {q && (
          <p className="text-sm text-text-secondary" aria-live="polite">
            {matches === 0 ? `No answers match “${query.trim()}”.` : `${matches} answer${matches === 1 ? '' : 's'} for “${query.trim()}”`}
          </p>
        )}

        {sections.map((s) => {
          const Icon = ICONS[s.icon]
          return (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-6">
              <div className="mb-3 flex items-center gap-3 px-1">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-gold-soft text-gold">
                  <Icon className="size-[1.125rem]" aria-hidden />
                </span>
                <div>
                  <h2 id={`${s.id}-title`} className="text-lg font-semibold tracking-tight text-text-primary">
                    {s.title}
                  </h2>
                  <p className="text-sm text-text-secondary">{s.summary}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)] ring-1 ring-border">
                {s.items.map((item, i) => {
                  const expanded = Boolean(q) || open.has(item.id)
                  return (
                    <div key={item.id} id={item.id} className={cn('scroll-mt-6', i > 0 && 'border-t border-border')}>
                      <h3>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`${item.id}-answer`}
                          onClick={() => toggle(item.id)}
                          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[0.9375rem] font-medium text-text-primary transition-colors hover:bg-surface-hover"
                        >
                          <span className="flex-1">{item.question}</span>
                          <ChevronDown
                            className={cn('size-4 shrink-0 text-text-tertiary transition-transform duration-[var(--dur-base)]', expanded && 'rotate-180')}
                            aria-hidden
                          />
                        </button>
                      </h3>
                      {expanded && (
                        <div id={`${item.id}-answer`} className="space-y-3 px-4 pb-4 text-[0.9375rem] leading-relaxed text-text-secondary">
                          {item.answer.map((p, j) => (
                            <p key={j}>{p}</p>
                          ))}
                          {item.steps && (
                            <ol className="list-decimal space-y-1 pl-5">
                              {item.steps.map((step, j) => (
                                <li key={j}>{step}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <div className="rounded-[var(--radius-xl)] bg-surface-sunken p-6 text-center">
          <p className="font-semibold text-text-primary">Still stuck?</p>
          <p className="mt-1 text-sm text-text-secondary">
            Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Cashly%20help`} className="inline-flex min-h-11 items-center font-medium text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            and we&apos;ll help.
          </p>
          <Link
            href={status === 'authenticated' ? '/app' : '/auth/register'}
            className={cn(BUTTON_BASE, BUTTON_VARIANTS.primary, BUTTON_SIZES.md, 'mt-3')}
          >
            {status === 'authenticated' ? 'Back to Cashly' : 'Create your free account'}
          </Link>
        </div>
      </main>
    </div>
  )
}
