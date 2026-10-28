import { describe, expect, it } from 'vitest'
import { loadSaved, removeSaved, saveSaved, type SavedBuild } from './history'
import type { BuildSnapshot } from './share'

const snapshot: BuildSnapshot = {
  version: 1,
  budget: 900000,
  selections: {
    cpu: ['amd-r5-5500'],
    motherboard: ['msi-b550m-a-pro'],
  },
}

/** Stub de Storage en memoria para correr sin window ni localStorage. */
function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => void map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  } as Storage
}

describe('saveSaved() / loadSaved()', () => {
  it('guarda y vuelca la lista ordenada de más nueva a más vieja', () => {
    const storage = fakeStorage()
    saveSaved('Primera', snapshot, storage)
    saveSaved('Segunda', snapshot, storage)

    const items = loadSaved(storage)
    expect(items.map((item) => item.name)).toEqual(['Segunda', 'Primera'])
  })

  it('reemplaza si se guarda con el mismo nombre', () => {
    const storage = fakeStorage()
    saveSaved('Gaming', snapshot, storage)
    const items = saveSaved('Gaming', { ...snapshot, budget: 1200000 }, storage)

    expect(items).toHaveLength(1)
    expect(loadSaved(storage)[0].snapshot.budget).toBe(1200000)
  })

  it('usa un nombre por defecto si llega vacío', () => {
    const storage = fakeStorage()
    const items = saveSaved('   ', snapshot, storage)
    expect(items[0].name).not.toBe('')
  })

  it('limita la lista a un máximo razonable', () => {
    const storage = fakeStorage()
    for (let index = 0; index < 25; index += 1) {
      saveSaved(`Build ${index}`, snapshot, storage)
    }
    expect(loadSaved(storage)).toHaveLength(20)
  })

  it('limpia piezas inválidas del snapshot al leer', () => {
    const storage = fakeStorage()
    const dirty = JSON.stringify([
      {
        id: 'a',
        name: 'Corrupta',
        createdAt: Date.now(),
        snapshot: { version: 1, budget: 100, selections: { cpu: ['no-existe'] } },
      },
    ])
    storage.setItem('armador-pc:saved:v1', dirty)

    const [item] = loadSaved(storage)
    expect(item.snapshot.selections).toEqual({})
    expect(item.snapshot.budget).toBe(100)
  })

  it('sobrevive a un archivo corrupto en localStorage', () => {
    const storage = fakeStorage()
    storage.setItem('armador-pc:saved:v1', '{{{: no json')
    expect(loadSaved(storage)).toEqual([])

    storage.setItem('armador-pc:saved:v1', JSON.stringify('no-es-lista'))
    expect(loadSaved(storage)).toEqual([])
  })

  it('descarta entradas sin id, nombre o fecha', () => {
    const storage = fakeStorage()
    storage.setItem(
      'armador-pc:saved:v1',
      JSON.stringify([
        { id: 'sin-name', createdAt: 1, snapshot: null },
        { name: 'sin-id', createdAt: 2 },
        { id: 'ok', name: 'Válida', createdAt: 3, snapshot: { version: 1, budget: null, selections: {} } },
      ]),
    )
    const items: SavedBuild[] = loadSaved(storage)
    expect(items.map((item) => item.id)).toEqual(['ok'])
  })
})

describe('removeSaved()', () => {
  it('elimina por id y deja el resto', () => {
    const storage = fakeStorage()
    saveSaved('A', snapshot, storage)
    saveSaved('B', snapshot, storage)
    // La lista viene ordenada de más nueva a más vieja, así que la primera es "B".
    const remaining = removeSaved(loadSaved(storage)[0].id, storage)

    expect(remaining.map((item) => item.name)).not.toContain('B')
    expect(remaining).toHaveLength(1)
  })

  it('eliminar un id inexistente no rompe', () => {
    const storage = fakeStorage()
    saveSaved('A', snapshot, storage)
    expect(removeSaved('fantasma', storage)).toHaveLength(1)
  })

  it('eliminar el único elemento resulta en una lista vacía', () => {
    const storage = fakeStorage()
    saveSaved('A', snapshot, storage)
    const id = loadSaved(storage)[0].id
    const remaining = removeSaved(id, storage)
    expect(remaining).toHaveLength(0)
    expect(loadSaved(storage)).toHaveLength(0)
  })
})

describe('storage que falla', () => {
  it('loadSaved devuelve lista vacía si el storage lanza al leer', () => {
    const storage = fakeStorage()
    storage.getItem = () => {
      throw new Error('quota exceeded')
    }
    expect(loadSaved(storage)).toEqual([])
  })

  it('saveSaved devuelve la lista aunque no pueda persistir', () => {
    const storage = fakeStorage()
    storage.setItem = () => {
      throw new Error('quota exceeded')
    }
    const items = saveSaved('Irrecuperable', snapshot, storage)
    expect(items.map((item) => item.name)).toEqual(['Irrecuperable'])
  })

  it('removeSaved devuelve la lista reducida aunque no pueda persistir', () => {
    const storage = fakeStorage()
    saveSaved('A', snapshot, storage)
    const id = loadSaved(storage)[0].id

    // Rompemos el setItem para simular fallo al intentar guardar la nueva lista (sin 'A')
    storage.setItem = () => {
      throw new Error('quota exceeded')
    }

    const remaining = removeSaved(id, storage)
    expect(remaining).toHaveLength(0)
  })
})
