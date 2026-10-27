const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** Formatea un importe como moneda argentina sin decimales.
 * @returns El valor monetario localizado en pesos argentinos.
 */
export function money(value: number): string {
  return ars.format(value)
}

/** Abrevia importes grandes usando miles o millones.
 * @returns El importe compacto con el sufijo correspondiente.
 */
export function moneyShort(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString('es-AR', {
      maximumFractionDigits: value >= 10_000_000 ? 0 : 1,
    })} M`
  }
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString('es-AR')} k`
  return money(value)
}

/** Redondea un valor al entero más cercano y agrega el símbolo de porcentaje.
 * @returns El porcentaje como texto.
 */
export function percent(value: number): string {
  return `${Math.round(value)}%`
}

/** Limita un número al intervalo inclusivo indicado.
 * @returns El valor entre el mínimo y el máximo.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Formatea una fecha ISO como DD/MM/AAAA. */
export function formatDateDMY(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Indica si una fecha ISO tiene más de `days` días de antigüedad. */
export function isOlderThan(iso: string, days: number): boolean {
  const then = new Date(iso).getTime()
  const now = Date.now()
  return now - then > days * 24 * 60 * 60 * 1000
}
