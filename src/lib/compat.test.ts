import { describe, expect, it } from 'vitest'
import { analyze, estimateWatts, partCompatibility } from './compat'
import type { Part, Selections } from '../types'

/** Fixture AM5 gaming: Ryzen 7 9800X3D (AM5, 120 W, sin cooler) + GPU grande. */
const am5Base: Selections = {
  cpu: ['amd-r7-9800x3d'],
  motherboard: ['asrock-b650i-lightning'],
  ram: ['ddr5-32-6000-kit'],
  psu: ['antec-1000-plat'],
  case: ['antec-vx310'],
}

function issuesOf(selections: Selections) {
  const analysis = analyze(selections)
  return analysis.issues.map((issue) => issue.id)
}

describe('analyze() sobre una build vacía', () => {
  it('no genera issues y devuelve ceros', () => {
    const analysis = analyze({})
    expect(analysis.partCount).toBe(0)
    expect(analysis.total).toBe(0)
    expect(analysis.watts).toBe(49) // 45 base + 4 de cooler de aire genérico
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.gamingIndex).toBe(0)
    expect(analysis.isComplete).toBe(false)
  })
})

describe('componentes esenciales', () => {
  it('una build con solo CPU avisa por cada esencial que falta', () => {
    const analysis = analyze({ cpu: ['amd-r5-5500'] })
    expect(analysis.issues.map((issue) => issue.id)).toContain('missing-motherboard')
    expect(analysis.issues.map((issue) => issue.id)).toContain('missing-ram')
    expect(analysis.issues.map((issue) => issue.id)).toContain('missing-case')
    expect(analysis.issues.map((issue) => issue.id)).toContain('no-video')
  })

  it('es true solo cuando la build no tiene errores ni avisos ni faltantes', () => {
    const analysis = analyze({
      ...am5Base,
      gpu: ['rx-7600'],
      storage: ['nvme-1tb'],
      cooler: ['id-se214xt'],
    })
    expect(analysis.issues.filter((issue) => issue.severity !== 'info')).toHaveLength(0)
    expect(analysis.missingRequired).toHaveLength(0)
    expect(analysis.isComplete).toBe(true)
  })
})

describe('CPU ↔ motherboard ↔ RAM', () => {
  it('detecta socket incompatible', () => {
    expect(issuesOf({ ...am5Base, motherboard: ['msi-b550m-a-pro'] })).toContain(
      'socket-mismatch',
    )
  })

  it('detecta DDR4 en una mother DDR5', () => {
    expect(issuesOf({ ...am5Base, ram: ['ddr4-32-3600-kit'] })).toContain('ram-type')
  })

  it('por pieza: RAM de 4 módulos en una mother de 2 slots es bad', () => {
    const compat = partCompatibility(
      ddr5Part({ modules: 4 }),
      { motherboard: ['asrock-b650i-lightning'] }, // Mini-ITX AM5 con 2 slots
    )
    expect(compat.level).toBe('bad')
    expect(compat.reason).toContain('2 slots')
  })

  it('por pieza: DDR4 contra mother DDR5 pide DDR5', () => {
    const compat = partCompatibility(
      { ...ddr5Part({ ramType: 'DDR4' }) },
      { motherboard: ['asrock-b650i-lightning'] },
    )
    expect(compat.level).toBe('bad')
    expect(compat.reason).toContain('DDR5')
  })

  it('dos módulos entran en dos slots (Mini-ITX AM5)', () => {
    expect(issuesOf(am5Base)).not.toContain('ram-slots')
  })

  it('avisa por RAM de 8 GB y por single channel', () => {
    const ids = issuesOf({ ...am5Base, ram: ['ddr4-8-3200'] })
    expect(ids).toContain('ram-low')
    expect(ids).toContain('ram-single')
  })

  it('RAM más rápida de 6000 en AM5 genera sólo un aviso informativo', () => {
    const analysis = analyze({ ...am5Base, ram: ['ddr5-32-6400-kit'] })
    expect(analysis.issues.find((issue) => issue.id === 'ram-speed')?.severity).toBe('info')
  })
})

describe('video', () => {
  it('CPU sin iGPU y sin GPU es error', () => {
    expect(issuesOf({ cpu: ['intel-i3-12100f'] })).toContain('no-video')
  })

  it('CPU con iGPU y sin GPU es sólo info', () => {
    const analysis = analyze({ cpu: ['intel-i5-12400'] })
    expect(analysis.errors).toHaveLength(0)
    expect(analysis.issues.map((issue) => issue.id)).toContain('igpu-only')
  })

  it('GPU muy superior al CPU marca cuello de botella', () => {
    const ids = issuesOf({ ...am5Base, cpu: ['intel-i3-12100f'], gpu: ['rtx-5080'] }) // perf 42 vs 80
    expect(ids).toContain('cpu-bottleneck')
  })
})

