import { CATEGORY_BY_ID, PARTS_BY_CATEGORY, getPart } from '../data/catalog'
import { analyze, estimateWatts, type Analysis } from './compat'
import { clamp } from './format'
import type { Category, Part, Selections } from '../types'

export type UseCase = 'gaming-1080' | 'gaming-1440' | 'editing' | 'streaming' | 'office'
export type Preference = 'performance' | 'balanced' | 'compact'
export type ProposalId = 'max' | 'balanced' | 'value'

export interface OptimizerInput {
  budget: number
  useCase: UseCase
  preference: Preference
  /**
   * Piezas de la torre que se mantienen fijas. Las categorías ausentes o
   * vacías se completan automáticamente. Los periféricos se ignoran porque
   * el presupuesto cubre solo la torre.
   */
  locked?: Selections
}

export interface OptimizerProposal {
  id: ProposalId
  name: string
  tagline: string
  description: string
  selections: Selections
  total: number
  budget: number
  remaining: number
  analysis: Analysis
  performance: number
  quality: number
  value: number
  compact: number
  recommended: boolean
  badges: string[]
  highlights: string[]
  /** Categorías que se mantuvieron fijas desde la build actual. */
  lockedCategories: Category[]
}

export type OptimizerResult =
  | {
      ok: true
      proposals: OptimizerProposal[]
      budget: number
      useCase: UseCase
      preference: Preference
      note?: string
      lockedCount: number
      lockedTotal: number
    }
  | {
      ok: false
      reason: 'budget-too-low' | 'no-build' | 'locked-conflict'
      budget: number
      useCase: UseCase
      preference: Preference
      minimumBudget: number | null
      message: string
      /** Detalle de los conflictos cuando las piezas fijas no se pueden usar. */
      details?: string[]
    }

export interface UseCaseOption {
  id: UseCase
  label: string
  short: string
  description: string
}

export interface PreferenceOption {
  id: Preference
  label: string
  short: string
  description: string
}

export const USE_CASE_OPTIONS: UseCaseOption[] = [
  {
    id: 'gaming-1080',
    label: 'Gaming 1080p',
    short: '1080p',
    description: 'eSports y AAA en 1080p, hasta 144 Hz.',
  },
  {
    id: 'gaming-1440',
    label: 'Gaming 1440p',
    short: '1440p',
    description: 'AAA en 1440p con buen refresco y texturas altas.',
  },
  {
    id: 'editing',
    label: 'Edición',
    short: 'Edición',
    description: 'Foto, video y render. Prioriza CPU, RAM y SSD.',
  },
  {
    id: 'streaming',
    label: 'Streaming',
    short: 'Streaming',
    description: 'Jugar y transmitir al mismo tiempo sin perder calidad.',
  },
  {
    id: 'office',
    label: 'Oficina',
    short: 'Oficina',
    description: 'Estudio, trabajo y uso diario. Sin GPU dedicada.',
  },
]

export const PREFERENCE_OPTIONS: PreferenceOption[] = [
  {
    id: 'performance',
    label: 'Máximo rendimiento',
    short: 'Rendimiento',
    description: 'Estira el presupuesto al máximo rendimiento.',
  },
  {
    id: 'balanced',
    label: 'Equilibrada',
    short: 'Equilibrada',
    description: 'Buen rendimiento con componentes duraderos y margen de upgrade.',
  },
  {
    id: 'compact',
    label: 'Compacta y silenciosa',
    short: 'Compacta',
    description: 'Gabinete chico, fuente SFX y refrigeración eficiente.',
  },
]

interface UseCaseConfig {
  label: string
  short: string
  requiresGpu: boolean
  minCpuPerf: number
  minRamGb: number
  preferredRamGb: number
  targetStorageGb: number
  preferredStorageGb: number
  weights: {
    cpu: number
    gpu: number
    ram: number
    storage: number
  }
  targets: Record<ProposalId, number>
}

const USE_CASES: Record<UseCase, UseCaseConfig> = {
  'gaming-1080': {
    label: 'Gaming 1080p',
    short: '1080p',
    requiresGpu: true,
    minCpuPerf: 40,
    minRamGb: 16,
    preferredRamGb: 32,
    targetStorageGb: 1000,
    preferredStorageGb: 1000,
    weights: { cpu: 0.25, gpu: 0.62, ram: 0.08, storage: 0.05 },
    targets: { max: 0.98, balanced: 0.86, value: 0.72 },
  },
  'gaming-1440': {
    label: 'Gaming 1440p',
    short: '1440p',
    requiresGpu: true,
    minCpuPerf: 55,
    minRamGb: 32,
    preferredRamGb: 32,
    targetStorageGb: 1000,
    preferredStorageGb: 2000,
    weights: { cpu: 0.18, gpu: 0.72, ram: 0.06, storage: 0.04 },
    targets: { max: 0.98, balanced: 0.87, value: 0.74 },
  },
  editing: {
    label: 'Edición',
    short: 'Edición',
    requiresGpu: true,
    minCpuPerf: 55,
    minRamGb: 32,
    preferredRamGb: 32,
    targetStorageGb: 1000,
    preferredStorageGb: 2000,
    weights: { cpu: 0.42, gpu: 0.18, ram: 0.25, storage: 0.15 },
    targets: { max: 0.98, balanced: 0.86, value: 0.72 },
  },
  streaming: {
    label: 'Streaming',
    short: 'Streaming',
    requiresGpu: true,
    minCpuPerf: 55,
    minRamGb: 32,
    preferredRamGb: 32,
    targetStorageGb: 1000,
    preferredStorageGb: 2000,
    weights: { cpu: 0.35, gpu: 0.25, ram: 0.25, storage: 0.15 },
    targets: { max: 0.98, balanced: 0.86, value: 0.72 },
  },
  office: {
    label: 'Oficina',
    short: 'Oficina',
    requiresGpu: false,
    minCpuPerf: 0,
    minRamGb: 16,
    preferredRamGb: 16,
    targetStorageGb: 1000,
    preferredStorageGb: 1000,
    weights: { cpu: 0.55, gpu: 0, ram: 0.25, storage: 0.2 },
    targets: { max: 0.95, balanced: 0.82, value: 0.68 },
  },
}

const CATEGORY_ORDER: Category[] = [
  'gpu',
  'cpu',
  'motherboard',
  'ram',
  'case',
  'cooler',
  'storage',
  'psu',
]

const REQUIRED_CATEGORIES: Category[] = [
  'cpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case',
]

const BEAM_WIDTH = 320
const MIN_SENSIBLE_BUDGET = 300_000
const HUGE_BUDGET = 50_000_000

/* ------------------------------------------------------------------ */
/* Precios y compatibilidad                                           */
/* ------------------------------------------------------------------ */

const MIN_PRICE: Record<Category, number> = {
  cpu: 111_193,
  cooler: 0,
  motherboard: 81_407,
  ram: 221_300,
  gpu: 515_600,
  storage: 136_750,
  psu: 74_252,
  case: 60_600,
  monitor: 208_750,
  keyboard: 31_200,
  mouse: 11_050,
  headset: 26_250,
  extra: 7_650,
}

function selectionKey(selections: Selections): string {
  return CATEGORY_ORDER.map((category) => `${category}:${(selections[category] ?? []).join(',')}`).join('|')
}

/* ------------------------------------------------------------------ */
/* Build actual como base                                             */
/* ------------------------------------------------------------------ */

