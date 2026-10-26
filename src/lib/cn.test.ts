import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn()', () => {
  it('une clases verdaderas', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ignora valores falsos', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('devuelve un string vacío si no hay nada', () => {
    expect(cn(false, null, undefined, '')).toBe('')
  })
})
