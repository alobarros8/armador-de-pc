import { Check, Copy, Download, FileJson, ImageDown, Link2, Plus, Share2, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { PRESETS } from '../data/presets'
import { CATEGORY_BY_ID, getPart } from '../data/catalog'
import { money } from '../lib/format'
import { createBuildCardBlob, downloadBlob } from '../lib/buildCard'
import {
  buildLink,
  buildToText,
  copyText,
  decodeBuild,
  downloadBuild,
  readBuildFile,
  sanitizeSelections,
  type BuildSnapshot,
} from '../lib/share'
import type { Analysis } from '../lib/compat'
import type { Part, Preset } from '../types'
import { BrandBadge, CompatBadge, Modal, PlatformBadge } from './ui'
import { PartImage } from './PartImage'
import { cn } from '../lib/cn'

type Notify = (message: string, tone?: 'success' | 'error' | 'info') => void

/* ------------------------------------------------------------------ */
/* Presets                                                            */
/* ------------------------------------------------------------------ */

function presetTotal(preset: Preset): number {
  return Object.values(preset.selections)
    .flat()
    .reduce((total, id) => total + (getPart(id)?.price ?? 0), 0)
}

export function PresetsDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (preset: Preset) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Presets por gama"
      subtitle="Builds completas y compatibles. Aplicá una y ajustá lo que quieras."
      wide
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {PRESETS.map((preset) => {
          const total = presetTotal(preset)
          const count = Object.values(preset.selections).flat().length
          return (
            <article
              key={preset.id}
              className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition-colors hover:border-brand-500/25 hover:bg-white/[0.035]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <PlatformBadge platform={preset.platform} />
                  <span className="chip">{preset.tier}</span>
                </div>
                <span className="font-mono text-sm font-semibold text-slate-100">{money(total)}</span>
              </div>
              <h3 className="mt-2 text-metric font-semibold text-white">{preset.name}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-slate-400">{preset.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-micro uppercase tracking-wider text-slate-400">
                  {preset.useCase} · {count} piezas
                </span>
                <button
                  type="button"
                  onClick={() => onApply(preset)}
                  className="btn bg-brand-500/15 px-2.5 py-1.5 text-xs text-brand-200 hover:bg-brand-500/25"
                >
                  Aplicar
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Share / import                                                     */
/* ------------------------------------------------------------------ */

function parseImport(input: string): BuildSnapshot | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        version?: number
        budget?: number | null
        selections?: unknown
        v?: number
        b?: number | null
        s?: unknown
      }
      const budget = parsed.budget ?? parsed.b
      return {
        version: 1,
        budget: typeof budget === 'number' && budget > 0 ? budget : null,
        selections: sanitizeSelections(parsed.selections ?? parsed.s),
      }
    } catch {
      return null
    }
  }

  if (trimmed.includes('#b=')) {
    const code = trimmed.split('#b=')[1]?.split('&')[0]
    return code ? decodeBuild(code) : null
  }

  return decodeBuild(trimmed.replace(/^#?b=/, ''))
}

export function ShareDialog({
  open,
  onClose,
  snapshot,
  analysis,
  onImport,
  notify,
}: {
  open: boolean
  onClose: () => void
  snapshot: BuildSnapshot
  analysis: Analysis
  onImport: (snapshot: BuildSnapshot) => void
  notify: Notify
}) {
  const [importText, setImportText] = useState('')
  const [error, setError] = useState('')
  const [cardBusy, setCardBusy] = useState(false)
  const link = buildLink(snapshot)
  const json = JSON.stringify(snapshot, null, 2)

  const copy = async (text: string, message: string) => {
    const ok = await copyText(text)
    notify(ok ? message : 'No se pudo copiar al portapapeles', ok ? 'success' : 'error')
  }

  const applySnapshot = (next: BuildSnapshot | null) => {
    if (!next) {
      setError('No pudimos leer ese código. Revisá que sea un link o JSON válido.')
      return
    }
    onImport(next)
    notify('Build importada correctamente', 'success')
    onClose()
  }

  const listText = buildToText(snapshot, {
    total: analysis.total,
    watts: analysis.watts,
    link,
  })

  const downloadCard = async () => {
    setCardBusy(true)
    try {
      const blob = await createBuildCardBlob(snapshot, {
        total: analysis.total,
        watts: analysis.watts,
        link,
      })
      downloadBlob(blob, 'mi-build-pc.png')
      notify('Imagen de la build descargada', 'success')
    } catch {
      notify('No se pudo generar la imagen', 'error')
    } finally {
      setCardBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartir e importar"
      subtitle="El link guarda toda la build. También podés exportar un archivo JSON."
      wide
    >
      <div className="space-y-5">
        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="label">Link de la build</p>
            <Link2 className="size-3.5 text-slate-600" aria-hidden />
          </div>
          <div className="flex gap-2">
            <input readOnly value={link} className="field font-mono text-xs" aria-label="Link de la build" />
            <button
              type="button"
              onClick={() => copy(link, 'Link copiado')}
              className="btn btn-primary shrink-0 text-xs"
            >
              <Copy className="size-3.5" aria-hidden /> Copiar
            </button>
          </div>
          <p className="mt-1.5 text-caption leading-4 text-slate-400">
            Cualquiera con el link puede abrir la build con los componentes y el presupuesto.
          </p>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="label">Código JSON</p>
            <FileJson className="size-3.5 text-slate-600" aria-hidden />
          </div>
          <textarea
            readOnly
            value={json}
            rows={7}
            aria-label="Código JSON de la build"
            className="field scroll-thin resize-none font-mono text-caption leading-5"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(json, 'JSON copiado')}
              className="btn btn-ghost text-xs"
            >
              <Copy className="size-3.5" aria-hidden /> Copiar JSON
            </button>
            <button
              type="button"
              onClick={downloadCard}
              disabled={cardBusy || analysis.partCount === 0}
              title={analysis.partCount === 0 ? 'Agregá componentes primero' : undefined}
              className="btn btn-ghost text-xs disabled:opacity-40"
            >
              <ImageDown className="size-3.5" aria-hidden />
              {cardBusy ? 'Generando…' : 'Descargar imagen PNG'}
            </button>
            <button
              type="button"
              onClick={() => downloadBuild(snapshot)}
              className="btn btn-ghost text-xs"
            >
              <Download className="size-3.5" aria-hidden /> Descargar .json
            </button>
            <button
              type="button"
              onClick={() => copy(listText, 'Lista copiada')}
              className="btn btn-ghost text-xs"
            >
              <Share2 className="size-3.5" aria-hidden /> Copiar lista en texto
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
          <p className="label">Importar una build</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Pegá un link, un código JSON o subí el archivo exportado. Reemplaza la build actual.
          </p>
          <textarea
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value)
              setError('')
            }}
            rows={4}
            placeholder="https://…/#b=…  o  { &quot;version&quot;: 1, … }"
            className="field scroll-thin mt-2 resize-none font-mono text-caption leading-5"
            aria-label="Datos para importar"
          />
          {error ? <p className="mt-1.5 text-caption font-medium text-rose-300">{error}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applySnapshot(parseImport(importText))}
              disabled={!importText.trim()}
              className="btn btn-primary text-xs disabled:opacity-40"
            >
              <Check className="size-3.5" aria-hidden /> Importar
            </button>
            <label className="btn btn-ghost cursor-pointer text-xs">
              <Upload className="size-3.5" aria-hidden /> Subir archivo
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  applySnapshot(await readBuildFile(file))
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setImportText('')
                setError('')
              }}
              className="btn btn-ghost text-xs"
            >
              <X className="size-3.5" aria-hidden /> Limpiar
            </button>
          </div>
        </section>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Part detail                                                        */
