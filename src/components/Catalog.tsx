import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_BY_ID, PARTS_BY_CATEGORY } from '../data/catalog'
import { partCompatibility, type Analysis } from '../lib/compat'
import type { ToggleResult } from '../lib/useBuild'
import type { Category, Part, Selections } from '../types'
import { PartCard } from './PartCard'
import { CategoryIcon } from './ui'
import { cn } from '../lib/cn'

const DESCRIPTIONS: Record<Category, string> = {
  cpu: 'El cerebro de la build. Define la plataforma (socket AM4, AM5, LGA1700 o LGA1851) y el rendimiento general.',
  cooler: 'Aire o líquida. Debe cubrir el TDP del CPU, ser compatible con el socket y entrar en el gabinete.',
  motherboard: 'Conecta todo. Tiene que compartir socket con el CPU, tipo de RAM y formato con el gabinete.',
  ram: 'Capacidad y velocidad. 16 GB es el mínimo para jugar; 32 GB es ideal si además editás o streameás.',
  gpu: 'El motor de los juegos. Revisá el largo, el consumo y la resolución a la que querés jugar.',
  storage: 'SSD NVMe para el sistema y los juegos; HDD para archivo. Podés combinar hasta 3 unidades.',
  psu: 'Potencia y protecciones. Dejá margen para los picos de la placa de video; no escatimes en la fuente.',
  case: 'Debe soportar el formato de la mother, el largo de la GPU, la altura del cooler y el radiador si es AIO.',
  monitor: 'Resolución y refresco. Buscá el equilibrio con la GPU para no desperdiciar rendimiento.',
  keyboard: 'Membrana para escribir, mecánico para jugar. El formato (60%, TKL, full) cambia mucho el escritorio.',
  mouse: 'Peso, sensor y conexión. Para shooters conviene liviano; para productividad, ergonómico.',
  headset: 'Conexión por cable o 2.4 GHz. Revisá el micrófono y la comodidad en sesiones largas.',
  extra: 'Sistema operativo, protección eléctrica, ventiladores, WiFi y accesorios que completan el setup.',
}

type SortKey = 'recomendado' | 'precio-asc' | 'precio-desc' | 'rendimiento'

const EMPTY_SELECTION: string[] = []

/** Filtra, ordena y presenta el catálogo de la categoría activa con datos de compatibilidad.
 * @returns La navegación por categorías y las tarjetas de componentes disponibles.
 */
