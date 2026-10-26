import { CATEGORIES, getPart } from '../data/catalog'
import type { Category, Selections } from '../types'
import { money } from './format'

export interface BuildSnapshot {
  version: 1
  budget: number | null
  selections: Selections
}

export const EMPTY_SELECTIONS: Selections = {}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

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

export function encodeBuild(snapshot: BuildSnapshot): string {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      b: snapshot.budget && snapshot.budget > 0 ? Math.round(snapshot.budget) : null,
      s: snapshot.selections,
    }),
  )
}

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

export function readBuildFromLocation(): BuildSnapshot | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const code = params.get('b')
  return code ? decodeBuild(code) : null
}

export function writeBuildToLocation(snapshot: BuildSnapshot): void {
  const code = encodeBuild(snapshot)
  const url = `${window.location.pathname}${window.location.search}#b=${code}`
  window.history.replaceState(null, '', url)
}

export function buildLink(snapshot: BuildSnapshot): string {
  const code = encodeBuild(snapshot)
  return `${window.location.origin}${window.location.pathname}#b=${code}`
}

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

export function categoryItemCount(selections: Selections, category: Category): number {
  return selections[category]?.length ?? 0
}
