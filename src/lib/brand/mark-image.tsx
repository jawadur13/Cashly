import { ImageResponse } from 'next/og'
import { MARK } from '@/components/brand/logo'

/**
 * The Cashly mark as a PNG at `px` square. Used by the favicon, apple icon and PWA icons.
 * `rounded` gives the tile the logo's corner radius with transparent corners
 * (tabs, desktop installs); iOS and maskable icons stay square because the
 * system applies its own shape.
 */
export function markImage(px: number, { padded = false, rounded = false }: { padded?: boolean; rounded?: boolean } = {}) {
  // Maskable icons are cropped to a circle; keep the mark inside the safe zone.
  const inner = Math.round(px * (padded ? 0.62 : 0.86))
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${MARK.navyFrom}, ${MARK.navyTo})`,
          borderRadius: rounded ? Math.round(px * 0.25) : 0,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 64 64">
          <path d={MARK.arc} fill="none" stroke={MARK.gold} strokeWidth="7" strokeLinecap="round" />
          <circle cx="44.5" cy="32" r="3.6" fill={MARK.coin} />
        </svg>
      </div>
    ),
    { width: px, height: px }
  )
}
