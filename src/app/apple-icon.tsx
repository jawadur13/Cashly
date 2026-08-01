import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2563EB',
        }}
      >
        <div
          style={{
            width: 88,
            height: 66,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: '#2563EB' }} />
            <div style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: '#EAF1FE' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: '#EAF7EF' }} />
            <div style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: '#EAF1FE' }} />
          </div>
        </div>
      </div>
    ),
    size
  )
}
