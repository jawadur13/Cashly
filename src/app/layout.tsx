import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/providers/app-providers'
import { ToastProvider } from '@/providers/toast-provider'
import { THEME_INIT_SCRIPT } from '@/providers/theme-provider'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'

const plex = IBM_Plex_Sans({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'Cashly — Personal Finance', template: '%s · Cashly' },
  description: 'Your money, beautifully clear. Track accounts, spending and what people owe you.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cashly',
  },
}

export const viewport: Viewport = {
  themeColor: '#f7f8fa',
  // Lets the layout reach the screen edges on notched phones; the header,
  // bottom bar and sheets pad themselves with env(safe-area-inset-*).
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
