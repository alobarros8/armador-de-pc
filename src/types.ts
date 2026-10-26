export type Category =
  | 'cpu'
  | 'cooler'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'headset'
  | 'extra'

export type Socket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851'
export type RamType = 'DDR4' | 'DDR5'
export type FormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX'
export type CoolerType = 'air' | 'aio'

export interface Spec {
  label: string
  value: string
}

export interface Part {
  id: string
  category: Category
  name: string
  brand: string
  price: number
  specs: Spec[]
  highlights: string[]
  /** Notas libres que se muestran en el detalle. */
  note?: string

  // CPU
  socket?: Socket
  cores?: number
  threads?: number
  boost?: number
  tdp?: number
  igpu?: boolean
  perf?: number
  stockCooler?: boolean

  // Motherboard
  ramType?: RamType
  ramSlots?: number
  formFactor?: FormFactor
  pcieGen?: number
  m2Slots?: number

  // RAM
  modules?: number
  capacityGb?: number
  speed?: number

  // GPU
  chip?: 'AMD' | 'NVIDIA' | 'Intel'
  gpuLength?: number
  wattage?: number
  vram?: number

  // Storage
  capacity?: string
  interface?: string
  readSpeed?: number
  storageType?: 'SSD' | 'HDD'

  // PSU
  efficiency?: string
  psuForm?: 'ATX' | 'SFX'

  // Case
  supportedFormFactors?: FormFactor[]
  maxGpuLength?: number
  maxCoolerHeight?: number
  radiatorSupport?: number[]
  psuFormSupport?: 'ATX' | 'SFX'

  // Cooler
  coolerType?: CoolerType
  coolerHeight?: number
  coolerTdp?: number
  radiator?: number
  supportedSockets?: Socket[]
  included?: boolean

  // Monitor
  sizeIn?: number
  resolution?: string
  refresh?: number

  // Periféricos / extras
  kind?: string
}

export type Selections = Partial<Record<Category, string[]>>

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  id: string
  severity: Severity
  title: string
  detail: string
  categories: Category[]
}

export interface CategoryMeta {
  id: Category
  label: string
  short: string
  group: 'esencial' | 'periferico'
  multi: boolean
  max?: number
  required: boolean
}

export interface Preset {
  id: string
  name: string
  tier: string
  platform: 'AMD' | 'Intel' | 'Mixto'
  description: string
  useCase: string
  selections: Selections
}
