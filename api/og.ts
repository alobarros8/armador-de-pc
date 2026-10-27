import { createElement } from 'react'
import { ImageResponse } from '@vercel/og'
import { decodeBuild, getSelectedParts, money } from './decode.js'

/** Genera una imagen Open Graph para una build compartida o la página inicial. */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('b')
  const snapshot = code ? decodeBuild(code) : null

  const title = 'Armador de PC'
  let subtitle = 'Armá tu PC con compatibilidad validada'
  let total = 0

  if (snapshot) {
    const parts = getSelectedParts(snapshot.selections)
    const lines = parts.slice(0, 3).map((part) => part.name)
    total = parts.reduce((acc, part) => acc + part.price, 0)
    subtitle = lines.join(' · ') || subtitle
    if (total > 0) subtitle += ` · ${money(total)}`
  }

  return new ImageResponse(
    createElement(
      'div',
      {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#08090d',
          color: '#e2e8f0',
          padding: '48px 60px',
          fontFamily: 'Inter, sans-serif',
        },
      },
      createElement(
        'div',
        { style: { fontSize: 52, fontWeight: 800, color: '#10b981', marginBottom: 8 } },
        title,
      ),
      createElement(
        'div',
        { style: { fontSize: 24, color: '#94a3b8', marginBottom: 24 } },
        subtitle,
      ),
      snapshot
        ? createElement(
            'div',
            { style: { fontSize: 22, marginTop: 'auto', color: '#cbd5e1' } },
            createElement('div', null, `Total: ${money(total)}`),
            createElement(
              'div',
              { style: { fontSize: 16, opacity: 0.7 } },
              'Piezas principales mostradas',
            ),
          )
        : createElement(
            'div',
            { style: { fontSize: 16, opacity: 0.5, marginTop: 'auto' } },
            'Sin build compartida. Usá el botón de compartir o generá un link.',
          ),
    ),
    { width: 1200, height: 630 },
  )
}
