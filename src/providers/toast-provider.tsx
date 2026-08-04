'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ToastStack, type ToastItem, type ToastKind } from '@/components/ui/toast'

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
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

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter.current
    setToasts((prev) => {
      const next = [...prev.slice(-2), { id, kind, message }]
      for (const removed of prev.slice(0, prev.length - 2)) {
        const tid = timers.current.get(removed.id)
        if (tid != null) {
          window.clearTimeout(tid)
          timers.current.delete(removed.id)
        }
      }
      return next
    })
    const timerId = window.setTimeout(() => dismiss(id), 3000)
    timers.current.set(id, timerId)
  }, [dismiss])

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
