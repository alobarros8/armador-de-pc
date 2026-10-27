import { CATEGORIES, CATEGORY_BY_ID, getPart } from '../data/catalog'
import type { Category, Issue, Part, Selections } from '../types'
import { clamp } from './format'

export interface Analysis {
  issues: Issue[]
  errors: Issue[]
  warnings: Issue[]
  infos: Issue[]
  selected: Partial<Record<Category, Part[]>>
  total: number
  partCount: number
  watts: number
  recommendedPsu: number
  gamingIndex: number
  productivityIndex: number
  targetResolution: string
  targetLabel: string
  missingRequired: Category[]
  isComplete: boolean
}

const RAM_BY_RESOLUTION: Array<{ minPerf: number; resolution: string; label: string }> = [
  { minPerf: 75, resolution: '4K', label: '4K 144 Hz' },
  { minPerf: 50, resolution: '1440p', label: '1440p 165 Hz' },
  { minPerf: 25, resolution: '1080p', label: '1080p 144 Hz' },
]

/** Extrae el ancho en píxeles del formato de resolución del catálogo.
 * @returns El ancho numérico o cero cuando no puede determinarse.
 */
function resolutionWidth(resolution?: string): number {
  if (!resolution) return 0
  const width = Number(resolution.split('×')[0])
  return Number.isFinite(width) ? width : 0
}

/** Convierte una resolución en una etiqueta habitual para pantallas.
 * @returns La etiqueta 4K, UWQHD, 1440p, 1080p o el valor recibido.
 */
function resolutionLabel(resolution?: string): string {
  const width = resolutionWidth(resolution)
  if (width >= 3840) return '4K'
  if (width >= 3400) return 'UWQHD'
  if (width >= 2560) return '1440p'
  if (width >= 1920) return '1080p'
  return resolution ?? '—'
}

/** Estima el consumo de CPU, GPU, placa, refrigeración y unidades de almacenamiento.
 * @returns El consumo total estimado de la build en watts.
 */
export function estimateWatts(selections: Selections): number {
  const cpu = getPart(selections.cpu?.[0])
  const gpu = getPart(selections.gpu?.[0])
  const cooler = getPart(selections.cooler?.[0])
  const storageWatts = (selections.storage ?? [])
    .map((id) => getPart(id))
    .reduce((acc, part) => acc + (part?.storageType === 'HDD' ? 10 : 5), 0)
  return (
    (cpu?.tdp ?? 0) +
    (gpu?.wattage ?? 0) +
    45 +
    storageWatts +
    (cooler?.coolerType === 'aio' ? 12 : 4)
  )
}

/** Analiza costos, consumo, rendimiento y reglas de compatibilidad de una build.
 * @returns El análisis completo con métricas, piezas y advertencias.
 */