function partsFromSelections(
  selections: Selections,
): Partial<Record<Category, Part[]>> {
  const parts: Partial<Record<Category, Part[]>> = {}
  for (const category of CATEGORY_ORDER) {
    const list = (selections[category] ?? [])
      .map((id) => getPart(id))
      .filter((part): part is Part => Boolean(part))
    if (list.length > 0) parts[category] = list
  }
  return parts
}

function selectionsTotal(selections: Selections): number {
  return Object.values(partsFromSelections(selections))
    .flat()
    .reduce((total, part) => total + part.price, 0)
}

/**
 * Deja solo piezas válidas de la torre, respeta el máximo de cada categoría y
 * descarta periféricos: el presupuesto del optimizador cubre únicamente la torre.
 */
function normalizeLocked(selections: Selections | undefined): Selections | undefined {
  if (!selections) return undefined
  const locked: Selections = {}
  for (const category of CATEGORY_ORDER) {
    const ids = selections[category] ?? []
    if (ids.length === 0) continue
    const max = CATEGORY_BY_ID[category].max
    const parts = ids
      .map((id) => getPart(id))
      .filter((part): part is Part => Boolean(part) && part?.category === category)
      .slice(0, max)
    if (parts.length > 0) locked[category] = parts.map((part) => part.id)
  }
  return Object.keys(locked).length > 0 ? locked : undefined
}

/**
 * La preferencia compacta exige Mini-ITX y fuente SFX. Si alguna pieza fija
 * no encaja en ese formato, relajamos el requisito y lo avisamos en el
 * resultado en lugar de descartar la build del usuario.
 */
function effectiveStrictCompact(
  input: OptimizerInput,
  locked: Selections | undefined,
): boolean {
  if (input.preference !== 'compact') return false
  const lockedCase = getPart(locked?.case?.[0])
  const lockedMobo = getPart(locked?.motherboard?.[0])
  const lockedPsu = getPart(locked?.psu?.[0])
  const lockedGpu = getPart(locked?.gpu?.[0])
  const lockedCooler = getPart(locked?.cooler?.[0])

  if (lockedCase && lockedCase.id !== 'cm-nr200p') return false
  if (lockedMobo && lockedMobo.formFactor !== 'Mini-ITX') return false
  if (lockedPsu && lockedPsu.psuForm !== 'SFX') return false
  if (lockedGpu && (lockedGpu.gpuLength ?? 0) > 330) return false
  if (lockedCooler) {
    if (lockedCooler.coolerType === 'aio' && ![240, 280].includes(lockedCooler.radiator ?? 0)) {
      return false
    }
    if (
      lockedCooler.coolerType === 'air' &&
      (lockedCooler.coolerHeight ?? 0) > 155
    ) {
      return false
    }
  }
  return true
}

function lockedSummary(locked: Selections | undefined): {
  count: number
  total: number
  categories: Category[]
} {
  if (!locked) return { count: 0, total: 0, categories: [] }
  const categories = CATEGORY_ORDER.filter(
    (category) => (locked[category]?.length ?? 0) > 0,
  )
  return {
    count: categories.reduce(
      (count, category) => count + (locked[category]?.length ?? 0),
      0,
    ),
    total: selectionsTotal(locked),
    categories,
  }
}

/**
 * Conflictos que no se pueden resolver agregando piezas: incompatibilidades
 * entre piezas fijas, requisitos del uso que ya incumplen y avisos que solo
 * se arreglarían reemplazando una pieza bloqueada.
 */
function lockedIssues(input: OptimizerInput, locked: Selections): string[] {
  const analysis = analyze(locked)
  const parts = partsFromSelections(locked)
  const cpu = parts.cpu?.[0]
  const gpu = parts.gpu?.[0]
  const mobo = parts.motherboard?.[0]
  const ram = parts.ram?.[0]
  const storage = parts.storage ?? []
  const psu = parts.psu?.[0]
  const pcCase = parts.case?.[0]
  const cooler = parts.cooler?.[0]
  const config = USE_CASES[input.useCase]
  const issues: string[] = []

  // Errores entre piezas fijas. "no-video" queda afuera porque se resuelve
  // agregando una GPU cuando el uso la requiere.
  for (const issue of analysis.errors) {
    if (issue.id === 'no-video') continue
    issues.push(issue.detail)
  }

  if (input.useCase === 'office') {
    if (gpu) {
      issues.push(
        'Para oficina el optimizador usa solo gráficos integrados. Quitá la GPU de la build o elegí otro uso.',
      )
    }
    if (cpu && !cpu.igpu) {
      issues.push(
        `El ${cpu.name} no tiene gráficos integrados y para oficina necesitás un CPU con iGPU.`,
      )
    }
  } else {
    if (ram) {
      if ((ram.capacityGb ?? 0) < config.minRamGb) {
        issues.push(
          `Tu RAM de ${ram.capacityGb ?? 0} GB no alcanza para ${config.label.toLowerCase()}: necesitás al menos ${config.minRamGb} GB.`,
        )
      }
      if ((ram.modules ?? 1) < 2) {
        issues.push(
          'Tu RAM usa un solo módulo. Para gaming, edición o streaming necesitás dual channel.',
        )
      }
    }
    if (storage.length > 0 && !storage.some((drive) => drive.interface?.includes('NVMe'))) {
      issues.push(
        'Tu almacenamiento no incluye un SSD NVMe, necesario para este uso.',
      )
    }
    if (mobo) {
      if ((mobo.pcieGen ?? 0) < 4) {
        issues.push(
          `La ${mobo.name} es PCIe ${mobo.pcieGen ?? '?'}. Con GPU dedicada necesitás PCIe 4.0.`,
        )
      }
      if (/h610|a520/i.test(mobo.id) || /H610|A520/i.test(mobo.name)) {
        issues.push(
          `La ${mobo.name} es un chipset de entrada; con GPU dedicada necesitás una mother superior.`,
        )
      }
    }
  }

  const highEndCpu = Boolean(
    cpu && ((cpu.tdp ?? 0) >= 105 || (cpu.perf ?? 0) >= 75),
  )
  const highEndGpu = Boolean(gpu && (gpu.perf ?? 0) >= 50)
  if (highEndCpu || highEndGpu) {
    if (psu && !/Gold|Platinum/i.test(psu.efficiency ?? '')) {
      issues.push(
        `La ${psu.name} no es Gold/Platinum; una build de gama alta necesita mejor eficiencia.`,
      )
    }
    if (pcCase && caseQuality(pcCase) < 60) {
      issues.push(
        `El ${pcCase.name} no tiene el flujo de aire necesario para una build de gama alta.`,
      )
    }
    if (
      mobo &&
      (motherboardQuality(mobo) < 60 || (mobo.pcieGen ?? 0) < 4)
    ) {
      issues.push(
        `La ${mobo.name} no está a la altura de una build de gama alta.`,
      )
    }
  }

  // Avisos que no se corrigen completando el resto: dependen de piezas fijas.
  for (const issue of analysis.warnings) {
    if (issue.id === 'ram-low' && ram) issues.push(issue.detail)
    if (issue.id === 'psu-tight' && psu) issues.push(issue.detail)
    if (issue.id === 'm2-slots' && mobo && storage.length > 0) issues.push(issue.detail)
    if (issue.id === 'hdd-only' && storage.length > 0) issues.push(issue.detail)
    if (issue.id === 'cooler-tdp' && cpu && cooler) issues.push(issue.detail)
  }

  return [...new Set(issues)]
}

