'use client'

import { Button } from './button'

interface LoadMoreButtonProps {
  visible: boolean
  loading: boolean
  onClick: () => void
  label?: string
}

export function LoadMoreButton({ visible, loading, onClick, label = 'Load more' }: LoadMoreButtonProps) {
  if (!visible) return null
  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={onClick} disabled={loading} loading={loading}>
        {label}
      </Button>
    </div>
  )
}
