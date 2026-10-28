import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  money,
  moneyShort,
  percent,
  clamp,
  formatDateDMY,
  isOlderThan,
} from './format'

describe('format', () => {
  describe('money()', () => {
    it('formatea números positivos sin decimales', () => {
      // Usamos replace(/\s/g, ' ') para evitar problemas con los espacios de no separación de Intl
      expect(money(1234).replace(/\s/g, ' ')).toBe('$ 1.234')
      expect(money(1234567).replace(/\s/g, ' ')).toBe('$ 1.234.567')
    })

    it('redondea los decimales correctamente', () => {
      expect(money(1234.4).replace(/\s/g, ' ')).toBe('$ 1.234')
      expect(money(1234.6).replace(/\s/g, ' ')).toBe('$ 1.235')
    })

    it('formatea números negativos correctamente', () => {
      expect(money(-1234).replace(/\s/g, ' ')).toBe('-$ 1.234')
    })
  })

  describe('percent()', () => {
    it('redondea y agrega el signo de porcentaje', () => {
      expect(percent(50.4)).toBe('50%')
      expect(percent(50.6)).toBe('51%')
      expect(percent(100)).toBe('100%')
      expect(percent(0)).toBe('0%')
    })
  })

  describe('clamp()', () => {
    it('mantiene el valor dentro de los límites', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('formatDateDMY()', () => {
    it('formatea una fecha ISO a DD/MM/AAAA', () => {
      expect(formatDateDMY('2023-12-01T10:00:00Z')).toBe('01/12/2023')
      expect(formatDateDMY('2024-01-15T00:00:00')).toBe('15/01/2024')
    })
  })

  describe('moneyShort()', () => {
    it('no abrevia números menores a 1000', () => {
      expect(moneyShort(999).replace(/\s/g, ' ')).toBe('$ 999')
    })

    it('abrevia números entre 1.000 y 999.999 con "k"', () => {
      expect(moneyShort(1000).replace(/\s/g, ' ')).toBe('$1 k')
      expect(moneyShort(1500).replace(/\s/g, ' ')).toBe('$2 k') // Porque divide y usa Math.round en moneyShort para la k
      expect(moneyShort(999999).replace(/\s/g, ' ')).toBe('$1.000 k')
    })

    it('abrevia números entre 1.000.000 y 9.999.999 con "M" y un decimal', () => {
      expect(moneyShort(1000000).replace(/\s/g, ' ')).toBe('$1 M')
      expect(moneyShort(1500000).replace(/\s/g, ' ')).toBe('$1,5 M')
      expect(moneyShort(9999999).replace(/\s/g, ' ')).toBe('$10 M')
    })

    it('abrevia números mayores o iguales a 10.000.000 con "M" y sin decimales', () => {
      expect(moneyShort(10000000).replace(/\s/g, ' ')).toBe('$10 M')
      expect(moneyShort(15500000).replace(/\s/g, ' ')).toBe('$16 M')
    })

    it('maneja valores negativos adecuadamente', () => {
      // Si value < 1000, cae directo en return money(value).
      // Math.round no se usará porque -1500 < 1000
      expect(moneyShort(-1500).replace(/\s/g, ' ')).toBe('-$ 1.500')
      expect(moneyShort(-1000000).replace(/\s/g, ' ')).toBe('-$ 1.000.000')
    })
  })

  describe('isOlderThan()', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('devuelve true si la fecha es más antigua que la cantidad de días indicada', () => {
      const now = new Date('2024-01-10T12:00:00Z')
      vi.setSystemTime(now)

      const iso = '2024-01-01T12:00:00Z' // 9 días de antigüedad
      expect(isOlderThan(iso, 8)).toBe(true) // 9 > 8 -> true
    })

    it('devuelve false si la fecha es más reciente', () => {
      const now = new Date('2024-01-10T12:00:00Z')
      vi.setSystemTime(now)

      const iso = '2024-01-08T12:00:00Z' // 2 días de antigüedad
      expect(isOlderThan(iso, 3)).toBe(false) // 2 > 3 -> false
    })

    it('devuelve false si la fecha es exactamente igual al límite', () => {
      const now = new Date('2024-01-10T12:00:00Z')
      vi.setSystemTime(now)

      const iso = '2024-01-05T12:00:00Z' // Exactamente 5 días de antigüedad
      expect(isOlderThan(iso, 5)).toBe(false) // 5 > 5 -> false
    })
  })
})
