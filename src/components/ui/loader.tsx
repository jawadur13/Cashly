'use client'

import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  text?: string
}

export function Loader({ className, text }: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)} aria-busy="true" role="status">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" style={{ animationDuration: '2s' }} />
        <div className="absolute -inset-1 animate-pulse rounded-full bg-accent/10" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="relative size-12 animate-[pulse-scale_1.5s_ease-in-out_infinite]" />
      </div>
      <span className="animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-text-tertiary via-text-primary to-text-tertiary bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent">
        {text ?? 'Loading...'}
      </span>
    </div>
  )
}
