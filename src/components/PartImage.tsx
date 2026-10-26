import { useState } from 'react'
import { partImage } from '../data/images'
import type { Part } from '../types'
import { CategoryIcon } from './ui'
import { cn } from '../lib/cn'

/**
 * Foto del producto con fallback gráfico. Las imágenes locales viven en
 * public/parts y se sirven desde el mismo origen, así que no dependen de
 * conexión ni de hotlinks.
 */
export function PartImage({
  part,
  className,
  imageClassName,
  fallbackLabel = true,
}: {
  part: Part
  className?: string
  imageClassName?: string
  fallbackLabel?: boolean
}) {
  const src = partImage(part.id)
  const [failedId, setFailedId] = useState<string | null>(null)
  const failed = failedId === part.id

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-xl border border-white/10 bg-white',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={part.name}
          width={450}
          height={402}
          loading="lazy"
          decoding="async"
          onError={() => setFailedId(part.id)}
          className={cn(
            'h-full w-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.035]',
            imageClassName,
          )}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,#ffffff,#e7edf5)] text-slate-400">
          <CategoryIcon category={part.category} className="size-7 text-brand-600/70" />
          {fallbackLabel ? (
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Imagen referencial
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
