import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cashly — Personal Finance',
    short_name: 'Cashly',
    description: 'Your money, beautifully clear.',
    id: '/app',
    start_url: '/app',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    icons: [
      // ?v= changes whenever the artwork does, so installed copies re-download it.
      { src: '/icons/192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
