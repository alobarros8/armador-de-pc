declare const atob: (str: string) => string
declare const TextDecoder: { new(): { decode(bytes?: ArrayBufferView | ArrayBuffer): string } }

import { LITE_CATALOG, getPart, type LitePart } from './catalog-lite.js'

export type { LitePart }
export { LITE_CATALOG, getPart }

export const LITE_CATEGORIES = [
  'cpu', 'cooler', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case',
  'monitor', 'keyboard', 'mouse', 'headset', 'extra',
] as const

export interface Selections {
  cpu?: string[]
  cooler?: string[]
  motherboard?: string[]
  ram?: string[]
  gpu?: string[]
  storage?: string[]
  psu?: string[]
  case?: string[]
  monitor?: string[]
  keyboard?: string[]
  mouse?: string[]
  headset?: string[]
  extra?: string[]
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeBuild(code: string): { version: 1; selections: Selections; budget: number | null } | null {
  try {
    const parsed = JSON.parse(fromBase64Url(code)) as { v?: number; b?: number | null; s?: unknown }
    if (parsed.v !== 1) return null
    const sel: Selections = {}
    for (const cat of LITE_CATEGORIES) {
      const ids = ((parsed.s?.[cat as never] ?? []) as string[])
      const valid = ids.filter((id: string) => Boolean(getPart(id)?.category === cat))
      if (valid.length) sel[cat as keyof Selections] = Array.from(new Set(valid))
    }
    return { version: 1, selections: sel, budget: typeof parsed.b === 'number' && parsed.b > 0 ? parsed.b : null }
  } catch {
    return null
  }
}

export function getSelectedParts(selections: Selections): LitePart[] {
  const result: LitePart[] = []
  for (const k of Object.keys(selections) as Array<keyof Selections>) {
    const ids = selections[k] ?? []
    for (const id of ids) {
      const p = getPart(id)
      if (p) result.push(p)
    }
  }
  return result
}

export function money(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
}
