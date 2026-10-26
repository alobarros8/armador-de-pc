import {
  Box,
  CircleCheck,
  CircuitBoard,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  Headphones,
  Keyboard,
  MemoryStick,
  Monitor,
  Mouse,
  Power,
  Puzzle,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { Category, Part } from '../types'

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  cpu: Cpu,
  cooler: Fan,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  gpu: Gpu,
  storage: HardDrive,
  psu: Power,
  case: Box,
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headphones,
  extra: Puzzle,
}

export function CategoryIcon({
  category,
  className = 'size-4',
}: {
  category: Category
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon className={className} aria-hidden />
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current

    // Llevamos el foco al panel del modal para teclado y lectores de pantalla.
    dialog?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'Tab' && dialog) {
        // Focus trap: el tabulador cicla dentro del modal.
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) {
          event.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (event.shiftKey) {
          if (active === first || active === dialog) {
            event.preventDefault()
            last.focus()
          }
        } else if (active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900 shadow-2xl outline-none sm:m-4 sm:rounded-2xl',
          wide ? 'sm:max-w-4xl' : 'sm:max-w-2xl',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="btn btn-subtle -mr-1 shrink-0 rounded-lg p-1.5"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-white/[0.06] px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  )
}

const BRAND_TONES: Record<string, string> = {
  AMD: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
  Intel: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
  NVIDIA: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  Arc: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
  Radeon: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
  GeForce: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
}

export function BrandBadge({ part }: { part: Part }) {
  const label = part.category === 'gpu' && part.chip ? part.chip : part.brand
  return (
    <span
      className={cn(
        'inline-flex max-w-[10rem] items-center truncate rounded-md border px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wider',
        BRAND_TONES[label] ?? 'badge-neutral',
      )}
    >
      {label}
    </span>
  )
}

export function PlatformBadge({ platform }: { platform: string }) {
  const tone =
    platform === 'AMD'
      ? 'border-rose-400/25 bg-rose-500/10 text-rose-300'
      : platform === 'Intel'
        ? 'border-sky-400/25 bg-sky-500/10 text-sky-300'
        : 'border-white/10 bg-white/[0.04] text-slate-300'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wider',
        tone,
      )}
    >
      {platform}
    </span>
  )
}

export function CompatBadge({
  level,
  reason,
  selected,
}: {
  level: 'ok' | 'warn' | 'bad'
  reason: string
  selected?: boolean
}) {
  if (selected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-semibold badge-brand">
        <CircleCheck className="size-3" aria-hidden /> En tu build
      </span>
    )
  }

  if (level === 'bad') {
    return (
      <span
        title={reason}
        className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-micro font-semibold badge-bad"
      >
        <XCircle className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{reason || 'Incompatible'}</span>
      </span>
    )
  }

  if (level === 'warn') {
    return (
      <span
        title={reason}
        className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-micro font-semibold badge-warn"
      >
        <TriangleAlert className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{reason || 'Revisar'}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-semibold badge-ok">
      <CircleCheck className="size-3" aria-hidden /> Compatible
    </span>
  )
}

export function Progress({
  value,
  tone = 'brand',
  className,
  marks,
}: {
  value: number
  tone?: 'brand' | 'amber' | 'rose' | 'sky'
  className?: string
  /** Marcas decorativas en % (rangos de referencia sobre la barra). */
  marks?: number[]
}) {
  const gradients: Record<string, string> = {
    brand: 'from-brand-500 to-emerald-300',
    amber: 'from-amber-500 to-yellow-300',
    rose: 'from-rose-500 to-orange-400',
    sky: 'from-sky-500 to-cyan-300',
  }
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-500', gradients[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {marks
        ? marks.filter((mark) => mark > 0 && mark < 100).map((mark) => (
            <span
              key={mark}
              aria-hidden
              className="absolute inset-y-0.5 w-px bg-white/25"
              style={{ left: `${mark}%` }}
            />
          ))
        : null}
    </div>
  )
}