export function Catalog({
  activeCategory,
  selections,
  analysis,
  onSelectCategory,
  onToggle,
  onDetails,
  onStep,
  onOpenPresets,
  onOpenOptimizer,
}: {
  activeCategory: Category
  selections: Selections
  analysis: Analysis
  onSelectCategory: (category: Category) => void
  onToggle: (category: Category, id: string) => ToggleResult
  onDetails: (part: Part) => void
  onStep: (direction: 1 | -1) => void
  onOpenPresets: () => void
  onOpenOptimizer: () => void
}) {
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('all')
  const [sort, setSort] = useState<SortKey>('recomendado')
  const [onlyCompatible, setOnlyCompatible] = useState(true)
  // Al cambiar de categoría reseteamos la búsqueda. Se hace ajustando el estado
  // durante el render en vez de un effect, para no encadenar renders extra.
  const [lastCategory, setLastCategory] = useState(activeCategory)
  if (lastCategory !== activeCategory) {
    setLastCategory(activeCategory)
    setQuery('')
    setBrand('all')
  }

  const category = CATEGORY_BY_ID[activeCategory]
  const parts = useMemo(() => PARTS_BY_CATEGORY[activeCategory] ?? [], [activeCategory])
  const selectedIds = useMemo(
    () => selections[activeCategory] ?? EMPTY_SELECTION,
    [selections, activeCategory],
  )
  const stepIndex = CATEGORIES.findIndex((entry) => entry.id === activeCategory)
  const showCompat = analysis.partCount > 0

  const brands = useMemo(
    () => Array.from(new Set(parts.map((part) => part.brand))).sort((a, b) => a.localeCompare(b)),
    [parts],
  )

  const enriched = useMemo(
    () =>
      parts.map((part) => ({
        part,
        compat: partCompatibility(part, selections),
        selected: selectedIds.includes(part.id),
      })),
    [parts, selections, selectedIds],
  )

  const compatibleCount = useMemo(
    () => enriched.filter((entry) => entry.compat.level !== 'bad').length,
    [enriched],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = enriched.filter(({ part, compat, selected }) => {
      if (onlyCompatible && compat.level === 'bad' && !selected) return false
      if (brand !== 'all' && part.brand !== brand) return false
      if (!term) return true
      return `${part.name} ${part.brand} ${part.highlights.join(' ')}`.toLowerCase().includes(term)
    })

    /** Convierte el nivel de compatibilidad en un orden numérico para ordenar resultados.
     * @returns La prioridad de orden (compatible, aviso o incompatible).
     */
    const rank = (level: 'ok' | 'warn' | 'bad') => (level === 'ok' ? 0 : level === 'warn' ? 1 : 2)

    return filtered.sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1
      if (sort === 'precio-asc') return a.part.price - b.part.price
      if (sort === 'precio-desc') return b.part.price - a.part.price
      if (sort === 'rendimiento') return (b.part.perf ?? 0) - (a.part.perf ?? 0)
      const rankDiff = rank(a.compat.level) - rank(b.compat.level)
      if (rankDiff !== 0) return rankDiff
      return a.part.price - b.part.price
    })
  }, [brand, enriched, onlyCompatible, query, sort])

  const selectedInCategory = selectedIds
    .map((id) => parts.find((part) => part.id === id))
    .filter((part): part is Part => Boolean(part))

  return (
    <div className="min-w-0 space-y-4">
      {analysis.partCount === 0 ? (
        <div className="panel flex flex-col gap-3 border-brand-500/20 bg-gradient-to-r from-brand-500/[0.08] via-transparent to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Tu build está vacía</p>
              <p className="mt-0.5 text-sm text-slate-400">
                Elegí componente por componente, arrancá con un preset o dejá que el
                optimizador arme una build según tu presupuesto.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onOpenOptimizer} className="btn btn-primary">
              <Wand2 className="size-4" aria-hidden /> Armá por presupuesto
            </button>
            <button type="button" onClick={onOpenPresets} className="btn btn-ghost">
              <Sparkles className="size-4" aria-hidden /> Ver presets
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel p-2.5">
        <div className="scroll-thin -mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1">
          {CATEGORIES.map((entry) => {
            const count = selections[entry.id]?.length ?? 0
            const active = entry.id === activeCategory
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectCategory(entry.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'border-brand-500/35 bg-brand-500/12 text-brand-200'
                    : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                )}
              >
                <CategoryIcon category={entry.id} className="size-3.5" />
                <span className="whitespace-nowrap">{entry.short}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      'grid min-w-4 place-items-center rounded-full px-1 font-mono text-micro',
                      active ? 'bg-brand-500/25 text-brand-200' : 'bg-white/[0.07] text-slate-400',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-brand-300">
              <CategoryIcon category={activeCategory} className="size-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-white">{category.label}</h2>
            {analysis.missingRequired.includes(activeCategory) ? (
              <span className="chip chip-warn">Esencial pendiente</span>
            ) : null}
            <span className="chip">{parts.length} opciones</span>
            {showCompat ? (
              <span className="chip chip-ok">
                {compatibleCount} compatibles
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            {DESCRIPTIONS[activeCategory]}
          </p>
          {showCompat && selectedInCategory.length === 0 && category.group === 'periferico' ? (
            <p className="mt-1.5 text-caption text-slate-400">
              Es opcional: podés dejarlo para más tarde, no bloquea la build.
            </p>
          ) : null}
          {selectedInCategory.length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-brand-300">Elegido:</span>
              {selectedInCategory.map((part) => (
                <span key={part.id} className="max-w-full truncate text-slate-300">
                  {part.name}
                  {selectedInCategory.length > 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative min-w-[190px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Buscar en ${category.label.toLowerCase()}…`}
            className="field pl-9"
            aria-label={`Buscar en ${category.label}`}
          />
        </div>

        {brands.length > 1 ? (
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="field w-auto min-w-[8.5rem] cursor-pointer"
            aria-label="Filtrar por marca"
          >
            <option value="all">Todas las marcas</option>
            {brands.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        ) : null}

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          className="field w-auto min-w-[9rem] cursor-pointer"
          aria-label="Ordenar"
        >
          <option value="recomendado">Recomendados</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
          <option value="rendimiento">Rendimiento</option>
        </select>

        <button
          type="button"
          role="switch"
          aria-checked={onlyCompatible}
          onClick={() => setOnlyCompatible((value) => !value)}
          className={cn(
            'btn h-10 border px-3 text-xs',
            onlyCompatible
              ? 'border-brand-500/30 bg-brand-500/10 text-brand-200'
              : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
          )}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Solo compatibles
          <span
            className={cn(
              'relative ml-0.5 h-4 w-7 rounded-full transition-colors',
              onlyCompatible ? 'bg-brand-500/70' : 'bg-white/15',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-3 rounded-full bg-white transition-all',
                onlyCompatible ? 'left-3.5' : 'left-0.5',
              )}
            />
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="panel px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">No hay componentes que coincidan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
            Probá con otra búsqueda, cambiá la marca o desactivá el filtro de compatibilidad.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setBrand('all')
              setOnlyCompatible(false)
            }}
            className="btn btn-ghost mt-4"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div key={activeCategory} className="animate-fade grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {visible.map(({ part, compat, selected }) => (
            <PartCard
              key={part.id}
              part={part}
              selected={selected}
              compat={compat}
              showCompat={showCompat}
              onToggle={() => onToggle(activeCategory, part.id) === 'added'}
              onDetails={() => onDetails(part)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={stepIndex === 0}
          className="btn btn-ghost min-h-10 text-xs disabled:opacity-30"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{stepIndex > 0 ? CATEGORIES[stepIndex - 1].label : 'Inicio'}</span>
          <span className="sm:hidden">Anterior</span>
        </button>
        <span className="font-mono text-caption text-slate-400">
          Paso {stepIndex + 1} / {CATEGORIES.length}
        </span>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={stepIndex === CATEGORIES.length - 1}
          className="btn btn-ghost min-h-10 text-xs disabled:opacity-30"
        >
          <span className="hidden sm:inline">
            {stepIndex < CATEGORIES.length - 1 ? CATEGORIES[stepIndex + 1].label : 'Fin'}
          </span>
          <span className="sm:hidden">Siguiente</span>
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
