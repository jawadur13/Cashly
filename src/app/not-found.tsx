import Link from 'next/link'
import { Compass } from 'lucide-react'
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Page not found</h1>
      <p className="max-w-xs text-text-secondary">This page doesn&apos;t exist or has moved.</p>
      <Link href="/app" className={cn(BUTTON_BASE, BUTTON_VARIANTS.primary, BUTTON_SIZES.md, 'mt-2')}>
        Back to Cashly
      </Link>
    </div>
  )
}
