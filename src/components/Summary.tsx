import {
  Copy,
  Download,
  Info,
  Lock,
  MessageCircle,
  Share2,
  TriangleAlert,
  Wallet,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CATEGORIES } from '../data/catalog'
import type { Analysis } from '../lib/compat'
import { money } from '../lib/format'
import type { Category } from '../types'
import { Progress } from './ui'
import { cn } from '../lib/cn'

/** Presenta una métrica con su valor, descripción opcional e indicador visual opcional.
 * @returns El bloque visual de una estadística.
 */
function Stat({
  label,
  value,
  hint,
  meter,
}: {
  label: string
  value: string
  hint?: string
  meter?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <p className="text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-micro leading-4 text-slate-400">{hint}</p> : null}
      {meter ? <div className="mt-1.5">{meter}</div> : null}
    </div>
  )
}

/** Resume costos, presupuesto, rendimiento y problemas de compatibilidad de la build.
 * @returns El panel de resumen con acciones para compartir y exportar.
 */
export function Summary({
  analysis,
  budget,
  onBudget,
  onSelectCategory,
  onOpenOptimizer,
  onOptimizeCurrent,
  onOpenShare,
  onExport,
  onCopyList,
  whatsappUrl,
  compact,
}: {
  analysis: Analysis
  budget: number | null
  onBudget: (value: number | null) => void
  onSelectCategory: (category: Category) => void
  onOpenOptimizer: () => void
  onOptimizeCurrent: () => void
  onOpenShare: () => void
  onExport: () => void
  onCopyList: () => void
  whatsappUrl: string
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const towerCount = CATEGORIES.reduce(
    (count, category) =>
      category.group === 'esencial'
        ? count + (analysis.selected[category.id]?.length ?? 0)
        : count,
    0,
  )
  const ratio = budget ? (analysis.total / budget) * 100 : 0
  const over = Boolean(budget && analysis.total > budget)
  const remaining = budget ? budget - analysis.total : 0
  const issues = analysis.issues
  const visibleIssues = expanded ? issues : issues.slice(0, 4)

  return (
    <div className={cn('flex flex-col gap-3', compact ? '' : 'panel p-3.5')}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="label">Total de la build</p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-white">
              {money(analysis.total)}
            </p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-brand-300">
            <Wallet className="size-4" aria-hidden />
          </span>
        </div>

        <div className="mt-3">
          <label htmlFor="budget" className="label">
            Presupuesto
          </label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                $
              </span>
              <input
                id="budget"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Sin límite"
                value={budget ?? ''}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '')
                  onBudget(digits ? Number(digits) : null)
                }}
                className="field pl-7 font-mono"
              />
            </div>
            {budget ? (
              <button
                type="button"
                onClick={() => onBudget(null)}
                className="btn btn-ghost px-2.5 text-xs"
                title="Quitar presupuesto"
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>

        {budget ? (
          <div className="mt-2.5">
            <Progress
              value={ratio}
              tone={over ? 'rose' : ratio > 85 ? 'amber' : 'brand'}
              className="h-2"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-caption">
              <span className={over ? 'font-medium text-rose-300' : 'text-slate-400'}>
                {over ? `Te pasaste ${money(Math.abs(remaining))}` : `Disponible ${money(remaining)}`}
              </span>
              <span className="font-mono text-slate-400">{Math.round(ratio)}%</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-caption leading-4 text-slate-400">
            Cargá un monto para ver cuánto te queda y controlar el gasto.
          </p>
        )}

        <button
          type="button"
          onClick={onOpenOptimizer}
          className="btn btn-primary mt-3 w-full text-xs"
        >
          <Wand2 className="size-4" aria-hidden /> Armá por presupuesto
        </button>
        {towerCount > 0 ? (
          <button
            type="button"
            onClick={onOptimizeCurrent}
            className="btn btn-ghost mt-2 w-full text-xs"
            title="Mantené tus piezas de la torre y completá el resto dentro del presupuesto"
          >
            <Lock className="size-3.5" aria-hidden /> Optimizar mi build actual
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Consumo"
          value={`${analysis.watts} W`}
          hint={`Fuente ideal ${analysis.recommendedPsu} W`}
          meter={
            <Progress
              value={Math.min(100, Math.round((analysis.watts / Math.max(analysis.recommendedPsu, 1)) * 100))}
              tone={
                analysis.watts > analysis.recommendedPsu
                  ? 'rose'
                  : analysis.watts / Math.max(analysis.recommendedPsu, 1) > 0.85
                    ? 'amber'
                    : 'brand'
              }
              className="h-1"
            />
          }
        />
        <Stat
          label="Componentes"
          value={String(analysis.partCount)}
          hint={`${analysis.missingRequired.length} esenciales pendientes`}
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="label">Rendimiento estimado</p>
          <span className="chip chip-brand">{analysis.targetLabel}</span>
        </div>
        <div className="mt-3 space-y-2.5">
          <div>
            <div className="mb-1 flex items-center justify-between text-caption">
              <span className="text-slate-400">Gaming</span>
              <span className="font-mono text-slate-400">{analysis.gamingIndex}/100</span>
            </div>
            <Progress value={analysis.gamingIndex} marks={[25, 50, 75]} />
            <p className="mt-1 text-micro leading-4 text-slate-400" aria-hidden>
              Marcas de resolución: 1080p · 1440p · 4K
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-caption">
              <span className="text-slate-400">Productividad</span>
              <span className="font-mono text-slate-400">{analysis.productivityIndex}/100</span>
            </div>
            <Progress value={analysis.productivityIndex} tone="sky" />
          </div>
        </div>
        <p className="mt-2.5 text-micro leading-4 text-slate-400">
          Índice orientativo según los componentes elegidos, no son FPS medidos.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="label">Compatibilidad</p>
          <div className="flex items-center gap-1.5">
            {analysis.errors.length > 0 ? (
              <span className="chip chip-bad">
                {analysis.errors.length} {analysis.errors.length === 1 ? 'error' : 'errores'}
              </span>
            ) : null}
            {analysis.warnings.length > 0 ? (
              <span className="chip chip-warn">
                {analysis.warnings.length} {analysis.warnings.length === 1 ? 'aviso' : 'avisos'}
              </span>
            ) : null}
            {analysis.issues.length === 0 && analysis.partCount > 0 ? (
              <span className="chip chip-ok">Todo OK</span>
            ) : null}
          </div>
        </div>

        {analysis.partCount === 0 ? (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs leading-5 text-slate-400">
            Elegí tus componentes y acá vas a ver los problemas de socket, RAM, fuente, tamaño y más.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visibleIssues.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(issue.categories[0])}
                  className={cn(
                    'w-full rounded-xl border px-2.5 py-2 text-left transition-colors',
                    issue.severity === 'error'
                      ? 'border-rose-500/20 bg-rose-500/[0.06] hover:bg-rose-500/[0.1]'
                      : issue.severity === 'warning'
                        ? 'border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/[0.09]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
                  )}
                >
                  <span className="flex items-start gap-1.5">
                    {issue.severity === 'error' ? (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" aria-hidden />
                    ) : issue.severity === 'warning' ? (
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden />
                    ) : (
                      <Info className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden />
                    )}
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-xs font-semibold',
                          issue.severity === 'error'
                            ? 'text-rose-200'
                            : issue.severity === 'warning'
                              ? 'text-amber-200'
                              : 'text-slate-300',
                        )}
                      >
                        {issue.title}
                      </span>
                      <span className="mt-0.5 block text-caption leading-4 text-slate-400">
                        {issue.detail}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {issues.length > 4 ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-1.5 text-caption font-medium text-slate-400 hover:text-slate-300"
          >
            {expanded ? 'Ver menos' : `Ver ${issues.length - 4} más`}
          </button>
        ) : null}
      </div>

      {analysis.isComplete ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
          <p className="text-sm font-semibold text-emerald-200">
            ¡Tu build está lista y es compatible!
          </p>
          <p className="mt-1 text-caption leading-4 text-slate-300">
            Consultá por WhatsApp el mejor precio y las opciones de armado. Te enviamos la lista
            completa de componentes.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn mt-2.5 w-full bg-emerald-500 text-xs text-ink-950 hover:bg-emerald-400"
          >
            <MessageCircle className="size-3.5" aria-hidden /> Consultar mejor precio por WhatsApp
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onOpenShare} className="btn btn-primary text-xs">
          <Share2 className="size-3.5" aria-hidden /> Compartir
        </button>
        <button type="button" onClick={onExport} className="btn btn-ghost text-xs">
          <Download className="size-3.5" aria-hidden /> Exportar
        </button>
        <button type="button" onClick={onCopyList} className="btn btn-ghost col-span-2 text-xs">
          <Copy className="size-3.5" aria-hidden /> Copiar lista de componentes
        </button>
      </div>

      <div className="flex items-start gap-1.5 rounded-xl border border-white/[0.05] px-2.5 py-2">
        <Zap className="mt-0.5 size-3.5 shrink-0 text-slate-600" aria-hidden />
        <p className="text-micro leading-4 text-slate-400">
          Consumo y fuente recomendada son estimaciones. Precios de referencia en ARS.
        </p>
      </div>
    </div>
  )
}
