import type { Payout } from '@prisma/client'

export interface PayoutProviderAdapter {
  createPayout(input: { payoutId: string; idempotencyKey: string; amountPaise: number; currency: 'INR'; destinationRef: string; narration: string }): Promise<{ providerTransferRef: string; status: 'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED' }>
  getPayoutStatus(providerTransferRef: string): Promise<'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED'>
  reverseOrRefund(providerTransferRef: string): Promise<void>
  reconcilePayout(payoutRecord: Payout): Promise<'PAID' | 'FAILED' | 'AMBIGUOUS_RECONCILIATION_REQUIRED'>
}
