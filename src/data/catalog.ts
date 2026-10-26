import type {
  Category,
  CategoryMeta,
  CoolerType,
  FormFactor,
  Part,
  RamType,
  Socket,
} from '../types'

export const CATEGORIES: CategoryMeta[] = [
  { id: 'cpu', label: 'Procesador', short: 'CPU', group: 'esencial', multi: false, required: true },
  { id: 'cooler', label: 'Refrigeración', short: 'Cooler', group: 'esencial', multi: false, required: false },
  { id: 'motherboard', label: 'Motherboard', short: 'Motherboard', group: 'esencial', multi: false, required: true },
  { id: 'ram', label: 'Memoria RAM', short: 'RAM', group: 'esencial', multi: false, required: true },
  { id: 'gpu', label: 'Placa de video', short: 'GPU', group: 'esencial', multi: false, required: false },
  { id: 'storage', label: 'Almacenamiento', short: 'Almacenamiento', group: 'esencial', multi: true, max: 3, required: true },
  { id: 'psu', label: 'Fuente', short: 'Fuente', group: 'esencial', multi: false, required: true },
  { id: 'case', label: 'Gabinete', short: 'Gabinete', group: 'esencial', multi: false, required: true },
  { id: 'monitor', label: 'Monitor', short: 'Monitor', group: 'periferico', multi: false, required: false },
  { id: 'keyboard', label: 'Teclado', short: 'Teclado', group: 'periferico', multi: false, required: false },
  { id: 'mouse', label: 'Mouse', short: 'Mouse', group: 'periferico', multi: false, required: false },
  { id: 'headset', label: 'Auriculares', short: 'Auriculares', group: 'periferico', multi: false, required: false },
  { id: 'extra', label: 'Extras y accesorios', short: 'Extras', group: 'periferico', multi: true, max: 6, required: false },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  Category,
  CategoryMeta
>

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

interface CpuInput {
  id: string
  name: string
  brand: 'AMD' | 'Intel'
  price: number
  socket: Socket
  cores: number
  threads: number
  boost: number
  tdp: number
  igpu: boolean
  perf: number
  stockCooler: boolean
  note?: string
}

const cpu = (p: CpuInput): Part => ({
  ...p,
  category: 'cpu',
  highlights: [
    `${p.cores} núcleos / ${p.threads} hilos`,
    `${p.boost} GHz turbo`,
    `${p.tdp} W TDP`,
    p.igpu ? 'Video integrado' : 'Sin video integrado',
  ],
  specs: [
    { label: 'Socket', value: p.socket },
    { label: 'Núcleos / hilos', value: `${p.cores} / ${p.threads}` },
    { label: 'Frecuencia turbo', value: `${p.boost} GHz` },
    { label: 'TDP', value: `${p.tdp} W` },
    { label: 'Gráficos integrados', value: p.igpu ? 'Sí' : 'No' },
    { label: 'Cooler incluido', value: p.stockCooler ? 'Sí' : 'No' },
  ],
})

interface MoboInput {
  id: string
  name: string
  brand: string
  price: number
  socket: Socket
  chipset: string
  ramType: RamType
  ramSlots: number
  formFactor: FormFactor
  pcieGen: number
  m2Slots: number
  note?: string
}

const mobo = (p: MoboInput): Part => ({
  ...p,
  category: 'motherboard',
  highlights: [p.socket, p.ramType, p.formFactor, `${p.m2Slots}× M.2`],
  specs: [
    { label: 'Socket', value: p.socket },
    { label: 'Chipset', value: p.chipset },
    { label: 'Memoria', value: `${p.ramType} · ${p.ramSlots} slots` },
    { label: 'Formato', value: p.formFactor },
    { label: 'M.2 / PCIe', value: `Gen ${p.pcieGen}` },
    { label: 'Slots M.2', value: String(p.m2Slots) },
  ],
})

interface RamInput {
  id: string
  name: string
  brand: string
  price: number
  ramType: RamType
  capacityGb: number
  modules: number
  speed: number
  latency: string
  note?: string
}

const ram = (p: RamInput): Part => {
  const perModule = p.capacityGb / p.modules
  return {
    ...p,
    category: 'ram',
    highlights: [
      `${p.capacityGb} GB`,
      `${p.modules}× ${perModule} GB`,
      `${p.ramType} ${p.speed}`,
      `CL ${p.latency}`,
    ],
    specs: [
      { label: 'Tipo', value: p.ramType },
      { label: 'Capacidad total', value: `${p.capacityGb} GB` },
      { label: 'Módulos', value: `${p.modules}× ${perModule} GB` },
      { label: 'Velocidad', value: `${p.speed} MT/s` },
      { label: 'Latencia', value: `CL ${p.latency}` },
      { label: 'Perfil', value: 'XMP / EXPO' },
    ],
  }
}

interface GpuInput {
  id: string
  name: string
  brand: string
  price: number
  chip: 'AMD' | 'NVIDIA' | 'Intel'
  vram: number
  gpuLength: number
  wattage: number
  perf: number
  note?: string
}

const gpu = (p: GpuInput): Part => ({
  ...p,
  category: 'gpu',
  highlights: [`${p.vram} GB VRAM`, `${p.wattage} W`, `${p.gpuLength} mm`, `Índice ${p.perf}`],
  specs: [
    { label: 'GPU', value: p.chip },
    { label: 'Memoria', value: `${p.vram} GB` },
    { label: 'Consumo', value: `${p.wattage} W` },
    { label: 'Largo', value: `${p.gpuLength} mm` },
    { label: 'Índice de rendimiento', value: `${p.perf} / 100` },
    { label: 'Alimentación', value: p.wattage >= 300 ? '2× 8 pin / 12V-2×6' : '8 pin' },
  ],
})

interface StorageInput {
  id: string
  name: string
  brand: string
  price: number
  capacity: string
  storageType: 'SSD' | 'HDD'
  interface: string
  readSpeed: number
  note?: string
}

const storage = (p: StorageInput): Part => ({
  ...p,
  category: 'storage',
  highlights: [p.capacity, p.interface, `${p.readSpeed} MB/s`, p.storageType],
  specs: [
    { label: 'Capacidad', value: p.capacity },
    { label: 'Tipo', value: p.storageType },
    { label: 'Interfaz', value: p.interface },
    { label: 'Lectura secuencial', value: `${p.readSpeed} MB/s` },
  ],
})

interface PsuInput {
  id: string
  name: string
  brand: string
  price: number
  wattage: number
  efficiency: string
  modular: string
  psuForm?: 'ATX' | 'SFX'
  note?: string
}

const psu = (p: PsuInput): Part => {
  const psuForm = p.psuForm ?? 'ATX'
  return {
    ...p,
    psuForm,
    category: 'psu',
    highlights: [`${p.wattage} W`, p.efficiency, p.modular, `Formato ${psuForm}`],
    specs: [
      { label: 'Potencia', value: `${p.wattage} W` },
      { label: 'Certificación', value: p.efficiency },
      { label: 'Cableado', value: p.modular },
      { label: 'Formato', value: psuForm },
      { label: 'Estándar', value: 'ATX 3.1 · PCIe 5.1' },
    ],
  }
}

interface CaseInput {
  id: string
  name: string
  brand: string
  price: number
  supportedFormFactors: FormFactor[]
  maxGpuLength: number
  maxCoolerHeight: number
  radiatorSupport: number[]
  psuFormSupport?: 'ATX' | 'SFX'
  note?: string
}

const pcCase = (p: CaseInput): Part => {
  const psuFormSupport = p.psuFormSupport ?? 'ATX'
  return {
    ...p,
    psuFormSupport,
    category: 'case',
    highlights: [
      p.supportedFormFactors.join(' / '),
      `GPU hasta ${p.maxGpuLength} mm`,
      `Cooler hasta ${p.maxCoolerHeight} mm`,
      p.radiatorSupport.length ? `Radiador ${p.radiatorSupport.join('/')} mm` : 'Sin radiador',
    ],
    specs: [
      { label: 'Formatos', value: p.supportedFormFactors.join(', ') },
      { label: 'Largo máx. GPU', value: `${p.maxGpuLength} mm` },
      { label: 'Alto máx. cooler', value: `${p.maxCoolerHeight} mm` },
      {
        label: 'Soporte radiador',
        value: p.radiatorSupport.length ? p.radiatorSupport.map((r) => `${r} mm`).join(', ') : 'No',
      },
      { label: 'Fuente compatible', value: psuFormSupport },
    ],
  }
}

interface CoolerInput {
  id: string
  name: string
  brand: string
  price: number
  coolerType: CoolerType
  coolerTdp: number
  supportedSockets: Socket[]
  coolerHeight?: number
  radiator?: number
  included?: boolean
  note?: string
}

const cooler = (p: CoolerInput): Part => ({
  ...p,
  category: 'cooler',
  highlights: [
    p.included ? 'Incluido con el CPU' : p.coolerType === 'aio' ? `AIO ${p.radiator} mm` : `Aire · ${p.coolerHeight} mm`,
    `${p.coolerTdp} W TDP`,
    p.supportedSockets.join(' / '),
  ],
  specs: [
    { label: 'Tipo', value: p.coolerType === 'aio' ? 'Líquida (AIO)' : 'Aire' },
    { label: 'Capacidad', value: `${p.coolerTdp} W TDP` },
    ...(p.coolerHeight ? [{ label: 'Altura', value: `${p.coolerHeight} mm` }] : []),
    ...(p.radiator ? [{ label: 'Radiador', value: `${p.radiator} mm` }] : []),
    { label: 'Sockets', value: p.supportedSockets.join(', ') },
  ],
})

interface MonitorInput {
  id: string
  name: string
  brand: string
  price: number
  sizeIn: number
  resolution: string
  refresh: number
  panel: string
  note?: string
}

const monitor = (p: MonitorInput): Part => ({
  ...p,
  category: 'monitor',
  highlights: [p.sizeIn + '"', p.resolution, `${p.refresh} Hz`, p.panel],
  specs: [
    { label: 'Tamaño', value: `${p.sizeIn}"` },
    { label: 'Resolución', value: p.resolution },
    { label: 'Refresco', value: `${p.refresh} Hz` },
    { label: 'Panel', value: p.panel },
  ],
})

interface PeripheralInput {
  id: string
  category: Category
  name: string
  brand: string
  price: number
  specLabel: string
  specValue: string
  highlights: string[]
  note?: string
}

const peripheral = (p: PeripheralInput): Part => ({
  ...p,
  specs: [
    { label: p.specLabel, value: p.specValue },
    { label: 'Categoría', value: CATEGORY_BY_ID[p.category].label },
  ],
})

/* ------------------------------------------------------------------ */
/* CPUs                                                               */
/* ------------------------------------------------------------------ */

const CPUS: Part[] = [
  cpu({
    id: 'amd-r3-3200g',
    name: 'AMD Ryzen 3 3200G',
    brand: 'AMD',
    price: 111193,
    socket: 'AM4',
    cores: 4,
    threads: 8,
    boost: 4.0,
    tdp: 65,
    igpu: true,
    perf: 30,
    stockCooler: true,
    note: 'Opción económica con Vega 8 integrada. Ideal para oficina y eSports livianos.',
  }),
  cpu({
    id: 'amd-r5-5500',
    name: 'AMD Ryzen 5 5500',
    brand: 'AMD',
    price: 185500,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    boost: 4.2,
    tdp: 65,
    igpu: false,
    perf: 50,
    stockCooler: true,
  }),
  cpu({
    id: 'amd-r5-5600gt',
    name: 'AMD Ryzen 5 5600GT',
    brand: 'AMD',
    price: 331100,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    boost: 4.6,
    tdp: 65,
    igpu: true,
    perf: 57,
    stockCooler: true,
  }),
  cpu({
    id: 'amd-r7-5700x',
    name: 'AMD Ryzen 7 5700X',
    brand: 'AMD',
    price: 385160,
    socket: 'AM4',
    cores: 8,
    threads: 16,
    boost: 4.6,
    tdp: 65,
    igpu: false,
    perf: 64,
    stockCooler: false,
  }),
  cpu({
    id: 'amd-r7-5700g',
    name: 'AMD Ryzen 7 5700G',
    brand: 'AMD',
    price: 362950,
    socket: 'AM4',
    cores: 8,
    threads: 16,
    boost: 4.6,
    tdp: 65,
    igpu: true,
    perf: 62,
    stockCooler: true,
  }),
  cpu({
    id: 'amd-r7-5800x3d',
    name: 'AMD Ryzen 7 5800X3D',
    brand: 'AMD',
    price: 659460,
    socket: 'AM4',
    cores: 8,
    threads: 16,
    boost: 4.5,
    tdp: 105,
    igpu: false,
    perf: 69,
    stockCooler: false,
    note: 'El mejor CPU gaming de AM4. Edición 10th Anniversary.',
  }),
  cpu({
    id: 'amd-r5-8500g',
    name: 'AMD Ryzen 5 8500G',
    brand: 'AMD',
    price: 251437,
    socket: 'AM5',
    cores: 6,
    threads: 12,
    boost: 5.0,
    tdp: 65,
    igpu: true,
    perf: 60,
    stockCooler: true,
  }),
  cpu({
    id: 'amd-r5-8600g',
    name: 'AMD Ryzen 5 8600G',
    brand: 'AMD',
    price: 305109,
    socket: 'AM5',
    cores: 6,
    threads: 12,
    boost: 5.0,
    tdp: 65,
    igpu: true,
    perf: 63,
    stockCooler: true,
    note: 'Con Radeon 760M: la mejor iGPU para jugar sin placa dedicada.',
  }),
  cpu({
    id: 'amd-r5-7600x',
    name: 'AMD Ryzen 5 7600X',
    brand: 'AMD',
    price: 400600,
    socket: 'AM5',
    cores: 6,
    threads: 12,
    boost: 5.3,
    tdp: 105,
    igpu: true,
    perf: 72,
    stockCooler: false,
  }),
  cpu({
    id: 'amd-r5-9600x',
    name: 'AMD Ryzen 5 9600X',
    brand: 'AMD',
    price: 404600,
    socket: 'AM5',
    cores: 6,
    threads: 12,
    boost: 5.4,
    tdp: 65,
    igpu: true,
    perf: 77,
    stockCooler: false,
  }),
  cpu({
    id: 'amd-r7-9700x',
    name: 'AMD Ryzen 7 9700X',
    brand: 'AMD',
    price: 614400,
    socket: 'AM5',
    cores: 8,
    threads: 16,
    boost: 5.5,
    tdp: 65,
    igpu: true,
    perf: 85,
    stockCooler: false,
  }),
  cpu({
    id: 'amd-r7-7800x3d',
    name: 'AMD Ryzen 7 7800X3D',
    brand: 'AMD',
    price: 770713,
    socket: 'AM5',
    cores: 8,
    threads: 16,
    boost: 5.0,
    tdp: 120,
    igpu: true,
    perf: 82,
    stockCooler: false,
    note: 'Rey del gaming AM5 con caché 3D y consumo contenido.',
  }),
  cpu({
    id: 'amd-r7-9800x3d',
    name: 'AMD Ryzen 7 9800X3D',
    brand: 'AMD',
    price: 844980,
    socket: 'AM5',
    cores: 8,
    threads: 16,
    boost: 5.2,
    tdp: 120,
    igpu: true,
    perf: 88,
    stockCooler: false,
    note: 'El CPU gaming más rápido del catálogo. Excelente en 1440p y 4K.',
  }),
  cpu({
    id: 'amd-r9-9900x',
    name: 'AMD Ryzen 9 9900X',
    brand: 'AMD',
    price: 747777,
    socket: 'AM5',
    cores: 12,
    threads: 24,
    boost: 5.6,
    tdp: 120,
    igpu: true,
    perf: 91,
    stockCooler: false,
  }),
  cpu({
    id: 'amd-r9-9950x',
    name: 'AMD Ryzen 9 9950X',
    brand: 'AMD',
    price: 1085000,
    socket: 'AM5',
    cores: 16,
    threads: 32,
    boost: 5.7,
    tdp: 170,
    igpu: true,
    perf: 100,
    stockCooler: false,
    note: '16 núcleos para render, compilación y streaming pesado.',
  }),
  cpu({
    id: 'amd-r9-9950x3d',
    name: 'AMD Ryzen 9 9950X3D',
    brand: 'AMD',
    price: 1310016,
    socket: 'AM5',
    cores: 16,
    threads: 32,
    boost: 5.7,
    tdp: 170,
    igpu: true,
    perf: 99,
    stockCooler: false,
    note: 'Gaming y productividad sin concesiones. Requiere buena refrigeración.',
  }),
  cpu({
    id: 'intel-i3-12100f',
    name: 'Intel Core i3-12100F',
    brand: 'Intel',
    price: 161434,
    socket: 'LGA1700',
    cores: 4,
    threads: 8,
    boost: 4.3,
    tdp: 58,
    igpu: false,
    perf: 42,
    stockCooler: true,
  }),
  cpu({
    id: 'intel-i5-12400f',
    name: 'Intel Core i5-12400F',
    brand: 'Intel',
    price: 246564,
    socket: 'LGA1700',
    cores: 6,
    threads: 12,
    boost: 4.4,
    tdp: 65,
    igpu: false,
    perf: 55,
    stockCooler: true,
  }),
  cpu({
    id: 'intel-i5-12400',
    name: 'Intel Core i5-12400',
    brand: 'Intel',
    price: 304350,
    socket: 'LGA1700',
    cores: 6,
    threads: 12,
    boost: 4.4,
    tdp: 65,
    igpu: true,
    perf: 55,
    stockCooler: true,
    note: 'Con UHD 730: permite armar sin placa de video dedicada.',
  }),
  cpu({
    id: 'intel-i5-14400f',
    name: 'Intel Core i5-14400F',
    brand: 'Intel',
    price: 299936,
    socket: 'LGA1700',
    cores: 10,
    threads: 16,
    boost: 4.7,
    tdp: 65,
    igpu: false,
    perf: 63,
    stockCooler: true,
  }),
  cpu({
    id: 'intel-i5-14600kf',
    name: 'Intel Core i5-14600KF',
    brand: 'Intel',
    price: 423878,
    socket: 'LGA1700',
    cores: 14,
    threads: 20,
    boost: 5.3,
    tdp: 125,
    igpu: false,
    perf: 75,
    stockCooler: false,
  }),
  cpu({
    id: 'intel-i7-14700k',
    name: 'Intel Core i7-14700K',
    brand: 'Intel',
    price: 676540,
    socket: 'LGA1700',
    cores: 20,
    threads: 28,
    boost: 5.6,
    tdp: 125,
    igpu: true,
    perf: 88,
    stockCooler: false,
  }),
  cpu({
    id: 'intel-i9-14900k',
    name: 'Intel Core i9-14900K',
    brand: 'Intel',
    price: 908453,
    socket: 'LGA1700',
    cores: 24,
    threads: 32,
    boost: 6.0,
    tdp: 125,
    igpu: true,
    perf: 94,
    stockCooler: false,
    note: 'Consumo alto bajo carga: conviene AIO de 240 mm o más.',
  }),
  cpu({
    id: 'intel-ultra5-225f',
    name: 'Intel Core Ultra 5 225F',
    brand: 'Intel',
    price: 283510,
    socket: 'LGA1851',
    cores: 10,
    threads: 10,
    boost: 4.9,
    tdp: 65,
    igpu: false,
    perf: 65,
    stockCooler: true,
  }),
  cpu({
    id: 'intel-ultra5-245k',
    name: 'Intel Core Ultra 5 245K',
    brand: 'Intel',
    price: 370506,
    socket: 'LGA1851',
    cores: 14,
    threads: 14,
    boost: 5.2,
    tdp: 125,
    igpu: true,
    perf: 77,
    stockCooler: false,
  }),
  cpu({
    id: 'intel-ultra5-250k-plus',
    name: 'Intel Core Ultra 5 250K Plus',
    brand: 'Intel',
    price: 420056,
    socket: 'LGA1851',
    cores: 14,
    threads: 14,
    boost: 5.6,
    tdp: 125,
    igpu: true,
    perf: 80,
    stockCooler: false,
  }),
  cpu({
    id: 'intel-ultra7-265k',
    name: 'Intel Core Ultra 7 265K',
    brand: 'Intel',
    price: 601300,
    socket: 'LGA1851',
    cores: 20,
    threads: 20,
    boost: 5.5,
    tdp: 125,
    igpu: true,
    perf: 86,
    stockCooler: false,
  }),
  cpu({
    id: 'intel-ultra9-285k',
    name: 'Intel Core Ultra 9 285K',
    brand: 'Intel',
    price: 1089634,
    socket: 'LGA1851',
    cores: 24,
    threads: 24,
    boost: 5.7,
    tdp: 125,
    igpu: true,
    perf: 93,
    stockCooler: false,
    note: 'Tope de gama Intel para gaming y creación de contenido.',
  }),
]

/* ------------------------------------------------------------------ */
/* Motherboards                                                       */
/* ------------------------------------------------------------------ */

const MOBOS: Part[] = [
  mobo({
    id: 'asrock-a520m-hdv',
    name: 'ASRock A520M-HDV',
    brand: 'ASRock',
    price: 81407,
    socket: 'AM4',
    chipset: 'A520',
    ramType: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 3,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-a520m-k',
    name: 'ASUS Prime A520M-K',
    brand: 'ASUS',
    price: 87650,
    socket: 'AM4',
    chipset: 'A520',
    ramType: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 3,
    m2Slots: 1,
  }),
  mobo({
    id: 'msi-b550m-a-pro',
    name: 'MSI B550M-A Pro',
    brand: 'MSI',
    price: 125100,
    socket: 'AM4',
    chipset: 'B550',
    ramType: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-b550m-a-wifi',
    name: 'ASUS Prime B550M-A WiFi',
    brand: 'ASUS',
    price: 174250,
    socket: 'AM4',
    chipset: 'B550',
    ramType: 'DDR4',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 2,
  }),
  mobo({
    id: 'asus-tuf-b550m-plus',
    name: 'ASUS TUF B550M-Plus',
    brand: 'ASUS',
    price: 240550,
    socket: 'AM4',
    chipset: 'B550',
    ramType: 'DDR4',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 2,
  }),
  mobo({
    id: 'asrock-a620am-hvs',
    name: 'ASRock A620AM-HVS',
    brand: 'ASRock',
    price: 108283,
    socket: 'AM5',
    chipset: 'A620',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 1,
  }),
  mobo({
    id: 'msi-pro-b650m-b',
    name: 'MSI PRO B650M-B',
    brand: 'MSI',
    price: 129005,
    socket: 'AM5',
    chipset: 'B650',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-b650m-a-ii',
    name: 'ASUS Prime B650M-A II',
    brand: 'ASUS',
    price: 201150,
    socket: 'AM5',
    chipset: 'B650',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 2,
  }),
  mobo({
    id: 'asus-prime-b850m-a',
    name: 'ASUS Prime B850M-A',
    brand: 'ASUS',
    price: 255850,
    socket: 'AM5',
    chipset: 'B850',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 5,
    m2Slots: 2,
  }),
  mobo({
    id: 'asrock-b650-pro-rs-wifi',
    name: 'ASRock B650 Pro RS WiFi',
    brand: 'ASRock',
    price: 270024,
    socket: 'AM5',
    chipset: 'B650',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 4,
    m2Slots: 3,
  }),
  mobo({
    id: 'asus-prime-b850-plus',
    name: 'ASUS Prime B850-Plus',
    brand: 'ASUS',
    price: 328526,
    socket: 'AM5',
    chipset: 'B850',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 5,
    m2Slots: 3,
  }),
  mobo({
    id: 'asus-tuf-b650-plus-wifi',
    name: 'ASUS TUF B650-Plus WiFi',
    brand: 'ASUS',
    price: 368800,
    socket: 'AM5',
    chipset: 'B650',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 4,
    m2Slots: 3,
  }),
  mobo({
    id: 'asrock-h610m-hdv',
    name: 'ASRock H610M-HDV/M.2',
    brand: 'ASRock',
    price: 88983,
    socket: 'LGA1700',
    chipset: 'H610',
    ramType: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 3,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-b760m-k-d4',
    name: 'ASUS Prime B760M-K D4',
    brand: 'ASUS',
    price: 139716,
    socket: 'LGA1700',
    chipset: 'B760',
    ramType: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-b760m-a-d4',
    name: 'ASUS Prime B760M-A D4',
    brand: 'ASUS',
    price: 177250,
    socket: 'LGA1700',
    chipset: 'B760',
    ramType: 'DDR4',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 2,
  }),
  mobo({
    id: 'asus-tuf-z790-plus-wifi',
    name: 'ASUS TUF Gaming Z790-Plus WiFi',
    brand: 'ASUS',
    price: 536300,
    socket: 'LGA1700',
    chipset: 'Z790',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 4,
    m2Slots: 4,
  }),
  mobo({
    id: 'asus-prime-h810m-k',
    name: 'ASUS Prime H810M-K',
    brand: 'ASUS',
    price: 160750,
    socket: 'LGA1851',
    chipset: 'H810',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 1,
  }),
  mobo({
    id: 'asus-prime-b860m-a',
    name: 'ASUS Prime B860M-A',
    brand: 'ASUS',
    price: 230850,
    socket: 'LGA1851',
    chipset: 'B860',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'Micro-ATX',
    pcieGen: 4,
    m2Slots: 2,
  }),
  mobo({
    id: 'asrock-z890-pro-a',
    name: 'ASRock Z890 Pro-A',
    brand: 'ASRock',
    price: 324467,
    socket: 'LGA1851',
    chipset: 'Z890',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 5,
    m2Slots: 4,
  }),
  mobo({
    id: 'asus-prime-z890-p-wifi',
    name: 'ASUS Prime Z890-P WiFi',
    brand: 'ASUS',
    price: 407403,
    socket: 'LGA1851',
    chipset: 'Z890',
    ramType: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    pcieGen: 5,
    m2Slots: 4,
  }),
  mobo({
    id: 'asrock-b650i-lightning',
    name: 'ASRock B650I Lightning WiFi',
    brand: 'ASRock',
    price: 338933,
    socket: 'AM5',
    chipset: 'B650',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Mini-ITX',
    pcieGen: 4,
    m2Slots: 2,
    note: 'Formato Mini-ITX para gabinetes compactos. Solo 2 slots de RAM.',
  }),
  mobo({
    id: 'asrock-z790i-lightning',
    name: 'ASRock Z790I Lightning WiFi',
    brand: 'ASRock',
    price: 284348,
    socket: 'LGA1700',
    chipset: 'Z790',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Mini-ITX',
    pcieGen: 5,
    m2Slots: 2,
    note: 'Mini-ITX con overclock y PCIe 5.0. Ideal para el NR200P.',
  }),
  mobo({
    id: 'asrock-b860i-lightning',
    name: 'ASRock B860I Lightning WiFi',
    brand: 'ASRock',
    price: 383934,
    socket: 'LGA1851',
    chipset: 'B860',
    ramType: 'DDR5',
    ramSlots: 2,
    formFactor: 'Mini-ITX',
    pcieGen: 5,
    m2Slots: 2,
    note: 'Plataforma Intel Core Ultra en formato Mini-ITX.',
  }),
]

/* ------------------------------------------------------------------ */
/* RAM                                                                */
/* ------------------------------------------------------------------ */

const RAMS: Part[] = [
  ram({
    id: 'ddr4-8-3200',
    name: 'Team T-Force Vulcan 8 GB 3200',
    brand: 'Team',
    price: 129850,
    ramType: 'DDR4',
    capacityGb: 8,
    modules: 1,
    speed: 3200,
    latency: '16',
  }),
  ram({
    id: 'ddr4-16-3200',
    name: 'G.Skill Ripjaws V 16 GB 3200',
    brand: 'G.Skill',
    price: 221300,
    ramType: 'DDR4',
    capacityGb: 16,
    modules: 1,
    speed: 3200,
    latency: '16',
  }),
  ram({
    id: 'ddr4-16-3200-kit',
    name: 'G.Skill Ripjaws V 16 GB (2×8) 3200',
    brand: 'G.Skill',
    price: 238750,
    ramType: 'DDR4',
    capacityGb: 16,
    modules: 2,
    speed: 3200,
    latency: '16',
  }),
  ram({
    id: 'ddr4-16-3600-kit',
    name: 'Patriot Viper Steel 16 GB (2×8) 3600',
    brand: 'Patriot',
    price: 255850,
    ramType: 'DDR4',
    capacityGb: 16,
    modules: 2,
    speed: 3600,
    latency: '17',
  }),
  ram({
    id: 'ddr4-32-3200-kit',
    name: 'G.Skill Ripjaws V 32 GB (2×16) 3200',
    brand: 'G.Skill',
    price: 464500,
    ramType: 'DDR4',
    capacityGb: 32,
    modules: 2,
    speed: 3200,
    latency: '16',
  }),
  ram({
    id: 'ddr4-32-3600-kit',
    name: 'G.Skill Ripjaws V 32 GB (2×16) 3600',
    brand: 'G.Skill',
    price: 503300,
    ramType: 'DDR4',
    capacityGb: 32,
    modules: 2,
    speed: 3600,
    latency: '18',
  }),
  ram({
    id: 'ddr5-16-5600',
    name: 'Corsair Vengeance 16 GB 5600',
    brand: 'Corsair',
    price: 429400,
    ramType: 'DDR5',
    capacityGb: 16,
    modules: 1,
    speed: 5600,
    latency: '40',
  }),
  ram({
    id: 'ddr5-16-6000',
    name: 'KLEVV FIT V 16 GB 6000',
    brand: 'KLEVV',
    price: 471500,
    ramType: 'DDR5',
    capacityGb: 16,
    modules: 1,
    speed: 6000,
    latency: '30',
  }),
  ram({
    id: 'ddr5-16-6000-kit',
    name: 'KLEVV FIT V 16 GB (2×8) 6000',
    brand: 'KLEVV',
    price: 496600,
    ramType: 'DDR5',
    capacityGb: 16,
    modules: 2,
    speed: 6000,
    latency: '30',
  }),
  ram({
    id: 'ddr5-32-6000-kit',
    name: 'KLEVV FIT V 32 GB (2×16) 6000',
    brand: 'KLEVV',
    price: 882850,
    ramType: 'DDR5',
    capacityGb: 32,
    modules: 2,
    speed: 6000,
    latency: '30',
    note: 'Punto dulce para AM5 e Intel: 6000 MT/s con timings bajos.',
  }),
  ram({
    id: 'ddr5-32-6400-kit',
    name: 'Patriot Viper Venom 32 GB (2×16) 6400',
    brand: 'Patriot',
    price: 870600,
    ramType: 'DDR5',
    capacityGb: 32,
    modules: 2,
    speed: 6400,
    latency: '32',
  }),
  ram({
    id: 'ddr5-48-6000-kit',
    name: 'KLEVV Urbane V RGB 48 GB (2×24) 6000',
    brand: 'KLEVV',
    price: 1512550,
    ramType: 'DDR5',
    capacityGb: 48,
    modules: 2,
    speed: 6000,
    latency: '30',
    note: '48 GB es un buen equilibrio para edición, 3D y gaming exigente sin ir a 64 GB.',
  }),
  ram({
    id: 'ddr5-64-6000-kit',
    name: 'KLEVV BOLT V 64 GB (2×32) 6000',
    brand: 'KLEVV',
    price: 2170150,
    ramType: 'DDR5',
    capacityGb: 64,
    modules: 2,
    speed: 6000,
    latency: '30',
  }),
]

/* ------------------------------------------------------------------ */
/* GPUs                                                               */
/* ------------------------------------------------------------------ */

const GPUS: Part[] = [
  gpu({
    id: 'rtx-3050',
    name: 'NVIDIA GeForce RTX 3050 6 GB',
    brand: 'NVIDIA',
    price: 515600,
    chip: 'NVIDIA',
    vram: 6,
    gpuLength: 175,
    wattage: 70,
    perf: 20,
    note: 'Entrada al gaming 1080p con DLSS. La mayoría no necesita conector extra.',
  }),
  gpu({
    id: 'rtx-5050',
    name: 'NVIDIA GeForce RTX 5050 8 GB',
    brand: 'NVIDIA',
    price: 654100,
    chip: 'NVIDIA',
    vram: 8,
    gpuLength: 200,
    wattage: 130,
    perf: 27,
  }),
  gpu({
    id: 'rtx-5060',
    name: 'NVIDIA GeForce RTX 5060 8 GB',
    brand: 'NVIDIA',
    price: 888600,
    chip: 'NVIDIA',
    vram: 8,
    gpuLength: 245,
    wattage: 145,
    perf: 36,
  }),
  gpu({
    id: 'rtx-5060-ti',
    name: 'NVIDIA GeForce RTX 5060 Ti 8 GB',
    brand: 'NVIDIA',
    price: 938200,
    chip: 'NVIDIA',
    vram: 8,
    gpuLength: 245,
    wattage: 180,
    perf: 40,
  }),
  gpu({
    id: 'rtx-5060-ti-16',
    name: 'NVIDIA GeForce RTX 5060 Ti 16 GB',
    brand: 'NVIDIA',
    price: 1518900,
    chip: 'NVIDIA',
    vram: 16,
    gpuLength: 245,
    wattage: 180,
    perf: 44,
  }),
  gpu({
    id: 'rtx-5070',
    name: 'NVIDIA GeForce RTX 5070 12 GB',
    brand: 'NVIDIA',
    price: 1552850,
    chip: 'NVIDIA',
    vram: 12,
    gpuLength: 300,
    wattage: 250,
    perf: 55,
  }),
  gpu({
    id: 'rtx-5070-ti',
    name: 'NVIDIA GeForce RTX 5070 Ti 16 GB',
    brand: 'NVIDIA',
    price: 2392000,
    chip: 'NVIDIA',
    vram: 16,
    gpuLength: 300,
    wattage: 300,
    perf: 66,
  }),
  gpu({
    id: 'rtx-5080',
    name: 'NVIDIA GeForce RTX 5080 16 GB',
    brand: 'NVIDIA',
    price: 3307400,
    chip: 'NVIDIA',
    vram: 16,
    gpuLength: 330,
    wattage: 360,
    perf: 80,
    note: 'Gama entusiasta para 4K. Necesita fuente de 850 W o más.',
  }),
  gpu({
    id: 'rx-7600',
    name: 'AMD Radeon RX 7600 8 GB',
    brand: 'AMD',
    price: 544900,
    chip: 'AMD',
    vram: 8,
    gpuLength: 204,
    wattage: 165,
    perf: 34,
  }),
  gpu({
    id: 'rx-9060',
    name: 'AMD Radeon RX 9060 8 GB',
    brand: 'AMD',
    price: 694990,
    chip: 'AMD',
    vram: 8,
    gpuLength: 220,
    wattage: 150,
    perf: 38,
  }),
  gpu({
    id: 'rx-9060-xt',
    name: 'AMD Radeon RX 9060 XT 16 GB',
    brand: 'AMD',
    price: 999990,
    chip: 'AMD',
    vram: 16,
    gpuLength: 267,
    wattage: 160,
    perf: 46,
    note: 'Excelente relación precio/VRAM para 1440p.',
  }),
  gpu({
    id: 'rx-9070-gre',
    name: 'AMD Radeon RX 9070 GRE 12 GB',
    brand: 'AMD',
    price: 1149900,
    chip: 'AMD',
    vram: 12,
    gpuLength: 300,
    wattage: 220,
    perf: 52,
    note: 'Punto intermedio de RDNA 4: 12 GB para 1440p con buen margen.',
  }),
  gpu({
    id: 'rx-9070',
    name: 'AMD Radeon RX 9070 16 GB',
    brand: 'AMD',
    price: 1329900,
    chip: 'AMD',
    vram: 16,
    gpuLength: 300,
    wattage: 220,
    perf: 58,
  }),
  gpu({
    id: 'rx-9070-xt',
    name: 'AMD Radeon RX 9070 XT 16 GB',
    brand: 'AMD',
    price: 1596950,
    chip: 'AMD',
    vram: 16,
    gpuLength: 330,
    wattage: 304,
    perf: 66,
  }),
  gpu({
    id: 'arc-b570',
    name: 'Intel Arc B570 10 GB',
    brand: 'Intel',
    price: 555850,
    chip: 'Intel',
    vram: 10,
    gpuLength: 250,
    wattage: 150,
    perf: 34,
  }),
  gpu({
    id: 'arc-b580',
    name: 'Intel Arc B580 12 GB',
    brand: 'Intel',
    price: 678350,
    chip: 'Intel',
    vram: 12,
    gpuLength: 272,
    wattage: 190,
    perf: 40,
    note: 'Rinde mejor en DX12 y con ReBAR activado.',
  }),
]

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */

const STORAGE: Part[] = [
  storage({
    id: 'sata-480',
    name: 'Kingston A400 480 GB SATA',
    brand: 'Kingston',
    price: 136750,
    capacity: '480 GB',
    storageType: 'SSD',
    interface: 'SATA III',
    readSpeed: 500,
  }),
  storage({
    id: 'sata-960',
    name: 'Kingston A400 960 GB SATA',
    brand: 'Kingston',
    price: 237300,
    capacity: '960 GB',
    storageType: 'SSD',
    interface: 'SATA III',
    readSpeed: 500,
  }),
  storage({
    id: 'sata-1tb',
    name: 'SanDisk Plus 1 TB SATA',
    brand: 'SanDisk',
    price: 242350,
    capacity: '1 TB',
    storageType: 'SSD',
    interface: 'SATA III',
    readSpeed: 545,
  }),
  storage({
    id: 'nvme-500',
    name: 'Kingston NV3 500 GB NVMe',
    brand: 'Kingston',
    price: 180550,
    capacity: '500 GB',
    storageType: 'SSD',
    interface: 'NVMe PCIe 4.0',
    readSpeed: 5000,
  }),
  storage({
    id: 'nvme-1tb',
    name: 'Kingston NV3 1 TB NVMe',
    brand: 'Kingston',
    price: 291850,
    capacity: '1 TB',
    storageType: 'SSD',
    interface: 'NVMe PCIe 4.0',
    readSpeed: 6000,
  }),
  storage({
    id: 'nvme-2tb',
    name: 'Kingston NV3 2 TB NVMe',
    brand: 'Kingston',
    price: 516600,
    capacity: '2 TB',
    storageType: 'SSD',
    interface: 'NVMe PCIe 4.0',
    readSpeed: 6000,
  }),
  storage({
    id: 'nvme-4tb',
    name: 'Kingston NV3 4 TB NVMe',
    brand: 'Kingston',
    price: 965850,
    capacity: '4 TB',
    storageType: 'SSD',
    interface: 'NVMe PCIe 4.0',
    readSpeed: 6000,
  }),
  storage({
    id: 'hdd-2tb',
    name: 'WD Purple 2 TB',
    brand: 'Western Digital',
    price: 321350,
    capacity: '2 TB',
    storageType: 'HDD',
    interface: 'SATA III',
    readSpeed: 190,
    note: 'Disco de vigilancia: sirve para almacenamiento masivo, no como disco principal.',
  }),
  storage({
    id: 'hdd-4tb',
    name: 'WD Purple 4 TB',
    brand: 'Western Digital',
    price: 391250,
    capacity: '4 TB',
    storageType: 'HDD',
    interface: 'SATA III',
    readSpeed: 190,
  }),
]

/* ------------------------------------------------------------------ */
/* PSUs                                                               */
/* ------------------------------------------------------------------ */

const PSUS: Part[] = [
  psu({
    id: 'antec-650-bronze',
    name: 'Antec CSK650 650 W',
    brand: 'Antec',
    price: 74252,
    wattage: 650,
    efficiency: '80+ Bronze',
    modular: 'No modular',
  }),
  psu({
    id: 'antec-750-bronze',
    name: 'Antec CSK750 750 W',
    brand: 'Antec',
    price: 77750,
    wattage: 750,
    efficiency: '80+ Bronze',
    modular: 'No modular',
  }),
  psu({
    id: 'antec-1000-plat',
    name: 'Antec HCG1000 Pro 1000 W',
    brand: 'Antec',
    price: 332050,
    wattage: 1000,
    efficiency: '80+ Platinum',
    modular: 'Full modular',
  }),
  psu({
    id: 'asrock-750-gold',
    name: 'ASRock Steel Legend 750 W',
    brand: 'ASRock',
    price: 131250,
    wattage: 750,
    efficiency: '80+ Gold',
    modular: 'Full modular',
  }),
  psu({
    id: 'asrock-850-gold',
    name: 'ASRock Steel Legend 850 W',
    brand: 'ASRock',
    price: 159550,
    wattage: 850,
    efficiency: '80+ Gold',
    modular: 'Full modular',
  }),
  psu({
    id: 'asrock-1000-gold',
    name: 'ASRock Steel Legend 1000 W',
    brand: 'ASRock',
    price: 201950,
    wattage: 1000,
    efficiency: '80+ Gold',
    modular: 'Full modular',
  }),
  psu({
    id: 'cm-1050-gold',
    name: 'Cooler Master GX3 1050 W',
    brand: 'Cooler Master',
    price: 247000,
    wattage: 1050,
    efficiency: '80+ Gold',
    modular: 'Full modular',
  }),
  psu({
    id: 'asus-1200-gold',
    name: 'ASUS TUF Gaming 1200 W',
    brand: 'ASUS',
    price: 313050,
    wattage: 1200,
    efficiency: '80+ Gold',
    modular: 'Full modular',
  }),
  psu({
    id: 'antec-sf850x',
    name: 'Antec SF850X 850 W SFX',
    brand: 'Antec',
    price: 272950,
    wattage: 850,
    efficiency: '80+ Gold',
    modular: 'Full modular',
    psuForm: 'SFX',
    note: 'Formato SFX para gabinetes compactos como el NR200P.',
  }),
  psu({
    id: 'corsair-sf850',
    name: 'Corsair SF850 850 W SFX',
    brand: 'Corsair',
    price: 334900,
    wattage: 850,
    efficiency: '80+ Platinum',
    modular: 'Full modular',
    psuForm: 'SFX',
    note: 'SFX de gama alta, eficiencia Platinum y cables flexibles.',
  }),
]

/* ------------------------------------------------------------------ */
/* Cases                                                              */
/* ------------------------------------------------------------------ */

const CASES: Part[] = [
  pcCase({
    id: 'cm-nr200p',
    name: 'Cooler Master NR200P Mini-ITX',
    brand: 'Cooler Master',
    price: 60600,
    supportedFormFactors: ['Mini-ITX'],
    maxGpuLength: 330,
    maxCoolerHeight: 155,
    radiatorSupport: [240, 280],
    psuFormSupport: 'SFX',
    note: 'Compacto: requiere mother Mini-ITX y fuente SFX (hay dos opciones SFX en el catálogo).',
  }),
  pcCase({
    id: 'antec-vx310',
    name: 'Antec VX310 RGB',
    brand: 'Antec',
    price: 65400,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 330,
    maxCoolerHeight: 165,
    radiatorSupport: [240],
  }),
  pcCase({
    id: 'xyz-airone-70',
    name: 'XYZ Airone 70 Mesh ARGB',
    brand: 'XYZ',
    price: 65550,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 360,
    maxCoolerHeight: 165,
    radiatorSupport: [240, 360],
  }),
  pcCase({
    id: 'asus-a21',
    name: 'ASUS A21 Mesh',
    brand: 'ASUS',
    price: 85500,
    supportedFormFactors: ['Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 380,
    maxCoolerHeight: 165,
    radiatorSupport: [240, 280, 360],
  }),
  pcCase({
    id: 'bequiet-501',
    name: 'Be Quiet! Pure Base 501 Airflow',
    brand: 'Be Quiet!',
    price: 140520,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 368,
    maxCoolerHeight: 178,
    radiatorSupport: [240, 280, 360],
  }),
  pcCase({
    id: 'antec-flux',
    name: 'Antec Flux Mesh ARGB',
    brand: 'Antec',
    price: 158200,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 400,
    maxCoolerHeight: 180,
    radiatorSupport: [240, 280, 360],
  }),
  pcCase({
    id: 'hyte-y70',
    name: 'HYTE Y70 Vidrio Templado',
    brand: 'HYTE',
    price: 349000,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 422,
    maxCoolerHeight: 180,
    radiatorSupport: [240, 280, 360],
  }),
  pcCase({
    id: 'bequiet-900fx',
    name: 'Be Quiet! Light Base 900FX',
    brand: 'Be Quiet!',
    price: 371360,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 435,
    maxCoolerHeight: 190,
    radiatorSupport: [240, 280, 360],
  }),
  pcCase({
    id: 'rog-hyperion',
    name: 'ASUS ROG Hyperion GR701',
    brand: 'ASUS',
    price: 765450,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLength: 460,
    maxCoolerHeight: 190,
    radiatorSupport: [240, 360],
  }),
]

/* ------------------------------------------------------------------ */
/* Coolers                                                            */
/* ------------------------------------------------------------------ */

const COOLERS: Part[] = [
  cooler({
    id: 'stock-amd',
    name: 'AMD Wraith Stealth (incluido)',
    brand: 'AMD',
    price: 0,
    coolerType: 'air',
    coolerTdp: 95,
    coolerHeight: 54,
    supportedSockets: ['AM4', 'AM5'],
    included: true,
    note: 'Viene con los Ryzen de 65 W. Precio $0 porque está incluido.',
  }),
  cooler({
    id: 'stock-intel',
    name: 'Intel Laminar RM1 (incluido)',
    brand: 'Intel',
    price: 0,
    coolerType: 'air',
    coolerTdp: 85,
    coolerHeight: 47,
    supportedSockets: ['LGA1700', 'LGA1851'],
    included: true,
    note: 'Incluido en CPUs Intel sin "K". Precio $0.',
  }),
  cooler({
    id: 'antec-a35',
    name: 'Antec A35 FRGB',
    brand: 'Antec',
    price: 12350,
    coolerType: 'air',
    coolerTdp: 95,
    coolerHeight: 150,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'id-se214xt',
    name: 'ID-Cooling SE-214-XT ARGB',
    brand: 'ID-Cooling',
    price: 41650,
    coolerType: 'air',
    coolerTdp: 160,
    coolerHeight: 150,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'id-frozn-a410',
    name: 'ID-Cooling FROZN A410',
    brand: 'ID-Cooling',
    price: 50350,
    coolerType: 'air',
    coolerTdp: 200,
    coolerHeight: 155,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'id-frozn-a620',
    name: 'ID-Cooling FROZN A620 Pro SE',
    brand: 'ID-Cooling',
    price: 90550,
    coolerType: 'air',
    coolerTdp: 250,
    coolerHeight: 157,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'antec-luna-360',
    name: 'Antec Luna 360 ARGB',
    brand: 'Antec',
    price: 100900,
    coolerType: 'aio',
    coolerTdp: 300,
    radiator: 360,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'corsair-titan-240',
    name: 'Corsair iCUE Titan 240 RX',
    brand: 'Corsair',
    price: 104250,
    coolerType: 'aio',
    coolerTdp: 250,
    radiator: 240,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
  cooler({
    id: 'deepcool-le720',
    name: 'DeepCool LE720 360 ARGB',
    brand: 'DeepCool',
    price: 119400,
    coolerType: 'aio',
    coolerTdp: 300,
    radiator: 360,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  }),
]

/* ------------------------------------------------------------------ */
/* Monitors                                                           */
/* ------------------------------------------------------------------ */

const MONITORS: Part[] = [
  monitor({
    id: 'mon-24-fhd-180',
    name: 'KTC 24GR680 24" FHD 180 Hz',
    brand: 'KTC',
    price: 208750,
    sizeIn: 24,
    resolution: '1920×1080',
    refresh: 180,
    panel: 'IPS',
  }),
  monitor({
    id: 'mon-27-fhd-180',
    name: 'ASRock Phantom 27" FHD 180 Hz',
    brand: 'ASRock',
    price: 235219,
    sizeIn: 27,
    resolution: '1920×1080',
    refresh: 180,
    panel: 'IPS',
  }),
  monitor({
    id: 'mon-27-qhd-144',
    name: 'KTC 27DQ721 27" QHD 144 Hz',
    brand: 'KTC',
    price: 270850,
    sizeIn: 27,
    resolution: '2560×1440',
    refresh: 144,
    panel: 'HVA',
  }),
  monitor({
    id: 'mon-27-qhd-180',
    name: 'Samsung Odyssey G5 27" QHD 180 Hz',
    brand: 'Samsung',
    price: 417200,
    sizeIn: 27,
    resolution: '2560×1440',
    refresh: 180,
    panel: 'IPS',
    note: 'El equilibrio ideal para builds de gama media y alta.',
  }),
  monitor({
    id: 'mon-32-qhd-170',
    name: 'ASUS TUF VG32AQA1A 32" QHD 170 Hz',
    brand: 'ASUS',
    price: 583500,
    sizeIn: 32,
    resolution: '2560×1440',
    refresh: 170,
    panel: 'VA',
  }),
  monitor({
    id: 'mon-27-4k-144',
    name: 'ViewSonic VX2730D 27" 4K 144 Hz',
    brand: 'ViewSonic',
    price: 702100,
    sizeIn: 27,
    resolution: '3840×2160',
    refresh: 144,
    panel: 'IPS',
  }),
  monitor({
    id: 'mon-34-uwqhd-200',
    name: 'Acer Nitro ED340CUR 34" UWQHD 200 Hz',
    brand: 'Acer',
    price: 775450,
    sizeIn: 34,
    resolution: '3440×1440',
    refresh: 200,
    panel: 'VA curvo',
  }),
]

/* ------------------------------------------------------------------ */
/* Peripherals & extras                                               */
/* ------------------------------------------------------------------ */

const PERIPHERALS: Part[] = [
  peripheral({
    id: 'kb-k509',
    category: 'keyboard',
    name: 'Redragon K509 Dyaus',
    brand: 'Redragon',
    price: 31200,
    specLabel: 'Tipo',
    specValue: 'Membrana · full size',
    highlights: ['Membrana', 'Full size', 'RGB'],
  }),
  peripheral({
    id: 'kb-k617',
    category: 'keyboard',
    name: 'Redragon K617 Fizz 60%',
    brand: 'Redragon',
    price: 41850,
    specLabel: 'Tipo',
    specValue: 'Mecánico · 60%',
    highlights: ['Mecánico', '60%', 'RGB'],
  }),
  peripheral({
    id: 'kb-k552',
    category: 'keyboard',
    name: 'Redragon Kumara K552 TKL',
    brand: 'Redragon',
    price: 47450,
    specLabel: 'Tipo',
    specValue: 'Mecánico · TKL',
    highlights: ['Mecánico', 'TKL', 'Switch red'],
  }),
  peripheral({
    id: 'kb-alloy-origins',
    category: 'keyboard',
    name: 'HyperX Alloy Origins Core',
    brand: 'HyperX',
    price: 108135,
    specLabel: 'Tipo',
    specValue: 'Mecánico · TKL',
    highlights: ['Mecánico', 'TKL', 'Aluminio'],
  }),
  peripheral({
    id: 'kb-k70-core',
    category: 'keyboard',
    name: 'Corsair K70 Core RGB',
    brand: 'Corsair',
    price: 138350,
    specLabel: 'Tipo',
    specValue: 'Mecánico · full size',
    highlights: ['Mecánico', 'Full size', 'iCUE'],
  }),
  peripheral({
    id: 'mouse-m170',
    category: 'mouse',
    name: 'Logitech M170 inalámbrico',
    brand: 'Logitech',
    price: 11050,
    specLabel: 'Sensor',
    specValue: 'Óptico 1000 DPI',
    highlights: ['Inalámbrico', '1000 DPI', 'Básico'],
  }),
  peripheral({
    id: 'mouse-deathadder',
    category: 'mouse',
    name: 'Razer DeathAdder Essential',
    brand: 'Razer',
    price: 30400,
    specLabel: 'Sensor',
    specValue: 'Óptico 6400 DPI',
    highlights: ['6400 DPI', 'Cableado', 'Ergonómico'],
  }),
  peripheral({
    id: 'mouse-g305',
    category: 'mouse',
    name: 'Logitech G305 Lightspeed',
    brand: 'Logitech',
    price: 46950,
    specLabel: 'Sensor',
    specValue: 'Hero 12K DPI',
    highlights: ['Inalámbrico', '12000 DPI', '250 h'],
  }),
  peripheral({
    id: 'mouse-g502',
    category: 'mouse',
    name: 'Logitech G502 Hero',
    brand: 'Logitech',
    price: 72700,
    specLabel: 'Sensor',
    specValue: 'Hero 25K DPI',
    highlights: ['25600 DPI', '11 botones', 'RGB'],
  }),
  peripheral({
    id: 'mouse-superlight',
    category: 'mouse',
    name: 'Logitech G Pro X Superlight 2',
    brand: 'Logitech',
    price: 156400,
    specLabel: 'Sensor',
    specValue: 'Hero 2 · 44K DPI',
    highlights: ['Inalámbrico', '60 g', '44000 DPI'],
  }),
  peripheral({
    id: 'headset-h120',
    category: 'headset',
    name: 'Redragon Ares H120',
    brand: 'Redragon',
    price: 26250,
    specLabel: 'Conexión',
    specValue: 'USB / 3.5 mm',
    highlights: ['Estéreo', 'Micrófono', 'Económico'],
  }),
  peripheral({
    id: 'headset-h320',
    category: 'headset',
    name: 'Redragon Lamia H320 7.1',
    brand: 'Redragon',
    price: 65650,
    specLabel: 'Conexión',
    specValue: 'USB',
    highlights: ['7.1 virtual', 'RGB', 'Micrófono'],
  }),
  peripheral({
    id: 'headset-stinger2',
    category: 'headset',
    name: 'HyperX Cloud Stinger 2',
    brand: 'HyperX',
    price: 85770,
    specLabel: 'Conexión',
    specValue: '3.5 mm',
    highlights: ['Estéreo', 'Liviano', 'Micrófono'],
  }),
  peripheral({
    id: 'headset-stinger-wireless',
    category: 'headset',
    name: 'HyperX Cloud Stinger Core Wireless',
    brand: 'HyperX',
    price: 103982,
    specLabel: 'Conexión',
    specValue: '2.4 GHz',
    highlights: ['Inalámbrico', '17 h', 'PC/PS'],
  }),
  peripheral({
    id: 'headset-nova7',
    category: 'headset',
    name: 'SteelSeries Arctis Nova 7 Gen 2',
    brand: 'SteelSeries',
    price: 384950,
    specLabel: 'Conexión',
    specValue: '2.4 GHz + Bluetooth',
    highlights: ['Inalámbrico', '50 h', 'ANC'],
  }),
  peripheral({
    id: 'extra-win11',
    category: 'extra',
    name: 'Windows 11 Home (licencia)',
    brand: 'Microsoft',
    price: 199000,
    specLabel: 'Tipo',
    specValue: 'Licencia digital',
    highlights: ['Sistema operativo', 'Home'],
    note: 'Precio de referencia. También podés usar Windows sin licencia o Linux.',
  }),
  peripheral({
    id: 'extra-ups-800',
    category: 'extra',
    name: 'UPS Lyonn CTB 800 VA',
    brand: 'Lyonn',
    price: 98300,
    specLabel: 'Potencia',
    specValue: '800 VA',
    highlights: ['800 VA', 'Estabilizador', 'LCD'],
  }),
  peripheral({
    id: 'extra-ups-1500',
    category: 'extra',
    name: 'UPS Lyonn CTB 1500 VA',
    brand: 'Lyonn',
    price: 280300,
    specLabel: 'Potencia',
    specValue: '1500 VA',
    highlights: ['1500 VA', 'Estabilizador', 'LCD'],
  }),
  peripheral({
    id: 'extra-fans',
    category: 'extra',
    name: 'Pack 3× fan 120 mm ARGB',
    brand: 'ID-Cooling',
    price: 51150,
    specLabel: 'Contenido',
    specValue: '3 fans PWM',
    highlights: ['3× 120 mm', 'ARGB', 'PWM'],
  }),
  peripheral({
    id: 'extra-paste',
    category: 'extra',
    name: 'Pasta térmica ID-Cooling Frost X25',
    brand: 'ID-Cooling',
    price: 7650,
    specLabel: 'Cantidad',
    specValue: '4 g',
    highlights: ['4 g', 'Alta conductividad'],
  }),
  peripheral({
    id: 'extra-webcam',
    category: 'extra',
    name: 'Webcam Redragon GW800 1080p',
    brand: 'Redragon',
    price: 68700,
    specLabel: 'Resolución',
    specValue: '1080p 30 fps',
    highlights: ['1080p', 'Micrófono', 'USB'],
  }),
  peripheral({
    id: 'extra-mousepad',
    category: 'extra',
    name: 'Mouse pad Redragon Flick L',
    brand: 'Redragon',
    price: 16150,
    specLabel: 'Medidas',
    specValue: '400×450 mm',
    highlights: ['400×450 mm', 'Antideslizante'],
  }),
  peripheral({
    id: 'extra-wifi',
    category: 'extra',
    name: 'Placa WiFi TP-Link Archer T4E',
    brand: 'TP-Link',
    price: 35700,
    specLabel: 'Estándar',
    specValue: 'WiFi 5 AC1200',
    highlights: ['WiFi 5', 'PCIe', 'Antena externa'],
  }),
  peripheral({
    id: 'extra-speakers',
    category: 'extra',
    name: 'Barra Redragon GS570 Darknet',
    brand: 'Redragon',
    price: 52500,
    specLabel: 'Tipo',
    specValue: 'Barra 2.0 RGB',
    highlights: ['2.0', 'RGB', 'USB'],
  }),
  peripheral({
    id: 'extra-chair',
    category: 'extra',
    name: 'Silla gamer XPG Nexus',
    brand: 'XPG',
    price: 318050,
    specLabel: 'Tipo',
    specValue: 'Silla ergonómica 2D',
    highlights: ['Reclinable', '2D', '125 kg'],
  }),
]

export const PARTS: Part[] = [
  ...CPUS,
  ...MOBOS,
  ...RAMS,
  ...GPUS,
  ...STORAGE,
  ...PSUS,
  ...CASES,
  ...COOLERS,
  ...MONITORS,
  ...PERIPHERALS,
]

export const PART_BY_ID: Record<string, Part> = Object.fromEntries(
  PARTS.map((part) => [part.id, part]),
)

export const PARTS_BY_CATEGORY = PARTS.reduce<Record<Category, Part[]>>(
  (acc, part) => {
    acc[part.category] = [...(acc[part.category] ?? []), part]
    return acc
  },
  {} as Record<Category, Part[]>,
)

export const BRANDS = Array.from(new Set(PARTS.map((p) => p.brand))).sort((a, b) =>
  a.localeCompare(b),
)

export function getPart(id: string | undefined): Part | undefined {
  return id ? PART_BY_ID[id] : undefined
}
