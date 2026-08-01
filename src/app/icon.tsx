import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 96,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '10px solid #FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
              height: '100%',
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#2563EB' }} />
              <div
                style={{
                  flex: 1,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#EAF1FE',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#EAF7EF' }} />
              <div
                style={{
                  flex: 1,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#EAF1FE',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
