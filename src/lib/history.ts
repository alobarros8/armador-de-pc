import { sanitizeSelections, type BuildSnapshot } from './share'

export interface SavedBuild {
  id: string
  name: string
  createdAt: number
  snapshot: BuildSnapshot
}

const KEY = 'armador-pc:saved:v1'
const MAX_SAVED = 20

/** Genera un identificador corto para una build guardada.
 * @returns Un identificador aleatorio o basado en la hora actual.
 */
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return Date.now().toString(36)
}

/** Valida y normaliza una instantánea cargada desde el almacenamiento.
 * @returns La instantánea segura o null si el dato no es un objeto válido.
 */
function sanitizeSnapshot(input: unknown): BuildSnapshot | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as { budget?: unknown; selections?: unknown }
  return {
    version: 1,
    budget: typeof raw.budget === 'number' && raw.budget > 0 ? raw.budget : null,
    selections: sanitizeSelections(raw.selections),
  }
}

/** Lee builds guardadas, omite entradas inválidas y conserva las demás.
 * @returns Las builds válidas ordenadas de más nueva a más antigua.
 */
export function loadSaved(storage: Storage = window.localStorage): SavedBuild[] {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const items: SavedBuild[] = []
    for (const entry of parsed) {
      const item = entry as Partial<SavedBuild>
      if (typeof item.id !== 'string' || typeof item.name !== 'string') continue
      if (typeof item.createdAt !== 'number') continue
      const snapshot = sanitizeSnapshot(item.snapshot)
      if (!snapshot) continue
      items.push({ id: item.id, name: item.name, createdAt: item.createdAt, snapshot })
    }
    return items.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

/** Agrega (o reemplaza por nombre) y devuelve la lista nueva, limitada a las más recientes. */
/** Guarda una instantánea, reemplaza una existente con el mismo nombre y limita el historial.
 * @returns La lista actualizada de builds ordenada de más nueva a más antigua.
 */
export function saveSaved(
  name: string,
  snapshot: BuildSnapshot,
  storage: Storage = window.localStorage,
): SavedBuild[] {
  const cleanName = name.trim() || 'Build sin nombre'
  const list = loadSaved(storage).filter((item) => item.name !== cleanName)
  const next = [
    { id: newId(), name: cleanName, createdAt: Date.now(), snapshot },
    ...list,
  ].slice(0, MAX_SAVED)
  persist(next, storage)
  return next
}

/** Elimina una build identificada y persiste la lista resultante.
 * @returns La lista actualizada de builds guardadas.
 */
export function removeSaved(
  id: string,
  storage: Storage = window.localStorage,
): SavedBuild[] {
  const next = loadSaved(storage).filter((item) => item.id !== id)
  persist(next, storage)
  return next
}

/** Serializa la lista de builds en el almacenamiento indicado.
 * @returns No devuelve valor.
 */
function persist(items: SavedBuild[], storage: Storage): void {
  try {
    storage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Sin persistencia si el navegador la bloquea; el usuario igual puede
    // exportar por link o JSON.
  }
}
