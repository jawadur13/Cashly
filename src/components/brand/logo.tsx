import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Cashly mark: a gold "C" with a coin in its opening, on a navy tile.
 * Vector, so it is sharp at any size and has no white box around it.
 * The same geometry is used by app/icon.tsx and app/apple-icon.tsx.
 */
export const MARK = {
  navyFrom: '#0F172A',
  navyTo: '#1E3A8A',
  gold: '#D4B483',
  coin: '#F1F5F9',
  arc: 'M42.6 21.4A15 15 0 1 0 42.6 42.6',
}

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={MARK.navyFrom} />
          <stop offset="1" stopColor={MARK.navyTo} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path d={MARK.arc} fill="none" stroke={MARK.gold} strokeWidth="7" strokeLinecap="round" />
      <circle cx="44.5" cy="32" r="3.6" fill={MARK.coin} />
    </svg>
  )
}

/** Mark plus wordmark. The wordmark takes the surrounding text colour. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-8', markClassName)} />
      <span className="text-lg font-semibold tracking-tight">Cashly</span>
    </span>
  )
}