function storageCapacityGb(part: Part | undefined): number {
  if (!part?.capacity) return 0
  const value = Number.parseFloat(part.capacity)
  if (!Number.isFinite(value)) return 0
  return part.capacity.toUpperCase().includes('TB') ? value * 1000 : value
}

function compatibleMotherboards(cpu: Part, strictCompact: boolean): Part[] {
  return (PARTS_BY_CATEGORY.motherboard ?? []).filter(
    (mobo) =>
      mobo.socket === cpu.socket &&
      (!strictCompact || mobo.formFactor === 'Mini-ITX'),
  )
}

function compatibleRam(mobo: Part, useCase: UseCase): Part[] {
  const config = USE_CASES[useCase]
  const requireDualChannel = useCase !== 'office'
  return (PARTS_BY_CATEGORY.ram ?? []).filter(
    (ram) =>
      ram.ramType === mobo.ramType &&
      (ram.modules ?? 1) <= (mobo.ramSlots ?? 2) &&
      (ram.capacityGb ?? 0) >= config.minRamGb &&
      (!requireDualChannel || (ram.modules ?? 1) >= 2),
  )
}

function compatibleCases(
  mobo: Part,
  gpu: Part | undefined,
  strictCompact: boolean,
): Part[] {
  return (PARTS_BY_CATEGORY.case ?? []).filter(
    (pcCase) =>
      (pcCase.supportedFormFactors ?? []).includes(mobo.formFactor ?? 'ATX') &&
      (!gpu || (gpu.gpuLength ?? 0) <= (pcCase.maxGpuLength ?? 0)) &&
      (!strictCompact || pcCase.id === 'cm-nr200p'),
  )
}

function compatibleCoolers(cpu: Part, pcCase: Part): Part[] {
  return (PARTS_BY_CATEGORY.cooler ?? []).filter((cooler) => {
    if (!(cooler.supportedSockets ?? []).includes(cpu.socket ?? 'AM4')) return false
    if (cooler.included && !cpu.stockCooler) return false
    if ((cooler.coolerTdp ?? 0) < (cpu.tdp ?? 0)) return false
    if (cooler.coolerType === 'aio') {
      return (pcCase.radiatorSupport ?? []).includes(cooler.radiator ?? 0)
    }
    return (cooler.coolerHeight ?? 0) <= (pcCase.maxCoolerHeight ?? 0)
  })
}

function compatibleStorage(mobo: Part): Part[] {
  return (PARTS_BY_CATEGORY.storage ?? []).filter(
    (drive) =>
      drive.storageType === 'SSD' &&
      (!drive.interface?.includes('NVMe') || (mobo.m2Slots ?? 0) > 0),
  )
}

function recommendedPsuFor(selections: Selections): number {
  const watts = estimateWatts(selections)
  return Math.max(450, Math.ceil((watts * 1.35) / 50) * 50)
}

function compatiblePsus(selections: Selections, pcCase: Part): Part[] {
  const recommended = recommendedPsuFor(selections)
  return (PARTS_BY_CATEGORY.psu ?? []).filter(
    (psu) =>
      (psu.wattage ?? 0) >= recommended &&
      (pcCase.psuFormSupport === 'SFX' ? psu.psuForm === 'SFX' : psu.psuForm === 'ATX'),
  )
}

/* ------------------------------------------------------------------ */
/* Puntajes                                                           */
/* ------------------------------------------------------------------ */

function cpuPerfScore(part: Part, useCase: UseCase): number {
  const perf = part.perf ?? 0
  if (useCase === 'editing' || useCase === 'streaming') {
    return clamp(perf * 0.75 + ((part.cores ?? 0) / 16) * 100 * 0.25, 0, 100)
  }
  return perf
}

function gpuPerfScore(part: Part, useCase: UseCase): number {
  const perf = part.perf ?? 0
  const vram = part.vram ?? 0
  if (useCase === 'gaming-1440') {
    return clamp(perf * 0.92 + Math.min(vram / 16, 1) * 8, 0, 100)
  }
  if (useCase === 'editing') {
    return clamp(perf * 0.85 + Math.min(vram / 16, 1) * 15, 0, 100)
  }
  if (useCase === 'streaming') {
    return clamp(perf * 0.88 + Math.min(vram / 16, 1) * 12, 0, 100)
  }
  return perf
}

function ramPerfScore(part: Part, useCase: UseCase): number {
  const target =
    useCase === 'editing' || useCase === 'streaming'
      ? 64
      : useCase === 'office'
        ? 16
        : 32
  const capacity = clamp(((part.capacityGb ?? 0) / target) * 100, 0, 100)
  const speed = clamp((((part.speed ?? 0) - 2400) / 4000) * 10, 0, 10)
  const dual = (part.modules ?? 1) >= 2 ? 5 : 0
  return clamp(capacity * 0.85 + speed + dual, 0, 100)
}

function storagePerfScore(part: Part, useCase: UseCase): number {
  const config = USE_CASES[useCase]
  const gb = storageCapacityGb(part)
  const capacity = clamp((gb / config.targetStorageGb) * 100, 0, 100)
  const nvme = part.interface?.includes('NVMe') ? 12 : -6
  const preferred = gb >= config.preferredStorageGb ? 5 : 0
  return clamp(capacity * 0.9 + nvme + preferred, 0, 100)
}

function performanceScore(
  parts: Partial<Record<Category, Part[]>>,
  useCase: UseCase,
): number {
  const config = USE_CASES[useCase]
  const cpu = parts.cpu?.[0]
  const gpu = parts.gpu?.[0]
  const ram = parts.ram?.[0]
  const storage = parts.storage?.[0]

  let score = 0
  let weight = 0
  if (cpu) {
    score += cpuPerfScore(cpu, useCase) * config.weights.cpu
    weight += config.weights.cpu
  }
  if (gpu) {
    score += gpuPerfScore(gpu, useCase) * config.weights.gpu
    weight += config.weights.gpu
  }
  if (ram) {
    score += ramPerfScore(ram, useCase) * config.weights.ram
    weight += config.weights.ram
  }
  if (storage) {
    score += storagePerfScore(storage, useCase) * config.weights.storage
    weight += config.weights.storage
  }

  let result = weight > 0 ? score / weight : 0
  if ((useCase === 'gaming-1080' || useCase === 'gaming-1440') && cpu && gpu) {
    const gap = gpuPerfScore(gpu, useCase) - cpuPerfScore(cpu, useCase)
    if (gap > 30) result -= Math.min((gap - 30) * 0.35, 12)
  }
  return clamp(result, 0, 100)
}

function motherboardQuality(part: Part | undefined): number {
  if (!part) return 50
  const name = part.name.toLowerCase()
  const highChipset = /x\d|z\d|b\d{3}/.test(name) ? 20 : 6
  const pcie = ((part.pcieGen ?? 4) - 3) * 8
  const m2 = Math.min(part.m2Slots ?? 0, 3) * 5
  const wifi = /wifi/i.test(part.name) ? 4 : 0
  const atx = part.formFactor === 'ATX' ? 3 : 0
  return clamp(40 + highChipset + pcie + m2 + wifi + atx, 0, 100)
}

const CASE_TIERS: Record<string, number> = {
  'antec-vx310': 55,
  'xyz-airone-70': 58,
  'cm-nr200p': 78,
  'asus-a21': 68,
  'bequiet-501': 85,
  'antec-flux': 80,
  'hyte-y70': 82,
  'bequiet-900fx': 90,
  'rog-hyperion': 95,
}

