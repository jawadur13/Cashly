'use client'

import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
}

/**
 * Always mounted, so screen readers have a live region to listen to before the
 * first toast arrives. Errors are announced assertively.
 */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--navy-900)] py-2.5 pl-4 pr-1.5 text-sm font-medium text-white shadow-[var(--shadow-lg)]',
            'animate-[toast-in_var(--dur-base)_var(--ease-out)]',
            '[[data-theme=dark]_&]:bg-surface-raised [[data-theme=dark]_&]:text-text-primary [[data-theme=dark]_&]:ring-1 [[data-theme=dark]_&]:ring-border-strong'
          )}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 text-[var(--green-400)]" aria-hidden />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-[var(--red-400)]" aria-hidden />
          )}
          <span className="min-w-0 flex-1 py-1">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                onDismiss(toast.id)
              }}
              className="pressable min-h-11 shrink-0 rounded-[var(--radius-md)] px-3 font-semibold text-[var(--gold-300)] hover:bg-white/10"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="pressable flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white/60 hover:bg-white/10 hover:text-white [[data-theme=dark]_&]:text-text-tertiary"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
