import { ArrowRight, Check, Sparkles, Wrench } from 'lucide-react'
import { PRESETS } from '../data/presets'

/** Renderiza un punto de una lista de características con un icono de confirmación.
 * @returns Un elemento de lista con el texto recibido.
 */
function OptionPoint({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-5 text-slate-400">
      <Check className="mt-0.5 size-3.5 shrink-0 text-brand-400" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

/** Ofrece iniciar con un preset o comenzar el armado desde cero.
 * @returns La pantalla inicial con las dos opciones de armado.
 */
export function StartScreen({
  onLoadPreset,
  onStartFromScratch,
}: {
  onLoadPreset: () => void
  onStartFromScratch: () => void
}) {
  return (
    <section
      aria-labelledby="start-title"
      className="animate-fade mx-auto flex min-h-[calc(100dvh-13rem)] max-w-5xl flex-col justify-center py-6 sm:py-10"
    >
      <div className="text-center">
        <span className="chip chip-brand">
          <Sparkles className="size-3" aria-hidden /> Empezá tu build
        </span>
        <h1
          id="start-title"
          className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          ¿Cómo querés armar tu PC?
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
          Todavía no hay componentes seleccionados. Elegí un punto de partida y después
          ajustá todo lo que quieras.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <article className="group panel flex flex-col p-5 transition-colors hover:border-brand-500/30 hover:bg-white/[0.035]">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="chip">{PRESETS.length} builds</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
            Cargar una build preestablecida
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-400">
            Elegí una build completa por gama y uso. Ya viene compatible y podés cambiar
            cualquier pieza después.
          </p>
          <ul className="mt-3.5 flex-1 space-y-1.5">
            <OptionPoint>Opciones de oficina, gaming, edición y streaming.</OptionPoint>
            <OptionPoint>Componentes, periféricos y precio de referencia incluidos.</OptionPoint>
          </ul>
          <button
            type="button"
            onClick={onLoadPreset}
            className="mt-5 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-brand-300"
          >
            Ver builds preestablecidas
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </article>

        <article className="group panel flex flex-col p-5 transition-colors hover:border-sky-500/30 hover:bg-white/[0.035]">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-300">
              <Wrench className="size-5" aria-hidden />
            </span>
            <span className="chip">Paso a paso</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
            Empezar de cero
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-400">
            Armá la PC a tu manera eligiendo cada componente. La compatibilidad se valida
            mientras armás.
          </p>
          <ul className="mt-3.5 flex-1 space-y-1.5">
            <OptionPoint>Elegís CPU, mother, RAM, GPU, fuente y gabinete.</OptionPoint>
            <OptionPoint>Filtro de compatibles y ayudas en cada categoría.</OptionPoint>
          </ul>
          <button
            type="button"
            onClick={onStartFromScratch}
            className="mt-5 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-sky-300"
          >
            Empezar de cero
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </article>
      </div>

      <p className="mt-5 text-center text-caption leading-5 text-slate-500">
        También podés importar una build, cargar una guardada o usar el optimizador por
        presupuesto desde el encabezado.
      </p>
    </section>
  )
}
