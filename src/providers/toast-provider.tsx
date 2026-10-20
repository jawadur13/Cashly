'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ToastStack, type ToastAction, type ToastItem, type ToastKind } from '@/components/ui/toast'

interface ToastOptions {
  /** A button on the toast, e.g. Undo. */
  action?: ToastAction
  /** Milliseconds. Defaults: 3.5s, 6s for errors and toasts with an action. */
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timerId = timers.current.get(id)
    if (timerId != null) {
      window.clearTimeout(timerId)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success', options: ToastOptions = {}) => {
      const id = ++counter.current
      setToasts((prev) => {
        const next = [...prev.slice(-2), { id, kind, message, action: options.action }]
        for (const removed of prev.slice(0, prev.length - 2)) {
          const tid = timers.current.get(removed.id)
          if (tid != null) {
            window.clearTimeout(tid)
            timers.current.delete(removed.id)
          }
        }
        return next
      })
      const duration = options.duration ?? (kind === 'error' || options.action ? 6000 : 3500)
      const timerId = window.setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timerId)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
