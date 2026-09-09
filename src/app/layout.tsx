import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/providers/app-providers'
import { ToastProvider } from '@/providers/toast-provider'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'

const plex = IBM_Plex_Sans({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Cashly — Personal Finance',
  description: 'Simple income and expense tracking.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/cashly-favicon.svg',
    shortcut: '/cashly-favicon.svg',
    apple: '/cashly-favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cashly',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
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
