import type { Payout } from '@prisma/client'
import type { PayoutProviderAdapter } from './payout.types.js'

export class LiveProviderPayoutAdapter implements PayoutProviderAdapter {
  private assertEnabled() {
    if (process.env.LIVE_PAYOUTS_ENABLED !== 'true') throw new Error('Live payouts are disabled. Set LIVE_PAYOUTS_ENABLED=true only after compliance approval.')
  }
  async createPayout(_input: Parameters<PayoutProviderAdapter['createPayout']>[0]): Promise<{ providerTransferRef: string; status: 'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED' }> { this.assertEnabled(); throw new Error('Live RazorpayX/Dodo payout integration requires approved provider credentials.') }
  async getPayoutStatus(_providerTransferRef: string): Promise<'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED'> { this.assertEnabled(); throw new Error('Live payout status integration requires approved provider credentials.') }
  async reverseOrRefund(_providerTransferRef: string) { this.assertEnabled(); throw new Error('Live payout reversal integration requires approved provider credentials.') }
  async reconcilePayout(_payoutRecord: Payout): Promise<'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED'> { this.assertEnabled(); throw new Error('Live payout reconciliation requires approved provider credentials.') }
}