function caseQuality(part: Part | undefined): number {
  if (!part) return 50
  return CASE_TIERS[part.id] ?? 55
}

function coolerQuality(part: Part | undefined, cpu: Part | undefined): number {
  if (!part) return 50
  if (part.included) return 55
  const thermal = clamp(
    ((part.coolerTdp ?? 0) / Math.max(cpu?.tdp ?? 65, 1)) * 65,
    0,
    100,
  )
  const type = part.coolerType === 'aio' ? 8 : 0
  const price = clamp((part.price / 120_000) * 100, 0, 100) * 0.15
  return clamp(thermal * 0.85 + type + price, 0, 100)
}

function psuQuality(part: Part | undefined, recommended: number): number {
  if (!part) return 50
  const efficiency = part.efficiency?.includes('Platinum')
    ? 100
    : part.efficiency?.includes('Gold')
      ? 85
      : part.efficiency?.includes('Bronze')
        ? 60
        : 50
  const headroom = clamp(
    ((part.wattage ?? 0) / Math.max(recommended, 1)) * 80,
    0,
    100,
  )
  return clamp(efficiency * 0.55 + headroom * 0.45, 0, 100)
}

function buildQuality(
  parts: Partial<Record<Category, Part[]>>,
  useCase: UseCase,
): number {
  const cpu = parts.cpu?.[0]
  const recommended = recommendedPsuFor({
    cpu: cpu ? [cpu.id] : [],
    gpu: parts.gpu?.[0] ? [parts.gpu[0].id] : [],
    cooler: parts.cooler?.[0] ? [parts.cooler[0].id] : [],
    storage: (parts.storage ?? []).map((part) => part.id),
  })
  const entries: Array<{ part: Part | undefined; weight: number; score: number }> = [
    {
      part: parts.motherboard?.[0],
      weight: 0.2,
      score: motherboardQuality(parts.motherboard?.[0]),
    },
    {
      part: parts.ram?.[0],
      weight: 0.15,
      score: parts.ram?.[0] ? ramPerfScore(parts.ram[0], useCase) : 50,
    },
    {
      part: parts.storage?.[0],
      weight: 0.15,
      score: parts.storage?.[0] ? storagePerfScore(parts.storage[0], useCase) : 50,
    },
    {
      part: parts.psu?.[0],
      weight: 0.2,
      score: psuQuality(parts.psu?.[0], recommended),
    },
    {
      part: parts.case?.[0],
      weight: 0.15,
      score: caseQuality(parts.case?.[0]),
    },
    {
      part: parts.cooler?.[0],
      weight: 0.15,
      score: coolerQuality(parts.cooler?.[0], cpu),
    },
  ]

  let score = 0
  let weight = 0
  for (const entry of entries) {
    if (!entry.part) continue
    score += entry.score * entry.weight
    weight += entry.weight
  }

  let penalty = 0
  const mobo = parts.motherboard?.[0]
  const gpu = parts.gpu?.[0]
  const psu = parts.psu?.[0]
  const pcCase = parts.case?.[0]
  const cooler = parts.cooler?.[0]
  if (cpu && mobo && (cpu.tdp ?? 0) >= 105 && motherboardQuality(mobo) < 65) {
    penalty += 10
  }
  if (gpu && psu && (gpu.perf ?? 0) >= 50 && !/Gold|Platinum/i.test(psu.efficiency ?? '')) {
    penalty += 10
  }
  if (gpu && pcCase && (gpu.perf ?? 0) >= 50 && caseQuality(pcCase) < 65) {
    penalty += 6
  }
  if (cpu && cooler && (cpu.tdp ?? 0) >= 105 && coolerQuality(cooler, cpu) < 70) {
    penalty += 6
  }

  return weight > 0 ? clamp(score / weight - penalty, 0, 100) : 50
}

function compactScore(parts: Partial<Record<Category, Part[]>>): number {
  const pcCase = parts.case?.[0]
  const mobo = parts.motherboard?.[0]
  if (pcCase?.id === 'cm-nr200p') return 100
  if (mobo?.formFactor === 'Mini-ITX') return 75
  if (pcCase?.id === 'asus-a21') return 70
  if (pcCase?.id === 'antec-vx310' || pcCase?.id === 'xyz-airone-70') return 60
  return 30
}

function quietScore(parts: Partial<Record<Category, Part[]>>): number {
  const pcCase = parts.case?.[0]
  const cooler = parts.cooler?.[0]
  const psu = parts.psu?.[0]
  let score = 50
  if (pcCase?.brand === 'Be Quiet!') score += 30
  else if (/mesh|airflow/i.test(pcCase?.name ?? '')) score += 8
  if (cooler?.coolerType === 'aio') score += 8
  else if ((cooler?.coolerTdp ?? 0) >= 200) score += 8
  if (psu?.efficiency?.includes('Gold') || psu?.efficiency?.includes('Platinum')) {
    score += 8
  }
  if (pcCase?.id === 'cm-nr200p') score += 4
  return clamp(score, 0, 100)
}

function valueScore(performance: number, total: number): number {
  if (total <= 0) return 0
  return clamp((performance / (total / 1_000_000)) * 1.5, 0, 100)
}

/* ------------------------------------------------------------------ */
/* Beam search                                                        */
/* ------------------------------------------------------------------ */

interface SearchProfile {
  id: string
  performance: number
  quality: number
  value: number
  compact: number
  quiet: number
  spend: number
  platform?: 'AMD' | 'Intel'
  strictCompact: boolean
}

const BASE_PROFILES: SearchProfile[] = [
  {
    id: 'performance',
    performance: 0.75,
    quality: 0.1,
    value: 0.05,
    compact: 0,
    quiet: 0,
    spend: 0.1,
    strictCompact: false,
  },
  {
    id: 'balanced',
    performance: 0.55,
    quality: 0.25,
    value: 0.15,
    compact: 0,
    quiet: 0,
    spend: 0.05,
    strictCompact: false,
  },
  {
    id: 'value',
    performance: 0.35,
    quality: 0.15,
    value: 0.45,
    compact: 0,
    quiet: 0,
    spend: -0.1,
    strictCompact: false,
  },
  {
    id: 'frugal',
    performance: 0.2,
    quality: 0.1,
    value: 0.7,
    compact: 0,
    quiet: 0,
    spend: -0.2,
    strictCompact: false,
  },
  {
    id: 'quality',
    performance: 0.45,
    quality: 0.35,
    value: 0.1,
    compact: 0.05,
    quiet: 0.05,
    spend: 0,
    strictCompact: false,
  },
]

const COMPACT_PROFILES: SearchProfile[] = [
  {
    id: 'compact-performance',
    performance: 0.6,
    quality: 0.1,
    value: 0.05,
    compact: 0.2,
    quiet: 0.05,
    spend: 0.1,
    strictCompact: true,
  },
  {
    id: 'compact-balanced',
    performance: 0.45,
    quality: 0.2,
    value: 0.1,
    compact: 0.2,
    quiet: 0.05,
    spend: 0.05,
    strictCompact: true,
  },
  {
    id: 'compact-value',
    performance: 0.3,
    quality: 0.15,
    value: 0.35,
    compact: 0.15,
    quiet: 0.05,
    spend: -0.1,
    strictCompact: true,
  },
  {
    id: 'compact-frugal',
    performance: 0.2,
    quality: 0.1,
    value: 0.6,
    compact: 0.15,
    quiet: 0.05,
    spend: -0.2,
    strictCompact: true,
  },
]

