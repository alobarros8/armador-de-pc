import { describe, expect, it } from 'vitest'
import {
  buildToText,
  decodeBuild,
  encodeBuild,
  sanitizeSelections,
  type BuildSnapshot,
} from './share'
import { getPart } from '../data/catalog'

const snapshot: BuildSnapshot = {
  version: 1,
  budget: 1500000,
  selections: {
    cpu: ['amd-r5-5500'],
    motherboard: ['msi-b550m-a-pro'],
    storage: ['nvme-1tb', 'nvme-2tb'],
  },
}

describe('sanitizeSelections()', () => {
  it('descarta IDs de otra categoría, desconocidos y duplicados', () => {
    const result = sanitizeSelections({
      cpu: ['amd-r5-5500', 'msi-b550m-a-pro', 'no-existe', 'amd-r5-5500'],
    })
    expect(result.cpu).toEqual(['amd-r5-5500'])
    expect(result.motherboard).toBeUndefined()
  })

  it('respeta el límite de categorías multi-select', () => {
    const result = sanitizeSelections({
      storage: ['nvme-1tb', 'nvme-2tb', 'nvme-4tb', 'hdd-2tb'], // máx 3
      mouse: ['mouse-deathadder', 'mouse-g305'], // single → 1
    })
    expect(result.storage).toHaveLength(3)
    expect(result.mouse).toEqual(['mouse-deathadder'])
  })

  it('acepta no-objetos sin romper', () => {
    expect(sanitizeSelections(null)).toEqual({})
    expect(sanitizeSelections('x')).toEqual({})
    expect(sanitizeSelections(undefined)).toEqual({})
  })

  it('ignora IDs no string', () => {
    expect(sanitizeSelections({ cpu: [1, null, {}] })).toEqual({})
  })
})

describe('encodeBuild() / decodeBuild()', () => {
  it('hace el viaje ida y vuelta sin perder datos', () => {
    expect(decodeBuild(encodeBuild(snapshot))).toEqual(snapshot)
  })

  it('serializa en base64url sin + / ni =', () => {
    const code = encodeBuild(snapshot)
    expect(code).not.toMatch(/[+/=]/)
  })

  it('maneja presupuesto nulo', () => {
    expect(decodeBuild(encodeBuild({ ...snapshot, budget: null }))?.budget).toBeNull()
  })

  it('ignora presupuestos inválidos en el payload', () => {
    const code = encodeBuild({ ...snapshot, budget: -5 })
    expect(decodeBuild(code)?.budget).toBeNull()
  })

  it('devuelve null con código corrupto o versión incorrecta', () => {
    expect(decodeBuild('no-es-base64-valido!!!')).toBeNull()
    expect(decodeBuild(btoa(JSON.stringify({ v: 2, s: {} })))).toBeNull()
  })

  it('sanitiza las selecciones al decodificar (link manipulado no rompe)', () => {
    const raw = JSON.stringify({ v: 1, b: 100, s: { cpu: ['no-existe'], gpu: 42 } })
    const result = decodeBuild(btoa(raw))
    expect(result?.selections).toEqual({})
    expect(result?.budget).toBe(100)
  })
})

describe('buildToText()', () => {
  const textBuild: BuildSnapshot = {
    version: 1,
    budget: null,
    selections: {
      cpu: ['amd-r5-5500'],
      cooler: ['stock-amd'],
    },
  }

  it('arma la lista con categoría, nombre de pieza y precio por línea', () => {
    const cpuName = getPart('amd-r5-5500')?.name ?? ''
    const text = buildToText(textBuild, { total: 550_000, watts: 120 })

    expect(text).toContain('Mi build de PC')
    expect(text).toContain(cpuName)
    expect((text.match(/^- /gm) ?? []).length).toBe(2)
  })

  it('marca la piezas con precio 0 como incluidas', () => {
    const text = buildToText(textBuild, { total: 550_000, watts: 120 })
    expect(text).toContain('incluido')
  })

  it('agrega el cierre con total, consumo y link opcional', () => {
    const text = buildToText(textBuild, { total: 550_000, watts: 120 })
    expect(text).toContain('Total')
    expect(text).toContain('120 W')
    expect(text).not.toContain('http')

    const withLink = buildToText(textBuild, {
      total: 550_000,
      watts: 120,
      link: 'https://ejemplo.test/#b=abc',
    })
    expect(withLink).toContain('https://ejemplo.test/#b=abc')
  })

  it('no agrega líneas para categorías sin piezas y tolera build vacía', () => {
    const empty = buildToText(
      { version: 1, budget: null, selections: {} },
      { total: 0, watts: 22 },
    )
    expect((empty.match(/^- /g) ?? []).length).toBe(0)
  })
})
