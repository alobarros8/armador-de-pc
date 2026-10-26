import { describe, expect, it } from 'vitest'
import { getPart } from '../data/catalog'
import { analyze } from './compat'
import {
  optimizeBuild,
  type OptimizerProposal,
  type OptimizerResult,
  type Preference,
  type UseCase,
} from './optimizer'
import type { Category, Selections } from '../types'

const REQUIRED_CATEGORIES: Category[] = ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'case']
const LOW_TIER_CASES = new Set(['antec-vx310', 'xyz-airone-70'])
const SELECTION_CATEGORIES: Category[] = [...REQUIRED_CATEGORIES, 'gpu', 'cooler']

const LOCKED_BUILD: Selections = {
  cpu: ['intel-i3-12100f'],
  cooler: ['stock-intel'],
  motherboard: ['asus-prime-b760m-k-d4'],
  ram: ['ddr4-16-3200-kit'],
  gpu: ['rtx-3050'],
  storage: ['nvme-500'],
  psu: ['antec-750-bronze'],
  case: ['xyz-airone-70'],
}
const LOCKED_BUILD_TOTAL = Object.values(LOCKED_BUILD)
  .flat()
  .reduce((total, id) => total + (getPart(id)?.price ?? 0), 0)

function expectOk(result: OptimizerResult): Extract<OptimizerResult, { ok: true }> {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result
}

function partOf(proposal: OptimizerProposal, category: Category) {
  const part = getPart(proposal.selections[category]?.[0])
  expect(part, `falta ${category} en la propuesta ${proposal.id}`).toBeDefined()
  if (!part) throw new Error(`falta ${category} en la propuesta ${proposal.id}`)
  return part
}

function selectionKey(proposal: OptimizerProposal): string {
  return SELECTION_CATEGORIES.map(
    (category) => `${category}:${(proposal.selections[category] ?? []).join(',')}`,
  ).join('|')
}

function expectValidProposal(
  proposal: OptimizerProposal,
  useCase: UseCase,
  budget: number,
  preference: Preference,
) {
  // La build entra en presupuesto y el análisis coincide con el total mostrado.
  expect(proposal.total).toBeLessThanOrEqual(budget)
  expect(proposal.budget).toBe(budget)
  expect(proposal.remaining).toBe(budget - proposal.total)
  expect(proposal.analysis.total).toBe(proposal.total)

  const analysis = analyze(proposal.selections)
  expect(analysis.total).toBe(proposal.total)
  expect(analysis.isComplete).toBe(true)
  expect(analysis.missingRequired).toEqual([])
  expect(analysis.errors).toEqual([])
  expect(analysis.warnings).toEqual([])

  for (const category of REQUIRED_CATEGORIES) {
    expect(
      proposal.selections[category]?.length ?? 0,
      `la propuesta ${proposal.id} no incluye ${category}`,
    ).toBeGreaterThan(0)
  }

  // El presupuesto y la propuesta cubren solo la torre.
  for (const category of ['monitor', 'keyboard', 'mouse', 'headset', 'extra'] as Category[]) {
    expect(proposal.selections[category] ?? []).toHaveLength(0)
  }

  const cpu = partOf(proposal, 'cpu')

  if (useCase === 'office') {
    // Oficina usa solo gráficos integrados.
    expect(proposal.selections.gpu?.[0]).toBeUndefined()
    expect(cpu.igpu).toBe(true)
  } else {
    const gpu = partOf(proposal, 'gpu')
    expect(gpu.category).toBe('gpu')

    const ram = partOf(proposal, 'ram')
    expect(ram.modules ?? 1).toBeGreaterThanOrEqual(2)
    const minRam =
      useCase === 'gaming-1440' || useCase === 'editing' || useCase === 'streaming' ? 32 : 16
    expect(ram.capacityGb ?? 0).toBeGreaterThanOrEqual(minRam)

    expect(partOf(proposal, 'storage').interface).toContain('NVMe')

    // Con GPU dedicada exigimos PCIe 4.0 y descartamos chipsets de entrada.
    const mobo = partOf(proposal, 'motherboard')
    expect(mobo.pcieGen ?? 0).toBeGreaterThanOrEqual(4)
    expect(mobo.id).not.toMatch(/h610|a520/)
    if (preference !== 'compact') {
      expect(mobo.formFactor).not.toBe('Mini-ITX')
    }
  }

  // Los pares de gama alta piden fuente Gold/Platinum, mother moderna y
  // un gabinete con buen flujo de aire.
  const gpu = getPart(proposal.selections.gpu?.[0])
  const highEnd =
    (cpu.tdp ?? 0) >= 105 || (cpu.perf ?? 0) >= 75 || (gpu?.perf ?? 0) >= 50
  if (highEnd) {
    expect(partOf(proposal, 'psu').efficiency).toMatch(/Gold|Platinum/)
    expect(LOW_TIER_CASES.has(partOf(proposal, 'case').id)).toBe(false)
    expect(partOf(proposal, 'motherboard').pcieGen ?? 0).toBeGreaterThanOrEqual(4)
  }
}