export function analyze(selections: Selections): Analysis {
  const selected: Partial<Record<Category, Part[]>> = {}
  for (const category of CATEGORIES) {
    const ids = selections[category.id] ?? []
    const parts = ids.map((id) => getPart(id)).filter((part): part is Part => Boolean(part))
    if (parts.length) selected[category.id] = parts
  }

  const cpu = selected.cpu?.[0]
  const mobo = selected.motherboard?.[0]
  const ram = selected.ram?.[0]
  const gpuPart = selected.gpu?.[0]
  const psuPart = selected.psu?.[0]
  const pcCase = selected.case?.[0]
  const cooler = selected.cooler?.[0]
  const storageParts = selected.storage ?? []
  const monitorPart = selected.monitor?.[0]

  const issues: Issue[] = []
  /** Agrega una incidencia detectada al resultado del análisis.
   * @returns El nuevo largo del arreglo de incidencias.
   */
  const add = (issue: Issue) => issues.push(issue)

  const partCount = Object.values(selected).reduce((acc, list) => acc + (list?.length ?? 0), 0)
  const total = Object.values(selected)
    .flat()
    .reduce((acc, part) => acc + part.price, 0)

  const watts = estimateWatts(selections)

  const recommendedPsu = Math.max(450, Math.ceil((watts * 1.35) / 50) * 50)

  /* ---------------- Esenciales ---------------- */
  const missingRequired = CATEGORIES.filter(
    (category) => category.required && !(selected[category.id]?.length ?? 0),
  ).map((category) => category.id)

  if (partCount > 0) {
    for (const category of missingRequired) {
      add({
        id: `missing-${category}`,
        severity: 'warning',
        title: `Falta ${CATEGORY_BY_ID[category].label.toLowerCase()}`,
        detail: 'Este componente es necesario para que la build funcione.',
        categories: [category],
      })
    }
  }

  /* ---------------- CPU + motherboard ---------------- */
  if (cpu && mobo) {
    if (cpu.socket !== mobo.socket) {
      add({
        id: 'socket-mismatch',
        severity: 'error',
        title: 'Socket incompatible',
        detail: `El ${cpu.name} usa ${cpu.socket} y la ${mobo.name} es ${mobo.socket}. Necesitás una motherboard ${cpu.socket}.`,
        categories: ['cpu', 'motherboard'],
      })
    }
  }

  /* ---------------- RAM ---------------- */
  if (ram && mobo) {
    if (ram.ramType !== mobo.ramType) {
      add({
        id: 'ram-type',
        severity: 'error',
        title: 'Tipo de memoria incompatible',
        detail: `La RAM es ${ram.ramType} y la motherboard acepta ${mobo.ramType}. No entran físicamente.`,
        categories: ['ram', 'motherboard'],
      })
    }
    if ((ram.modules ?? 1) > (mobo.ramSlots ?? 2)) {
      add({
        id: 'ram-slots',
        severity: 'error',
        title: 'No hay suficientes slots de RAM',
        detail: `El kit usa ${ram.modules ?? 1} módulos y la motherboard tiene ${mobo.ramSlots ?? 2} slots.`,
        categories: ['ram', 'motherboard'],
      })
    }
    if (ram.speed && ram.speed > 6000 && mobo.socket === 'AM5') {
      add({
        id: 'ram-speed',
        severity: 'info',
        title: 'Velocidad de RAM muy alta para AM5',
        detail: 'Por encima de 6000 MT/s el controlador de memoria puede no ser estable en 1:1. Revisá el perfil EXPO.',
        categories: ['ram'],
      })
    }
  }

  if (ram) {
    if ((ram.capacityGb ?? 0) < 16) {
      add({
        id: 'ram-low',
        severity: 'warning',
        title: 'Poca memoria para gaming',
        detail: `Tenés ${ram.capacityGb ?? 0} GB. Para juegos actuales conviene empezar en 16 GB (32 GB si además editás o streameás).`,
        categories: ['ram'],
      })
    }
    if (ram.modules === 1) {
      add({
        id: 'ram-single',
        severity: 'info',
        title: 'Un solo módulo de RAM',
        detail: 'Un único módulo trabaja en single channel y pierde bastante rendimiento en juegos. Conviene un kit de 2 módulos.',
        categories: ['ram'],
      })
    }
  }

  /* ---------------- Gabinete ---------------- */
  if (mobo && pcCase) {
    if (!pcCase.supportedFormFactors?.includes(mobo.formFactor ?? 'ATX')) {
      add({
        id: 'form-factor',
        severity: 'error',
        title: 'La motherboard no entra en el gabinete',
        detail: `La motherboard es ${mobo.formFactor} y el gabinete soporta ${pcCase.supportedFormFactors?.join(', ')}.`,
        categories: ['motherboard', 'case'],
      })
    }
  }

  if (gpuPart && pcCase) {
    if ((gpuPart.gpuLength ?? 0) > (pcCase.maxGpuLength ?? 0)) {
      add({
        id: 'gpu-length',
        severity: 'error',
        title: 'La GPU es demasiado larga',
        detail: `La ${gpuPart.name} mide ${gpuPart.gpuLength} mm y el gabinete admite hasta ${pcCase.maxGpuLength} mm.`,
        categories: ['gpu', 'case'],
      })
    }
  }

  if (psuPart && pcCase && pcCase.psuFormSupport === 'SFX' && psuPart.psuForm !== 'SFX') {
    add({
      id: 'psu-form-factor',
      severity: 'error',
      title: 'La fuente no entra en el gabinete',
      detail: `El ${pcCase.name} necesita una fuente SFX y la ${psuPart.name} es ${psuPart.psuForm ?? 'ATX'}.`,
      categories: ['psu', 'case'],
    })
  }

  /* ---------------- Cooler ---------------- */
  if (cpu && !cooler && !cpu.stockCooler) {
    add({
      id: 'missing-cooler',
      severity: 'warning',
      title: 'Falta refrigeración para el CPU',
      detail: `El ${cpu.name} no incluye cooler. Elegí uno por aire o líquido antes de comprar.`,
      categories: ['cooler', 'cpu'],
    })
  }

  if (cooler && cpu) {
    if (cooler.supportedSockets && !cooler.supportedSockets.includes(cpu.socket ?? 'AM4')) {
      add({
        id: 'cooler-socket',
        severity: 'error',
        title: 'El cooler no soporta ese socket',
        detail: `El ${cooler.name} no tiene anclaje para ${cpu.socket}.`,
        categories: ['cooler', 'cpu'],
      })
    }
    if (cooler.included && !cpu.stockCooler) {
      add({
        id: 'cooler-not-included',
        severity: 'error',
        title: 'Ese cooler no viene con el CPU',
        detail: `El ${cooler.name} está incluido únicamente con procesadores que lo traen de fábrica, y el ${cpu.name} no lo incluye.`,
        categories: ['cooler', 'cpu'],
      })
    }
    if ((cooler.coolerTdp ?? 0) < (cpu.tdp ?? 0)) {
      add({
        id: 'cooler-tdp',
        severity: 'warning',
        title: 'Refrigeración justa para el CPU',
        detail: `El cooler disipa hasta ${cooler.coolerTdp} W y el CPU declara ${cpu.tdp} W. Puede calentar de más y bajar frecuencias.`,
        categories: ['cooler', 'cpu'],
      })
    } else if ((cooler.coolerTdp ?? 0) < (cpu.tdp ?? 0) * 1.15) {
      add({
        id: 'cooler-tight',
        severity: 'info',
        title: 'Cooler al límite',
        detail: 'Está dentro de lo soportado pero sin margen para overclock o veranos calurosos.',
        categories: ['cooler'],
      })
    }
  }

  if (cooler && pcCase) {
    if (cooler.coolerType === 'air' && (cooler.coolerHeight ?? 0) > (pcCase.maxCoolerHeight ?? 0)) {
      add({
        id: 'cooler-height',
        severity: 'error',
        title: 'El cooler no cierra en el gabinete',
        detail: `El cooler mide ${cooler.coolerHeight} mm de alto y el gabinete admite hasta ${pcCase.maxCoolerHeight} mm.`,
        categories: ['cooler', 'case'],
      })
    }
    if (
      cooler.coolerType === 'aio' &&
      !(pcCase.radiatorSupport ?? []).includes(cooler.radiator ?? 0)
    ) {
      add({
        id: 'cooler-radiator',
        severity: 'error',
        title: 'El gabinete no soporta ese radiador',
        detail: `El gabinete acepta radiadores de ${pcCase.radiatorSupport?.join(', ') || 'ningún'} mm y elegiste ${cooler.radiator} mm.`,
        categories: ['cooler', 'case'],
      })
    }
  }

  /* ---------------- GPU / video ---------------- */
  if (!gpuPart && cpu && !cpu.igpu) {
    add({
      id: 'no-video',
      severity: 'error',
      title: 'No hay salida de video',
      detail: `El ${cpu.name} no tiene gráficos integrados. Agregá una placa de video o cambiá a un CPU con iGPU.`,
      categories: ['gpu', 'cpu'],
    })
  }

  if (!gpuPart && cpu?.igpu) {
    add({
      id: 'igpu-only',
      severity: 'info',
      title: 'Build con video integrado',
      detail: 'Sirve para oficina, estudio y eSports livianos. Para juegos AAA necesitás una GPU dedicada.',
      categories: ['gpu'],
    })
  }

  if (gpuPart && cpu && (gpuPart.perf ?? 0) - (cpu.perf ?? 0) > 28) {
    add({
      id: 'cpu-bottleneck',
      severity: 'info',
      title: 'Posible cuello de botella de CPU',
      detail: `${gpuPart.name} es mucho más potente que el ${cpu.name}. En 1080p el CPU puede limitar los FPS.`,
      categories: ['cpu', 'gpu'],
    })
  }

  /* ---------------- Fuente ---------------- */
  if (psuPart) {
    const psuWatts = psuPart.wattage ?? 0
    if (psuWatts < watts) {
      add({
        id: 'psu-low',
        severity: 'error',
        title: 'La fuente no alcanza',
        detail: `El consumo estimado es ${watts} W y la fuente entrega ${psuWatts} W. Riesgo de apagados y daño a componentes.`,
        categories: ['psu'],
      })
    } else if (psuWatts < recommendedPsu) {
      add({
        id: 'psu-tight',
        severity: 'warning',
        title: 'Fuente sin margen',
        detail: `Consumo estimado ${watts} W. Recomendamos ${recommendedPsu} W para tener margen y picos de la GPU.`,
        categories: ['psu'],
      })
    }
    if (psuPart.efficiency?.includes('Bronze') && (gpuPart?.perf ?? 0) > 60) {
      add({
        id: 'psu-quality',
        severity: 'info',
        title: 'Fuente Bronze en una build de gama alta',
        detail: 'En equipos de alto consumo conviene 80+ Gold o superior por eficiencia y protección.',
        categories: ['psu'],
      })
    }
  }

  /* ---------------- Almacenamiento ---------------- */
  const nvmeParts = storageParts.filter((part) => part.interface?.includes('NVMe'))
  if (mobo && nvmeParts.length > (mobo.m2Slots ?? 0)) {
    add({
      id: 'm2-slots',
      severity: 'warning',
      title: 'Faltan slots M.2',
      detail: `Elegiste ${nvmeParts.length} unidades NVMe y la motherboard tiene ${mobo.m2Slots} slots M.2. Usá SATA para el resto.`,
      categories: ['storage', 'motherboard'],
    })
  }
  for (const drive of storageParts) {
    if (drive.interface?.includes('5.0') && (mobo?.pcieGen ?? 0) < 5) {
      add({
        id: `gen5-${drive.id}`,
        severity: 'info',
        title: 'SSD Gen5 en una mother Gen4',
        detail: `${drive.name} va a funcionar a la velocidad del slot (Gen ${mobo?.pcieGen ?? '?'}), no a su máximo.`,
        categories: ['storage'],
      })
    }
  }
  if (storageParts.length > 0 && storageParts.every((part) => part.storageType === 'HDD')) {
    add({
      id: 'hdd-only',
      severity: 'warning',
      title: 'Solo disco mecánico',
      detail: 'Un HDD como único disco hace que el sistema arranque y cargue todo muy lento. Agregá al menos un SSD.',
      categories: ['storage'],
    })
  }

  /* ---------------- Monitor ---------------- */
  if (monitorPart && gpuPart) {
    const width = resolutionWidth(monitorPart.resolution)
    const perf = gpuPart.perf ?? 0
    if (width >= 3840 && perf < 45) {
      add({
        id: 'monitor-4k',
        severity: 'warning',
        title: '4K exigente para esta GPU',
        detail: `${gpuPart.name} va a necesitar bajar calidad o usar escalado para mover 4K con fluidez.`,
        categories: ['monitor', 'gpu'],
      })
    } else if (width >= 2560 && perf < 30) {
      add({
        id: 'monitor-1440',
        severity: 'warning',
        title: '1440p/ultrawide exigente para esta GPU',
        detail: 'Vas a tener que ajustar calidad en juegos pesados. Considerá un monitor 1080p.',
        categories: ['monitor', 'gpu'],
      })
    } else if (width <= 1920 && perf >= 80) {
      add({
        id: 'monitor-overspec',
        severity: 'info',
        title: 'Monitor chico para tanta GPU',
        detail: 'Con esta placa estás desperdiciando potencial en 1080p: un 1440p o 4K le saca más provecho.',
        categories: ['monitor', 'gpu'],
      })
    }
  }

  /* ---------------- Rendimiento estimado ---------------- */
  const gpuPerf = gpuPart?.perf ?? (cpu?.igpu ? 9 : 0)
  const cpuPerf = cpu?.perf ?? 0
  const gamingIndex = partCount === 0 ? 0 : Math.round(clamp(gpuPerf * 0.85 + cpuPerf * 0.15, 0, 100))

  const ramGb = ram?.capacityGb ?? 0
  const productivityIndex =
    partCount === 0
      ? 0
      : Math.round(
          clamp(
            cpuPerf * 0.78 +
              Math.min(ramGb / 64, 1) * 12 +
              (nvmeParts.length > 0 ? 6 : 0) +
              (gpuPart ? Math.min((gpuPart.perf ?? 0) / 10, 6) : 0),
            0,
            100,
          ),
        )

  const target = [...RAM_BY_RESOLUTION].find((entry) => gamingIndex >= entry.minPerf)
  const targetResolution = monitorPart
    ? resolutionLabel(monitorPart.resolution)
    : gpuPerf > 0
      ? (target?.resolution ?? '720p / eSports')
      : '—'
  const targetLabel = monitorPart
    ? `${targetResolution} ${monitorPart.refresh ?? 60} Hz`
    : gpuPerf > 0
      ? (target?.label ?? '720p 60 Hz')
      : 'Sin GPU'

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const infos = issues.filter((issue) => issue.severity === 'info')

  return {
    issues,
    errors,
    warnings,
    infos,
    selected,
    total,
    partCount,
    watts,
    recommendedPsu,
    gamingIndex,
    productivityIndex,
    targetResolution,
    targetLabel,
    missingRequired,
    isComplete:
      partCount > 0 && missingRequired.length === 0 && errors.length === 0 && warnings.length === 0,
  }
}

