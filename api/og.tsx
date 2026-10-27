import { ImageResponse } from '@vercel/og'
import { decodeBuild } from '../src/lib/share'
import { getPart } from '../src/data/catalog'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('b')
  if (code && code.length > 2000) {
    return new ImageResponse(<div>Invalid</div>, { width: 1200, height: 630 })
  }
  const snapshot = code ? decodeBuild(code) : null

  const title = 'Armador de PC'
  let subtitle = 'Armá tu PC con compatibilidad validada'
  let total = ''
  const lines: string[] = []

  if (snapshot) {
    const cpu = snapshot.selections.cpu?.[0] ? getPart(snapshot.selections.cpu[0]) : null
    const gpu = snapshot.selections.gpu?.[0] ? getPart(snapshot.selections.gpu[0]) : null
    const ram = snapshot.selections.ram?.[0] ? getPart(snapshot.selections.ram[0]) : null
    const storage = snapshot.selections.storage?.[0] ? getPart(snapshot.selections.storage[0]) : null
    const psu = snapshot.selections.psu?.[0] ? getPart(snapshot.selections.psu[0]) : null
    const pcCase = snapshot.selections.case?.[0] ? getPart(snapshot.selections.case[0]) : null
    if (cpu) lines.push(`CPU: ${cpu.name}`)
    if (gpu) lines.push(`GPU: ${gpu.name}`)
    if (ram) lines.push(`RAM: ${ram.name}`)
    if (storage) lines.push(`SSD: ${storage.name}`)
    if (psu) lines.push(`Fuente: ${psu.name}`)
    if (pcCase) lines.push(`Gabinete: ${pcCase.name}`)
    const parts = Object.values(snapshot.selections).flat().map((id) => getPart(id)).filter(Boolean)
    const sum = parts.reduce((acc, p) => acc + (p?.price ?? 0), 0)
    total = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(sum)
    subtitle = [cpu?.name, gpu?.name, ram ? `${ram.capacityGb} GB` : null].filter(Boolean).join(' · ')
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#08090d',
          color: '#e2e8f0',
          padding: '60px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, color: '#10b981' }}>{title}</div>
        <div style={{ fontSize: 28, marginTop: 8, color: '#94a3b8' }}>{subtitle}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32, gap: 8, fontSize: 22 }}>
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        {total ? (
          <div style={{ marginTop: 'auto', fontSize: 40, fontWeight: 700 }}>{total}</div>
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 },
  )
}