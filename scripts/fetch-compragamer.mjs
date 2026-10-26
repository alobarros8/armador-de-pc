// Descarga el catálogo público de Compra Gamer para usar como referencia de precios.
// Uso: node scripts/fetch-compragamer.mjs
import { mkdir, writeFile } from 'node:fs/promises'

const URLS = {
  productos: 'https://static.compragamer.com/productos',
  filtros: 'https://static.compragamer.com/productos_caracteristicas_filtro',
  incompatibles: 'https://static.compragamer.com/productosIncompatibles',
}

await mkdir('data', { recursive: true })

for (const [name, url] of Object.entries(URLS)) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
  const json = await response.json()
  await writeFile(`data/cg-${name}.json`, JSON.stringify(json))
  console.log(`${name}: ${Array.isArray(json) ? json.length : '?'} registros`)
}