const CHEAPEST_PROFILE: SearchProfile = {
  id: 'cheapest',
  performance: 0.05,
  quality: 0.05,
  value: 0.1,
  compact: 0,
  quiet: 0,
  spend: -0.8,
  strictCompact: false,
}

interface BeamState {
  selections: Selections
  parts: Partial<Record<Category, Part[]>>
  total: number
  score: number
}

function minRemainingCost(
  category: Category,
  selections: Selections,
  useCase: UseCase,
): number {
  const index = CATEGORY_ORDER.indexOf(category)
  let total = 0
  for (let i = index + 1; i < CATEGORY_ORDER.length; i += 1) {
    const next = CATEGORY_ORDER[i]
    if (selections[next]?.length) continue
    if (next === 'gpu') {
      if (USE_CASES[useCase].requiresGpu) total += MIN_PRICE.gpu
      continue
    }
    if (next === 'cooler') {
      const cpu = selections.cpu?.[0]
      if (cpu) {
        const cpuPart = PARTS_BY_CATEGORY.cpu.find((part) => part.id === cpu)
        if (cpuPart?.stockCooler) continue
      }
      total += 12_350
      continue
    }
    total += MIN_PRICE[next]
  }
  return total
}

function isHighEndCpu(part: Part | undefined): boolean {
  return Boolean(part && ((part.tdp ?? 0) >= 105 || (part.perf ?? 0) >= 75))
}

function isHighEndGpu(part: Part | undefined): boolean {
  return Boolean(part && (part.perf ?? 0) >= 50)
}

function optionsFor(
  category: Category,
  state: BeamState,
  input: OptimizerInput,
  strictCompact: boolean,
): Array<Part | undefined> {
  const config = USE_CASES[input.useCase]
  const cpu = state.parts.cpu?.[0]
  const mobo = state.parts.motherboard?.[0]
  const gpu = state.parts.gpu?.[0]
  const pcCase = state.parts.case?.[0]
  const ram = state.parts.ram?.[0]
  const psu = state.parts.psu?.[0]
  const cooler = state.parts.cooler?.[0]

  // Cuando la fuente, el gabinete o la mother están fijos y no son de gama
  // alta, evitamos que el resto de la build suba de gama y quede desbalanceada.
  const lowQualitySupport =
    (psu !== undefined && !/Gold|Platinum/i.test(psu.efficiency ?? '')) ||
    (pcCase !== undefined && caseQuality(pcCase) < 60) ||
    (mobo !== undefined && motherboardQuality(mobo) < 60)

  if (category === 'gpu') {
    if (!config.requiresGpu) return [undefined]
    return (PARTS_BY_CATEGORY.gpu ?? []).filter((part) => {
      if (pcCase && (part.gpuLength ?? 0) > (pcCase.maxGpuLength ?? 0)) return false
      if (
        mobo &&
        ((mobo.pcieGen ?? 3) < 4 ||
          /h610|a520/i.test(mobo.id) ||
          /H610|A520/i.test(mobo.name))
      ) {
        return false
      }
      if (lowQualitySupport && isHighEndGpu(part)) return false
      if (psu) {
        const watts = estimateWatts({ ...state.selections, gpu: [part.id] })
        const recommended = Math.max(450, Math.ceil((watts * 1.35) / 50) * 50)
        if ((psu.wattage ?? 0) < recommended) return false
      }
      return true
    })
  }

  if (category === 'cpu') {
    const cpus = (PARTS_BY_CATEGORY.cpu ?? []).filter((part) => {
      if ((part.perf ?? 0) < config.minCpuPerf) return false
      if (!config.requiresGpu && !part.igpu) return false
      if (mobo && part.socket !== mobo.socket) return false
      if (cooler) {
        if (
          cooler.supportedSockets &&
          !cooler.supportedSockets.includes(part.socket ?? 'AM4')
        ) {
          return false
        }
        if (cooler.included && !part.stockCooler) return false
        if ((cooler.coolerTdp ?? 0) < (part.tdp ?? 0)) return false
      }
      if (lowQualitySupport && isHighEndCpu(part)) return false
      if (psu) {
        const watts = estimateWatts({ ...state.selections, cpu: [part.id] })
        const recommended = Math.max(450, Math.ceil((watts * 1.35) / 50) * 50)
        if ((psu.wattage ?? 0) < recommended) return false
      }
      if (strictCompact) {
        return compatibleMotherboards(part, true).length > 0
      }
      return true
    })
    return cpus
  }

  if (category === 'motherboard') {
    if (!cpu) return []
    const lockedStorage = state.parts.storage ?? []
    const nvmeCount = lockedStorage.filter((drive) =>
      drive.interface?.includes('NVMe'),
    ).length
    const boards = compatibleMotherboards(cpu, strictCompact)
      .filter(
        (moboOption) =>
          strictCompact ||
          input.preference === 'compact' ||
          moboOption.formFactor !== 'Mini-ITX',
      )
      .filter((moboOption) => {
        if (ram) {
          if (moboOption.ramType !== ram.ramType) return false
          if ((ram.modules ?? 1) > (moboOption.ramSlots ?? 2)) return false
        }
        if (
          pcCase &&
          !(pcCase.supportedFormFactors ?? []).includes(
            moboOption.formFactor ?? 'ATX',
          )
        ) {
          return false
        }
        if (gpu) {
          // Las GPU modernas rinden mejor en PCIe 4.0; evitamos chipsets
          // de entrada (H610/A520) en builds con gráfica dedicada.
          if ((moboOption.pcieGen ?? 3) < 4) return false
          if (
            /h610|a520/i.test(moboOption.id) ||
            /H610|A520/i.test(moboOption.name)
          ) {
            return false
          }
        }
        if (nvmeCount > (moboOption.m2Slots ?? 0)) return false
        if (
          (isHighEndCpu(cpu) || isHighEndGpu(gpu)) &&
          motherboardQuality(moboOption) < 60
        ) {
          return false
        }
        return true
      })
    return boards
  }

  if (category === 'ram') {
    if (!mobo) return []
    return compatibleRam(mobo, input.useCase)
  }

  if (category === 'case') {
    if (!mobo) return []
    const cases = compatibleCases(mobo, gpu, strictCompact).filter(
      (pcCaseOption) => {
        if (
          psu &&
          (pcCaseOption.psuFormSupport === 'SFX'
            ? psu.psuForm !== 'SFX'
            : psu.psuForm === 'SFX')
        ) {
          return false
        }
        if (
          cooler?.coolerType === 'air' &&
          (cooler.coolerHeight ?? 0) > (pcCaseOption.maxCoolerHeight ?? 0)
        ) {
          return false
        }
        if (
          cooler?.coolerType === 'aio' &&
          !(pcCaseOption.radiatorSupport ?? []).includes(cooler.radiator ?? 0)
        ) {
          return false
        }
        return true
      },
    )
    return isHighEndCpu(cpu) || isHighEndGpu(gpu)
      ? cases.filter((pcCaseOption) => caseQuality(pcCaseOption) >= 60)
      : cases
  }

  if (category === 'cooler') {
    if (!cpu || !pcCase) return []
    return compatibleCoolers(cpu, pcCase)
  }

  if (category === 'storage') {
    if (!mobo) return []
    const drives = compatibleStorage(mobo)
    if (input.useCase !== 'office') {
      return drives.filter((drive) => drive.interface?.includes('NVMe'))
    }
    return drives
  }

  if (category === 'psu') {
    if (!pcCase) return []
    const psus = compatiblePsus(state.selections, pcCase)
    return isHighEndCpu(cpu) || isHighEndGpu(gpu)
      ? psus.filter((psuOption) =>
          /Gold|Platinum/i.test(psuOption.efficiency ?? ''),
        )
      : psus
  }

  return []
}