function expectValidResult(
  result: OptimizerResult,
  useCase: UseCase,
  budget: number,
  preference: Preference,
) {
  const ok = expectOk(result)
  expect(ok.budget).toBe(budget)
  expect(ok.useCase).toBe(useCase)
  expect(ok.preference).toBe(preference)
  expect(ok.proposals.length).toBeGreaterThanOrEqual(2)
  expect(ok.proposals.length).toBeLessThanOrEqual(3)

  const ids = ok.proposals.map((proposal) => proposal.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const proposal of ok.proposals) {
    expectValidProposal(proposal, useCase, budget, preference)
  }

  // Las propuestas tienen que ser builds distintas, no variantes de la misma.
  const keys = ok.proposals.map(selectionKey)
  expect(new Set(keys).size).toBe(ok.proposals.length)

  // Una sola recomendación, alineada con la preferencia elegida.
  const recommended = ok.proposals.filter((proposal) => proposal.recommended)
  expect(recommended).toHaveLength(1)
  expect(recommended[0].id).toBe(preference === 'performance' ? 'max' : 'balanced')

  // La opción de máximo rendimiento debe liderar el índice de rendimiento y
  // la de mejor valor debe ser la más económica de las tres.
  const max = ok.proposals.find((proposal) => proposal.id === 'max')
  const value = ok.proposals.find((proposal) => proposal.id === 'value')
  if (max) {
    for (const proposal of ok.proposals) {
      if (proposal.id !== 'max') {
        expect(max.performance).toBeGreaterThanOrEqual(proposal.performance)
      }
    }
  }
  if (value) {
    for (const proposal of ok.proposals) {
      if (proposal.id !== 'value') {
        expect(value.total).toBeLessThanOrEqual(proposal.total)
      }
    }
  }

  // La opción de mejor valor nunca puede salir más cara que la equilibrada.
  const balanced = ok.proposals.find((proposal) => proposal.id === 'balanced')
  if (balanced && value) {
    expect(value.total).toBeLessThanOrEqual(balanced.total)
  }

  return ok
}

