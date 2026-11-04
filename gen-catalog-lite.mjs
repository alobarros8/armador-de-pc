// Genera api/catalog-lite.ts a partir del catálogo curado y de las piezas
// importadas de Compra Gamer. El archivo liviano se usa en el edge para
// decodificar builds compartidas sin cargar todo el catálogo de la app.
import { readFile, writeFile } from 'node:fs/promises'

const CATALOG_SOURCE_PATH = 'src/data/catalog.ts'
const CG_CATALOG_PATH = 'src/data/catalog-cg.json'
const PRICES_PATH = 'src/data/prices.json'
const OUTPUT_PATH = 'api/catalog-lite.ts'

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

const BUILDER_CATEGORIES = {
  cpu: 'cpu',
  mobo: 'motherboard',
  ram: 'ram',
  gpu: 'gpu',
  storage: 'storage',
  psu: 'psu',
  pcCase: 'case',
  cooler: 'cooler',
  monitor: 'monitor',
  peripheral: null,
}

const catalogSource = await readFile(CATALOG_SOURCE_PATH, 'utf8')
const cgCatalog = JSON.parse(await readFile(CG_CATALOG_PATH, 'utf8'))
const prices = JSON.parse(await readFile(PRICES_PATH, 'utf8')).prices ?? {}

const entries = new Map()

// Cada entrada curada empieza con "  builder({" y termina con "  }),".
const blockRe = /^ {2}([A-Za-z]+)\(\{\n([\s\S]*?)^ {2}\}\),?$/gm
let match
while ((match = blockRe.exec(catalogSource))) {
  const builder = match[1]
  if (!(builder in BUILDER_CATEGORIES)) continue

  const body = match[2]
  const id = body.match(/\bid:\s*'([^']+)'/)?.[1]
  const name = body.match(/\bname:\s*'([^']+)'/)?.[1]
  const price = body.match(/\bprice:\s*(\d+)/)?.[1]
  const category =
    BUILDER_CATEGORIES[builder] ?? body.match(/\bcategory:\s*'([a-z-]+)'/)?.[1]

  if (!id || !name || !price || !category) continue
  entries.set(id, { id, name, price: Number(price), category })
}

// Suma las piezas generadas desde el feed público de Compra Gamer.
for (const part of cgCatalog) {
  if (!part?.id || !part.name || typeof part.price !== 'number') continue
  if (!CATEGORY_ORDER.includes(part.category)) continue
  entries.set(part.id, {
    id: part.id,
    name: part.name,
    price: part.price,
    category: part.category,
  })
}

// Aplica los precios vigentes, igual que hace catalog.ts con applyPrice().
for (const entry of entries.values()) {
  const price = prices[entry.id]
  if (typeof price === 'number') entry.price = price
}

const categories = CATEGORY_ORDER.filter((category) =>
  [...entries.values()].some((entry) => entry.category === category),
)

const ordered = [...entries.values()].sort((a, b) => {
  const categoryDiff =
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  return categoryDiff !== 0 ? categoryDiff : a.name.localeCompare(b.name, 'es')
})

let out = 'export interface LitePart {\n  id: string\n  name: string\n  price: number\n  category: string\n}\n\n'
out += `export const LITE_CATEGORIES = ${JSON.stringify(categories)} as const\n\n`
out += 'export type LiteCategory = (typeof LITE_CATEGORIES)[number]\n\n'
out += 'export const LITE_CATALOG = new Map<string, LitePart>([\n'
for (const entry of ordered) {
  out += `  [${JSON.stringify(entry.id)}, { id: ${JSON.stringify(entry.id)}, name: ${JSON.stringify(entry.name)}, price: ${entry.price}, category: ${JSON.stringify(entry.category)} }],\n`
}
out += '])\n\n'
out += 'export function getLitePart(id: string): LitePart | undefined {\n'
out += '  return LITE_CATALOG.get(id)\n'
out += '}\n\n'
out += 'export const getPart = getLitePart\n'

await writeFile(OUTPUT_PATH, out)
console.log(`entries: ${ordered.length} -> ${OUTPUT_PATH}`)
