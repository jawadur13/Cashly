import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cashly — Personal Finance',
    short_name: 'Cashly',
    description: 'Simple income and expense tracking for personal finance.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#0E0E11',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