function heuristicScore(
  state: BeamState,
  budget: number,
  input: OptimizerInput,
  profile: SearchProfile,
): number {
  const performance = performanceScore(state.parts, input.useCase)
  const quality = buildQuality(state.parts, input.useCase)
  const value = valueScore(performance, state.total)
  const compact = compactScore(state.parts)
  const quiet = quietScore(state.parts)
  const usage = budget > 0 ? state.total / budget : 0

  let score =
    profile.performance * performance +
    profile.quality * quality +
    profile.value * value +
    profile.compact * compact +
    profile.quiet * quiet +
    profile.spend * clamp(usage, 0, 1)

  const cpu = state.parts.cpu?.[0]
  if (profile.platform === 'AMD' && cpu?.brand === 'AMD') score += 2
  if (profile.platform === 'Intel' && cpu?.brand === 'Intel') score += 2
  return score
}

function beamSearch(
  input: OptimizerInput,
  profile: SearchProfile,
  budget: number,
): BeamState[] {
  const locked = input.locked
  const lockedParts = locked ? partsFromSelections(locked) : {}
  const lockedTotal = locked ? selectionsTotal(locked) : 0
  const strictCompact =
    profile.strictCompact && effectiveStrictCompact(input, locked)
  const initial: BeamState = {
    selections: locked ? { ...locked } : {},
    parts: lockedParts,
    total: lockedTotal,
    score: 0,
  }
  initial.score = heuristicScore(initial, budget, input, profile)
  let beam: BeamState[] = [initial]

  for (const category of CATEGORY_ORDER) {
    // Las piezas fijas se conservan tal cual: no generamos alternativas.
    if (locked?.[category]?.length) continue
    const next: BeamState[] = []
    for (const state of beam) {
      const options = optionsFor(category, state, input, strictCompact)
      for (const part of options) {
        const total = state.total + (part?.price ?? 0)
        if (total > budget) continue

        const selections: Selections = part
          ? { ...state.selections, [category]: [part.id] }
          : state.selections
        if (total + minRemainingCost(category, selections, input.useCase) > budget) {
          continue
        }

        const parts: Partial<Record<Category, Part[]>> = part
          ? { ...state.parts, [category]: [part] }
          : state.parts
        const partial: BeamState = { selections, parts, total, score: 0 }
        partial.score = heuristicScore(partial, budget, input, profile)
        next.push(partial)
      }
    }

    if (next.length === 0) return []

    const unique = new Map<string, BeamState>()
    for (const state of next) {
      const key = selectionKey(state.selections)
      const previous = unique.get(key)
      if (!previous || state.score > previous.score) unique.set(key, state)
    }

    beam = [...unique.values()]
      .sort((a, b) =>
        profile.id === 'cheapest' ? a.total - b.total : b.score - a.score,
      )
      .slice(0, BEAM_WIDTH)
  }

  return beam
}

/* ------------------------------------------------------------------ */
/* Evaluación final                                                   */
/* ------------------------------------------------------------------ */

interface Candidate {
  selections: Selections
  parts: Partial<Record<Category, Part[]>>
  total: number
  analysis: Analysis
  performance: number
  quality: number
  value: number
  compact: number
  quiet: number
}

function isCompleteBuild(analysis: Analysis): boolean {
  return (
    REQUIRED_CATEGORIES.every((category) => (analysis.selected[category]?.length ?? 0) > 0) &&
    analysis.missingRequired.length === 0 &&
    analysis.errors.length === 0 &&
    analysis.warnings.length === 0
  )
}

function toCandidate(state: BeamState, useCase: UseCase): Candidate | null {
  const analysis = analyze(state.selections)
  if (!isCompleteBuild(analysis)) return null
  const performance = performanceScore(state.parts, useCase)
  const quality = buildQuality(state.parts, useCase)
  return {
    selections: state.selections,
    parts: state.parts,
    total: state.total,
    analysis,
    performance,
    quality,
    value: valueScore(performance, state.total),
    compact: compactScore(state.parts),
    quiet: quietScore(state.parts),
  }
}

function collectCandidates(
  input: OptimizerInput,
  profiles: SearchProfile[],
  budget: number,
): Candidate[] {
  const candidates = new Map<string, Candidate>()
  for (const profile of profiles) {
    const states = beamSearch(input, profile, budget)
    for (const state of states) {
      const key = selectionKey(state.selections)
      if (candidates.has(key)) continue
      const candidate = toCandidate(state, input.useCase)
      if (candidate) candidates.set(key, candidate)
    }
  }
  return [...candidates.values()]
}

function profilesFor(input: OptimizerInput): SearchProfile[] {
  const withPlatforms = (profiles: SearchProfile[]) =>
    profiles.flatMap((profile) => [
      { ...profile, platform: 'AMD' as const },
      { ...profile, platform: 'Intel' as const },
    ])

  if (input.preference === 'compact') {
    return withPlatforms(COMPACT_PROFILES)
  }
  return withPlatforms(BASE_PROFILES)
}

function diversity(
  a: Candidate,
  b: Candidate,
  budget: number,
  broad = false,
): number {
  const categories = broad
    ? CATEGORY_ORDER
    : (['cpu', 'gpu', 'motherboard', 'case'] as Category[])
  let differences = 0
  for (const category of categories) {
    if ((a.selections[category] ?? []).join(',') !== (b.selections[category] ?? []).join(',')) {
      differences += 1
    }
  }
  if (Math.abs(a.total - b.total) > budget * 0.05) differences += 1
  return differences
}

const ARCHETYPES: Array<{
  id: ProposalId
  name: string
  tagline: string
  performanceWeight: number
  qualityWeight: number
  valueWeight: number
  performanceFloor: number
  qualityFloor: number
  usagePenalty: number
}> = [
  {
    id: 'max',
    name: 'Máximo rendimiento',
    tagline: 'La mayor potencia que entra en tu presupuesto.',
    performanceWeight: 1,
    qualityWeight: 0.2,
    valueWeight: 0.05,
    performanceFloor: 0.95,
    qualityFloor: 65,
    usagePenalty: 15,
  },
  {
    id: 'balanced',
    name: 'Equilibrada',
    tagline: 'El mejor equilibrio entre rendimiento, calidad y precio.',
    performanceWeight: 0.6,
    qualityWeight: 0.3,
    valueWeight: 0.1,
    performanceFloor: 0.85,
    qualityFloor: 70,
    usagePenalty: 60,
  },
  {
    id: 'value',
    name: 'Mejor valor',
    tagline: 'La mejor relación precio/rendimiento sin resignar lo esencial.',
    performanceWeight: 0.45,
    qualityWeight: 0.15,
    valueWeight: 0.4,
    performanceFloor: 0.72,
    qualityFloor: 60,
    usagePenalty: 40,
  },
]

type Archetype = (typeof ARCHETYPES)[number]

interface SelectedProposal {
  candidate: Candidate
  archetype: Archetype
}

