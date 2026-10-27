import { Bookmark, CircleCheck, Cpu, Info, Share2, Sparkles, TriangleAlert, Wallet, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BuildPanel } from './components/BuildPanel'
import { Catalog } from './components/Catalog'
import { PartDetailDialog, PresetsDialog, ShareDialog } from './components/Dialogs'
import { OptimizerDialog } from './components/OptimizerDialog'
import { SavedDialog } from './components/SavedDialog'
import { StartScreen } from './components/StartScreen'
import { Summary } from './components/Summary'
import { Modal } from './components/ui'
import { cn } from './lib/cn'
import { CATEGORIES, CATEGORY_BY_ID } from './data/catalog'
import type { Preset } from './types'
import type { SavedBuild } from './lib/history'
import { partCompatibility } from './lib/compat'
import { formatDateDMY, isOlderThan, money } from './lib/format'
import { PRICES_UPDATED_AT } from './data/catalog'
import type { OptimizerProposal } from './lib/optimizer'
import { buildLink, buildToText, copyText, downloadBuild, type BuildSnapshot } from './lib/share'
import { useBuild } from './lib/useBuild'
import type { Category, Part, Selections } from './types'

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' }

const CURRENT_YEAR = new Date().getFullYear()

/** Compone la aplicación, coordina sus diálogos y conecta la interfaz con el estado de la build.
 * @returns La interfaz principal de armado de PC.
 */