/* ------------------------------------------------------------------ */

export function PartDetailDialog({
  part,
  selected,
  compat,
  showCompat,
  onClose,
  onToggle,
}: {
  part: Part | null
  selected: boolean
  compat: { level: 'ok' | 'warn' | 'bad'; reason: string }
  showCompat: boolean
  onClose: () => void
  onToggle: () => void
}) {
  return (
    <Modal
      open={Boolean(part)}
      onClose={onClose}
      title={part?.name ?? ''}
      subtitle={part ? `${CATEGORY_BY_ID[part.category].label} · ${part.brand}` : undefined}
      footer={
        part ? (
          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-400">
              Precio:{' '}
              <span className="font-mono font-semibold text-white">
                {part.price === 0 ? 'Incluido' : money(part.price)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                onToggle()
                onClose()
              }}
              className={cn('btn text-sm', selected ? 'btn-ghost' : 'btn-primary')}
            >
              {selected ? (
                <>
                  <X className="size-4" aria-hidden /> Quitar de la build
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden /> Agregar a la build
                </>
              )}
            </button>
          </div>
        ) : null
      }
    >
      {part ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <div>
              <PartImage
                part={part}
                className="aspect-[4/3] w-full sm:aspect-square"
                imageClassName="p-3"
              />
              <p className="mt-1.5 text-center text-micro text-slate-400">Imagen de referencia</p>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <BrandBadge part={part} />
                {showCompat ? (
                  <CompatBadge level={compat.level} reason={compat.reason} selected={selected} />
                ) : null}
                <span className="chip">{CATEGORY_BY_ID[part.category].label}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {part.highlights.map((highlight) => (
                  <span key={highlight} className="chip">
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.05] sm:grid-cols-2">
            {part.specs.map((spec) => (
              <div key={spec.label} className="bg-ink-900 px-3 py-2.5">
                <dt className="text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {spec.label}
                </dt>
                <dd className="mt-0.5 text-sm text-slate-200">{spec.value}</dd>
              </div>
            ))}
          </dl>

          {part.note ? (
            <div className="note note-info">{part.note}</div>
          ) : null}

          {showCompat && compat.level !== 'ok' && compat.reason ? (
            <div className={cn('note', compat.level === 'bad' ? 'note-bad' : 'note-warn')}>
              <strong>Con tu build actual: </strong>
              {compat.reason}
            </div>
          ) : null}

          {showCompat && compat.level === 'ok' && !selected ? (
            <p className="note note-ok">Compatible con los componentes que ya elegiste.</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