function selectProposals(
  candidates: Candidate[],
  input: OptimizerInput,
): SelectedProposal[] {
  if (candidates.length === 0) return []
  const maxPerformance = Math.max(...candidates.map((candidate) => candidate.performance))
  const chosen: SelectedProposal[] = []
  const config = USE_CASES[input.useCase]
  const broadDiversity = Boolean(input.locked)
  const bias =
    input.preference === 'performance'
      ? { performance: 1.25, quality: 0.85, value: 0.6, usage: 0.75 }
      : input.preference === 'compact'
        ? { performance: 0.9, quality: 1.15, value: 0.75, usage: 1 }
        : { performance: 1, quality: 1, value: 1, usage: 1 }

  for (const archetype of ARCHETYPES) {
    let pool = candidates.filter(
      (candidate) =>
        candidate.performance >= maxPerformance * archetype.performanceFloor &&
        candidate.quality >= archetype.qualityFloor,
    )
    if (pool.length === 0) {
      pool = candidates.filter(
        (candidate) =>
          candidate.performance >= maxPerformance * 0.6 &&
          candidate.quality >= archetype.qualityFloor - 10,
      )
    }
    if (pool.length === 0) {
      pool = candidates.filter(
        (candidate) => candidate.performance >= maxPerformance * 0.6,
      )
    }
    if (pool.length === 0) pool = candidates

    const ranked = pool
      .map((candidate) => {
        const usage = candidate.total / input.budget
        const compactBonus = input.preference === 'compact' ? candidate.compact * 0.1 : 0
        const quietBonus = input.preference === 'compact' ? candidate.quiet * 0.05 : 0
        const score =
          archetype.performanceWeight * bias.performance * candidate.performance +
          archetype.qualityWeight * bias.quality * candidate.quality +
          archetype.valueWeight * bias.value * candidate.value +
          compactBonus +
          quietBonus -
          Math.abs(usage - config.targets[archetype.id]) * archetype.usagePenalty * bias.usage
        return { candidate, score }
      })
      .sort((a, b) => b.score - a.score)

    const picked = ranked.find(({ candidate }) =>
      chosen.every(
        ({ candidate: previous }) =>
          diversity(candidate, previous, input.budget, broadDiversity) >= 2,
      ),
    )?.candidate
    if (
      picked &&
      !chosen.some(
        ({ candidate }) =>
          selectionKey(candidate.selections) === selectionKey(picked.selections),
      )
    ) {
      chosen.push({ candidate: picked, archetype })
    }
  }

  // La propuesta de máximo rendimiento debe ser la de mayor rendimiento de
  // las tres; si la diversidad invirtió el orden, intercambiamos los
  // candidatos conservando las etiquetas.
  if (chosen.length >= 2) {
    const maxEntry = chosen.find((entry) => entry.archetype.id === 'max')
    const balancedEntry = chosen.find((entry) => entry.archetype.id === 'balanced')
    if (
      maxEntry &&
      balancedEntry &&
      maxEntry.candidate.performance < balancedEntry.candidate.performance
    ) {
      const stronger = balancedEntry.candidate
      balancedEntry.candidate = maxEntry.candidate
      maxEntry.candidate = stronger
    }
  }

  // La propuesta de mejor valor debe ser la más económica de las tres;
  // si el azar de la diversidad invirtió el orden, intercambiamos los
  // candidatos pero conservamos las etiquetas.
  if (chosen.length === 3 && chosen[2].candidate.total > chosen[1].candidate.total) {
    const cheaper = chosen[1].candidate
    chosen[1].candidate = chosen[2].candidate
    chosen[2].candidate = cheaper
  }

  // Si la diversidad dejó una sola propuesta, sumamos la mejor alternativa
  // restante para cumplir con el mínimo de dos.
  if (chosen.length < 2) {
    const missingArchetype =
      ARCHETYPES.find(
        (archetype) =>
          !chosen.some((entry) => entry.archetype.id === archetype.id),
      ) ?? ARCHETYPES[1]
    const remaining = candidates
      .filter(
        (candidate) =>
          !chosen.some(
            (entry) =>
              selectionKey(entry.candidate.selections) === selectionKey(candidate.selections),
          ),
      )
      .sort((a, b) => {
        const score = (candidate: Candidate) =>
          candidate.performance +
          candidate.quality * 0.4 +
          candidate.value * 0.3 -
          (candidate.total / input.budget) * 10
        return score(b) - score(a)
      })
    if (remaining[0]) {
      chosen.push({ candidate: remaining[0], archetype: missingArchetype })
    }
  }

  return chosen
}

function partName(parts: Partial<Record<Category, Part[]>>, category: Category): string {
  return parts[category]?.[0]?.name ?? '—'
}

function badgesFor(candidate: Candidate): string[] {
  const cpu = candidate.parts.cpu?.[0]
  const gpu = candidate.parts.gpu?.[0]
  const ram = candidate.parts.ram?.[0]
  const storage = candidate.parts.storage?.[0]
  const psu = candidate.parts.psu?.[0]
  const mobo = candidate.parts.motherboard?.[0]
  const cooler = candidate.parts.cooler?.[0]
  const badges: string[] = []
  if (cpu?.brand) badges.push(cpu.brand)
  if (candidate.compact >= 90) badges.push('ITX')
  if (gpu?.vram) badges.push(`${gpu.vram} GB VRAM`)
  if (ram?.capacityGb) badges.push(`${ram.capacityGb} GB ${ram.ramType}`)
  if (storage?.capacity) {
    badges.push(`${storage.capacity} ${storage.interface?.includes('NVMe') ? 'NVMe' : 'SSD'}`)
  }
  if (psu?.efficiency) badges.push(psu.efficiency.replace('80+ ', ''))
  if (mobo && /wifi/i.test(mobo.name)) badges.push('WiFi')
  if (cooler?.coolerType === 'aio') badges.push('AIO')
  return badges.slice(0, 6)
}

function highlightsFor(candidate: Candidate): string[] {
  const cpu = candidate.parts.cpu?.[0]
  const gpu = candidate.parts.gpu?.[0]
  const ram = candidate.parts.ram?.[0]
  const storage = candidate.parts.storage?.[0]
  const psu = candidate.parts.psu?.[0]
  const pcCase = candidate.parts.case?.[0]
  const highlights: string[] = []
  if (cpu) {
    highlights.push(
      `${cpu.cores ?? '?'} núcleos${cpu.threads ? ` / ${cpu.threads} hilos` : ''}`,
    )
  }
  if (gpu) {
    // Varios nombres del catálogo ya incluyen la VRAM ("RX 9070 16 GB"):
    // evitamos repetirla al final del highlight.
    const shortName = gpu.name.replace(/^.*?(RTX|RX|Arc)\s?/, '$1 ')
    const vram = gpu.vram ? `${gpu.vram} GB` : null
    highlights.push(
      vram && !shortName.includes(vram) ? `${shortName} · ${vram}` : shortName,
    )
  } else {
    highlights.push('Gráficos integrados')
  }
  if (ram) {
    highlights.push(`${ram.capacityGb} GB${(ram.modules ?? 1) > 1 ? ' dual channel' : ''}`)
  }
  if (storage) {
    highlights.push(`${storage.capacity} ${storage.interface?.includes('NVMe') ? 'NVMe' : 'SSD'}`)
  }
  if (psu) highlights.push(`${psu.wattage} W ${psu.efficiency ?? ''}`.trim())
  if (pcCase && candidate.compact >= 90) highlights.push('Gabinete Mini-ITX')
  return highlights
}

