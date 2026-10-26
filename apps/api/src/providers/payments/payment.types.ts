export type PaymentProviderName = 'dodo' | 'razorpay' | 'sandbox'
export type PaymentStatus = 'created' | 'succeeded' | 'failed' | 'refunded' | 'disputed'

export interface PaymentProviderAdapter {
  createOrder(input: { donationId: string; amountPaise: number; currency: 'INR'; receipt: string; metadata: Record<string, string> }): Promise<{ orderId: string; checkoutUrl?: string; provider: PaymentProviderName }>
  verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }): boolean
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean
  fetchPaymentStatus(providerPaymentId: string): Promise<{ status: PaymentStatus; amountPaise: number; currency: 'INR' }>
}

export function assertIntegerPaise(amountPaise: number) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new Error('Payment amount must be a positive integer number of paise.')
}
