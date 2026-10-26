import { Check, ChevronRight, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { money } from '../lib/format'
import type { Part } from '../types'
import { BrandBadge, CompatBadge } from './ui'
import { PartImage } from './PartImage'
import { cn } from '../lib/cn'

export function PartCard({
  part,
  selected,
  compat,
  showCompat,
  onToggle,
  onDetails,
}: {
  part: Part
  selected: boolean
  compat: { level: 'ok' | 'warn' | 'bad'; reason: string }
  showCompat: boolean
  onToggle: () => boolean
  onDetails: () => void
}) {
  const [adding, setAdding] = useState(false)
  const confirming = adding && selected

  useEffect(() => {
    if (!confirming) return
    const timer = window.setTimeout(() => setAdding(false), 520)
    return () => window.clearTimeout(timer)
  }, [confirming])

  const handleToggle = () => {
    if (confirming) return
    if (selected) {
      onToggle()
      return
    }
    if (onToggle()) setAdding(true)
  }

  return (
    <article
      className={cn(
        'group relative flex min-w-0 flex-col rounded-2xl border p-3.5 transition-all duration-[var(--dur-fast)] ease-(--ease-emerge) sm:p-4',
        selected
          ? 'border-brand-500/45 bg-brand-500/[0.055] shadow-[0_0_0_1px_rgba(16,185,129,0.08)] translate-y-[-2px]'
          : 'border-white/[0.065] bg-white/[0.022] hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]',
      )}
    >
      {selected ? (
        <span className="animate-check-pop absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-brand-500 text-ink-950 shadow-lg shadow-brand-950/40">
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <BrandBadge part={part} />
          {showCompat ? (
            <CompatBadge level={compat.level} reason={compat.reason} selected={selected} />
          ) : null}
        </div>
        <span
          className={cn(
            'shrink-0 font-mono text-sm font-semibold tabular-nums',
            part.price === 0 ? 'text-brand-300' : 'text-slate-100',
          )}
        >
          {part.price === 0 ? 'Incluido' : money(part.price)}
        </span>
      </div>

      <button
        type="button"
        onClick={onDetails}
        aria-label={`Ver detalle de ${part.name}`}
        className="mt-2.5 block w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <PartImage part={part} className="aspect-[16/10] w-full" />
      </button>

      <button
        type="button"
        onClick={onDetails}
        className="mt-3 text-left text-metric font-semibold leading-snug text-slate-100 transition-colors hover:text-white py-2.5 -my-2.5"
      >
        <span className="line-clamp-2">{part.name}</span>
      </button>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {part.highlights.slice(0, 4).map((highlight) => (
          <span key={highlight} className="chip">
            {highlight}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 py-2.5 -my-2.5"
        >
          Ver detalle
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={selected}
          aria-disabled={confirming}
          aria-label={
            confirming
              ? `${part.name} agregado a la build`
              : selected
                ? `Quitar ${part.name} de la build`
                : `Agregar ${part.name} a la build`
          }
          className={cn(
            'btn min-h-10 min-w-24 px-3 text-xs',
            confirming
              ? 'animate-add-confirm pointer-events-none border border-brand-500/40 bg-brand-500 text-ink-950'
              : selected
                ? 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200'
                : 'bg-brand-500 text-ink-950 hover:bg-brand-400',
          )}
        >
          {confirming ? (
            <>
              <Check className="size-3.5" strokeWidth={3} aria-hidden /> Agregado
            </>
          ) : selected ? (
            <span className="animate-fade inline-flex items-center gap-1.5">
              <X className="size-3.5" aria-hidden /> Quitar
            </span>
          ) : (
            <>
              <Plus className="size-3.5" aria-hidden /> Agregar
            </>
          )}
        </button>
      </div>
    </article>
  )
}
