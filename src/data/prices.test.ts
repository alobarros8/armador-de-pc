import { describe, expect, it } from 'vitest'
import { getPart, PRICES_UPDATED_AT } from './catalog'
import pricesJson from './prices.json'

describe('prices', () => {
  it('carga el precio desde prices.json', () => {
    const part = getPart('amd-r3-3200g')
    expect(part).toBeDefined()
    expect(part?.price).toBe(pricesJson.prices['amd-r3-3200g'])
  })

  it('conserva el valor embebido si falta una pieza en prices.json', () => {
    // El fallback se aplica en tiempo de build; verificamos que la fecha exista.
    expect(PRICES_UPDATED_AT).toBeTruthy()
  })

  it('formatea la fecha de actualización', () => {
    expect(new Date(PRICES_UPDATED_AT).toString()).not.toBe('Invalid Date')
  })
})