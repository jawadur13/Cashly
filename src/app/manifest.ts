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
        src: '/cashly-favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/cashly-favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/cashly-favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
