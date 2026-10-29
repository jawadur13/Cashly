'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface HelpTipProps {
  /** What the tip explains, e.g. "Transfer fees". Also the button's accessible name. */
  title: string
  children: React.ReactNode
  /** Anchor in the user guide: /help#<guide>. */
  guide?: string
  /** Use on the navy hero panels. */
  onDark?: boolean
  className?: string
}

/**
 * A small ⓘ next to a concept that trips people up. Opens a short explanation
 * with a link to the full answer in the guide. The icon is small; the tap
 * target around it is 44px.
 */
export function HelpTip({ title, children, guide, onDark, className }: HelpTipProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`What is this? ${title}`}
        className={cn(
          'pressable -m-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full align-middle',
          onDark ? 'text-white/60 hover:text-white' : 'text-text-tertiary hover:text-text-primary',
          className
        )}
      >
        <Info className="size-4" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-3 text-[0.9375rem] leading-relaxed text-text-secondary">{children}</div>
        {guide && (
          <Link
            href={`/help#${guide}`}
            onClick={() => setOpen(false)}
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:underline"
          >
            Read more in the guide <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </Sheet>
    </>
  )
}
