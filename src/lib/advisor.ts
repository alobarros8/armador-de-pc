import { PARTS_BY_CATEGORY, getPart } from '../data/catalog'
import { analyze } from './compat'
import { performanceScore } from './optimizer'
import type { UseCase } from './optimizer'
import { money } from './format'
import type { Category, Part, Selections } from '../types'

export type SuggestionType = 'improve' | 'save' | 'balance'

export interface Suggestion {
  type: SuggestionType
  category: Category
  current: Part
  replacement: Part
  priceDelta: number
  performanceDelta: number
  reason: string
}

const SUGGEST_CATEGORIES: Category[] = ['gpu', 'cpu', 'ram', 'storage', 'psu', 'cooler']

/** Clona una selección para no mutar la original. */
function cloneSelections(s: Selections): Selections {
  const out: Selections = {}
  for (const key of Object.keys(s)) {
    const cat = key as Category
    out[cat] = [...(s[cat] ?? [])]
  }
  return out
}

/** Calcula el rendimiento estimado de una build (0-100). */
function buildPerformance(selections: Selections, useCase: UseCase): number {
  const parts: Partial<Record<Category, Part[]>> = {}
  for (const cat of Object.keys(selections) as Category[]) {
    const list = (selections[cat] ?? []).map((id) => getPart(id)).filter((p): p is Part => Boolean(p))
    if (list.length) parts[cat] = list
  }
  return performanceScore(parts, useCase)
}

/** Detecta si hay cuello de botella CPU/GPU en gaming. */
function hasCpuBottleneck(selections: Selections): boolean {
  const analysis = analyze(selections)
  return analysis.infos.some((i) => i.id === 'cpu-bottleneck')
}

export function explainBuild(build: Selections, useCase: UseCase, budget: number): string[] {
  const analysis = analyze(build)
  const reasons: string[] = []
  const parts = analysis.selected

  // Mayor parte del presupuesto
  const entries = Object.entries(parts).flatMap(([cat, list]) =>
    (list ?? []).map((p) => ({ cat: cat as Category, part: p })),
  )
  if (entries.length > 0) {
    const top = entries.reduce((a, b) => (a.part.price > b.part.price ? a : b))
    const pct = analysis.total > 0 ? Math.round((top.part.price / analysis.total) * 100) : 0
    reasons.push(`La mayor parte del presupuesto (${pct}%) se asigna a ${top.part.name}.`)
  }

  // Balance CPU/GPU
  const cpu = parts.cpu?.[0]
  const gpu = parts.gpu?.[0]
  if (cpu && gpu && (useCase === 'gaming-1080' || useCase === 'gaming-1440')) {
    const gap = (gpu.perf ?? 0) - (cpu.perf ?? 0)
    if (gap > 30) {
      reasons.push(`Hay cuello de botella de CPU: la GPU es mucho más potente que el ${cpu.name}.`)
    } else if (gap < -10) {
      reasons.push(`La CPU es más potente que la GPU; podés ganar rendimiento con una GPU superior.`)
    } else {
      reasons.push(`CPU y GPU están balanceados para ${useCase === 'gaming-1080' ? '1080p' : '1440p'}.`)
    }
  }

  // Requisitos del uso
  const ram = parts.ram?.[0]
  if (ram) {
    if ((ram.modules ?? 1) >= 2) reasons.push(`RAM en dual channel (${ram.capacityGb} GB).`)
    else reasons.push(`RAM en single channel: conviene un kit de 2 módulos.`)
  }
  const storage = parts.storage ?? []
  if (storage.some((d) => d.interface?.includes('NVMe'))) {
    reasons.push(`Incluye almacenamiento NVMe.`)
  }
  if (useCase === 'editing' || useCase === 'streaming') {
    if ((ram?.capacityGb ?? 0) >= 32) reasons.push(`Cumple el requisito de 32 GB de RAM.`)
    else reasons.push(`Faltan ${32 - (ram?.capacityGb ?? 0)} GB para el uso elegido.`)
  }

  // Margen de fuente
  const psu = parts.psu?.[0]
  if (psu) {
    const margin = (psu.wattage ?? 0) - analysis.watts
    if (margin >= 150) reasons.push(`La fuente tiene buen margen (${margin} W libres).`)
    else if (margin >= 0) reasons.push(`La fuente queda justa (${margin} W libres).`)
  }

  // Espacio para ampliar
  const mobo = parts.motherboard?.[0]
  if (mobo) {
    const usedRamSlots = ram?.modules ?? 0
    const freeRam = (mobo.ramSlots ?? 0) - usedRamSlots
    const nvmeCount = storage.filter((d) => d.interface?.includes('NVMe')).length
    const freeM2 = (mobo.m2Slots ?? 0) - nvmeCount
    if (freeRam > 0 || freeM2 > 0) {
      reasons.push(`Espacio para ampliar: ${freeRam} slot(s) de RAM y ${freeM2} slot(s) M.2 libres.`)
    }
  }

  if (budget > 0 && analysis.total <= budget) {
    const leftover = budget - analysis.total
    if (leftover > 0) reasons.push(`Sobra ${money(leftover)} del presupuesto para upgrades.`)
  }

  return reasons.slice(0, 5)
}

