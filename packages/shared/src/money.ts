const MAX_SAFE = Number.MAX_SAFE_INTEGER

function assertSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative safe integer`)
  return value
}

export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'number') {
    if (!Number.isSafeInteger(rupees) || rupees < 0 || rupees > Math.floor(MAX_SAFE / 100)) throw new RangeError('Rupees must be a non-negative safe integer within paise precision')
    return rupees * 100
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(rupees)) throw new RangeError('Rupees must be a non-negative decimal with at most two fractional digits')
  const [whole, fraction = ''] = rupees.split('.')
  return assertSafeInteger(Number(whole) * 100 + Number(fraction.padEnd(2, '0')), 'Paise')
}

export function assertValidPositivePaise(paise: unknown): number {
  if (typeof paise !== 'number' || !Number.isSafeInteger(paise) || paise <= 0) throw new RangeError('Paise must be a positive safe integer')
  return paise
}

export function paiseToRupeesString(paise: number): string {
  assertSafeInteger(paise, 'Paise')
  return (paise / 100).toFixed(2)
}

export function formatINRFromPaise(paise: number): string {
  assertSafeInteger(paise, 'Paise')
  return `₹${Math.floor(paise / 100).toLocaleString('en-IN')}.${String(paise % 100).padStart(2, '0')}`
}
