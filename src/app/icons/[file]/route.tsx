import { markImage } from '@/lib/brand/mark-image'

/** PWA icons for the manifest: /icons/192.png, /icons/512.png, /icons/maskable-512.png. */
const ICONS: Record<string, { px: number; padded?: boolean }> = {
  '192.png': { px: 192 },
  '512.png': { px: 512 },
  'maskable-512.png': { px: 512, padded: true },
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const icon = ICONS[(await params).file]
  if (!icon) return new Response('Not found', { status: 404 })
  return markImage(icon.px, { padded: icon.padded })
}
