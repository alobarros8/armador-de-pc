import { describe, expect, it } from 'vitest'
import { analyze } from './compat'
import { suggestChanges, explainBuild } from './advisor'
import type { Selections } from '../types'

describe('advisor', () => {
  it('no rompe con build incompleta', () => {
    const build: Selections = {}
    expect(suggestChanges(build, 'gaming-1080')).toEqual([])
    expect(explainBuild(build, 'gaming-1080', 1000000).length).toBeGreaterThanOrEqual(0)
  })

  it('ninguna sugerencia deja la build incompatible', () => {
    const build: Selections = {
      cpu: ['amd-r5-7600x'],
      motherboard: ['asus-prime-b650m-a-ii'],
      ram: ['ddr5-16-6000-kit'],
      gpu: ['rtx-5060'],
      storage: ['nvme-1tb'],
      psu: ['asrock-750-gold'],
      case: ['antec-vx310'],
      cooler: ['id-se214xt'],
    }
    const suggestions = suggestChanges(build, 'gaming-1080', 2000000)
    for (const s of suggestions) {
      const next: Selections = { ...build, [s.category]: [s.replacement.id] }
      const a = analyze(next)
      expect(a.errors).toHaveLength(0)
    }
  })

  it('explainBuild devuelve razones', () => {
    const build: Selections = {
      cpu: ['amd-r5-7600x'],
      motherboard: ['asus-prime-b650m-a-ii'],
      ram: ['ddr5-16-6000-kit'],
      gpu: ['rtx-5060'],
      storage: ['nvme-1tb'],
      psu: ['asrock-750-gold'],
      case: ['antec-vx310'],
      cooler: ['id-se214xt'],
    }
    const reasons = explainBuild(build, 'gaming-1080', 2000000)
    expect(reasons.length).toBeGreaterThan(0)
  })
})