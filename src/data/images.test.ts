import { describe, expect, it } from 'vitest'
import { PARTS } from './catalog'
import { PART_IMAGES } from './images'

describe('fotos de los componentes', () => {
  it('cada pieza tiene una foto mapeada o una URL remota', () => {
    for (const part of PARTS) {
      if (part.image) {
        expect(part.image, `URL inválida en ${part.id}`).toMatch(/^https:\/\//)
        continue
      }
      if (part.cgId) {
        // Algunos productos del feed (por ejemplo, usados en evento) no traen
        // imágenes. La UI muestra el fallback gráfico de PartImage.
        continue
      }
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
