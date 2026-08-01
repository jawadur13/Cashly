import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/providers/app-providers'
import { ToastProvider } from '@/providers/toast-provider'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Cashly — Personal Finance',
  description: 'Simple income and expense tracking.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cashly',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E0E11',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-text-primary">
        <AppProviders>
          <ToastProvider>
            {children}
            <ServiceWorkerRegistration />
          </ToastProvider>
        </AppProviders>
      </body>
    </html>
  )
}
