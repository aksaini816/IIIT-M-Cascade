import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentProviderAdapter } from './payment.types.js'
import { assertIntegerPaise } from './payment.types.js'

const secret = () => process.env.SANDBOX_PAYMENT_SECRET || 'kindora-sandbox-payment-secret'
const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('hex')

export class SandboxPaymentAdapter implements PaymentProviderAdapter {
  async createOrder(input: Parameters<PaymentProviderAdapter['createOrder']>[0]) {
    assertIntegerPaise(input.amountPaise)
    return { orderId: `sandbox_order_${input.donationId}`, provider: 'sandbox' as const }
  }
  verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(sign(`${input.orderId}|${input.paymentId}`), input.signature)
  }
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
    return safeEqual(sign(rawBody.toString('utf8')), signatureHeader)
  }
  async fetchPaymentStatus(providerPaymentId: string) {
    const encodedAmount = providerPaymentId.match(/amount_(\d+)/)?.[1]
    return { status: providerPaymentId.includes('fail') ? 'failed' as const : providerPaymentId.includes('refund') ? 'refunded' as const : 'succeeded' as const, amountPaise: encodedAmount ? Number(encodedAmount) : 0, currency: 'INR' as const }
  }
  static signCheckout(orderId: string, paymentId: string) { return sign(`${orderId}|${paymentId}`) }
  static signWebhook(rawBody: Buffer) { return sign(rawBody.toString('utf8')) }
}

function safeEqual(expected: string, received: string) {
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}