/** Evalúa cómo encaja una pieza candidata con las selecciones actuales.
 * @returns El nivel de compatibilidad y una explicación si hay un conflicto o aviso.
 */
export function partCompatibility(part: Part, selections: Selections): {
  level: 'ok' | 'warn' | 'bad'
  reason: string
} {
  const cpu = getPart(selections.cpu?.[0])
  const mobo = getPart(selections.motherboard?.[0])
  const pcCase = getPart(selections.case?.[0])
  const psu = getPart(selections.psu?.[0])

  if (part.category === 'cpu' && mobo && part.socket !== mobo.socket) {
    return { level: 'bad', reason: `Socket ${part.socket} ≠ ${mobo.socket}` }
  }
  if (part.category === 'motherboard' && cpu && part.socket !== cpu.socket) {
    return { level: 'bad', reason: `Socket ${part.socket} ≠ ${cpu.socket}` }
  }
  if (part.category === 'motherboard' && pcCase && !pcCase.supportedFormFactors?.includes(part.formFactor ?? 'ATX')) {
    return { level: 'bad', reason: `No entra en el gabinete (${part.formFactor})` }
  }
  if (part.category === 'ram' && mobo && part.ramType !== mobo.ramType) {
    return { level: 'bad', reason: `Necesitás ${mobo.ramType}` }
  }
  if (part.category === 'ram' && mobo && (part.modules ?? 1) > (mobo.ramSlots ?? 4)) {
    return { level: 'bad', reason: `La mother tiene ${mobo.ramSlots} slots` }
  }
  if (part.category === 'gpu' && pcCase && (part.gpuLength ?? 0) > (pcCase.maxGpuLength ?? 0)) {
    return { level: 'bad', reason: `Mide ${part.gpuLength} mm, entran ${pcCase.maxGpuLength} mm` }
  }
  if (part.category === 'case' && mobo && !part.supportedFormFactors?.includes(mobo.formFactor ?? 'ATX')) {
    return { level: 'bad', reason: `No soporta ${mobo.formFactor}` }
  }
  if (part.category === 'case' && psu && part.psuFormSupport === 'SFX' && psu.psuForm !== 'SFX') {
    return { level: 'bad', reason: `Necesita fuente SFX (elegiste ${psu.psuForm ?? 'ATX'})` }
  }
  if (part.category === 'psu' && pcCase && pcCase.psuFormSupport === 'SFX' && part.psuForm !== 'SFX') {
    return { level: 'bad', reason: `El ${pcCase.name} usa fuente SFX` }
  }
  if (
    part.category === 'cooler' &&
    cpu &&
    part.supportedSockets &&
    !part.supportedSockets.includes(cpu.socket ?? 'AM4')
  ) {
    return { level: 'bad', reason: `No soporta ${cpu.socket}` }
  }
  if (part.category === 'cooler' && part.included && cpu && !cpu.stockCooler) {
    return { level: 'bad', reason: 'No viene incluido con este CPU' }
  }
  if (
    part.category === 'cooler' &&
    cpu &&
    (part.coolerTdp ?? 0) < (cpu.tdp ?? 0)
  ) {
    return { level: 'warn', reason: 'Puede quedar corto para este CPU' }
  }
  if (
    part.category === 'cooler' &&
    pcCase &&
    part.coolerType === 'air' &&
    (part.coolerHeight ?? 0) > (pcCase.maxCoolerHeight ?? 0)
  ) {
    return { level: 'bad', reason: `Alto ${part.coolerHeight} mm, entran ${pcCase.maxCoolerHeight} mm` }
  }
  if (
    part.category === 'cooler' &&
    pcCase &&
    part.coolerType === 'aio' &&
    !(pcCase.radiatorSupport ?? []).includes(part.radiator ?? 0)
  ) {
    return { level: 'bad', reason: `Radiador ${part.radiator} mm no soportado` }
  }
  if (part.category === 'psu' && cpu) {
    const needed = estimateWatts(selections)
    const recommended = Math.max(450, Math.ceil((needed * 1.35) / 50) * 50)
    if ((part.wattage ?? 0) < needed) {
      return { level: 'bad', reason: `Consumo estimado ${needed} W` }
    }
    if ((part.wattage ?? 0) < recommended) {
      return { level: 'warn', reason: `Recomendado ${recommended} W` }
    }
  }
  if (part.category === 'storage' && mobo) {
    const nvme = (selections.storage ?? []).filter((id) =>
      getPart(id)?.interface?.includes('NVMe'),
    ).length
    if (part.interface?.includes('NVMe') && nvme >= (mobo.m2Slots ?? 0)) {
      return { level: 'warn', reason: 'Sin slots M.2 libres' }
    }
  }
  return { level: 'ok', reason: '' }
}
