import { ImageResponse } from '@vercel/og'
import { decodeBuild, getSelectedParts, money } from './decode.js'

declare const Request: any
declare const URL: any

export const config = { runtime: 'edge' }

export default async function handler(req: any) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('b')
  const snapshot = code ? decodeBuild(code) : null

  const title = 'Armador de PC'
  let subtitle = 'Armá tu PC con compatibilidad validada'
  const lines: string[] = []

  if (snapshot) {
    const parts = getSelectedParts(snapshot.selections)
    for (const p of parts) {
      if (lines.length < 3) lines.push(p.name)
    }
    const total = parts.reduce((acc, p) => acc + p.price, 0)
    subtitle = lines.join(' · ') || subtitle
    if (total > 0) subtitle += ` · ${money(total)}`
  }

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#08090d', color: '#e2e8f0', padding: '48px 60px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 24, color: '#94a3b8', marginBottom: 24 }}>{subtitle}</div>
        {snapshot && (
          <div style={{ fontSize: 22, marginTop: 'auto', color: '#cbd5e1' }}>
            <div>Total: {money(getSelectedParts(snapshot.selections).reduce((a, p) => a + p.price, 0))}</div>
            <div style={{ fontSize: 16, opacity: 0.7 }}>Piezas principales mostradas</div>
          </div>
        )}
        {!snapshot && (
          <div style={{ fontSize: 16, opacity: 0.5, marginTop: 'auto' }}>Sin build compartida. Usá el botón de compartir o generá un link.</div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