describe('optimizeBuild', () => {
  it('arma builds completas y compatibles para gaming 1080p', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 1_800_000, useCase: 'gaming-1080', preference: 'balanced' }),
      'gaming-1080',
      1_800_000,
      'balanced',
    )
    expect(result.proposals.length).toBe(3)
    expect(result.note).toBeUndefined()

    for (const proposal of result.proposals) {
      const gpuHighlight = proposal.highlights.find((highlight) => /RTX|RX|Arc/.test(highlight))
      expect(gpuHighlight).toBeDefined()
      // El nombre ya incluye la VRAM: no debe repetirse como "RX 9070 16 GB · 16 GB".
      expect(gpuHighlight).not.toMatch(/(\d+) GB · \1 GB/)
    }
  })

  it('usa 32 GB, PCIe 4.0 y fuente Gold para gaming 1440p', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 3_000_000, useCase: 'gaming-1440', preference: 'balanced' }),
      'gaming-1440',
      3_000_000,
      'balanced',
    )
    expect(result.proposals.length).toBe(3)

    for (const proposal of result.proposals) {
      expect(partOf(proposal, 'ram').capacityGb ?? 0).toBeGreaterThanOrEqual(32)
      expect(partOf(proposal, 'psu').efficiency).toMatch(/Gold|Platinum/)
      expect(LOW_TIER_CASES.has(partOf(proposal, 'case').id)).toBe(false)
    }
  })

  it('prioriza CPU, 32 GB y NVMe para edición', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 2_800_000, useCase: 'editing', preference: 'balanced' }),
      'editing',
      2_800_000,
      'balanced',
    )
    expect(result.proposals.length).toBe(3)

    for (const proposal of result.proposals) {
      expect(partOf(proposal, 'ram').capacityGb ?? 0).toBeGreaterThanOrEqual(32)
      expect(partOf(proposal, 'storage').interface).toContain('NVMe')
      expect(partOf(proposal, 'gpu').category).toBe('gpu')
    }
  })

  it('recomienda la opción de máximo rendimiento para streaming', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 3_000_000, useCase: 'streaming', preference: 'performance' }),
      'streaming',
      3_000_000,
      'performance',
    )
    expect(result.proposals.length).toBe(3)
    expect(result.proposals.find((proposal) => proposal.recommended)?.id).toBe('max')

    for (const proposal of result.proposals) {
      expect(partOf(proposal, 'ram').capacityGb ?? 0).toBeGreaterThanOrEqual(32)
      expect(partOf(proposal, 'storage').interface).toContain('NVMe')
      expect(partOf(proposal, 'gpu').category).toBe('gpu')
    }
  })

  it('usa solo iGPU en builds de oficina', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 1_200_000, useCase: 'office', preference: 'balanced' }),
      'office',
      1_200_000,
      'balanced',
    )
    expect(result.proposals.length).toBe(3)

    for (const proposal of result.proposals) {
      expect(proposal.selections.gpu?.[0]).toBeUndefined()
      expect(partOf(proposal, 'cpu').igpu).toBe(true)
    }
  })

  it('relaja Mini-ITX con una nota cuando el presupuesto no alcanza', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 1_200_000, useCase: 'office', preference: 'compact' }),
      'office',
      1_200_000,
      'compact',
    )
    expect(result.note).toBeTruthy()
    expect(result.note).toContain('Mini-ITX')
    for (const proposal of result.proposals) {
      expect(proposal.selections.case?.[0]).not.toBe('cm-nr200p')
    }
  })

  it('arma builds Mini-ITX completas cuando el presupuesto lo permite', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 3_200_000, useCase: 'gaming-1440', preference: 'compact' }),
      'gaming-1440',
      3_200_000,
      'compact',
    )
    expect(result.note).toBeUndefined()
    expect(result.proposals.length).toBe(3)

    for (const proposal of result.proposals) {
      expect(partOf(proposal, 'case').id).toBe('cm-nr200p')
      expect(partOf(proposal, 'motherboard').formFactor).toBe('Mini-ITX')
      expect(partOf(proposal, 'psu').psuForm).toBe('SFX')
      expect(proposal.compact).toBeGreaterThanOrEqual(90)
    }
  })

  it('devuelve al menos dos propuestas en presupuestos ajustados', () => {
    const result = expectValidResult(
      optimizeBuild({ budget: 1_400_000, useCase: 'gaming-1080', preference: 'balanced' }),
      'gaming-1080',
      1_400_000,
      'balanced',
    )
    expect(result.proposals.length).toBeGreaterThanOrEqual(2)
    expect(result.proposals.length).toBeLessThanOrEqual(3)
  })

  it('explica el presupuesto mínimo cuando no alcanza', () => {
    const result = optimizeBuild({
      budget: 1_200_000,
      useCase: 'gaming-1080',
      preference: 'balanced',
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('esperaba un resultado sin build')

    expect(result.reason).toBe('no-build')
    expect(result.minimumBudget).not.toBeNull()
    expect(result.minimumBudget ?? 0).toBeGreaterThan(result.budget)
    expect(result.message).toContain('no alcanza')
  })

  it('rechaza presupuestos por debajo del mínimo razonable', () => {
    const result = optimizeBuild({
      budget: 250_000,
      useCase: 'gaming-1080',
      preference: 'balanced',
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('esperaba un resultado sin build')

    expect(result.reason).toBe('budget-too-low')
    expect(result.minimumBudget).not.toBeNull()
    expect(result.minimumBudget ?? 0).toBeGreaterThan(result.budget)
    expect(result.message).toContain('no alcanza')
  })

  it('mantiene las piezas fijas y completa el resto de la torre', () => {
    const locked: Selections = {
      cpu: ['intel-i3-12100f'],
      case: ['xyz-airone-70'],
    }
    const budget = 2_000_000
    const result = expectValidResult(
      optimizeBuild({
        budget,
        useCase: 'gaming-1080',
        preference: 'balanced',
        locked,
      }),
      'gaming-1080',
      budget,
      'balanced',
    )

    expect(result.lockedCount).toBe(2)
    expect(result.lockedTotal).toBe(
      (getPart('intel-i3-12100f')?.price ?? 0) +
        (getPart('xyz-airone-70')?.price ?? 0),
    )
    expect(result.proposals.length).toBeGreaterThanOrEqual(2)

    for (const proposal of result.proposals) {
      expect(proposal.selections.cpu).toEqual(locked.cpu)
      expect(proposal.selections.case).toEqual(locked.case)
      expect(proposal.lockedCategories).toEqual(
        expect.arrayContaining(['cpu', 'case']),
      )
      expect(proposal.total).toBeGreaterThanOrEqual(result.lockedTotal)
    }
  })

  it('respeta una build completa cuando todas las piezas están fijas', () => {
    const result = expectOk(
      optimizeBuild({
        budget: 1_380_000,
        useCase: 'gaming-1080',
        preference: 'balanced',
        locked: LOCKED_BUILD,
      }),
    )

    expect(result.lockedCount).toBe(8)
    expect(result.lockedTotal).toBe(LOCKED_BUILD_TOTAL)
    expect(result.proposals).toHaveLength(1)

    const [proposal] = result.proposals
    expectValidProposal(proposal, 'gaming-1080', 1_380_000, 'balanced')
    expect(proposal.total).toBe(LOCKED_BUILD_TOTAL)
    expect(proposal.lockedCategories).toHaveLength(8)
    for (const category of Object.keys(LOCKED_BUILD) as Category[]) {
      expect(proposal.selections[category]).toEqual(LOCKED_BUILD[category])
    }
  })

  it('explica conflictos entre piezas fijas', () => {
    const result = optimizeBuild({
      budget: 2_000_000,
      useCase: 'gaming-1080',
      preference: 'balanced',
      locked: {
        cpu: ['intel-i3-12100f'],
        motherboard: ['msi-b550m-a-pro'],
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('esperaba un resultado sin build')
    expect(result.reason).toBe('locked-conflict')
    expect(result.details?.join(' ')).toMatch(/LGA1700|AM4/i)
  })

  it('rechaza piezas fijas que no cumplen el uso elegido', () => {
    const editing = optimizeBuild({
      budget: 3_000_000,
      useCase: 'editing',
      preference: 'balanced',
      locked: { ram: ['ddr4-16-3200-kit'] },
    })
    expect(editing.ok).toBe(false)
    if (editing.ok) throw new Error('esperaba un resultado sin build')
    expect(editing.reason).toBe('locked-conflict')
    expect(editing.details?.join(' ')).toMatch(/32 GB/)

    const office = optimizeBuild({
      budget: 1_500_000,
      useCase: 'office',
      preference: 'balanced',
      locked: { gpu: ['rtx-3050'] },
    })
    expect(office.ok).toBe(false)
    if (office.ok) throw new Error('esperaba un resultado sin build')
    expect(office.reason).toBe('locked-conflict')
    expect(office.details?.join(' ')).toMatch(/oficina/i)

    const storage = optimizeBuild({
      budget: 2_000_000,
      useCase: 'gaming-1080',
      preference: 'balanced',
      locked: { storage: ['sata-1tb'] },
    })
    expect(storage.ok).toBe(false)
    if (storage.ok) throw new Error('esperaba un resultado sin build')
    expect(storage.reason).toBe('locked-conflict')
    expect(storage.details?.join(' ')).toMatch(/NVMe/i)
  })

  it('avisa cuando las piezas fijas ya superan el presupuesto', () => {
    const result = optimizeBuild({
      budget: 1_000_000,
      useCase: 'gaming-1080',
      preference: 'balanced',
      locked: LOCKED_BUILD,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('esperaba un resultado sin build')
    expect(result.reason).toBe('no-build')
    expect(result.message).toMatch(/piezas fijas/i)
    expect(result.minimumBudget ?? 0).toBeGreaterThanOrEqual(LOCKED_BUILD_TOTAL)
  })

  it('no acepta una fuente fija Bronze para una GPU de gama alta', () => {
    const result = optimizeBuild({
      budget: 3_000_000,
      useCase: 'gaming-1440',
      preference: 'balanced',
      locked: {
        gpu: ['rx-9070'],
        psu: ['antec-750-bronze'],
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('esperaba un resultado sin build')
    expect(result.reason).toBe('locked-conflict')
    expect(result.details?.join(' ')).toMatch(/Gold\/Platinum|gama alta/i)
  })

  it('ignora los periféricos al fijar las piezas de la torre', () => {
    const result = expectOk(
      optimizeBuild({
        budget: 2_000_000,
        useCase: 'gaming-1080',
        preference: 'balanced',
        locked: { ...LOCKED_BUILD, monitor: ['mon-27-4k-144'] },
      }),
    )

    expect(result.lockedCount).toBe(8)
    expect(result.lockedTotal).toBe(LOCKED_BUILD_TOTAL)
    for (const proposal of result.proposals) {
      expectValidProposal(proposal, 'gaming-1080', 2_000_000, 'balanced')
      expect(proposal.selections.monitor).toBeUndefined()
    }
  })

  it('avisa cuando las piezas fijas impiden una build Mini-ITX', () => {
    const result = expectValidResult(
      optimizeBuild({
        budget: 2_000_000,
        useCase: 'gaming-1080',
        preference: 'compact',
        locked: { case: ['xyz-airone-70'] },
      }),
      'gaming-1080',
      2_000_000,
      'compact',
    )

    expect(result.note).toMatch(/Mini-ITX/i)
    for (const proposal of result.proposals) {
      expect(proposal.selections.case).toEqual(['xyz-airone-70'])
    }
  })
})