export default function App() {
  const build = useBuild()
  const { analysis, selections, budget, setBudget, activeCategory, setActiveCategory } = build

  const [presetsOpen, setPresetsOpen] = useState(false)
  const [optimizerOpen, setOptimizerOpen] = useState(false)
  const [optimizerKeepCurrent, setOptimizerKeepCurrent] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [started, setStarted] = useState(() => analysis.partCount > 0)
  const [detailPart, setDetailPart] = useState<Part | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // La pantalla de inicio solo aparece cuando no hay ninguna pieza cargada.
  // Si el usuario ya tiene una build (o la importa), va directo al armador.
  const showStartScreen = !started && analysis.partCount === 0

  /** Publica un mensaje temporal en la interfaz con el tono indicado.
   * @returns No devuelve valor.
   */
  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  /** Abre el optimizador y define si debe conservar las piezas actuales.
   * @returns No devuelve valor.
   */
  const openOptimizer = useCallback((keepCurrent = false) => {
    setOptimizerKeepCurrent(keepCurrent)
    setOptimizerOpen(true)
  }, [])

  /** Alterna una pieza y notifica si se alcanzó el máximo permitido para su categoría.
   * @returns El resultado de la operación: pieza agregada, quitada o límite alcanzado.
   */
  const handleToggle = (category: Category, id: string) => {
    const result = build.togglePart(category, id)
    if (result === 'limit') {
      const meta = CATEGORY_BY_ID[category]
      notify(`Máximo ${meta.max} en ${meta.label.toLowerCase()}.`, 'info')
    }
    return result
  }

  /** Cambia la categoría activa y vuelve al inicio de la página.
   * @returns No devuelve valor.
   */
  const jumpTo = (category: Category) => {
    setActiveCategory(category)
    setSummaryOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Carga las selecciones de un preset y notifica que fue aplicado.
   * @returns No devuelve valor.
   */
  const applyPreset = (preset: Preset) => {
    setStarted(true)
    build.replaceSelections(preset.selections)
    setPresetsOpen(false)
    setActiveCategory('cpu')
    notify(`Preset "${preset.name}" aplicado`, 'success')
  }

  /** Aplica una propuesta del optimizador, conservando periféricos cuando hay piezas fijas.
   * @returns No devuelve valor.
   */
  const applyOptimizerProposal = (proposal: OptimizerProposal) => {
    // En modo "mantener piezas" el optimizador decide solo la torre: conservamos
    // monitor, periféricos y extras. Desde cero, la propuesta reemplaza la build.
    setStarted(true)
    let nextSelections = proposal.selections
    if (proposal.lockedCategories.length > 0) {
      const peripherals: Selections = {}
      for (const category of CATEGORIES) {
        if (category.group !== 'periferico') continue
        const ids = selections[category.id]
        if (ids?.length) peripherals[category.id] = ids
      }
      nextSelections = { ...proposal.selections, ...peripherals }
    }
    build.replaceSelections(nextSelections)
    setBudget(proposal.budget)
    setOptimizerOpen(false)
    setActiveCategory('cpu')
    notify(
      proposal.lockedCategories.length > 0
        ? `Build "${proposal.name}" aplicada manteniendo tus piezas fijas`
        : `Build "${proposal.name}" aplicada`,
      'success',
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Reemplaza la build y el presupuesto con una instantánea importada.
   * @returns No devuelve valor.
   */
  const importBuild = (snapshot: BuildSnapshot) => {
    setStarted(true)
    build.replaceSelections(snapshot.selections)
    setBudget(snapshot.budget)
  }

  /** Carga una build guardada en el estado actual y cierra su diálogo.
   * @returns No devuelve valor.
   */
  const applySaved = (item: SavedBuild) => {
    importBuild(item.snapshot)
    setSavedOpen(false)
  }

  /** Descarga la build actual como archivo JSON y muestra una notificación.
   * @returns No devuelve valor.
   */
  const exportBuild = () => {
    downloadBuild(build.snapshot)
    notify('Archivo JSON descargado', 'success')
  }

  /** Copia al portapapeles el resumen textual y el enlace de la build actual.
   * @returns Una promesa que se resuelve cuando termina la copia y notificación.
   */
  const copyList = async () => {
    if (analysis.partCount === 0) {
      notify('La build está vacía: agregá componentes primero', 'info')
      return
    }
    const text = buildToText(build.snapshot, {
      total: analysis.total,
      watts: analysis.watts,
      link: buildLink(build.snapshot),
    })
    const ok = await copyText(text)
    notify(ok ? 'Lista copiada al portapapeles' : 'No se pudo copiar', ok ? 'success' : 'error')
  }

  /** Solicita confirmación y, si se acepta, vacía la build y su presupuesto.
   * @returns No devuelve valor.
   */
  const clearBuild = () => {
    if (analysis.partCount === 0) return
    if (window.confirm('¿Vaciar la build y el presupuesto?')) {
      build.clear()
      setStarted(false)
      notify('Build vaciada', 'info')
    }
  }

  /** Inicia el armado desde cero y enfoca la categoría de procesador.
   * @returns No devuelve valor.
   */
  const startFromScratch = () => {
    setStarted(true)
    setActiveCategory('cpu')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const detailSelected = detailPart
    ? (selections[detailPart.category] ?? []).includes(detailPart.id)
    : false
  const detailCompat = detailPart
    ? partCompatibility(detailPart, selections)
    : { level: 'ok' as const, reason: '' }

  const summaryProps = {
    analysis,
    budget,
    onBudget: setBudget,
    onSelectCategory: jumpTo,
    onOpenOptimizer: () => {
      setSummaryOpen(false)
      openOptimizer()
    },
    onOptimizeCurrent: () => {
      setSummaryOpen(false)
      openOptimizer(true)
    },
    onOpenShare: () => {
      setSummaryOpen(false)
      setShareOpen(true)
    },
    onExport: exportBuild,
    onCopyList: copyList,
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-300 shadow-[0_0_34px_-12px_rgba(16,185,129,0.9)]">
              <Cpu className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">
                Armador <span className="text-brand-400">PC</span>
              </p>
              <p className="hidden text-micro uppercase tracking-[0.16em] text-slate-500 sm:block">
                AMD · Intel · Periféricos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="mr-1 hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 md:flex">
              <span className="text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-white">
                {money(analysis.total)}
              </span>
              {analysis.errors.length > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-semibold badge-bad"
                  title={`${analysis.errors.length} incompatibilidades`}
                >
                  <TriangleAlert className="size-3" aria-hidden />
                  {analysis.errors.length}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => openOptimizer()}
              className="btn btn-ghost size-10 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Armá por presupuesto"
              title="Armá por presupuesto"
            >
              <Wand2 className="size-4 text-brand-300" aria-hidden />
              <span className="hidden text-xs lg:inline">Presupuesto</span>
            </button>
            <button
              type="button"
              onClick={() => setPresetsOpen(true)}
              className="btn btn-ghost size-10 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Ver presets"
              title="Presets por gama"
            >
              <Sparkles className="size-4 text-brand-300" aria-hidden />
              <span className="hidden text-xs sm:inline">Presets</span>
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="btn btn-ghost size-10 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Compartir o importar"
              title="Compartir o importar"
            >
              <Share2 className="size-4" aria-hidden />
              <span className="hidden text-xs sm:inline">Compartir</span>
            </button>
            <button
              type="button"
              onClick={() => setSavedOpen(true)}
              className="btn btn-ghost size-10 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Builds guardadas"
              title="Mis builds guardadas"
            >
              <Bookmark className="size-4 text-brand-300" aria-hidden />
              <span className="hidden text-xs sm:inline">Guardadas</span>
            </button>
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="btn btn-primary h-10 px-3 text-xs xl:hidden"
            >
              <Wallet className="size-4" aria-hidden />
              <span className="hidden sm:inline">Resumen</span>
              <span className="font-mono sm:hidden">{analysis.partCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-3 pb-24 pt-4 sm:px-5 xl:pb-8">
        {showStartScreen ? (
          <StartScreen
            onLoadPreset={() => setPresetsOpen(true)}
            onStartFromScratch={startFromScratch}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <BuildPanel
                  selections={selections}
                  analysis={analysis}
                  activeCategory={activeCategory}
                  onSelectCategory={jumpTo}
                  onRemove={(category) => {
                    const ids = selections[category] ?? []
                    ids.forEach((id) => build.removePart(category, id))
                  }}
                  onOpenPresets={() => setPresetsOpen(true)}
                  onOpenOptimizer={() => openOptimizer()}
                  onClear={clearBuild}
                />
              </div>
            </aside>

            <Catalog
              activeCategory={activeCategory}
              selections={selections}
              analysis={analysis}
              onSelectCategory={setActiveCategory}
              onToggle={handleToggle}
              onDetails={setDetailPart}
              onStep={build.goToStep}
              onOpenPresets={() => setPresetsOpen(true)}
              onOpenOptimizer={() => openOptimizer()}
            />

            <aside className="hidden xl:block">
              <div className="scroll-thin sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-4 pr-1">
                <Summary {...summaryProps} />
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="border-t border-white/[0.05] px-3 pb-24 pt-6 sm:px-5 xl:pb-6">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-2 text-caption leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Armador de PC · {CURRENT_YEAR} · Precios de referencia en ARS, no incluyen envío
            ni variaciones del mercado. Precios actualizados el{' '}
            {formatDateDMY(PRICES_UPDATED_AT)}.
            {isOlderThan(PRICES_UPDATED_AT, 30)
              ? ' Aviso: los precios pueden estar desactualizados.'
              : ''}
          </p>
          <p>
            Inspirado en el armador de{' '}
            <a
              href="https://compragamer.com/armatupc"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 underline decoration-white/20 underline-offset-2 hover:text-brand-300"
            >
              Compra Gamer
            </a>
            . Hecho con React, Vite y Tailwind.
          </p>
        </div>
      </footer>

      {showStartScreen ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 xl:hidden">
          <div className="border-t border-white/[0.08] bg-ink-950/92 px-3 py-2.5 backdrop-blur-xl sm:px-5">
            <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total · {analysis.partCount}{' '}
                  {analysis.partCount === 1 ? 'pieza' : 'piezas'}
                </p>
                <p className="truncate font-mono text-base font-semibold text-white">
                  {money(analysis.total)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {analysis.errors.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-caption font-semibold badge-bad">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    {analysis.errors.length}
                  </span>
                ) : analysis.isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-caption font-semibold badge-ok">
                    <CircleCheck className="size-3.5" aria-hidden /> OK
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSummaryOpen(true)}
                  className="btn btn-primary h-10 px-3 text-xs"
                >
                  <Wallet className="size-4" aria-hidden /> Ver resumen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PresetsDialog open={presetsOpen} onClose={() => setPresetsOpen(false)} onApply={applyPreset} />

      {optimizerOpen ? (
        <OptimizerDialog
          open
          onClose={() => setOptimizerOpen(false)}
          onApply={applyOptimizerProposal}
          initialBudget={budget}
          selections={selections}
          initialKeepCurrent={optimizerKeepCurrent}
        />
      ) : null}

      <SavedDialog
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        snapshot={build.snapshot}
        hasParts={analysis.partCount > 0}
        onApply={applySaved}
        notify={notify}
      />

      {shareOpen ? (
        <ShareDialog
          open
          onClose={() => setShareOpen(false)}
          snapshot={build.snapshot}
          analysis={analysis}
          onImport={importBuild}
          notify={notify}
        />
      ) : null}

      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Resumen de la build"
        subtitle="Total, presupuesto, rendimiento y compatibilidad."
      >
        <Summary {...summaryProps} compact />
      </Modal>

      <PartDetailDialog
        part={detailPart}
        selected={detailSelected}
        compat={detailCompat}
        showCompat={analysis.partCount > 0}
        onClose={() => setDetailPart(null)}
        onToggle={() => detailPart && handleToggle(detailPart.category, detailPart.id)}
      />

      {toast ? (
        <div
          role="status"
          className={cn(
            'animate-toast fixed bottom-24 left-1/2 z-[70] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-2xl xl:bottom-8',
            toast.tone === 'error'
              ? 'border-rose-500/30 bg-rose-950/95 text-rose-100'
              : toast.tone === 'info'
                ? 'border-sky-500/25 bg-sky-950/95 text-sky-100'
                : 'border-brand-500/30 bg-emerald-950/95 text-emerald-50',
          )}
        >
          {toast.tone === 'error' ? (
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
          ) : toast.tone === 'info' ? (
            <Info className="size-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">{toast.message}</span>
        </div>
      ) : null}
    </div>
  )
}
