// Catálogo generado desde el feed público de Compra Gamer.
// No editar a mano: se regenera con `node scripts/build-cg-catalog.mjs`.
import cgParts from './catalog-cg.json'
import type { Part } from '../types'

export const CG_PARTS = cgParts as unknown as Part[]