export function suggestChanges(build: Selections, useCase: UseCase, _budget?: number): Suggestion[] {
  const analysis = analyze(build)
  if (analysis.errors.length > 0 || analysis.missingRequired.length > 0) return []

  const basePerf = buildPerformance(build, useCase)
  const bottleneck = hasCpuBottleneck(build)
  const suggestions: Suggestion[] = []

  for (const category of SUGGEST_CATEGORIES) {
    const current = getPart(build[category]?.[0])
    if (!current) continue
    const candidates = PARTS_BY_CATEGORY[category] ?? []

    for (const replacement of candidates) {
      if (replacement.id === current.id) continue
      const newSelections = cloneSelections(build)
      newSelections[category] = [replacement.id]

      const newAnalysis = analyze(newSelections)
      if (newAnalysis.errors.length > 0 || newAnalysis.missingRequired.length > 0 || newAnalysis.warnings.length > 0) {
        continue
      }

      const newPerf = buildPerformance(newSelections, useCase)
      if (basePerf <= 0) continue
      const perfDelta = ((newPerf - basePerf) / basePerf) * 100
      if (Math.abs(perfDelta) < 2) continue

      const priceDelta = replacement.price - current.price

      let type: SuggestionType | null = null
      if (perfDelta >= 2 && priceDelta > 0) type = 'improve'
      else if (perfDelta >= -5 && priceDelta < 0) type = 'save'
      else if (bottleneck && perfDelta >= 2) type = 'balance'

      if (!type) continue

      const reason =
        type === 'improve'
          ? `Cambiando ${current.name} por ${replacement.name} sumás ~${perfDelta.toFixed(0)}% de rendimiento estimado por ${money(priceDelta)}.`
          : type === 'save'
            ? `Podés ahorrar ${money(-priceDelta)} con ${replacement.name} perdiendo ~${Math.abs(perfDelta).toFixed(0)}% de rendimiento estimado.`
            : `Cambiando a ${replacement.name} resolvés el cuello de botella por ${money(priceDelta)}.`

      suggestions.push({
        type,
        category,
        current,
        replacement,
        priceDelta,
        performanceDelta: perfDelta,
        reason,
      })
    }
  }

  // Dedup by replacement id
  const seen = new Set<string>()
  const unique = suggestions.filter((s) => {
    const key = `${s.category}:${s.replacement.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const improves = unique
    .filter((s) => s.type === 'improve')
    .sort((a, b) => b.performanceDelta / Math.max(b.priceDelta, 1) - a.performanceDelta / Math.max(a.priceDelta, 1))
    .slice(0, 3)
  const saves = unique
    .filter((s) => s.type === 'save')
    .sort((a, b) => a.priceDelta - b.priceDelta)
    .slice(0, 3)
  const balances = unique
    .filter((s) => s.type === 'balance')
    .sort((a, b) => b.performanceDelta - a.performanceDelta)
    .slice(0, 3)

  return [...improves, ...balances, ...saves]
}