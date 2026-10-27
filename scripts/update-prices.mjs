// Actualiza src/data/prices.json con precios vigentes de Compra Gamer.
// Uso: node scripts/update-prices.mjs [--dry-run]
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PART_IMAGES_PATH = resolve(ROOT, 'data', 'part-images.json')
const PRICES_PATH = resolve(ROOT, 'src', 'data', 'prices.json')
const CG_PRODUCTOS_URL = 'https://static.compragamer.com/productos'
const USER_AGENT = 'ArmadorDePC-PriceUpdater/1.0 (+https://github.com/armador-de-pc)'
const TIMEOUT_MS = 30000
const MAX_RETRIES = 3
const VARIATION_LIMIT = 0.4
const MIN_COVERAGE = 0.8

const dryRun = process.argv.includes('--dry-run')

async function fetchWithRetry(url) {
  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (error) {
      clearTimeout(timer)
      lastError = error
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
  }
  throw lastError
}

async function main() {
  const partImages = JSON.parse(await readFile(PART_IMAGES_PATH, 'utf8'))
  const mapping = partImages.images ?? {}
  const mappedIds = Object.keys(mapping)

  const currentPrices = JSON.parse(await readFile(PRICES_PATH, 'utf8'))
  const prices = { ...(currentPrices.prices ?? {}) }

  console.log(`Piezas mapeadas: ${mappedIds.length}`)

  // Pausa identificable antes de la descarga.
  await new Promise((r) => setTimeout(r, 500))

  const response = await fetchWithRetry(CG_PRODUCTOS_URL)
  const products = await response.json()
  if (!Array.isArray(products)) throw new Error('La descarga no devolvió un array')

  const byId = new Map(products.map((p) => [p.id_producto, p]))

  const updated = []
  const skippedExcessive = []
  const notFound = []
  const noStock = []
  const invalidPrice = []
  let validCount = 0

  for (const partId of mappedIds) {
    const cgId = mapping[partId].cgId
    const product = byId.get(cgId)

    if (!product) {
      notFound.push(partId)
      continue
    }

    const stock = Number(product.stock ?? 0)
    const priceRaw = product.precioLista
    const price = Number(priceRaw)

    if (stock <= 0) {
      noStock.push(partId)
      continue
    }
    if (!Number.isFinite(price) || price <= 0) {
      invalidPrice.push(partId)
      continue
    }

    validCount++
    const oldPrice = prices[partId]
    if (typeof oldPrice === 'number' && oldPrice > 0) {
      const variation = Math.abs(price - oldPrice) / oldPrice
      if (variation > VARIATION_LIMIT) {
        skippedExcessive.push({ partId, oldPrice, newPrice: price, variation })
        continue
      }
    }

    if (price !== oldPrice) {
      updated.push({ partId, oldPrice, newPrice: price })
    }
    prices[partId] = price
  }

  const coverage = validCount / mappedIds.length
  if (coverage < MIN_COVERAGE) {
    throw new Error(
      `Descarga incompleta: solo ${validCount}/${mappedIds.length} piezas válidas (${(coverage * 100).toFixed(1)}%). No se escribe nada.`,
    )
  }

  console.log(`\nActualizadas: ${updated.length}`)
  console.log(`Sin cambios de valor: ${mappedIds.length - updated.length - skippedExcessive.length - notFound.length - noStock.length - invalidPrice.length}`)
  console.log(`Variación excesiva (no aplicadas): ${skippedExcessive.length}`)
  console.log(`No encontradas: ${notFound.length}`)
  console.log(`Sin stock: ${noStock.length}`)
  console.log(`Precio inválido: ${invalidPrice.length}`)

  if (skippedExcessive.length) {
    console.log('\nVariaciones excesivas (revisión humana):')
    for (const s of skippedExcessive) {
      console.log(`  ${s.partId}: ${s.oldPrice} -> ${s.newPrice} (${(s.variation * 100).toFixed(1)}%)`)
    }
  }
  if (notFound.length) console.log('\nNo encontradas:', notFound.join(', '))
  if (noStock.length) console.log('\nSin stock:', noStock.join(', '))
  if (invalidPrice.length) console.log('\nPrecio inválido:', invalidPrice.join(', '))

  const topVariations = [...updated]
    .map((u) => ({ ...u, variation: Math.abs((u.newPrice - (u.oldPrice ?? u.newPrice)) / (u.oldPrice || 1)) }))
    .sort((a, b) => b.variation - a.variation)
    .slice(0, 10)

  if (topVariations.length) {
    console.log('\n10 mayores variaciones:')
    for (const v of topVariations) {
      console.log(`  ${v.partId}: ${v.oldPrice ?? '-'} -> ${v.newPrice} (${(v.variation * 100).toFixed(1)}%)`)
    }
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribió ningún archivo.')
    return
  }

  const output = {
    updatedAt: new Date().toISOString(),
    prices,
  }
  await writeFile(PRICES_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`\nEscrito ${PRICES_PATH}`)
}

main().catch((error) => {
  console.error('Error:', error?.message ?? error)
  process.exit(1)
})