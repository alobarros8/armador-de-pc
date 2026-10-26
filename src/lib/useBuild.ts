import { useCallback, useEffect, useMemo, useState } from 'react'
import { CATEGORIES } from '../data/catalog'
import { analyze } from '../lib/compat'
import {
  EMPTY_SELECTIONS,
  readBuildFromLocation,
  sanitizeSelections,
  writeBuildToLocation,
  type BuildSnapshot,
} from '../lib/share'
import type { Category, Selections } from '../types'

const STORAGE_KEY = 'armador-pc:build:v1'

function loadInitial(): BuildSnapshot {
  const fromUrl = readBuildFromLocation()
  if (fromUrl) return fromUrl

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BuildSnapshot>
      return {
        version: 1,
        budget: typeof parsed.budget === 'number' && parsed.budget > 0 ? parsed.budget : null,
        selections: sanitizeSelections(parsed.selections),
      }
    }
  } catch {
    // localStorage puede estar bloqueado; seguimos con una build vacía.
  }

  return { version: 1, budget: null, selections: EMPTY_SELECTIONS }
}

export type ToggleResult = 'added' | 'removed' | 'limit'

export function useBuild() {
  const [initial] = useState(loadInitial)
  const [selections, setSelections] = useState<Selections>(initial.selections)
  const [budget, setBudgetState] = useState<number | null>(initial.budget)
  const [activeCategory, setActiveCategory] = useState<Category>('cpu')

  const analysis = useMemo(() => analyze(selections), [selections])
  const snapshot = useMemo<BuildSnapshot>(
    () => ({ version: 1, budget, selections }),
    [budget, selections],
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Sin persistencia si el navegador la bloquea.
    }
    writeBuildToLocation(snapshot)
  }, [snapshot])

  const togglePart = useCallback(
    (category: Category, id: string): ToggleResult => {
      const meta = CATEGORIES.find((entry) => entry.id === category)
      const current = selections[category] ?? []

      if (current.includes(id)) {
        const next = current.filter((entry) => entry !== id)
        setSelections((prev) => {
          const copy = { ...prev }
          if (next.length) copy[category] = next
          else delete copy[category]
          return copy
        })
        return 'removed'
      }

      if (!meta?.multi) {
        setSelections((prev) => ({ ...prev, [category]: [id] }))
        return 'added'
      }

      if (current.length >= (meta.max ?? 99)) return 'limit'

      setSelections((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), id] }))
      return 'added'
    },
    [selections],
  )

  const removePart = useCallback((category: Category, id: string) => {
    setSelections((prev) => {
      const next = (prev[category] ?? []).filter((entry) => entry !== id)
      const copy = { ...prev }
      if (next.length) copy[category] = next
      else delete copy[category]
      return copy
    })
  }, [])

  const replaceSelections = useCallback((next: Selections) => {
    setSelections(sanitizeSelections(next))
  }, [])

  const clear = useCallback(() => {
    setSelections({})
    setBudgetState(null)
  }, [])

  const setBudget = useCallback((value: number | null) => {
    setBudgetState(value && value > 0 ? Math.round(value) : null)
  }, [])

  const goToStep = useCallback((direction: 1 | -1) => {
    setActiveCategory((current) => {
      const index = CATEGORIES.findIndex((entry) => entry.id === current)
      const nextIndex = Math.min(CATEGORIES.length - 1, Math.max(0, index + direction))
      return CATEGORIES[nextIndex].id
    })
  }, [])

  return {
    selections,
    budget,
    activeCategory,
    analysis,
    snapshot,
    setActiveCategory,
    goToStep,
    togglePart,
    removePart,
    replaceSelections,
    clear,
    setBudget,
  }
}
