'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * One card holding a group of rows separated by hairlines inset past the icon.
 * Replaces a separate boxed card per row, the main source of visual clutter.
 */
export function ListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)] ring-1 ring-border',
        '[&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:left-[4.25rem] [&>*+*]:before:h-px [&>*+*]:before:bg-border',
        className
      )}
    >
      {children}
    </div>
  )
}

interface ListRowProps {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** A third, quieter line. */
  meta?: React.ReactNode
  trailing?: React.ReactNode
  /** Under the trailing value, e.g. a converted amount. */
  trailingSub?: React.ReactNode
  href?: string
  onClick?: () => void
  /** Shows a chevron; defaults to true when the row navigates. */
  chevron?: boolean
  className?: string
  'aria-label'?: string
}

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  trailingSub,
  href,
  onClick,
  chevron,
  className,
  ...rest
}: ListRowProps) {
  const interactive = Boolean(href || onClick)
  const showChevron = chevron ?? Boolean(href)
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-text-primary">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-sm text-text-secondary">{subtitle}</span>}
        {meta && <span className="mt-0.5 block truncate text-xs text-text-tertiary">{meta}</span>}
      </span>
      {(trailing || trailingSub) && (
        <span className="flex shrink-0 flex-col items-end text-right">
          {trailing && <span className="text-[0.9375rem] font-semibold">{trailing}</span>}
          {trailingSub && <span className="mt-0.5 text-xs text-text-tertiary">{trailingSub}</span>}
        </span>
      )}
      {showChevron && <ChevronRight className="size-4 shrink-0 text-text-tertiary" aria-hidden />}
    </>
  )
  const classes = cn(
    'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left',
    interactive && 'cursor-pointer transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover active:bg-surface-sunken',
    className
  )
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={rest['aria-label']}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-label={rest['aria-label']}>
        {body}
      </button>
    )
  }
  return <div className={classes}>{body}</div>
}

/** Tinted rounded-square icon tile used at the start of rows. */
export function IconTile({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'income' | 'expense' | 'transfer' | 'gold' | 'navy'
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-text-secondary',
    income: 'bg-income-soft text-income',
    expense: 'bg-expense-soft text-expense',
    transfer: 'bg-exchange-soft text-exchange',
    gold: 'bg-gold-soft text-gold',
    navy: 'bg-primary text-on-primary',
  }
  return (
    <span className={cn('flex size-10 items-center justify-center rounded-[var(--radius-md)] [&_svg]:size-5', tones[tone], className)}>
      {children}
    </span>
  )
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-2.5 flex min-h-8 items-end justify-between gap-3 px-1', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">{title}</h2>
      {action}
    </div>
  )
}
