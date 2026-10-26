import { CATEGORIES, getPart } from '../data/catalog'
import type { BuildSnapshot } from './share'

export interface BuildCardOptions {
  total: number
  watts: number
  link?: string
}

/* Paleta espejo del tema dark de la app (index.css). */
const COLORS = {
  bg: '#07080c',
  panel: '#0b0d13',
  accent: '#10b981',
  text: '#e2e8f0',
  muted: '#94a3b8',
  faint: '#64748b',
  line: 'rgba(255, 255, 255, 0.08)',
}

const FONT = "Inter, 'Segoe UI', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

function money(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Genera la imagen de resumen de la build (PNG, ~1200 ancho, 2x nitidez). */
export async function createBuildCardBlob(
  snapshot: BuildSnapshot,
  meta: BuildCardOptions,
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('La tarjeta solo se genera en el navegador.')
  }

  // Esperamos las webfonts para dibujar con Inter real y no con el fallback.
  await document.fonts.ready

  const rows = CATEGORIES.flatMap((category) => {
    const ids = snapshot.selections[category.id] ?? []
    const parts = ids.map((id) => getPart(id)).filter((part) => part !== undefined)
    if (!parts.length) {
      return []
    }
    return [
      {
        label: category.label,
        names: parts.map((part) => part.name).join(' + '),
        total: parts.reduce((acc, part) => acc + part.price, 0),
      },
    ]
  })

  const width = 1200
  const padding = 80
  const rowHeight = 52
  const headerHeight = 200
  const footerHeight = 240
  const height = headerHeight + rows.length * rowHeight + footerHeight

  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el canvas.')
  ctx.scale(scale, scale)

  // Fondo y barra de acento.
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, COLORS.accent)
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, 5)

  // Panel interior sutil.
  ctx.fillStyle = COLORS.panel
  ctx.fillRect(0, 5, width, height - 5)

  // Header.
  ctx.fillStyle = COLORS.accent
  ctx.font = `700 15px ${MONO}`
  ctx.fillText('ARMADOR DE PC', padding, 74)
  const dateLabel = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  ctx.fillStyle = COLORS.faint
  ctx.font = `500 13px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(`Precios de referencia ARS · ${dateLabel}`, width - padding, 74)
  ctx.textAlign = 'left'

  ctx.fillStyle = COLORS.text
  ctx.font = `800 34px ${FONT}`
  ctx.fillText('Mi build de PC', padding, 128)

  ctx.fillStyle = COLORS.muted
  ctx.font = `500 15px ${FONT}`
  const piezas = rows.reduce(
    (acc, row) => acc + row.names.split(' + ').length,
    0,
  )
  ctx.fillText(`${piezas} componentes · Consumo estimado ${meta.watts} W`, padding, 160)

  // Lista de componentes.
  let y = headerHeight + rowHeight / 2
  for (const row of rows) {
    ctx.fillStyle = COLORS.faint
    ctx.font = `600 11px ${FONT}`
    ctx.fillText(row.label.toUpperCase(), padding, y)

    ctx.fillStyle = COLORS.text
    ctx.font = `600 19px ${FONT}`
    ctx.fillText(
      truncate(ctx, row.names, width - padding * 2 - 220),
      padding + 210,
      y + 1,
    )

    ctx.fillStyle = COLORS.muted
    ctx.font = `500 17px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(row.total === 0 ? 'incluido' : money(row.total), width - padding, y + 1)
    ctx.textAlign = 'left'

    y += rowHeight
  }

  // Separador + total.
  y += 18
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()

  y += 56
  ctx.fillStyle = COLORS.muted
  ctx.font = `700 18px ${FONT}`
  ctx.fillText('Total', padding, y)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 38px ${MONO}`
  ctx.textAlign = 'right'
  ctx.fillText(money(meta.total), width - padding, y + 4)
  ctx.textAlign = 'left'

  // Footer.
  ctx.fillStyle = COLORS.faint
  ctx.font = `500 14px ${FONT}`
  if (meta.link) {
    ctx.fillText(truncate(ctx, meta.link, width - padding * 2 - 260), padding, height - 56)
  }
  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.accent
  ctx.fillText('Armado con compatibilidad validada', width - padding, height - 56)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('No se pudo exportar la imagen.'))
      }
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