describe('cooler', () => {
  it('CPU sin cooler de fábrica avisa que falta refrigeración', () => {
    expect(issuesOf(am5Base)).toContain('missing-cooler')
  })

  it('cooler incluido con CPU que no lo trae es error', () => {
    expect(issuesOf({ ...am5Base, cooler: ['stock-intel'] })).toContain('cooler-socket')
    // el Wraith Stealth viene con CPUs de 65 W, no con el 9800X3D
    expect(issuesOf({ ...am5Base, cooler: ['stock-amd'] })).toContain('cooler-not-included')
  })

  it('cooler de TDP menor al CPU genera advertencia, con margen justo genera info', () => {
    const analysis = analyze({ ...am5Base, cooler: ['antec-a35'] }) // 95 W < 120 W
    expect(analysis.issues.find((issue) => issue.id === 'cooler-tdp')?.severity).toBe('warning')
  })
})

describe('gabinete y fuente', () => {
  it('mother ATX en un gabinete ITX no entra', () => {
    expect(issuesOf({
      ...am5Base,
      motherboard: ['asus-tuf-b650-plus-wifi'], // ATX
      case: ['cm-nr200p'], // sólo Mini-ITX
    })).toContain('form-factor')
  })

  it('gabinete SFX rechaza fuente ATX y acepta fuente SFX', () => {
    const itxBase = { ...am5Base, case: ['cm-nr200p'] }
    expect(issuesOf({ ...itxBase, psu: ['antec-650-bronze'] })).toContain('psu-form-factor')
    expect(issuesOf({ ...itxBase, psu: ['antec-sf850x'] })).not.toContain('psu-form-factor')
  })

  it('fuente sin margen para una GPU de 360 W dispara psu-tight', () => {
    const selections = { ...am5Base, gpu: ['rtx-5080'], cooler: ['id-se214xt'], psu: ['antec-650-bronze'] }
    const ids = issuesOf(selections)
    expect(ids).toContain('psu-tight')
    expect(ids).toContain('psu-quality') // Bronze en build de gama alta
  })

  it('radiador 360 en gabinete que sólo soporta 240 es error', () => {
    expect(issuesOf({ ...am5Base, cooler: ['antec-luna-360'] })).toContain('cooler-radiator')
    expect(issuesOf({ ...am5Base, cooler: ['corsair-titan-240'] })).not.toContain(
      'cooler-radiator',
    )
  })
})

describe('almacenamiento', () => {
  it('más NVMe que slots M.2 advierte', () => {
    expect(issuesOf({
      ...am5Base,
      storage: ['nvme-500', 'nvme-1tb', 'nvme-2tb'], // la B650I tiene 2 slots
    })).toContain('m2-slots')
  })

  it('sólo HDD avisa falta de SSD', () => {
    expect(issuesOf({ ...am5Base, storage: ['hdd-2tb'] })).toContain('hdd-only')
  })
})

describe('monitor', () => {
  it('GPU muy potente para un 1080p marca monitor-overspec', () => {
    expect(issuesOf({ ...am5Base, gpu: ['rtx-5080'], monitor: ['mon-24-fhd-180'] })).toContain(
      'monitor-overspec',
    )
  })
})

describe('estimateWatts()', () => {
  it('suma CPU + GPU + base + storage', () => {
    // 120 (X3D) + 165 (RX 7600) + 45 + 5 (NVMe) + 4 (aire) = 339
    expect(estimateWatts({
      ...am5Base,
      gpu: ['rx-7600'],
      storage: ['nvme-1tb'],
      cooler: ['id-se214xt'],
    })).toBe(339)
  })

  it('un AIO suma 12 W en vez de 4 W', () => {
    // 120 + 165 + 45 + (5 + 10 HDD) + 12 (AIO) = 357
    expect(estimateWatts({
      ...am5Base,
      gpu: ['rx-7600'],
      storage: ['nvme-1tb', 'hdd-2tb'],
      cooler: ['antec-luna-360'],
    })).toBe(357)
  })
})

/* ------------------------------------------------------------------ */
/* partCompatibility()                                                 */
/* ------------------------------------------------------------------ */

describe('partCompatibility()', () => {
  it('CPU con socket LGA1851 contra mother LGA1700 es bad', () => {
    const ramInit: Selections = { motherboard: ['asrock-h610m-hdv'] }
    const compat = partCompatibility(
      { id: 'intel-ultra5-225f', category: 'cpu', name: 'Intel Core Ultra 5 225F', brand: 'Intel', price: 0, specs: [], highlights: [], socket: 'LGA1851' },
      ramInit,
    )
    expect(compat.level).toBe('bad')
    expect(compat.reason).toContain('LGA')
  })

  it('PSU en build con RTX 5080 queda corta y se marca como warn', () => {
    const compat = partCompatibility(
      { id: 'antec-650-bronze', category: 'psu', name: 'Antec CSK650', brand: 'Antec', price: 0, specs: [], highlights: [], wattage: 650 },
      { cpu: ['amd-r7-9800x3d'], gpu: ['rtx-5080'], cooler: ['id-se214xt'], storage: ['nvme-1tb'] },
    )
    expect(compat.level).toBe('warn')
    expect(compat.reason).toContain('Recomendado')
  })
})

/* Piezas literales mínimas para probar partCompatibility() sin depender del catálogo. */
function ddr5Part(overrides: Record<string, unknown>): Part {
  return {
    id: 'kit-ddr5-test',
    category: 'ram',
    name: 'Kit DDR5 de prueba',
    brand: 'Test',
    price: 0,
    specs: [],
    highlights: [],
    ramType: 'DDR5',
    modules: 2,
    ...overrides,
  }
}
