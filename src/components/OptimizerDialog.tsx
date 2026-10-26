import {
  ArrowLeft,
  Box,
  Briefcase,
  Check,
  CircleCheck,
  Film,
  Gamepad2,
  Gauge,
  Info,
  Loader2,
  Lock,
  LockOpen,
  Monitor,
  Pin,
  Radio,
  Scale,
  Sparkles,
  TriangleAlert,
  Wallet,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_BY_ID, getPart } from '../data/catalog'
import { cn } from '../lib/cn'
import { money, moneyShort } from '../lib/format'
import {
  PREFERENCE_OPTIONS,
  USE_CASE_OPTIONS,
  optimizeBuild,
  type OptimizerProposal,
  type OptimizerResult,
  type Preference,
  type UseCase,
} from '../lib/optimizer'
import type { Category, Part, Selections } from '../types'
import { CategoryIcon, Modal, PlatformBadge, Progress } from './ui'

const USE_CASE_ICONS: Record<UseCase, LucideIcon> = {
  'gaming-1080': Gamepad2,
  'gaming-1440': Monitor,
  editing: Film,
  streaming: Radio,
  office: Briefcase,
}

const PREFERENCE_ICONS: Record<Preference, LucideIcon> = {
  performance: Zap,
  balanced: Scale,
  compact: Box,
}

const PROPOSAL_CATEGORIES: Category[] = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case',
  'cooler',
]

const QUICK_BUDGETS = [800_000, 1_200_000, 1_800_000, 2_500_000, 3_500_000]

const budgetFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function getUseCaseLabel(id: UseCase): string {
  return USE_CASE_OPTIONS.find((option) => option.id === id)?.label ?? id
}

function getPreferenceLabel(id: Preference): string {
  return PREFERENCE_OPTIONS.find((option) => option.id === id)?.label ?? id
}

type TowerEntry = { category: Category; part: Part }

function towerPartsOf(selections: Selections): TowerEntry[] {
  return CATEGORIES.filter((meta) => meta.group === 'esencial').flatMap((meta) =>
    (selections[meta.id] ?? [])
      .map((id) => getPart(id))
      .filter((part): part is Part => Boolean(part))
      .map((part) => ({ category: meta.id, part })),
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'brand' | 'sky' | 'amber'
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-1 text-micro uppercase tracking-[0.1em] text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{value}</span>
      </div>
      <Progress value={value} tone={tone} className="mt-1" />
    </div>
  )
}

