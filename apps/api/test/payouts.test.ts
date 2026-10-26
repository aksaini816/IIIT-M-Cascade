import { describe, expect, it } from 'vitest'
import { SimulationPayoutAdapter } from '../src/providers/payouts/simulation.adapter.js'
import { LiveProviderPayoutAdapter } from '../src/providers/payouts/live.adapter.js'
import { payoutIdempotencyKey } from '../src/modules/payouts/payouts.service.js'

describe('payout safety engine', () => {
  it('uses deterministic idempotency keys for an expense version', () => {
    expect(payoutIdempotencyKey('expense-1', 3)).toBe('payout:expense-1:v3')
    expect(payoutIdempotencyKey('expense-1', 3)).toBe(payoutIdempotencyKey('expense-1', 3))
  })

  it('supports paid, failed, and ambiguous simulation outcomes', async () => {
    const adapter = new SimulationPayoutAdapter()
    const input = { payoutId: 'payout-1', idempotencyKey: 'key-1', amountPaise: 1000, currency: 'INR' as const, narration: 'test' }
    await expect(adapter.createPayout({ ...input, destinationRef: 'bank-ok' })).resolves.toMatchObject({ status: 'PAID' })
    await expect(adapter.createPayout({ ...input, destinationRef: 'bank-fail' })).resolves.toMatchObject({ status: 'FAILED' })
    await expect(adapter.createPayout({ ...input, destinationRef: 'bank-ambiguous' })).resolves.toMatchObject({ status: 'AMBIGUOUS_RECONCILIATION_REQUIRED' })
    await expect(adapter.getPayoutStatus('sim_transfer_ambiguous')).resolves.toBe('AMBIGUOUS_RECONCILIATION_REQUIRED')
  })

  it('rejects live payout execution without explicit enablement', async () => {
    const previous = process.env.LIVE_PAYOUTS_ENABLED
    process.env.LIVE_PAYOUTS_ENABLED = 'false'
    const adapter = new LiveProviderPayoutAdapter()
    await expect(adapter.createPayout({ payoutId: 'p', idempotencyKey: 'k', amountPaise: 1, currency: 'INR', destinationRef: 'dest', narration: 'test' })).rejects.toThrow('Live payouts are disabled')
    process.env.LIVE_PAYOUTS_ENABLED = previous
  })
})
