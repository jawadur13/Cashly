'use client'

import { CATEGORY_ICONS, ACCOUNT_ICONS } from '@/lib/icons'
import { MoreHorizontal, Wallet } from 'lucide-react'

export function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name ?? ''] ?? MoreHorizontal
  return <Icon className={className} />
}

export function AccountIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = ACCOUNT_ICONS[name ?? ''] ?? Wallet
  return <Icon className={className} />
}
