import { describe, expect, it } from 'vitest'
import { assertValidPositivePaise, formatINRFromPaise, paiseToRupeesString, rupeesToPaise } from '../src/money.js'

describe('INR paise money utilities', () => {
  it('converts exact rupee and paise values', () => {
    expect(rupeesToPaise('120000.50')).toBe(12000050)
    expect(rupeesToPaise(120000)).toBe(12000000)
    expect(paiseToRupeesString(12000050)).toBe('120000.50')
    expect(formatINRFromPaise(12000050)).toBe('₹1,20,000.50')
  })
  it('rejects floats and invalid positive paise', () => {
    expect(() => rupeesToPaise(12.5)).toThrow()
    expect(() => assertValidPositivePaise(12.5)).toThrow()
    expect(() => assertValidPositivePaise(0)).toThrow()
    expect(() => rupeesToPaise('12.345')).toThrow()
  })
  it('rejects unsafe overflow', () => {
    expect(() => rupeesToPaise(Number.MAX_SAFE_INTEGER)).toThrow()
    expect(() => assertValidPositivePaise(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(() => formatINRFromPaise(Number.MAX_SAFE_INTEGER + 1)).toThrow()
  })
})
