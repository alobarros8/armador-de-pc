// Descarga las fotos de referencia de cada componente del catálogo.
// Las imágenes quedan en public/parts/<id>.jpg y la fuente en data/part-images.json.
// Las 146 fotos de Compra Gamer se bajan del CDN; las 3 oficiales de AMD, Intel y
// Microsoft ya vienen procesadas en el repo y solo se verifican.
// Uso: node scripts/fetch-part-images.mjs [--force]
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = 'https://imagenes.compragamer.com/productos/compragamer_Imganen_general_'
const force = process.argv.includes('--force')
const manifest = JSON.parse(await readFile('data/part-images.json', 'utf8'))
const entries = Object.entries(manifest.images)
const outDir = join('public', 'parts')

await mkdir(outDir, { recursive: true })

let downloaded = 0
let skipped = 0
let official = 0
const failed = []

for (const [partId, entry] of entries) {
  const dest = join(outDir, `${partId}.jpg`)

  // Las fotos oficiales se incluyen ya recortadas a 450 × 402 en public/parts.
  if (entry.official) {
    official += 1
    try {
      const info = await stat(dest)
      if (info.size < 2000) throw new Error('archivo vacío')
    } catch {
      failed.push({
        partId,
        url: entry.image,
        error: 'falta la foto oficial incluida en el repo',
      })
    }
    continue
  }

  if (!force) {
    try {
      const info = await stat(dest)
      if (info.size > 2000) {
        skipped += 1
        continue
      }
    } catch {
      // Todavía no existe: se descarga.
    }
  }

  const url = `${BASE}${encodeURIComponent(entry.file)}`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 2000) throw new Error(`archivo inválido (${bytes.length} bytes)`)
    await writeFile(dest, bytes)
    downloaded += 1
  } catch (error) {
    failed.push({ partId, url, error: String(error) })
  }
}

console.log(
  `Descargadas: ${downloaded} · Ya existían: ${skipped} · Oficiales incluidas: ${official} · Errores: ${failed.length}`,
)
for (const failure of failed) console.error(`- ${failure.partId}: ${failure.error}`)
if (failed.length > 0) process.exitCode = 1
