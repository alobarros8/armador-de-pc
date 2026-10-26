import { ArrowLeft } from 'lucide-react'
import { analyze } from '../lib/compat'
import { money } from '../lib/format'
import type { SavedBuild } from '../lib/history'
import { CATEGORIES, getPart } from '../data/catalog'
import type { Category } from '../types'
import { CategoryIcon } from './ui'
import { cn } from '../lib/cn'

function itemDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ComparisonRow {
  id: Category
  label: string
  names: [string, string]
  totals: [number, number]
  same: boolean
}

function SideCard({ title, item }: { title: string; item: SavedBuild }) {
  const analysis = analyze(item.snapshot.selections)

  let status: { tone: 'ok' | 'warn' | 'bad'; label: string }
  if (analysis.errors.length > 0) {
    status = { tone: 'bad', label: `${analysis.errors.length} ${analysis.errors.length === 1 ? 'error' : 'errores'}` }
  } else if (analysis.warnings.length > 0) {
    status = { tone: 'warn', label: `${analysis.warnings.length} ${analysis.warnings.length === 1 ? 'aviso' : 'avisos'}` }
  } else if (analysis.partCount > 0) {
    status = { tone: 'ok', label: analysis.isComplete ? 'Compatible' : `${analysis.partCount} piezas` }
  } else {
    status = { tone: 'warn', label: 'Vacía' }
  }

  return (
    <div className="panel p-3.5">
      <p className="text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      <h3 className="mt-1 truncate text-sm font-semibold text-white">{item.name}</h3>
      <p className="mt-0.5 text-caption text-slate-400">{itemDate(item.createdAt)}</p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-white">
        {money(analysis.total)}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1">
        <span
          className={cn(
            'chip',
            status.tone === 'bad'
              ? 'chip-bad'
              : status.tone === 'warn'
                ? 'chip-warn'
                : status.tone === 'ok'
                  ? 'chip-ok'
                  : undefined,
          )}
        >
          {status.label}
        </span>
        <span className="chip">{analysis.partCount} piezas</span>
        <span className="chip">{analysis.watts} W</span>
        <span className="chip">Índice gaming {analysis.gamingIndex}</span>
        {item.snapshot.budget ? (
          <span className="chip">Presupuesto {money(item.snapshot.budget)}</span>
        ) : null}
      </div>
    </div>
  )
}

function SideCell({
  name,
  total,
  cheaper,
}: {
  name: string
  total: number
  cheaper: boolean
}) {
  const empty = name === ''
  return (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-ink-950/40 px-2.5 py-1.5',
        empty && 'opacity-50',
      )}
    >
      <span className="min-w-0 truncate text-caption text-slate-300">{name || 'Sin piezas'}</span>
      {empty ? null : (
        <span
          className={cn(
            'shrink-0 font-mono text-caption tabular-nums',
            cheaper ? 'text-brand-300' : 'text-slate-400',
          )}
        >
          {total === 0 ? 'Incluido' : money(total)}
        </span>
      )}
    </div>
  )
}

export function CompareView({
  a,
  b,
  onBack,
}: {
  a: SavedBuild
  b: SavedBuild
  onBack: () => void
}) {
  const analysisA = analyze(a.snapshot.selections)
  const analysisB = analyze(b.snapshot.selections)

  const rows: ComparisonRow[] = []
  for (const category of CATEGORIES) {
    const idsA = a.snapshot.selections[category.id] ?? []
    const idsB = b.snapshot.selections[category.id] ?? []
    if (!idsA.length && !idsB.length) continue
    const partsA = idsA
      .map((id) => getPart(id))
      .filter((part): part is NonNullable<typeof part> => Boolean(part))
    const partsB = idsB
      .map((id) => getPart(id))
      .filter((part): part is NonNullable<typeof part> => Boolean(part))
    rows.push({
      id: category.id,
      label: category.label,
      names: [partsA.map((part) => part.name).join(' · '), partsB.map((part) => part.name).join(' · ')],
      totals: [
        partsA.reduce((acc, part) => acc + part.price, 0),
        partsB.reduce((acc, part) => acc + part.price, 0),
      ],
      same: partsA.map((part) => part.id).join(',') === partsB.map((part) => part.id).join(','),
    })
  }

  const identical = rows.every((row) => row.same)
  const delta = analysisB.total - analysisA.total

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="btn btn-ghost text-xs">
          <ArrowLeft className="size-3.5" aria-hidden /> Volver a guardadas
        </button>
        <span className="chip chip-brand">Comparando 2 builds</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SideCard title="Build A" item={a} />
        <SideCard title="Build B" item={b} />
      </div>

      {identical ? (
        <p className="note note-ok">
          Las dos builds tienen exactamente los mismos componentes. La diferencia está solo en
          la guardada: nombre, fecha o presupuesto.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((row) => {
            const cheaperA = !row.same && row.names[0] !== '' && row.totals[0] < row.totals[1]
            const cheaperB = !row.same && row.names[1] !== '' && row.totals[1] < row.totals[0]
            return (
              <li
                key={row.id}
                className={cn(
                  'rounded-xl border p-2.5',
                  row.same ? 'border-white/[0.05] bg-white/[0.01]' : 'border-brand-500/20 bg-brand-500/[0.03]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-300">
                    <CategoryIcon category={row.id} className="size-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{row.label}</span>
                  </span>
                  {row.same ? null : <span className="chip chip-brand">Cambió</span>}
                </div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <SideCell name={row.names[0]} total={row.totals[0]} cheaper={cheaperA} />
                  <SideCell name={row.names[1]} total={row.totals[1]} cheaper={cheaperB} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="note note-info">Las dos builds están vacías.</p>
      )}

      <p className="text-caption leading-4 text-slate-400">
        {rows.length === 0
          ? 'No hay nada que comparar todavía.'
          : identical
            ? 'Marcá piezas distintas para ver la comparación componente a componente.'
            : delta === 0
              ? 'Las dos builds cuestan lo mismo: la diferencia está en las piezas, no en el precio.'
              : delta > 0
                ? `"${a.name}" es ${money(delta)} más económica que "${b.name}".`
                : `"${b.name}" es ${money(Math.abs(delta))} más económica que "${a.name}".`}
      </p>
    </div>
  )
}
