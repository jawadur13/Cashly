'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { useTransactionActions } from '@/hooks/use-transactions'
import { useToast } from '@/providers/toast-provider'
import { TransactionForm } from './transaction-form'
import { TYPE_LABELS } from './transaction-row'
import type { TransactionType } from '@/lib/types'

export interface QuickAddPreset {
  type?: TransactionType
  accountId?: string
  personId?: string
  /** Pre-filled amount in minor units, e.g. the exact balance for "Settle up". */
  amountMinor?: number
  note?: string
}

interface QuickAddContextValue {
  open: (preset?: QuickAddPreset) => void
}

const QuickAddContext = createContext<QuickAddContextValue | undefined>(undefined)

/**
 * The one "add transaction" entry point: every + in the app opens this sheet,
 * over whatever screen the user is on, so they never lose their place.
 */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; preset: QuickAddPreset; key: number }>({
    open: false,
    preset: {},
    key: 0,
  })
  const { remove } = useTransactionActions()
  const { toast } = useToast()

  const open = useCallback((preset: QuickAddPreset = {}) => {
    setState((s) => ({ open: true, preset, key: s.key + 1 }))
  }, [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}
      <Sheet open={state.open} onClose={close} title="New transaction">
        <TransactionForm
          key={state.key}
          preset={state.preset}
          variant="sheet"
          onCancel={close}
          onSaved={(saved, { addAnother }) => {
            if (!addAnother) close()
            toast(`${TYPE_LABELS[saved.type]} saved`, 'success', {
              action: {
                label: 'Undo',
                onClick: () => {
                  remove(saved).catch(() => toast("Couldn't undo. Delete it from Activity instead.", 'error'))
                },
              },
            })
          }}
        />
      </Sheet>
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider')
  return ctx
}