function ProposalCard({
  proposal,
  onApply,
}: {
  proposal: OptimizerProposal
  onApply: (proposal: OptimizerProposal) => void
}) {
  const rows = PROPOSAL_CATEGORIES.map((category) => ({
    category,
    part: getPart(proposal.selections[category]?.[0]),
  })).filter((row): row is { category: Category; part: Part } => Boolean(row.part))
  const lockedCategories = new Set(proposal.lockedCategories)

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border p-3.5 transition-colors',
        proposal.recommended
          ? 'border-brand-500/35 bg-brand-500/[0.055] shadow-[0_24px_70px_-48px_rgba(16,185,129,0.9)]'
          : 'border-white/[0.07] bg-white/[0.02]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-white">{proposal.name}</h3>
            {proposal.recommended ? (
              <span className="chip chip-brand">
                <Sparkles className="size-3" aria-hidden /> Recomendada
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-caption leading-4 text-slate-400">{proposal.tagline}</p>
        </div>
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg border',
            proposal.recommended
              ? 'border-brand-500/30 bg-brand-500/15 text-brand-300'
              : 'border-white/[0.07] bg-white/[0.03] text-slate-400',
          )}
        >
          {proposal.id === 'max' ? (
            <Zap className="size-4" aria-hidden />
          ) : proposal.id === 'value' ? (
            <Scale className="size-4" aria-hidden />
          ) : (
            <Gauge className="size-4" aria-hidden />
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="font-mono text-xl font-semibold tracking-tight text-white">
          {money(proposal.total)}
        </p>
        <span
          className={cn(
            'text-caption font-medium',
            proposal.remaining >= 0 ? 'text-brand-300' : 'text-rose-300',
          )}
        >
          {proposal.remaining >= 0
            ? `Quedan ${money(proposal.remaining)}`
            : `Excede ${money(Math.abs(proposal.remaining))}`}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {proposal.badges.map((badge, index) =>
          index === 0 && (badge === 'AMD' || badge === 'Intel') ? (
            <PlatformBadge key={badge} platform={badge} />
          ) : (
            <span key={badge} className="chip">
              {badge}
            </span>
          ),
        )}
        <span className="chip chip-ok">
          <CircleCheck className="size-3" aria-hidden /> Compatible
        </span>
        {proposal.lockedCategories.length > 0 ? (
          <span className="chip chip-brand">
            <Lock className="size-3" aria-hidden /> {proposal.lockedCategories.length}{' '}
            {proposal.lockedCategories.length === 1 ? 'fija' : 'fijas'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Rend." value={proposal.performance} tone="brand" />
        <Metric label="Calidad" value={proposal.quality} tone="sky" />
        <Metric label="Valor" value={proposal.value} tone="amber" />
      </div>

      <ul className="mt-3 space-y-1">
        {proposal.highlights.map((highlight) => (
          <li
            key={highlight}
            className="flex items-start gap-1.5 text-caption leading-4 text-slate-300"
          >
            <Check className="mt-0.5 size-3 shrink-0 text-brand-400" aria-hidden />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex-1 border-t border-white/[0.06] pt-2.5">
        <p className="label mb-1.5">Componentes</p>
        <ul className="space-y-1">
          {rows.map(({ category, part }) => (
            <li
              key={category}
              className="flex items-center gap-1.5 text-caption text-slate-400"
            >
              <CategoryIcon category={category} className="size-3 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 truncate">{part.name}</span>
              {lockedCategories.has(category) ? (
                <span className="chip chip-brand shrink-0 px-1 py-0 text-micro leading-4">
                  <Pin className="size-2.5" aria-hidden /> Fija
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onApply(proposal)}
        className={cn(
          'btn mt-3 w-full text-xs',
          proposal.recommended ? 'btn-primary' : 'btn-ghost',
        )}
      >
        <Wand2 className="size-3.5" aria-hidden /> Aplicar esta build
      </button>
    </article>
  )
}

export function OptimizerDialog({
  open,
  onClose,
  onApply,
  initialBudget,
  selections,
  initialKeepCurrent = false,
}: {
  open: boolean
  onClose: () => void
  onApply: (proposal: OptimizerProposal) => void
  initialBudget?: number | null
  selections: Selections
  initialKeepCurrent?: boolean
}) {
  const [budgetValue, setBudgetValue] = useState<number | null>(() =>
    initialBudget && initialBudget > 0 ? initialBudget : null,
  )
  const [useCase, setUseCase] = useState<UseCase>('gaming-1080')
  const [preference, setPreference] = useState<Preference>('balanced')
  const [keepCurrent, setKeepCurrent] = useState(
    () => initialKeepCurrent && towerPartsOf(selections).length > 0,
  )
  const [phase, setPhase] = useState<'form' | 'loading' | 'results'>('form')
  const [result, setResult] = useState<OptimizerResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const towerParts = useMemo(() => towerPartsOf(selections), [selections])
  const towerTotal = towerParts.reduce((total, entry) => total + entry.part.price, 0)
  const lockedSelections = keepCurrent && towerParts.length > 0 ? selections : undefined

  useEffect(() => {
    if (phase !== 'loading' || !budgetValue) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setResult(
        optimizeBuild({
          budget: budgetValue,
          useCase,
          preference,
          locked: lockedSelections,
        }),
      )
      setPhase('results')
    }, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [budgetValue, lockedSelections, phase, preference, useCase])

  const start = () => {
    if (!budgetValue || budgetValue <= 0) {
      setFormError('Ingresá un presupuesto para la torre.')
      return
    }
    setFormError(null)
    setResult(null)
    setPhase('loading')
  }

  const backToForm = () => {
    setPhase('form')
    setResult(null)
  }

  const retryWithMinimum = (minimum: number) => {
    setBudgetValue(Math.ceil(minimum / 10_000) * 10_000)
    setFormError(null)
    setResult(null)
    setPhase('loading')
  }

  const retryWithoutLocks = () => {
    setKeepCurrent(false)
    setFormError(null)
    setResult(null)
    setPhase('loading')
  }

  const lockedActive = keepCurrent && towerParts.length > 0

  const title =
    phase === 'loading'
      ? lockedActive
        ? 'Optimizando tu build'
        : 'Armando tu build'
      : phase === 'results'
        ? result?.ok
          ? lockedActive
            ? 'Tus builds optimizadas'
            : 'Tus builds sugeridas'
          : result?.reason === 'locked-conflict'
            ? 'Tus piezas no son compatibles'
            : 'Sin resultados'
        : lockedActive
          ? 'Optimizá tu build actual'
          : 'Armá por presupuesto'

  const subtitle =
    phase === 'results' && result
      ? `${getUseCaseLabel(result.useCase)} · ${getPreferenceLabel(result.preference)} · Presupuesto ${money(result.budget)}${
          result.ok && result.lockedCount > 0
            ? ` · ${result.lockedCount} ${result.lockedCount === 1 ? 'pieza fija' : 'piezas fijas'}`
            : ''
        }`
      : lockedActive
        ? 'Mantenemos tus piezas de la torre y completamos lo que falta dentro del presupuesto.'
        : 'Elegí presupuesto, uso y preferencia. Armamos 2 o 3 builds completas y compatibles.'

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} wide>
      {phase === 'loading' ? (
        <div
          role="status"
          className="flex min-h-[340px] flex-col items-center justify-center gap-4 py-8 text-center"
        >
          <span className="grid size-14 place-items-center rounded-2xl border border-brand-500/25 bg-brand-500/10 text-brand-300">
            <Loader2 className="size-7 animate-spin" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Optimizando componentes...</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-slate-400">
              {lockedActive
                ? 'Completamos tu torre sin cambiar las piezas fijas y descartamos las combinaciones que no son compatibles.'
                : 'Probamos combinaciones de CPU, GPU, mother, RAM, almacenamiento, fuente y gabinete, y descartamos las que no son compatibles.'}
            </p>
          </div>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-brand-500 to-emerald-300" />
          </div>
          <p className="text-caption text-slate-400">Suele tardar menos de un segundo.</p>
        </div>
      ) : phase === 'results' && result ? (
        result.ok ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={backToForm} className="btn btn-ghost text-xs">
                <ArrowLeft className="size-3.5" aria-hidden /> Cambiar criterios
              </button>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip chip-brand">
                  <Sparkles className="size-3" aria-hidden />
                  {result.proposals.length} {result.proposals.length === 1 ? 'opción' : 'opciones'}
                </span>
                <span className="chip">
                  <Wallet className="size-3" aria-hidden /> {money(result.budget)}
                </span>
                {result.lockedCount > 0 ? (
                  <span className="chip chip-brand">
                    <Lock className="size-3" aria-hidden /> {result.lockedCount}{' '}
                    {result.lockedCount === 1 ? 'fija' : 'fijas'} ·{' '}
                    {money(result.lockedTotal)}
                  </span>
                ) : null}
              </div>
            </div>

            {result.note ? <p className="note note-warn">{result.note}</p> : null}

            {result.lockedCount > 0 ? (
              <div className="note note-info flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  Mantenemos {result.lockedCount}{' '}
                  {result.lockedCount === 1 ? 'pieza fija' : 'piezas fijas'} de tu build
                  actual. En cada propuesta están marcadas con «Fija» y el resto se eligió
                  para completar la torre.
                </p>
              </div>
            ) : null}

            <p className="text-caption leading-4 text-slate-400">
              {result.lockedCount > 0
                ? 'Al aplicar una propuesta mantenemos tus piezas fijas, reemplazamos el resto de la torre y conservamos tus periféricos.'
                : 'Al aplicar una propuesta reemplazamos los componentes de tu build actual.'}{' '}
              Los precios son de referencia y no incluyen envío.
            </p>

            <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.proposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} onApply={onApply} />
              ))}
            </div>

            {result.proposals.length < 3 ? (
              <p className="text-caption leading-4 text-slate-400">
                No encontramos más opciones suficientemente distintas dentro de este presupuesto.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                <TriangleAlert className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {result.reason === 'locked-conflict'
                    ? 'Tus piezas fijas tienen conflictos'
                    : 'No pudimos armar una build completa'}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-400">
                  {result.message}
                </p>
              </div>
            </div>

            {result.details?.length ? (
              <div
                className={cn(
                  'note',
                  result.reason === 'locked-conflict' ? 'note-bad' : 'note-warn',
                )}
              >
                <p className="font-semibold">
                  {result.reason === 'locked-conflict'
                    ? 'Conflictos detectados'
                    : 'Detalle'}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {result.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.minimumBudget ? (
              <div className="note note-info">
                <p className="font-semibold text-sky-200">Presupuesto mínimo orientativo</p>
                <p className="mt-1">
                  Con {money(result.minimumBudget)} podríamos intentar una build completa para{' '}
                  {getUseCaseLabel(result.useCase).toLowerCase()}.
                </p>
                <button
                  type="button"
                  onClick={() => retryWithMinimum(result.minimumBudget as number)}
                  className="btn btn-primary mt-2 text-xs"
                >
                  <Wand2 className="size-3.5" aria-hidden /> Probar con{' '}
                  {moneyShort(result.minimumBudget)}
                </button>
              </div>
            ) : null}

            {lockedActive ? (
              <button
                type="button"
                onClick={retryWithoutLocks}
                className={cn(
                  'btn w-full text-xs',
                  result.reason === 'locked-conflict' ? 'btn-primary' : 'btn-ghost',
                )}
              >
                <LockOpen className="size-3.5" aria-hidden /> Optimizar sin fijar mis piezas
              </button>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={backToForm} className="btn btn-ghost flex-1 text-xs">
                <ArrowLeft className="size-3.5" aria-hidden /> Cambiar criterios
              </button>
              <button type="button" onClick={onClose} className="btn btn-subtle flex-1 text-xs">
                Cerrar
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-5">
          <div className="note note-info flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              El presupuesto cubre solo la torre: CPU, cooler, mother, RAM, GPU,
              almacenamiento, fuente y gabinete. No incluye monitor, periféricos ni envío.
            </p>
          </div>

          <div>
            <label htmlFor="optimizer-budget" className="label">
              Presupuesto para la torre
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                $
              </span>
              <input
                id="optimizer-budget"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1.500.000"
                value={budgetValue ? budgetFormatter.format(budgetValue) : ''}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '')
                  setBudgetValue(digits ? Number(digits) : null)
                  setFormError(null)
                }}
                className="field pl-7 font-mono text-base"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_BUDGETS.map((value) => {
                const selected = budgetValue === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setBudgetValue(value)
                      setFormError(null)
                    }}
                    className={cn(
                      'chip transition-colors',
                      selected
                        ? 'chip-brand bg-brand-500/10 text-brand-200'
                        : 'hover:border-white/15 hover:text-slate-200',
                    )}
                  >
                    {moneyShort(value)}
                  </button>
                )
              })}
            </div>
            {formError ? <p className="note note-bad mt-2">{formError}</p> : null}
          </div>

          {towerParts.length > 0 ? (
            <div
              className={cn(
                'rounded-xl border p-3 transition-colors',
                keepCurrent
                  ? 'border-brand-500/35 bg-brand-500/[0.055]'
                  : 'border-white/[0.07] bg-white/[0.02]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Lock className="size-4 text-brand-300" aria-hidden />
                    Mantener mis piezas actuales
                  </p>
                  <p className="mt-1 text-caption leading-4 text-slate-400">
                    Fijamos las piezas de la torre que ya elegiste y completamos las
                    categorías que faltan. Las fijas se cuentan dentro del presupuesto.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={keepCurrent}
                  aria-label="Mantener mis piezas actuales"
                  onClick={() => {
                    setKeepCurrent((value) => !value)
                    setFormError(null)
                  }}
                  className={cn(
                    'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors',
                    keepCurrent
                      ? 'border-brand-500/40 bg-brand-500/80'
                      : 'border-white/10 bg-white/[0.06]',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform',
                      keepCurrent && 'translate-x-5',
                    )}
                  />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="chip chip-brand">
                  <Pin className="size-3" aria-hidden /> {towerParts.length}{' '}
                  {keepCurrent
                    ? towerParts.length === 1
                      ? 'pieza fija'
                      : 'piezas fijas'
                    : towerParts.length === 1
                      ? 'pieza de tu build'
                      : 'piezas de tu build'}
                </span>
                <span className="chip">
                  <Wallet className="size-3" aria-hidden /> {money(towerTotal)}
                </span>
                {keepCurrent && budgetValue ? (
                  <span
                    className={cn(
                      'chip',
                      budgetValue >= towerTotal ? 'chip-ok' : 'chip-bad',
                    )}
                  >
                    {budgetValue >= towerTotal
                      ? `Quedan ${money(budgetValue - towerTotal)} para completar`
                      : `Las fijas exceden el presupuesto en ${money(towerTotal - budgetValue)}`}
                  </span>
                ) : null}
              </div>

              {keepCurrent ? (
                <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
                  {towerParts.map(({ category, part }) => (
                    <li
                      key={`${category}-${part.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-ink-950/40 px-2 py-1.5"
                    >
                      <CategoryIcon
                        category={category}
                        className="size-3 shrink-0 text-slate-500"
                      />
                      <span className="shrink-0 text-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
                        {CATEGORY_BY_ID[category].short}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-caption text-slate-300">
                        {part.name}
                      </span>
                      <span className="shrink-0 font-mono text-micro text-slate-400">
                        {part.price === 0 ? 'Incluido' : moneyShort(part.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="label">¿Para qué la vas a usar?</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASE_OPTIONS.map((option) => {
                const Icon = USE_CASE_ICONS[option.id]
                const selected = useCase === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setUseCase(option.id)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-brand-500/40 bg-brand-500/[0.08]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.035]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                        selected
                          ? 'border-brand-500/30 bg-brand-500/15 text-brand-300'
                          : 'border-white/[0.07] bg-white/[0.03] text-slate-400',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-xs font-semibold',
                          selected ? 'text-brand-100' : 'text-slate-200',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-caption leading-4 text-slate-400">
                        {option.description}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="ml-auto mt-0.5 size-3.5 shrink-0 text-brand-300" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="label">¿Qué priorizamos?</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {PREFERENCE_OPTIONS.map((option) => {
                const Icon = PREFERENCE_ICONS[option.id]
                const selected = preference === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPreference(option.id)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-brand-500/40 bg-brand-500/[0.08]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.035]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                        selected
                          ? 'border-brand-500/30 bg-brand-500/15 text-brand-300'
                          : 'border-white/[0.07] bg-white/[0.03] text-slate-400',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-xs font-semibold',
                          selected ? 'text-brand-100' : 'text-slate-200',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-caption leading-4 text-slate-400">
                        {option.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={!budgetValue || budgetValue <= 0}
            className="btn btn-primary w-full py-2.5 text-sm"
          >
            <Wand2 className="size-4" aria-hidden />{' '}
            {lockedActive ? 'Optimizar mi build' : 'Armá mis builds'}
          </button>

          <p className="text-center text-caption leading-4 text-slate-400">
            {lockedActive
              ? `Mantenemos tus ${towerParts.length} ${
                  towerParts.length === 1 ? 'pieza fija' : 'piezas fijas'
                } y completamos la torre. Todas las propuestas son compatibles y entran en el presupuesto.`
              : 'Generamos hasta 3 propuestas: máximo rendimiento, equilibrada y mejor valor. Todas son compatibles y entran en tu presupuesto.'}
          </p>
        </div>
      )}
    </Modal>
  )
}
