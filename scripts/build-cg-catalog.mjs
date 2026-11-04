// Genera src/data/catalog-cg.json a partir de los feeds públicos de Compra Gamer.
//
// Uso:
//   node scripts/build-cg-catalog.mjs
//
// El feed de productos trae nombre, marca, precio, stock e imágenes. El feed
// productos_caracteristicas trae la ficha técnica de cada producto (socket, TDP,
// formato, watts, largo de GPU, etc.). Con esos datos armamos piezas listas para
// el motor de compatibilidad, sin inventar valores: si un dato no está publicado,
// el campo se omite y la regla que dependa de él queda sin aplicar.
import { readFile, writeFile } from 'node:fs/promises'

const PRODUCTOS_PATH = 'data/cg-productos.json'
const CARACTERISTICAS_PATH = 'data/cg-caracteristicas.json'
const MARCAS_PATH = 'data/cg-marcas.json'
const PART_IMAGES_PATH = 'data/part-images.json'
const OUTPUT_PATH = 'src/data/catalog-cg.json'
const MAP_PATH = 'data/cg-parts.json'

const IMAGE_BASE =
  'https://imagenes.compragamer.com/productos/compragamer_Imganen_general_'

// Subcategorías de Compra Gamer que entran al armador. El resto (notebooks,
// PCs armadas, TVs, sillas, impresoras, servicios, etc.) queda afuera.
const SUBCATEGORY_CATEGORY = {
  27: 'cpu', // Procesadores AMD
  48: 'cpu', // Procesadores Intel
  26: 'motherboard', // Mothers AMD
  49: 'motherboard', // Mothers Intel
  6: 'gpu', // Placas de video GeForce
  62: 'gpu', // Placas de video Radeon
  116: 'gpu', // Placas de video Intel ARC
  15: 'ram', // Memorias de escritorio
  19: 'storage', // Discos rígidos
  81: 'storage', // Discos sólidos
  34: 'psu', // Fuentes
  7: 'case', // Gabinetes
  36: 'cooler', // Coolers de CPU
  35: 'extra', // Coolers fan
  5: 'monitor', // Monitores
  39: 'keyboard', // Teclados
  2: 'mouse', // Mouses
  8: 'headset', // Auriculares
  47: 'extra', // Memorias SODIMM (no van en un desktop)
}

const EXTRA_KIND = {
  35: 'Ventilador',
  47: 'Memoria SODIMM',
}

const CATEGORY_ORDER = [
  'cpu',
  'cooler',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
  'extra',
]

const PRODUCTS = JSON.parse(await readFile(PRODUCTOS_PATH, 'utf8'))
const CHARACTERISTICS = JSON.parse(await readFile(CARACTERISTICAS_PATH, 'utf8'))
const BRANDS = JSON.parse(await readFile(MARCAS_PATH, 'utf8'))
const PART_IMAGES = JSON.parse(await readFile(PART_IMAGES_PATH, 'utf8'))

const characteristicsById = new Map(
  CHARACTERISTICS.map((entry) => [entry.id_producto, entry]),
)
const productsById = new Map(PRODUCTS.map((product) => [product.id_producto, product]))
const brandsById = new Map(BRANDS.map((entry) => [entry.id, entry]))
const curatedCgIds = new Set(
  Object.values(PART_IMAGES.images ?? {})
    .map((entry) => entry.cgId)
    .filter((id) => Number.isFinite(id)),
)

/* ------------------------------------------------------------------ */
/* Helpers de lectura                                                  */
/* ------------------------------------------------------------------ */

/** Convierte las características de una entrada en un mapa por etiqueta. */
function characteristicMap(entry) {
  const map = new Map()
  for (const characteristic of entry?.caracteristicas ?? []) {
    if (!map.has(characteristic.etiqueta)) {
      map.set(characteristic.etiqueta, characteristic)
    }
  }
  return map
}

/** Devuelve el mapa de características de un producto.
 *
 * Algunos productos son combos (por ejemplo, CPU + cooler) y no tienen ficha
 * propia. En ese caso heredamos la ficha del componente principal incluido,
 * que es el que define la compatibilidad.
 */
function characteristicsFor(product, category) {
  const entry = characteristicsById.get(product.id_producto)
  if (entry?.caracteristicas?.length) {
    return { chars: characteristicMap(entry), entry }
  }

  for (const included of entry?.incluidos ?? []) {
    const includedProduct = productsById.get(included.id_incluido)
    if (!includedProduct) continue
    if (SUBCATEGORY_CATEGORY[includedProduct.id_subcategoria] !== category) continue
    const includedEntry = characteristicsById.get(includedProduct.id_producto)
    if (!includedEntry?.caracteristicas?.length) continue
    return {
      chars: characteristicMap(includedEntry),
      entry,
      inheritedFrom: includedProduct,
    }
  }

  return { chars: new Map(), entry }
}

/** Lee un valor crudo de la ficha técnica. */
function raw(chars, label) {
  return chars.get(label)?.valor ?? ''
}

/** Lee un valor de texto limpio. */
function text(chars, label) {
  return String(raw(chars, label)).trim()
}

