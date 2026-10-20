'use client'

import { LogoMark } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  text?: string
}

/** Full-screen app start only; inside the app, screens use skeletons. */
export function Loader({ className, text }: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-5', className)} aria-busy="true" role="status">
      <LogoMark className="size-14 animate-[pulse-scale_1.6s_ease-in-out_infinite] rounded-[16px] shadow-[var(--shadow-lg)]" />
      <span className="text-sm font-medium text-text-secondary">{text ?? 'Loading…'}</span>
    </div>
  )
}
