import { describe, expect, it } from 'vitest'
import { PARTS } from './catalog'
import { PART_IMAGES } from './images'

describe('fotos de los componentes', () => {
  it('cada pieza tiene una foto mapeada', () => {
    for (const part of PARTS) {
      expect(PART_IMAGES[part.id], `falta la foto de ${part.id}`).toBe(`/parts/${part.id}.jpg`)
    }
  })

  it('no tiene mapeos huérfanos', () => {
    const ids = new Set(PARTS.map((part) => part.id))
    for (const id of Object.keys(PART_IMAGES)) {
      expect(ids.has(id), `mapeo sin pieza: ${id}`).toBe(true)
    }
  })
})