/** Lee el primer número de una característica. */
function number(chars, label) {
  const value = Number.parseFloat(String(raw(chars, label)).replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

/** Convierte un valor con unidades a texto legible. */
function withUnits(chars, label) {
  const entry = chars.get(label)
  if (!entry) return undefined
  const value = String(entry.valor).trim()
  if (!value) return undefined
  const units = String(entry.unidades ?? '').trim()
  if (!units || value.toLowerCase().includes(units.toLowerCase())) return value
  return `${value} ${units}`
}

/** Pasa MHz a GHz cuando el dato viene en MHz. */
function toGhz(value) {
  if (!Number.isFinite(value) || value <= 0) return undefined
  if (value >= 100) return Math.round((value / 1000) * 10) / 10
  if (value < 20) return value
  return undefined
}

/** Formatea una capacidad en GB a GB/TB. */
function formatCapacity(gb) {
  if (!Number.isFinite(gb) || gb <= 0) return undefined
  if (gb >= 1000 && gb % 1000 === 0) return `${gb / 1000} TB`
  return `${gb} GB`
}

/** Extrae capacidad en GB desde un texto libre. */
function parseCapacityGb(value) {
  const source = String(value ?? '')
  const tb = source.match(/(\d+(?:[.,]\d+)?)\s*TB/i)
  if (tb) return Math.round(Number.parseFloat(tb[1].replace(',', '.')) * 1000)
  const gb = source.match(/(\d+)\s*GB/i)
  if (gb) return Number(gb[1])
  return undefined
}

/** Extrae la cantidad de módulos de un texto como 2x16GB. */
function parseModules(value) {
  const match = String(value ?? '').match(/(\d+)\s*[xX×]\s*\d+/)
  return match ? Number(match[1]) : undefined
}

/** Extrae la velocidad de memoria en MHz/MT/s. */
function parseMemorySpeed(value) {
  const match = String(value ?? '').match(/(\d{3,5})\s*(?:MHz|MT\/s)/i)
  return match ? Number(match[1]) : undefined
}

/** Extrae una velocidad secuencial en MB/s desde un texto libre. */
function parseReadSpeed(value) {
  const match = String(value ?? '').match(/(\d{3,6})\s*MB\/s/i)
  return match ? Number(match[1]) : undefined
}

/**
 * Detecta CPUs Intel sin video integrado por el sufijo del modelo (F/KF).
 * La ficha del feed a veces falta o marca "requiere gpu obligatoria" en 0
 * aunque el modelo sí sea F; el nombre es la fuente más confiable.
 */
function intelHasNoIgpu(name) {
  if (!/intel/i.test(name)) return false
  return /\b\d{3,5}(?:K|KS|T)?F(?:\s|$|\+)/i.test(name)
}

/** Normaliza un socket de CPU o mother. */
function normalizeSocket(value) {
  const source = String(value ?? '').toUpperCase()
  if (!source) return undefined
  if (source.includes('AM5')) return 'AM5'
  if (source.includes('AM4')) return 'AM4'
  if (source.includes('TRX4')) return 'TRX4'
  if (source.includes('TR4')) return 'TR4'
  if (source.includes('1851')) return 'LGA1851'
  if (source.includes('1700')) return 'LGA1700'
  if (source.includes('1200')) return 'LGA1200'
  if (source.includes('1151')) return 'LGA1151'
  if (source.includes('1150')) return 'LGA1150'
  if (source.includes('1155')) return 'LGA1155'
  if (source.includes('1156')) return 'LGA1156'
  if (source.includes('2011')) return 'LGA2011'
  if (source.includes('2066')) return 'LGA2066'
  if (source.includes('AM3')) return 'AM3'
  if (source.includes('FM2')) return 'FM2'
  if (source.includes('FM1')) return 'FM1'
  return undefined
}

/** Normaliza una lista de sockets compatibles. */
function normalizeSocketList(value) {
  const sockets = new Set()
  for (const token of String(value ?? '').split(',')) {
    const socket = normalizeSocket(token)
    if (socket) sockets.add(socket)
    if (/115X/i.test(token)) {
      for (const legacy of ['LGA1151', 'LGA1150', 'LGA1155', 'LGA1156']) {
        sockets.add(legacy)
      }
    }
    if (/2011[_\s-]?V3/i.test(token)) sockets.add('LGA2011')
  }
  return [...sockets]
}

/** Normaliza el formato de una mother o gabinete. */
function normalizeFormFactor(value) {
  const source = String(value ?? '').toUpperCase()
  if (!source) return undefined
  if (source.includes('E-ATX')) return 'E-ATX'
  if (source.includes('M-ATX') || source.includes('MICRO-ATX') || source.includes('MATX')) {
    return 'Micro-ATX'
  }
  if (source.includes('ITX')) return 'Mini-ITX'
  if (source.includes('ATX')) return 'ATX'
  return undefined
}

/** Convierte una lista de formatos soportados por un gabinete. */
function parseCaseFormFactors(value) {
  const formats = new Set()
  for (const token of String(value ?? '').split(',')) {
    const format = normalizeFormFactor(token)
    if (format) formats.add(format)
  }
  return [...formats]
}

/** Detecta el tipo de memoria de un texto. */
function parseRamType(value) {
  const source = String(value ?? '').toUpperCase()
  if (source.includes('DDR5')) return 'DDR5'
  if (source.includes('DDR4')) return 'DDR4'
  return undefined
}

/** Detecta el chipset de una mother a partir del nombre. */
function parseChipset(value) {
  const match = String(value ?? '').match(
    /\b(A320|A520|A620|B350|B450|B550|B650E?|B840|B850|X370|X470|X570|X670E?|X870E?|H610|B660|B760|Z690|Z790|B860|Z890|W680|W790)\b/i,
  )
  return match ? match[1].toUpperCase() : undefined
}

/** Estima la generación PCIe según el chipset. */
function inferPcieGen(chipset, name) {
  const source = `${chipset ?? ''} ${name ?? ''}`.toUpperCase()
  if (/X870|B850|B840|Z890|B860|X670|B650|A620|Z790|B760/.test(source)) return 5
  if (/X570|B550|A520|H610|B660|Z690|H810/.test(source)) return 4
  if (/X470|B450|A320|B350|X370|H370|B360|H310/.test(source)) return 3
  return undefined
}

/** Detecta el fabricante de una GPU. */
function detectGpuChip(chipset, name) {
  const source = `${chipset ?? ''} ${name ?? ''}`.toUpperCase()
  if (/ARC|INTEL/.test(source)) return 'Intel'
  if (/RTX|GEFORCE|GTX|QUADRO|TESLA|NVIDIA|A400|A1000|PRO\s*\d/.test(source)) {
    return 'NVIDIA'
  }
  if (/RADEON|RX\s*\d|AMD/.test(source)) return 'AMD'
  return undefined
}

/** Detecta el modelo de GPU a partir del nombre. */
function parseGpuChipset(value) {
  const source = String(value ?? '')
  const patterns = [
    /RTX\s*PRO\s*\d{4}/i,
    /RTX\s*\d{4}\s*(?:Ti|SUPER)?/i,
    /RX\s*\d{4}\s*(?:XT|GRE)?/i,
    /(?:Intel\s+)?ARC\s*(?:PRO\s*)?[AB]\d{3}/i,
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match) return match[0].replace(/\s+/g, ' ').trim()
  }
  return undefined
}

/** Extrae la VRAM desde un nombre. */
function parseVram(value) {
  const match = String(value ?? '').match(/(\d+)\s*GB/i)
  return match ? Number(match[1]) : undefined
}

/** Extrae una potencia en watts desde un nombre. */
function parseWattage(value) {
  const match = String(value ?? '').match(/(\d{3,4})\s*W\b/i)
  return match ? Number(match[1]) : undefined
}

/** Normaliza una certificación de fuente. */
function parseEfficiency(value) {
  const source = String(value ?? '')
  const match = source.match(/80\s*PLUS\s*(Bronze|Silver|Gold|Platinum|Titanium)/i)
  if (match) return `80 PLUS ${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`
  if (/cybenetics/i.test(source)) return source.trim()
  if (/standard/i.test(source)) return 'Standard'
  return undefined
}

/** Detecta el tamaño de radiador de un cooler. */
function parseRadiator(value) {
  const match = String(value ?? '').match(/\b(120|240|280|360|420)\b/)
  return match ? Number(match[1]) : undefined
}

/** Detecta el tamaño de un monitor en pulgadas. */
function parseMonitorSize(value) {
  const match = String(value ?? '').match(/(\d{2}(?:[.,]\d)?)\s*(?:"|”|''|pulg)/i)
  if (!match) return undefined
  const size = Number(match[1].replace(',', '.'))
  return Number.isFinite(size) ? size : undefined
}

/** Normaliza una resolución de monitor. */
function parseResolution(value) {
  const source = String(value ?? '')
  const explicit = source.match(/(\d{3,4})\s*[xX]\s*(\d{3,4})/)
  if (explicit) return `${explicit[1]}x${explicit[2]}`
  if (/UWQHD|UW-?QHD/i.test(source)) return '3440x1440'
  if (/4K|UHD/i.test(source)) return '3840x2160'
  if (/QHD|1440/i.test(source)) return '2560x1440'
  if (/FHD|1080/i.test(source)) return '1920x1080'
  if (/HD/i.test(source)) return '1366x768'
  return undefined
}

/** Extrae la frecuencia de refresco de un monitor. */
function parseRefresh(value) {
  const match = String(value ?? '').match(/(\d{2,3})\s*Hz/i)
  return match ? Number(match[1]) : undefined
}

/** Detecta el tipo de panel de un monitor. */
function parsePanel(value) {
  const match = String(value ?? '').match(/QD-?OLED|OLED|FAST\s*IPS|IPS|MVA|VA|TN/i)
  return match ? match[0].toUpperCase().replace('FAST IPS', 'Fast IPS') : undefined
}

/** Detecta el mecanismo de un teclado. */
function parseKeyboardMechanism(value) {
  const source = String(value ?? '')
  const match = source.match(/Mec[aá]nic[oa]|Membrana|Magn[eé]tic[oa]|Opto-?Mec[aá]nic[oa]/i)
  return match ? match[0] : undefined
}

/** Resume la conexión de un periférico. */
function connectionText(chars, name) {
  const source = String(name ?? '').toUpperCase()
  const connections = []
  if (
    number(chars, 'conexión wireless con receptor') === 1 ||
    number(chars, 'tipo inalámbrico') === 1 ||
    /WIRELESS|INAL[AÁ]MBRIC|2\.4GHZ|LIGHTSPEED|SLIPSTREAM/i.test(source)
  ) {
    connections.push('Wireless')
  }
  if (
    number(chars, 'conexión bluetooth') === 1 ||
    number(chars, 'inalámbrico por bluetooth') === 1 ||
    /BLUETOOTH/i.test(source)
  ) {
    connections.push('Bluetooth')
  }
  if (
    number(chars, 'conector jack 3.5 mm (audio)') === 1 ||
    number(chars, 'conector jack 3.5 mm (combinado)') === 1 ||
    /3\.5\s*MM|JACK/i.test(source)
  ) {
    connections.push('3.5 mm')
  }
  if (
    number(chars, 'conexión por pines') === 1 ||
    number(chars, 'usb requeridos') === 1 ||
    /USB/i.test(source)
  ) {
    connections.push('USB')
  }
  return [...new Set(connections)].join(' + ')
}

/** Capitaliza una etiqueta para mostrarla. */
function capitalize(label) {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Arma una spec a partir de una característica. */
function specFromChar(chars, label, displayLabel = capitalize(label)) {
  const value = withUnits(chars, label)
  return value ? { label: displayLabel, value } : undefined
}

/** Limpia una lista de specs quitando valores vacíos. */
function compactSpecs(specs) {
  return specs.filter((spec) => Boolean(spec?.value))
}

/** Limpia una lista de destacados quitando valores vacíos. */
function compactHighlights(highlights) {
  return highlights.filter((highlight) => Boolean(highlight))
}

/* ------------------------------------------------------------------ */
/* Rendimiento estimado                                                */
/* ------------------------------------------------------------------ */

const GPU_PERF = new Map(
  Object.entries({
    'RTX 3050': 20,
    'RTX 3060': 30,
    'RTX 4060': 34,
    'RTX 4060 TI': 40,
    'RTX 4070': 50,
    'RTX 4070 TI': 58,
    'RTX 4080': 72,
    'RTX 4090': 95,
    'RTX 5050': 27,
    'RTX 5060': 36,
    'RTX 5060 TI': 42,
    'RTX 5070': 55,
    'RTX 5070 TI': 66,
    'RTX 5080': 80,
    'RTX 5090': 100,
    'RX 580': 15,
    'RX 6600': 28,
    'RX 6700 XT': 38,
    'RX 6800': 45,
    'RX 6900 XT': 55,
    'RX 7600': 34,
    'RX 7800 XT': 50,
    'RX 7900 XTX': 72,
    'RX 9060': 38,
    'RX 9060 XT': 46,
    'RX 9070 GRE': 52,
    'RX 9070': 58,
    'RX 9070 XT': 66,
    'ARC A380': 18,
    'ARC A750': 28,
    'ARC A770': 32,
    'ARC B570': 34,
    'ARC B580': 40,
    'ARC B60': 38,
    'ARC PRO B65': 40,
    'RTX A400': 12,
    'RTX A1000': 18,
    'RTX PRO 2000': 30,
    'RTX PRO 4500': 55,
  }),
)

/** Estima un índice de rendimiento para una GPU. */
function estimateGpuPerf(chipset, vram, name) {
  const key = String(chipset ?? parseGpuChipset(name) ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
  const base = GPU_PERF.get(key)
  if (base !== undefined) {
    if (key === 'RTX 5060 TI' && (vram ?? 0) >= 16) return 44
    if (key === 'RTX 5060 TI' && (vram ?? 0) < 16) return 40
    return base
  }
  // Sin modelo conocido: estimación conservadora por VRAM y consumo.
  return Math.max(10, Math.min(95, Math.round(12 + (vram ?? 0) * 1.4)))
}

/** Estima un índice de rendimiento para un CPU. */
function estimateCpuPerf(name, cores, threads, boost) {
  const source = String(name ?? '').toUpperCase()
  let base

  if (/RYZEN/.test(source)) {
    const model = source.match(/RYZEN\s*[3579]\s*(\d{4})/)?.[1]
    const generation = model ? Number(model[0]) : 5
    const generationBase = { 1: 24, 2: 30, 3: 36, 4: 40, 5: 48, 7: 64, 8: 60, 9: 76 }
    base = generationBase[generation] ?? 48
    if (/RYZEN\s*9/.test(source)) base += 20
    else if (/RYZEN\s*7/.test(source)) base += 10
    else if (/RYZEN\s*3/.test(source)) base -= 8
    if (/X3D/.test(source)) base += 6
  } else if (/ULTRA\s*9/.test(source)) {
    base = 88
  } else if (/ULTRA\s*7/.test(source)) {
    base = 78
  } else if (/ULTRA\s*5/.test(source)) {
    base = 68
  } else if (/I9-?/.test(source)) {
    base = 78
  } else if (/I7-?/.test(source)) {
    base = 68
  } else if (/I5-?/.test(source)) {
    base = 52
  } else if (/I3-?/.test(source)) {
    base = 38
  } else if (/PENTIUM|CELERON|ATHLON|SEMPRON/.test(source)) {
    base = 18
  } else {
    base = 45
  }

  // Ajuste fino por núcleos, hilos y frecuencia turbo.
  if (Number.isFinite(cores)) base += Math.max(-8, Math.min(12, (cores - 6) * 1.2))
  if (Number.isFinite(threads)) base += Math.max(-4, Math.min(6, (threads - 12) * 0.3))
  if (Number.isFinite(boost)) base += Math.max(-4, Math.min(6, (boost - 4) * 2))

  return Math.round(Math.max(5, Math.min(100, base)))
}

/* ------------------------------------------------------------------ */
/* Constructores por categoría                                         */
/* ------------------------------------------------------------------ */

/** Arma un CPU listo para el catálogo. */
function buildCpu(product, chars) {
  const name = product.nombre.trim()
  const socket = normalizeSocket(text(chars, 'socket')) ?? normalizeSocket(name)
  const cores = number(chars, 'núcleos')
  const threads = number(chars, 'hilos')
  const boost = toGhz(number(chars, 'frecuencia turbo'))
  const tdp = number(chars, 'tdp predeterminada')
  const gpuChip = text(chars, 'chipset gpu')
  const noIgpuByName = intelHasNoIgpu(name)
  const hasIgpuData =
    noIgpuByName ||
    Boolean(gpuChip) ||
    number(chars, 'requiere gpu obligatoria') !== undefined
  const igpu = noIgpuByName
    ? false
    : gpuChip && !/NO\s*POSEE|SIN\s*GR[AÁ]FICOS|NO\s*TIENE|NO\s*INCLUYE/i.test(gpuChip)
      ? true
      : number(chars, 'requiere gpu obligatoria') === 1
        ? false
        : gpuChip
          ? false
          : undefined
  const stockCoolerValue = number(chars, 'incluye cooler cpu')
  const stockCooler =
    stockCoolerValue === 1 ? true : stockCoolerValue === 0 ? false : undefined
  const perf = estimateCpuPerf(name, cores, threads, boost)

  return {
    ...basePart(product, 'cpu'),
    ...(socket ? { socket } : {}),
    ...(Number.isFinite(cores) ? { cores } : {}),
    ...(Number.isFinite(threads) ? { threads } : {}),
    ...(boost ? { boost } : {}),
    ...(Number.isFinite(tdp) ? { tdp } : {}),
    ...(hasIgpuData ? { igpu } : {}),
    ...(stockCooler !== undefined ? { stockCooler } : {}),
    perf,
    highlights: compactHighlights([
      Number.isFinite(cores) && Number.isFinite(threads)
        ? `${cores} núcleos / ${threads} hilos`
        : undefined,
      boost ? `${boost} GHz turbo` : undefined,
      Number.isFinite(tdp) ? `${tdp} W TDP` : undefined,
      igpu === true ? 'Video integrado' : igpu === false ? 'Sin video integrado' : undefined,
    ]),
    specs: compactSpecs([
      socket ? { label: 'Socket', value: socket } : undefined,
      Number.isFinite(cores) || Number.isFinite(threads)
        ? { label: 'Núcleos / hilos', value: `${cores ?? '?'} / ${threads ?? '?'}` }
        : undefined,
      boost ? { label: 'Frecuencia turbo', value: `${boost} GHz` } : undefined,
      Number.isFinite(tdp) ? { label: 'TDP', value: `${tdp} W` } : undefined,
      {
        label: 'Gráficos integrados',
        value: igpu === undefined ? 'Sin datos' : igpu ? gpuChip || 'Sí' : 'No',
      },
      {
        label: 'Cooler incluido',
        value: stockCooler === undefined ? 'Sin datos' : stockCooler ? 'Sí' : 'No',
      },
    ]),
  }
}

/** Arma una motherboard lista para el catálogo. */
function buildMotherboard(product, chars) {
  const name = product.nombre.trim()
  const socket = normalizeSocket(text(chars, 'socket')) ?? normalizeSocket(name)
  const ramType = parseRamType(text(chars, 'tipo de memoria')) ?? parseRamType(name)
  const ramSlots = number(chars, 'cantidad de slot de memorias')
  const formFactor =
    normalizeFormFactor(text(chars, 'factor')) ?? normalizeFormFactor(name)
  const chipset = text(chars, 'chipsets principal') || parseChipset(name)
  const m2Slots =
    number(chars, 'cantidad de slot m.2 totales') ??
    number(chars, 'cantidad de slot m.2 nvme')
  const pcieGen = inferPcieGen(chipset, name)

  return {
    ...basePart(product, 'motherboard'),
    ...(socket ? { socket } : {}),
    ...(ramType ? { ramType } : {}),
    ...(Number.isFinite(ramSlots) ? { ramSlots } : {}),
    ...(formFactor ? { formFactor } : {}),
    ...(chipset ? { chipset } : {}),
    ...(Number.isFinite(m2Slots) ? { m2Slots } : {}),
    ...(pcieGen ? { pcieGen } : {}),
    highlights: compactHighlights([
      socket,
      ramType,
      formFactor,
      Number.isFinite(m2Slots) ? `${m2Slots}× M.2` : undefined,
    ]),
    specs: compactSpecs([
      socket ? { label: 'Socket', value: socket } : undefined,
      chipset ? { label: 'Chipset', value: chipset } : undefined,
      ramType ? { label: 'Memoria', value: `${ramType}${Number.isFinite(ramSlots) ? ` · ${ramSlots} slots` : ''}` } : undefined,
      formFactor ? { label: 'Formato', value: formFactor } : undefined,
      Number.isFinite(m2Slots) ? { label: 'Slots M.2', value: String(m2Slots) } : undefined,
      pcieGen ? { label: 'PCIe', value: `Gen ${pcieGen}` } : undefined,
    ]),
  }
}

/** Arma una GPU lista para el catálogo. */
function buildGpu(product, chars) {
  const name = product.nombre.trim()
  const chipset = text(chars, 'chipset gpu') || parseGpuChipset(name)
  const chip = detectGpuChip(chipset, name)
  const vram = number(chars, 'capacidad de memoria') ?? parseVram(name)
  const gpuLength = number(chars, 'largo de la placa')
  const wattage = number(chars, 'consumo aproximado')
  const recommendedPsu = number(chars, 'watts mínimos recomendados')
  const perf = estimateGpuPerf(chipset, vram, name)

  return {
    ...basePart(product, 'gpu'),
    ...(chip ? { chip } : {}),
    ...(Number.isFinite(vram) ? { vram } : {}),
    ...(Number.isFinite(gpuLength) ? { gpuLength } : {}),
    ...(Number.isFinite(wattage) ? { wattage } : {}),
    perf,
    highlights: compactHighlights([
      Number.isFinite(vram) ? `${vram} GB VRAM` : undefined,
      Number.isFinite(wattage) ? `${wattage} W` : undefined,
      Number.isFinite(gpuLength) ? `${gpuLength} mm` : undefined,
      `Índice ${perf}`,
    ]),
    specs: compactSpecs([
      chipset ? { label: 'GPU', value: chipset } : undefined,
      Number.isFinite(vram) ? { label: 'Memoria', value: `${vram} GB` } : undefined,
      Number.isFinite(wattage) ? { label: 'Consumo', value: `${wattage} W` } : undefined,
      Number.isFinite(gpuLength) ? { label: 'Largo', value: `${gpuLength} mm` } : undefined,
      Number.isFinite(recommendedPsu)
        ? { label: 'Fuente recomendada', value: `${recommendedPsu} W` }
        : undefined,
    ]),
  }
}

/** Arma un kit o módulo de RAM listo para el catálogo. */
function buildRam(product, chars) {
  const name = product.nombre.trim()
  const ramType = parseRamType(text(chars, 'tipo')) ?? parseRamType(name)
  const capacityGb = number(chars, 'capacidad') ?? parseCapacityGb(name)
  const modules = number(chars, 'cantidad de memorias') ?? parseModules(name) ?? 1
  const speed = number(chars, 'velocidad') ?? parseMemorySpeed(name)
  const latency = text(chars, 'latencia').replace(/\s*cl$/i, '') || undefined

  return {
    ...basePart(product, 'ram'),
    ...(ramType ? { ramType } : {}),
    ...(Number.isFinite(capacityGb) ? { capacityGb } : {}),
    ...(Number.isFinite(modules) ? { modules } : {}),
    ...(Number.isFinite(speed) ? { speed } : {}),
    ...(latency ? { latency } : {}),
    highlights: compactHighlights([
      Number.isFinite(capacityGb) ? `${capacityGb} GB` : undefined,
      Number.isFinite(modules) && Number.isFinite(capacityGb)
        ? `${modules}× ${capacityGb / modules} GB`
        : undefined,
      ramType && speed ? `${ramType} ${speed}` : undefined,
      latency ? `CL ${latency}` : undefined,
    ]),
    specs: compactSpecs([
      ramType ? { label: 'Tipo', value: ramType } : undefined,
      Number.isFinite(capacityGb) ? { label: 'Capacidad total', value: `${capacityGb} GB` } : undefined,
      Number.isFinite(modules) && Number.isFinite(capacityGb)
        ? { label: 'Módulos', value: `${modules}× ${capacityGb / modules} GB` }
        : undefined,
      Number.isFinite(speed) ? { label: 'Velocidad', value: `${speed} MT/s` } : undefined,
      latency ? { label: 'Latencia', value: `CL ${latency}` } : undefined,
    ]),
  }
}

/** Arma una unidad de almacenamiento lista para el catálogo. */
function buildStorage(product, chars) {
  const name = product.nombre.trim()
  const capacityGb = number(chars, 'capacidad') ?? parseCapacityGb(name)
  const capacity = formatCapacity(capacityGb)
  const typeText = `${text(chars, 'tipo de disco')} ${name}`
  const storageType = /sólido|ssd/i.test(typeText)
    ? 'SSD'
    : /mecánico|hdd/i.test(typeText)
      ? 'HDD'
      : undefined
  const interfaceName =
    text(chars, 'interfaz') ||
    (/NVMe/i.test(name) ? 'NVMe' : /SATA/i.test(name) ? 'SATA' : undefined)
  const readSpeed =
    number(chars, 'vel lectura secuencial') ?? parseReadSpeed(name)
  const writeSpeed = number(chars, 'vel escritura secuencial')

  return {
    ...basePart(product, 'storage'),
    ...(capacity ? { capacity } : {}),
    ...(storageType ? { storageType } : {}),
    ...(interfaceName ? { interface: interfaceName } : {}),
    ...(Number.isFinite(readSpeed) ? { readSpeed } : {}),
    highlights: compactHighlights([
      capacity,
      interfaceName,
      Number.isFinite(readSpeed) ? `${readSpeed} MB/s` : undefined,
      storageType,
    ]),
    specs: compactSpecs([
      capacity ? { label: 'Capacidad', value: capacity } : undefined,
      storageType ? { label: 'Tipo', value: storageType } : undefined,
      interfaceName ? { label: 'Interfaz', value: interfaceName } : undefined,
      Number.isFinite(readSpeed) ? { label: 'Lectura secuencial', value: `${readSpeed} MB/s` } : undefined,
      Number.isFinite(writeSpeed) ? { label: 'Escritura secuencial', value: `${writeSpeed} MB/s` } : undefined,
    ]),
  }
}

/** Arma una fuente lista para el catálogo. */
function buildPsu(product, chars) {
  const name = product.nombre.trim()
  const wattage =
    number(chars, 'watts nominal') ?? number(chars, 'watts reales') ?? parseWattage(name)
  const efficiency = parseEfficiency(text(chars, 'certificación') || name)
  const formText = text(chars, 'formato') || name
  const psuForm = /SFX/i.test(formText) ? 'SFX' : /ATX/i.test(formText) ? 'ATX' : undefined
  const modular = text(chars, 'tipo de cableado') || undefined

  return {
    ...basePart(product, 'psu'),
    ...(Number.isFinite(wattage) ? { wattage } : {}),
    ...(efficiency ? { efficiency } : {}),
    ...(psuForm ? { psuForm } : {}),
    ...(modular ? { modular } : {}),
    highlights: compactHighlights([
      Number.isFinite(wattage) ? `${wattage} W` : undefined,
      efficiency,
      modular,
      psuForm ? `Formato ${psuForm}` : undefined,
    ]),
    specs: compactSpecs([
      Number.isFinite(wattage) ? { label: 'Potencia', value: `${wattage} W` } : undefined,
      efficiency ? { label: 'Certificación', value: efficiency } : undefined,
      modular ? { label: 'Cableado', value: modular } : undefined,
      psuForm ? { label: 'Formato', value: psuForm } : undefined,
    ]),
  }
}

/** Arma un gabinete listo para el catálogo. */
function buildCase(product, chars) {
  const name = product.nombre.trim()
  const supportedFormFactors = parseCaseFormFactors(
    text(chars, 'factor mother') || name,
  )
  const maxGpuLength = number(chars, 'largo máximo vga')
  const maxCoolerHeight = number(chars, 'altura máxima del cooler cpu')
  const radiatorSupport = [240, 280, 360, 420].filter(
    (size) => (number(chars, `soporte radiador ${size}mm`) ?? 0) > 0,
  )
  const psuText = text(chars, 'tipo de fuente admitida')
  const psuFormSupport = /SFX/i.test(psuText)
    ? /ATX/i.test(psuText)
      ? 'ATX'
      : 'SFX'
    : /ATX/i.test(psuText)
      ? 'ATX'
      : undefined

  return {
    ...basePart(product, 'case'),
    ...(supportedFormFactors.length ? { supportedFormFactors } : {}),
    ...(Number.isFinite(maxGpuLength) ? { maxGpuLength } : {}),
    ...(Number.isFinite(maxCoolerHeight) ? { maxCoolerHeight } : {}),
    ...(radiatorSupport.length ? { radiatorSupport } : {}),
    ...(psuFormSupport ? { psuFormSupport } : {}),
    highlights: compactHighlights([
      supportedFormFactors.length ? supportedFormFactors.join(' / ') : undefined,
      Number.isFinite(maxGpuLength) ? `GPU hasta ${maxGpuLength} mm` : undefined,
      Number.isFinite(maxCoolerHeight) ? `Cooler hasta ${maxCoolerHeight} mm` : undefined,
      radiatorSupport.length ? `Radiador ${radiatorSupport.join('/')} mm` : undefined,
    ]),
    specs: compactSpecs([
      supportedFormFactors.length
        ? { label: 'Formatos', value: supportedFormFactors.join(', ') }
        : undefined,
      Number.isFinite(maxGpuLength) ? { label: 'Largo máx. GPU', value: `${maxGpuLength} mm` } : undefined,
      Number.isFinite(maxCoolerHeight) ? { label: 'Alto máx. cooler', value: `${maxCoolerHeight} mm` } : undefined,
      radiatorSupport.length
        ? { label: 'Soporte radiador', value: radiatorSupport.map((size) => `${size} mm`).join(', ') }
        : undefined,
      psuFormSupport ? { label: 'Fuente compatible', value: psuFormSupport } : undefined,
    ]),
  }
}

/** Arma un cooler de CPU listo para el catálogo. */
function buildCooler(product, chars) {
  const name = product.nombre.trim()
  const typeText = `${text(chars, 'tipo de disipación')} ${name}`
  const coolerType = /water|líquid|aio/i.test(typeText)
    ? 'aio'
    : /aire|air/i.test(typeText)
      ? 'air'
      : undefined
  const coolerTdp = number(chars, 'tdp')
  const coolerHeight = number(chars, 'altura')
  const supportedSockets =
    normalizeSocketList(text(chars, 'socket compatibles')) ||
    normalizeSocketList(name)
  const radiator =
    coolerType === 'aio'
      ? parseRadiator(text(chars, 'tamaño de los coolers')) ?? parseRadiator(name)
      : undefined

  return {
    ...basePart(product, 'cooler'),
    ...(coolerType ? { coolerType } : {}),
    ...(Number.isFinite(coolerTdp) ? { coolerTdp } : {}),
    ...(supportedSockets.length ? { supportedSockets } : {}),
    ...(Number.isFinite(coolerHeight) ? { coolerHeight } : {}),
    ...(radiator ? { radiator } : {}),
    highlights: compactHighlights([
      coolerType === 'aio' && radiator
        ? `AIO ${radiator} mm`
        : coolerType === 'air' && Number.isFinite(coolerHeight)
          ? `Aire · ${coolerHeight} mm`
          : coolerType === 'aio'
            ? 'Líquida (AIO)'
            : coolerType === 'air'
              ? 'Aire'
              : undefined,
      Number.isFinite(coolerTdp) ? `${coolerTdp} W TDP` : undefined,
      supportedSockets.length ? supportedSockets.join(' / ') : undefined,
    ]),
    specs: compactSpecs([
      coolerType
        ? { label: 'Tipo', value: coolerType === 'aio' ? 'Líquida (AIO)' : 'Aire' }
        : undefined,
      Number.isFinite(coolerTdp) ? { label: 'Capacidad', value: `${coolerTdp} W TDP` } : undefined,
      Number.isFinite(coolerHeight) ? { label: 'Altura', value: `${coolerHeight} mm` } : undefined,
      radiator ? { label: 'Radiador', value: `${radiator} mm` } : undefined,
      supportedSockets.length ? { label: 'Sockets', value: supportedSockets.join(', ') } : undefined,
    ]),
  }
}

/** Arma un monitor listo para el catálogo. */
function buildMonitor(product, chars) {
  const name = product.nombre.trim()
  const sizeIn =
    number(chars, 'pulgadas visibles') ??
    number(chars, 'pulgadas') ??
    parseMonitorSize(name)
  const resolution =
    text(chars, 'resolución máxima') || parseResolution(name)
  const refresh =
    number(chars, 'máxima frecuencia') ?? parseRefresh(name)
  const panel = text(chars, 'tipo de panel') || parsePanel(name)

  return {
    ...basePart(product, 'monitor'),
    ...(Number.isFinite(sizeIn) ? { sizeIn } : {}),
    ...(resolution ? { resolution } : {}),
    ...(Number.isFinite(refresh) ? { refresh } : {}),
    highlights: compactHighlights([
      Number.isFinite(sizeIn) ? `${sizeIn}"` : undefined,
      resolution,
      Number.isFinite(refresh) ? `${refresh} Hz` : undefined,
      panel,
    ]),
    specs: compactSpecs([
      Number.isFinite(sizeIn) ? { label: 'Tamaño', value: `${sizeIn}"` } : undefined,
      resolution ? { label: 'Resolución', value: resolution } : undefined,
      Number.isFinite(refresh) ? { label: 'Refresco', value: `${refresh} Hz` } : undefined,
      panel ? { label: 'Panel', value: panel } : undefined,
      specFromChar(chars, 'brillo', 'Brillo'),
      specFromChar(chars, 'tiempo de respuesta', 'Tiempo de respuesta'),
    ]),
  }
}

/** Arma un teclado listo para el catálogo. */
function buildKeyboard(product, chars) {
  const name = product.nombre.trim()
  const mechanism =
    text(chars, 'tipo de mecanismo') ||
    parseKeyboardMechanism(name)
  const switchName = text(chars, 'tipo de switch') || text(chars, 'switch especifico')
  const format = text(chars, 'tipo de teclado')
  const connection = connectionText(chars, name)
  const distribution = text(chars, 'distribución') || text(chars, 'idioma')
  const lighting = text(chars, 'color led') || text(chars, 'iluminación')

  return {
    ...basePart(product, 'keyboard'),
    kind: mechanism || 'Teclado',
    highlights: compactHighlights([
      mechanism,
      switchName,
      format,
      connection,
      lighting,
    ]),
    specs: compactSpecs([
      mechanism ? { label: 'Mecanismo', value: mechanism } : undefined,
      switchName ? { label: 'Switch', value: switchName } : undefined,
      format ? { label: 'Formato', value: format } : undefined,
      connection ? { label: 'Conexión', value: connection } : undefined,
      distribution ? { label: 'Distribución', value: distribution } : undefined,
      specFromChar(chars, 'peso', 'Peso'),
      specFromChar(chars, 'tipo cable', 'Cable'),
    ]),
  }
}

/** Arma un mouse listo para el catálogo. */
function buildMouse(product, chars) {
  const name = product.nombre.trim()
  const sensor = text(chars, 'sensor') || text(chars, 'tipo de sensor')
  const dpi = number(chars, 'dpi máximos')
  const buttons = number(chars, 'cantidad de botones')
  const connection = connectionText(chars, name)
  const weight = withUnits(chars, 'peso')

  return {
    ...basePart(product, 'mouse'),
    kind: 'Mouse',
    highlights: compactHighlights([
      Number.isFinite(dpi) ? `${dpi} DPI` : undefined,
      sensor,
      Number.isFinite(buttons) ? `${buttons} botones` : undefined,
      connection,
      weight,
    ]),
    specs: compactSpecs([
      sensor ? { label: 'Sensor', value: sensor } : undefined,
      Number.isFinite(dpi) ? { label: 'DPI máximo', value: String(dpi) } : undefined,
      Number.isFinite(buttons) ? { label: 'Botones', value: String(buttons) } : undefined,
      connection ? { label: 'Conexión', value: connection } : undefined,
      weight ? { label: 'Peso', value: weight } : undefined,
      specFromChar(chars, 'velocidad máxima', 'Velocidad máxima'),
    ]),
  }
}

/** Arma unos auriculares listos para el catálogo. */
function buildHeadset(product, chars) {
  const name = product.nombre.trim()
  const type = text(chars, 'tipo')
  const connection = connectionText(chars, name)
  const audio = text(chars, 'audio')
  const microphone = text(chars, 'tipo de micrófono')
  const surround = number(chars, 'surround') === 1

  return {
    ...basePart(product, 'headset'),
    kind: type || 'Auriculares',
    highlights: compactHighlights([
      type,
      connection,
      audio ? `Audio ${audio}` : undefined,
      surround ? 'Surround' : undefined,
      microphone ? `Mic ${microphone}` : undefined,
    ]),
    specs: compactSpecs([
      type ? { label: 'Tipo', value: type } : undefined,
      connection ? { label: 'Conexión', value: connection } : undefined,
      audio ? { label: 'Audio', value: audio } : undefined,
      microphone ? { label: 'Micrófono', value: microphone } : undefined,
      specFromChar(chars, 'impedancia', 'Impedancia'),
      specFromChar(chars, 'tamaño de los parlantes', 'Parlantes'),
    ]),
  }
}

/** Arma un accesorio (fan, SODIMM u otro) listo para el catálogo. */
function buildExtra(product, chars) {
  const name = product.nombre.trim()
  const kind = EXTRA_KIND[product.id_subcategoria] ?? 'Accesorio'

  if (product.id_subcategoria === 35) {
    const size = withUnits(chars, 'tamaño')
    const fanCount = number(chars, 'cantidad de fans')
    const speed = withUnits(chars, 'máxima velocidad')
    const airflow = withUnits(chars, 'flujo máximo de aire')
    const noise = withUnits(chars, 'nivel de ruido máximo') ?? withUnits(chars, 'nivel de ruido máxima')

    return {
      ...basePart(product, 'extra'),
      kind,
      highlights: compactHighlights([size, fanCount ? `${fanCount} fan${fanCount > 1 ? 's' : ''}` : undefined, speed, airflow]),
      specs: compactSpecs([
        size ? { label: 'Tamaño', value: size } : undefined,
        fanCount ? { label: 'Cantidad', value: String(fanCount) } : undefined,
        speed ? { label: 'Velocidad máxima', value: speed } : undefined,
        airflow ? { label: 'Flujo de aire', value: airflow } : undefined,
        noise ? { label: 'Ruido máximo', value: noise } : undefined,
        specFromChar(chars, 'iluminación', 'Iluminación'),
      ]),
    }
  }

  if (product.id_subcategoria === 47) {
    const ramType = parseRamType(text(chars, 'tipo')) ?? parseRamType(name)
    const capacityGb = number(chars, 'capacidad') ?? parseCapacityGb(name)
    const speed = number(chars, 'velocidad') ?? parseMemorySpeed(name)
    const latency = text(chars, 'latencia').replace(/\s*cl$/i, '') || undefined

    return {
      ...basePart(product, 'extra'),
      kind,
      highlights: compactHighlights([
        ramType,
        Number.isFinite(capacityGb) ? `${capacityGb} GB` : undefined,
        Number.isFinite(speed) ? `${speed} MHz` : undefined,
        'Formato notebook',
      ]),
      specs: compactSpecs([
        ramType ? { label: 'Tipo', value: ramType } : undefined,
        Number.isFinite(capacityGb) ? { label: 'Capacidad', value: `${capacityGb} GB` } : undefined,
        Number.isFinite(speed) ? { label: 'Velocidad', value: `${speed} MHz` } : undefined,
        latency ? { label: 'Latencia', value: `CL ${latency}` } : undefined,
        { label: 'Formato', value: 'SODIMM (notebook)' },
      ]),
    }
  }

  const specs = [...chars.entries()]
    .slice(0, 6)
    .map(([label, entry]) => ({
      label: capitalize(label),
      value: withUnits(chars, label) ?? String(entry.valor),
    }))

  return {
    ...basePart(product, 'extra'),
    kind,
    highlights: specs.slice(0, 4).map((spec) => spec.value),
    specs: specs.length
      ? specs
      : [{ label: 'Ficha técnica', value: 'No publicada por CompraGamer' }],
  }
}

/* ------------------------------------------------------------------ */
/* Pieza base y orquestación                                          */
/* ------------------------------------------------------------------ */

/** Devuelve la marca publicada o la deduce del nombre. */
function brandFor(product) {
  const brand = String(brandsById.get(product.id_marca)?.nombre ?? '').trim()
  if (brand && !/^SIN DEFINIR$/i.test(brand)) return brand
  const first = product.nombre.trim().split(/\s+/)
  return first[1] ?? first[0] ?? 'CompraGamer'
}

/** Devuelve la primera imagen del producto en formato CDN. */
function imageFor(product) {
  const images = [...(product.imagenes ?? [])].sort((a, b) => a.orden - b.orden)
  const name = images[0]?.nombre
  if (!name) return undefined
  return `${IMAGE_BASE}${encodeURIComponent(name)}-grn.jpg`
}

/** Construye los campos comunes a todas las piezas. */
function basePart(product, category) {
  const image = imageFor(product)
  return {
    id: `cg-${product.id_producto}`,
    category,
    name: product.nombre.trim(),
    brand: brandFor(product),
    price: Number(product.precioLista) || 0,
    cgId: product.id_producto,
    ...(image ? { image } : {}),
  }
}

const BUILDERS = {
  cpu: buildCpu,
  motherboard: buildMotherboard,
  gpu: buildGpu,
  ram: buildRam,
  storage: buildStorage,
  psu: buildPsu,
  case: buildCase,
  cooler: buildCooler,
  monitor: buildMonitor,
  keyboard: buildKeyboard,
  mouse: buildMouse,
  headset: buildHeadset,
  extra: buildExtra,
}

const parts = []
const skipped = []
const missingData = { total: 0, byCategory: {} }

for (const product of PRODUCTS) {
  const category = SUBCATEGORY_CATEGORY[product.id_subcategoria]
  if (!category) continue
  if (curatedCgIds.has(product.id_producto)) continue

  const price = Number(product.precioLista)
  if (!Number.isFinite(price) || price <= 0) {
    skipped.push({ id: product.id_producto, name: product.nombre, reason: 'sin precio' })
    continue
  }

  const { chars, entry, inheritedFrom } = characteristicsFor(product, category)
  const builder = BUILDERS[category]
  if (!builder) continue

  const part = builder(product, chars)
  const notes = []
  if (inheritedFrom) {
    const includedNames = (entry?.incluidos ?? [])
      .map((included) => included.nombre)
      .filter((name) => name !== inheritedFrom.nombre)
    const includesCooler =
      category === 'cpu' && includedNames.some((name) => /cooler/i.test(name))
    if (includesCooler) part.stockCooler = true
    notes.push(
      includedNames.length
        ? `Combo: incluye ${includedNames.join(', ')}.`
        : `Combo: incluye ${inheritedFrom.nombre}.`,
    )
  } else if (!chars.size) {
    notes.push(
      'Ficha técnica no publicada en el catálogo de CompraGamer; algunos datos de compatibilidad quedan sin verificar.',
    )
    missingData.total += 1
    missingData.byCategory[category] = (missingData.byCategory[category] ?? 0) + 1
  }
  if (product.es_outlet || /outlet|usado en evento/i.test(product.nombre)) {
    notes.push('Producto outlet: puede estar usado o venir en empaque bulk.')
  }
  if (notes.length) part.note = notes.join(' ')
  parts.push(part)
}

const categoryRank = new Map(CATEGORY_ORDER.map((category, index) => [category, index]))
parts.sort(
  (a, b) =>
    (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99) ||
    a.price - b.price ||
    a.name.localeCompare(b.name),
)

await writeFile(OUTPUT_PATH, `${JSON.stringify(parts, null, 2)}\n`)

const map = Object.fromEntries(parts.map((part) => [part.id, part.cgId]))
await writeFile(
  MAP_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'https://static.compragamer.com/productos',
      parts: map,
    },
    null,
    2,
  )}\n`,
)

const byCategory = parts.reduce((acc, part) => {
  acc[part.category] = (acc[part.category] ?? 0) + 1
  return acc
}, {})

console.log(`Generadas ${parts.length} piezas en ${OUTPUT_PATH}`)
console.log('Por categoría:', byCategory)
console.log(`Sin ficha técnica: ${missingData.total}`, missingData.byCategory)
if (skipped.length) {
  console.log(`Omitidas: ${skipped.length}`)
  for (const item of skipped) console.log(`- ${item.id} ${item.name}: ${item.reason}`)
}
