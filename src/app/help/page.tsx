import type { Metadata } from 'next'
import { HelpGuide } from '@/components/help/help-guide'

export const metadata: Metadata = {
  title: 'Help & guide',
  description: 'How to use Cashly: accounts, recording transactions, transfers and fees, give and get, share links, insights and privacy.',
}

export default function HelpPage() {
  return <HelpGuide />
}
