'use client'

import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'error'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-sm font-medium text-text-primary shadow-[var(--shadow-md)]',
            'animate-[toast-in_.2s_ease-out]'
          )}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 text-income" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-expense" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="text-text-tertiary hover:text-text-primary">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
