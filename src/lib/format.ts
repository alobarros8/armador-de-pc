const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function money(value: number): string {
  return ars.format(value)
}

export function moneyShort(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString('es-AR', {
      maximumFractionDigits: value >= 10_000_000 ? 0 : 1,
    })} M`
  }
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString('es-AR')} k`
  return money(value)
}

export function percent(value: number): string {
  return `${Math.round(value)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
