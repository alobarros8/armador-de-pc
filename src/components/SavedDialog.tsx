import { Bookmark, Check, GitCompareArrows, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getPart } from '../data/catalog'
import { money } from '../lib/format'
import { loadSaved, removeSaved, saveSaved, type SavedBuild } from '../lib/history'
import type { BuildSnapshot } from '../lib/share'
import { Modal } from './ui'
import { cn } from '../lib/cn'
import { CompareView } from './CompareView'

type Notify = (message: string, tone?: 'success' | 'error' | 'info') => void

function buildDetails(snapshot: BuildSnapshot): { count: number; total: number } {
  const parts = Object.values(snapshot.selections)
    .flat()
    .map((id) => getPart(id))
  return {
    count: parts.length,
    total: parts.reduce((acc, part) => acc + (part?.price ?? 0), 0),
  }
}

function itemDate(item: SavedBuild): string {
  return new Date(item.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SavedDialog({
  open,
  onClose,
  snapshot,
  hasParts,
  onApply,
  notify,
}: {
  open: boolean
  onClose: () => void
  snapshot: BuildSnapshot
  hasParts: boolean
  onApply: (item: SavedBuild) => void
  notify: Notify
}) {
  const [version, setVersion] = useState(0)
  const [name, setName] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [comparePair, setComparePair] = useState<[SavedBuild, SavedBuild] | null>(null)

  // Recargamos la lista cada vez que se abre el diálogo o cambia localmente.
  const items = open ? loadSaved() : []
  void version

  // Picks vigentes: descartamos ids que ya no existen (por ejemplo, tras eliminar).
  const picks = compareIds.filter((id) => items.some((item) => item.id === id))

  const togglePick = (id: string) => {
    setCompareIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id].slice(-2),
    )
  }

  const startCompare = () => {
    const pair = items.filter((item) => picks.includes(item.id)) as [SavedBuild, SavedBuild]
    if (pair.length !== 2 || pair.some((entry) => !entry)) return
    setComparePair(pair)
  }

  const save = () => {
    if (!hasParts) {
      notify('La build está vacía: agregá componentes primero', 'info')
      return
    }
    saveSaved(name, snapshot)
    setName('')
    setVersion((value) => value + 1)
    notify(name.trim() ? `Build "${name.trim()}" guardada` : 'Build guardada', 'success')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mis builds guardadas"
      subtitle="Guardá la build actual con nombre y volvé a cualquiera cuando quieras. Queda en este navegador."
      wide
    >
      <div className="space-y-5">
        {comparePair ? (
          <CompareView a={comparePair[0]} b={comparePair[1]} onBack={() => setComparePair(null)} />
        ) : (
          <>
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <p className="label">Guardar la build actual</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') save()
                  }}
                  placeholder={hasParts ? 'Ej: Gaming 1080p barato' : 'La build está vacía'}
                  className="field"
                  aria-label="Nombre para la build"
                  disabled={!hasParts}
                />
                <button
                  type="button"
                  onClick={save}
                  disabled={!hasParts}
                  className="btn btn-primary shrink-0 text-xs disabled:opacity-40"
                >
                  <Bookmark className="size-3.5" aria-hidden /> Guardar
                </button>
              </div>
              <p className="mt-1.5 text-caption text-slate-400">
                Incluye componentes y presupuesto. Si guardás de nuevo con el mismo nombre, se reemplaza.
              </p>
            </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="label">Guardadas ({items.length})</p>
            {items.length >= 2 ? (
              <button
                type="button"
                onClick={startCompare}
                disabled={picks.length !== 2}
                className="btn btn-primary text-xs disabled:opacity-40"
              >
                <Bookmark className="size-3.5" aria-hidden /> Comparar seleccionadas ({picks.length}/2)
              </button>
            ) : null}
          </div>
          {items.length >= 2 && picks.length === 1 ? (
            <p className="mt-0 text-caption text-slate-400">
              Elegí una segunda build para activar el comparador.
            </p>
          ) : null}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-300">Todavía no guardaste ninguna build</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Armá una build (o aplicá un preset) y guardala acá para comparar opciones o volver más tarde.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const { count, total } = buildDetails(item.snapshot)
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-2xl border p-3 transition-colors',
                      'border-white/[0.07] bg-white/[0.02] hover:border-brand-500/20 hover:bg-white/[0.03]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      <p className="mt-0.5 text-caption text-slate-400">
                        {itemDate(item)} · {count} {count === 1 ? 'pieza' : 'piezas'} ·{' '}
                        {money(total)}
                        {item.snapshot.budget ? ` · presupuesto ${money(item.snapshot.budget)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {items.length >= 2 ? (
                        <button
                          type="button"
                          onClick={() => togglePick(item.id)}
                          aria-pressed={picks.includes(item.id)}
                          title={picks.includes(item.id) ? `Quitar ${item.name} de la comparación` : `Sumar ${item.name} a la comparación`}
                          aria-label={picks.includes(item.id) ? `Quitar ${item.name} de la comparación` : `Sumar ${item.name} a la comparación`}
                          className={cn(
                            'btn btn-ghost p-2.5',
                            picks.includes(item.id)
                              ? 'border-brand-500/30 bg-brand-500/12 text-brand-200'
                              : 'hover:border-brand-500/25 hover:text-brand-200',
                          )}
                        >
                          <GitCompareArrows className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          onApply(item)
                          notify(`Build "${item.name}" cargada`, 'success')
                        }}
                        className="btn bg-brand-500/15 px-2.5 py-1.5 text-xs text-brand-200 hover:bg-brand-500/25"
                      >
                        <Check className="size-3.5" aria-hidden /> Cargar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeSaved(item.id)
                          setVersion((value) => value + 1)
                          notify(`"${item.name}" eliminada`, 'info')
                        }}
                        title={`Eliminar ${item.name}`}
                        aria-label={`Eliminar ${item.name}`}
                        className="btn btn-ghost p-2.5 hover:border-rose-500/25 hover:text-rose-200"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
          </>
        )}

        <p className="text-caption leading-4 text-slate-400">
          Las categorías cargadas se validan igual que al importar: IDs que ya no existen en el
          catálogo se descartan solos.
        </p>
      </div>
    </Modal>
  )
}