function toProposal(
  candidate: Candidate,
  archetype: (typeof ARCHETYPES)[number],
  input: OptimizerInput,
  recommended: boolean,
  lockedCategories: Category[],
): OptimizerProposal {
  const cpu = candidate.parts.cpu?.[0]
  const gpu = candidate.parts.gpu?.[0]
  const ram = candidate.parts.ram?.[0]
  const storage = candidate.parts.storage?.[0]
  const platform = cpu?.brand ?? 'Mixto'
  const description = [
    `${partName(candidate.parts, 'cpu')}`,
    gpu ? `${partName(candidate.parts, 'gpu')}` : 'gráficos integrados',
    ram ? `${ram.capacityGb} GB` : null,
    storage ? `${storage.capacity} ${storage.interface?.includes('NVMe') ? 'NVMe' : 'SSD'}` : null,
  ]
    .filter(Boolean)
    .join(' + ')

  return {
    id: archetype.id,
    name: archetype.name,
    tagline: archetype.tagline,
    description,
    selections: candidate.selections,
    total: candidate.total,
    budget: input.budget,
    remaining: input.budget - candidate.total,
    analysis: candidate.analysis,
    performance: Math.round(candidate.performance),
    quality: Math.round(candidate.quality),
    value: Math.round(candidate.value),
    compact: Math.round(candidate.compact),
    recommended,
    badges: [platform, ...badgesFor(candidate)].filter(
      (badge, index, list) => list.indexOf(badge) === index,
    ),
    highlights: highlightsFor(candidate),
    lockedCategories,
  }
}

/* ------------------------------------------------------------------ */
/* Búsqueda de mínimo y API pública                                   */
/* ------------------------------------------------------------------ */

function cheapestFor(input: OptimizerInput, budget: number): Candidate | null {
  const states = beamSearch(
    input,
    { ...CHEAPEST_PROFILE, strictCompact: input.preference === 'compact' },
    budget,
  )
  let cheapest: Candidate | null = null
  for (const state of states) {
    const candidate = toCandidate(state, input.useCase)
    if (!candidate) continue
    if (!cheapest || candidate.total < cheapest.total) cheapest = candidate
  }
  return cheapest
}

function minimumBudgetFor(input: OptimizerInput): number | null {
  // Para la preferencia compacta el mínimo relevante es el de la build más
  // económica con gabinete chico (aunque no sea Mini-ITX), porque el motor
  // relaja ese requisito cuando el presupuesto no alcanza.
  const effective = input.preference === 'compact' ? { ...input, preference: 'balanced' as const } : input
  return cheapestFor(effective, HUGE_BUDGET)?.total ?? null
}

function fallbackMessage(input: OptimizerInput, minimum: number | null): string {
  const config = USE_CASES[input.useCase]
  const locked = Boolean(input.locked)
  const base = `una build completa de ${config.label.toLowerCase()}${locked ? ' manteniendo tus piezas fijas' : ''}`
  if (minimum) {
    const suffix = locked
      ? ' La opción más económica con esas piezas ronda '
      : input.preference === 'compact'
        ? ' La opción más económica con gabinete chico ronda '
        : ' La más económica que encontramos ronda '
    return `Con ${formatBudget(input.budget)} no alcanza para ${base}.${suffix}${formatBudget(minimum)}.`
  }
  return `No encontramos ${base} y compatible con ese presupuesto.`
}

function formatBudget(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function optimizeBuild(input: OptimizerInput): OptimizerResult {
  const budget = Math.round(input.budget)
  const locked = normalizeLocked(input.locked)
  const normalized: OptimizerInput = { ...input, budget, locked }
  const lockedInfo = lockedSummary(locked)

  if (locked) {
    const issues = lockedIssues(normalized, locked)
    if (issues.length > 0) {
      return {
        ok: false,
        reason: 'locked-conflict',
        budget,
        useCase: normalized.useCase,
        preference: normalized.preference,
        minimumBudget: null,
        message:
          'Tu build actual tiene conflictos que no podemos resolver manteniendo esas piezas fijas.',
        details: issues,
      }
    }

    if (lockedInfo.total > budget) {
      const minimum = minimumBudgetFor(normalized)
      return {
        ok: false,
        reason: 'no-build',
        budget,
        useCase: normalized.useCase,
        preference: normalized.preference,
        minimumBudget: minimum,
        message: `Tus piezas fijas ya suman ${formatBudget(lockedInfo.total)} y el presupuesto es ${formatBudget(budget)}. Subí el presupuesto o destrabá alguna pieza.`,
        details: [
          'Las piezas fijas se cuentan dentro del presupuesto de la torre.',
        ],
      }
    }
  }

  if (!Number.isFinite(budget) || budget < MIN_SENSIBLE_BUDGET) {
    const minimum = minimumBudgetFor(normalized)
    return {
      ok: false,
      reason: 'budget-too-low',
      budget,
      useCase: normalized.useCase,
      preference: normalized.preference,
      minimumBudget: minimum,
      message: fallbackMessage(normalized, minimum),
    }
  }

  let candidates = collectCandidates(normalized, profilesFor(normalized), budget)
  const compactLocked =
    normalized.preference === 'compact' &&
    Boolean(locked) &&
    !effectiveStrictCompact(normalized, locked)
  let note = compactLocked
    ? 'Mantenemos tus piezas actuales, así que la propuesta no es Mini-ITX. El resto se elige priorizando un formato chico y silencioso.'
    : undefined

  // Si la preferencia compacta no encuentra suficientes opciones, relajamos el
  // requisito de Mini-ITX y priorizamos igual los formatos chicos.
  if (normalized.preference === 'compact' && candidates.length < 2) {
    const relaxedProfiles = profilesFor({ ...normalized, preference: 'balanced' }).map(
      (profile) => ({
        ...profile,
        compact: profile.compact + 0.15,
        quiet: profile.quiet + 0.05,
      }),
    )
    const relaxed = collectCandidates(normalized, relaxedProfiles, budget)
    if (relaxed.length > 0) {
      candidates = relaxed
      note =
        note ??
        'Con este presupuesto no entra una build Mini-ITX completa. Priorizamos gabinetes chicos y componentes silenciosos.'
    }
  }

  if (candidates.length === 0) {
    const minimum = minimumBudgetFor(normalized)
    return {
      ok: false,
      reason: 'no-build',
      budget,
      useCase: normalized.useCase,
      preference: normalized.preference,
      minimumBudget: minimum,
      message: fallbackMessage(normalized, minimum),
    }
  }

  const selected = selectProposals(candidates, normalized)
  const preferredId = normalized.preference === 'performance' ? 'max' : 'balanced'
  const preferredIndex = selected.findIndex(
    (entry) => entry.archetype.id === preferredId,
  )
  const fallbackIndex =
    normalized.preference === 'performance'
      ? selected.findIndex((entry) => entry.archetype.id === 'balanced')
      : selected.findIndex((entry) => entry.archetype.id !== 'max')
  const recommendedIndex =
    preferredIndex >= 0 ? preferredIndex : fallbackIndex >= 0 ? fallbackIndex : 0
  const proposals = selected.map((entry, index) =>
    toProposal(
      entry.candidate,
      entry.archetype,
      normalized,
      index === recommendedIndex,
      lockedInfo.categories,
    ),
  )

  return {
    ok: true,
    proposals,
    budget,
    useCase: normalized.useCase,
    preference: normalized.preference,
    note,
    lockedCount: lockedInfo.count,
    lockedTotal: lockedInfo.total,
  }
}
