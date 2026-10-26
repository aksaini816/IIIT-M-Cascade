import type { Payout } from '@prisma/client'
import type { PayoutProviderAdapter } from './payout.types.js'

export class SimulationPayoutAdapter implements PayoutProviderAdapter {
  async createPayout(input: Parameters<PayoutProviderAdapter['createPayout']>[0]) {
    const status = input.destinationRef.includes('ambiguous') ? 'AMBIGUOUS_RECONCILIATION_REQUIRED' : input.destinationRef.includes('fail') ? 'FAILED' : 'PAID'
    return { providerTransferRef: `sim_transfer_${input.payoutId}`, status: status as 'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED' }
  }
  async getPayoutStatus(providerTransferRef: string) {
    return providerTransferRef.includes('ambiguous') ? 'AMBIGUOUS_RECONCILIATION_REQUIRED' : providerTransferRef.includes('fail') ? 'FAILED' : 'PAID'
  }
  async reverseOrRefund(_providerTransferRef: string) {}
  async reconcilePayout(payoutRecord: Payout) { return this.getPayoutStatus(payoutRecord.providerTransferRef || '') }
}
