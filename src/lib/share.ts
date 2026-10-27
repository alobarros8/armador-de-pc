import { CATEGORIES, getPart } from '../data/catalog'
import type { Category, Selections } from '../types'
import { money } from './format'

export interface BuildSnapshot {
  version: 1
  budget: number | null
  selections: Selections
}

export const EMPTY_SELECTIONS: Selections = {}

/** Codifica texto UTF-8 como base64url apto para incluir en un enlace.
 * @returns El texto codificado sin caracteres reservados de URL ni padding.
 */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decodifica una cadena base64url y reconstruye su texto UTF-8.
 * @returns El texto original decodificado.
 */
function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Filtra categorías, IDs y cantidades para dejar solo selecciones válidas del catálogo.
 * @returns Las selecciones normalizadas y limitadas por categoría.
 */
export function sanitizeSelections(input: unknown): Selections {
  if (!input || typeof input !== 'object') return {}
  const raw = input as Record<string, unknown>
  const result: Selections = {}

  for (const category of CATEGORIES) {
    const ids = raw[category.id]
    if (!Array.isArray(ids)) continue
    const valid = ids
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => getPart(id)?.category === category.id)
      .slice(0, category.multi ? category.max ?? 99 : 1)
    if (valid.length) result[category.id] = Array.from(new Set(valid))
  }

  return result
}

/** Serializa y codifica una build para almacenarla en un hash de URL.
 * @returns El código base64url de la instantánea.
 */
export function encodeBuild(snapshot: BuildSnapshot): string {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      b: snapshot.budget && snapshot.budget > 0 ? Math.round(snapshot.budget) : null,
      s: snapshot.selections,
    }),
  )
}

/** Decodifica un código compartido y valida su versión, presupuesto y selecciones.
 * @returns La instantánea validada o null si el código es inválido o ilegible.
 */
export function decodeBuild(code: string): BuildSnapshot | null {
  try {
    const parsed = JSON.parse(fromBase64Url(code)) as {
      v?: number
      b?: number | null
      s?: unknown
    }
    if (parsed.v !== 1) return null
    return {
      version: 1,
      budget: typeof parsed.b === 'number' && parsed.b > 0 ? parsed.b : null,
      selections: sanitizeSelections(parsed.s),
    }
  } catch {
    return null
  }
}

/** Lee y decodifica el parámetro de build del hash de la URL actual.
 * @returns La instantánea del enlace o null si no hay un código válido.
 */
export function readBuildFromLocation(): BuildSnapshot | null {
  // Nuevo formato: query param ?b=
  const searchParams = new URLSearchParams(window.location.search)
  const queryCode = searchParams.get('b')
  if (queryCode) return decodeBuild(queryCode)

  // Compatibilidad con links viejos: #b=
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const code = params.get('b')
  return code ? decodeBuild(code) : null
}

/** Reemplaza la URL actual por el código de la build indicada en query param.
 * @returns No devuelve valor.
 */
export function writeBuildToLocation(snapshot: BuildSnapshot): void {
  const code = encodeBuild(snapshot)
  const url = `${window.location.pathname}?b=${code}`
  window.history.replaceState(null, '', url)
}

/** Construye un enlace absoluto que contiene la build en query param.
 * @returns La URL compartible de la instantánea.
 */
export function buildLink(snapshot: BuildSnapshot): string {
  const code = encodeBuild(snapshot)
  return `${window.location.origin}${window.location.pathname}?b=${code}`
}

/** Genera una lista legible de componentes, costos, consumo y enlace para compartir.
 * @returns El resumen textual completo de la build.
 */
export function buildToText(
  snapshot: BuildSnapshot,
  extra: { total: number; watts: number; link?: string },
): string {
  const lines: string[] = ['Mi build de PC', '']
  for (const category of CATEGORIES) {
    const parts = (snapshot.selections[category.id] ?? [])
      .map((id) => getPart(id))
      .filter((part) => part !== undefined)
    if (!parts.length) continue
    for (const part of parts) {
      lines.push(`- ${category.label}: ${part.name} (${part.price === 0 ? 'incluido' : money(part.price)})`)
    }
  }
  lines.push('', `Total: ${money(extra.total)}`, `Consumo estimado: ${extra.watts} W`)
  if (extra.link) lines.push('', extra.link)
  return lines.join('\n')
}

/** Copia texto usando Clipboard API y recurre al mecanismo clásico del navegador si falla.
 * @returns Una promesa con true si el texto se copió y false si no fue posible.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  }
}

/** Genera y descarga un archivo JSON con la instantánea de la build.
 * @returns No devuelve valor.
 */
export function downloadBuild(snapshot: BuildSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'mi-build-pc.json'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Lee un archivo JSON de build y normaliza sus campos y selecciones.
 * @returns Una promesa con la instantánea válida o null si el archivo no se puede leer.
 */
export function readBuildFile(file: File): Promise<BuildSnapshot | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          version?: number
          budget?: number | null
          selections?: unknown
          v?: number
          b?: number | null
          s?: unknown
        }
        const selections = sanitizeSelections(parsed.selections ?? parsed.s)
        const budgetRaw = parsed.budget ?? parsed.b
        resolve({
          version: 1,
          budget: typeof budgetRaw === 'number' && budgetRaw > 0 ? budgetRaw : null,
          selections,
        })
      } catch {
        resolve(null)
      }
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

/** Cuenta cuántas piezas están seleccionadas en una categoría.
 * @returns La cantidad de IDs guardados para esa categoría.
 */
export function categoryItemCount(selections: Selections, category: Category): number {
  return selections[category]?.length ?? 0
}
