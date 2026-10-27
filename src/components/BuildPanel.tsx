import { Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { CATEGORIES, getPart } from '../data/catalog'
import { money } from '../lib/format'
import type { Analysis } from '../lib/compat'
import type { Category, Selections } from '../types'
import { CategoryIcon, Progress } from './ui'
import { cn } from '../lib/cn'

/** Muestra una categoría de componentes, sus selecciones y acciones para cambiarla o vaciarla.
 * @returns El bloque visual de una categoría del panel de build.
 */
function Slot({
  category,
  selectedParts,
  active,
  onSelect,
  onClear,
}: {
  category: (typeof CATEGORIES)[number]
  selectedParts: ReturnType<typeof getPart>[]
  active: boolean
  onSelect: () => void
  onClear: () => void
}) {
  const filled = selectedParts.length > 0
  const subtotal = selectedParts.reduce((acc, part) => acc + (part?.price ?? 0), 0)

  return (
    <div
      className={cn(
        'flex items-stretch gap-1 rounded-xl border transition-colors',
        active
          ? 'border-brand-500/25 bg-brand-500/[0.055]'
          : 'border-transparent hover:bg-white/[0.025]',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left"
      >
        <span
          className={cn(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border',
            filled
              ? 'border-brand-500/20 bg-brand-500/10 text-brand-300'
              : 'border-white/[0.06] bg-white/[0.02] text-slate-600',
          )}
        >
          <CategoryIcon category={category.id} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
            {category.short}
            {category.required && !filled ? <span className="text-brand-400/70"> *</span> : null}
          </span>
          <span
            className={cn(
              'mt-0.5 block truncate text-xs',
              filled ? 'text-slate-200' : 'text-slate-600',
            )}
          >
            {filled
              ? selectedParts.length > 1
                ? `${selectedParts.length} seleccionados`
                : selectedParts[0]?.name
              : 'Elegir componente'}
          </span>
          {filled && selectedParts.length > 1 ? (
            <span className="mt-0.5 block truncate text-micro leading-4 text-slate-400">
              {selectedParts.map((part) => part?.name).join(' · ')}
            </span>
          ) : null}
        </span>
        {filled ? (
          <span className="mt-3 shrink-0 font-mono text-micro tabular-nums text-slate-400">
            {subtotal === 0 ? 'Incluido' : money(subtotal)}
          </span>
        ) : null}
      </button>
      {filled ? (
        <button
          type="button"
          onClick={onClear}
          title={`Quitar ${category.label.toLowerCase()}`}
          aria-label={`Quitar ${category.label.toLowerCase()}`}
          className="my-1 mr-1 grid w-6 shrink-0 place-items-center rounded-md text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** Resume el avance de la build y permite navegar categorías, usar presets, optimizar o limpiar.
 * @returns El panel lateral con categorías seleccionadas y acciones de armado.
 */
export function BuildPanel({
  selections,
  analysis,
  activeCategory,
  onSelectCategory,
  onRemove,
  onOpenPresets,
  onOpenOptimizer,
  onClear,
}: {
  selections: Selections
  analysis: Analysis
  activeCategory: Category
  onSelectCategory: (category: Category) => void
  onRemove: (category: Category) => void
  onOpenPresets: () => void
  onOpenOptimizer: () => void
  onClear: () => void
}) {
  const required = CATEGORIES.filter((category) => category.required)
  const done = required.filter((category) => (selections[category.id]?.length ?? 0) > 0).length
  const essentials = CATEGORIES.filter((category) => category.group === 'esencial')
  const peripherals = CATEGORIES.filter((category) => category.group === 'periferico')

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-white/[0.06] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Tu build</h2>
          <span className="font-mono text-caption text-slate-400">
            {done}/{required.length} esenciales
          </span>
        </div>
        <Progress value={(done / required.length) * 100} className="mt-2.5" />
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span className="text-caption text-slate-400">
            {analysis.partCount} {analysis.partCount === 1 ? 'componente' : 'componentes'}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-100">{money(analysis.total)}</span>
        </div>
      </div>

      <div className="scroll-thin max-h-[calc(100dvh-19rem)] overflow-y-auto p-1.5">
        <p className="label px-2 pb-1 pt-2">Núcleo</p>
        {essentials.map((category) => (
          <Slot
            key={category.id}
            category={category}
            selectedParts={(selections[category.id] ?? []).map((id) => getPart(id))}
            active={category.id === activeCategory}
            onSelect={() => onSelectCategory(category.id)}
            onClear={() => onRemove(category.id)}
          />
        ))}

        <p className="label px-2 pb-1 pt-3">Periféricos y extras</p>
        {peripherals.map((category) => (
          <Slot
            key={category.id}
            category={category}
            selectedParts={(selections[category.id] ?? []).map((id) => getPart(id))}
            active={category.id === activeCategory}
            onSelect={() => onSelectCategory(category.id)}
            onClear={() => onRemove(category.id)}
          />
        ))}
      </div>

      <div className="border-t border-white/[0.06] p-2.5">
        <button
          type="button"
          onClick={onOpenOptimizer}
          className="btn btn-primary w-full text-xs"
        >
          <Wand2 className="size-3.5" aria-hidden /> Armá por presupuesto
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onOpenPresets} className="btn btn-ghost text-xs">
            <Sparkles className="size-3.5 text-brand-300" aria-hidden /> Presets
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={analysis.partCount === 0}
            className="btn btn-ghost text-xs hover:border-rose-500/25 hover:text-rose-200"
          >
            <Trash2 className="size-3.5" aria-hidden /> Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}
