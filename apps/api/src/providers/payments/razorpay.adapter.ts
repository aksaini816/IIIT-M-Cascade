import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentProviderAdapter } from './payment.types.js'
import { assertIntegerPaise } from './payment.types.js'

export class RazorpayPaymentAdapter implements PaymentProviderAdapter {
  private readonly keyId = process.env.RAZORPAY_KEY_ID || ''
  private readonly secret = process.env.RAZORPAY_KEY_SECRET || ''
  async createOrder(input: Parameters<PaymentProviderAdapter['createOrder']>[0]) {
    assertIntegerPaise(input.amountPaise)
    if (!this.keyId || !this.secret) throw new Error('Razorpay credentials are not configured.')
    const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.metadata }) })
    if (!response.ok) throw new Error(`Razorpay order creation failed with HTTP ${response.status}.`)
    const body = await response.json() as { id: string }
    return { orderId: body.id, provider: 'razorpay' as const }
  }
  verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(createHmac('sha256', this.secret).update(`${input.orderId}|${input.paymentId}`).digest('hex'), input.signature)
  }
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
    return safeEqual(createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || this.secret).update(rawBody).digest('hex'), signatureHeader)
  }
  async fetchPaymentStatus(providerPaymentId: string) {
    if (!this.keyId || !this.secret) throw new Error('Razorpay credentials are not configured.')
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(providerPaymentId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.secret}`).toString('base64')}` } })
    if (!response.ok) throw new Error(`Razorpay payment lookup failed with HTTP ${response.status}.`)
    const body = await response.json() as { status: string; amount: number; currency: string }
    return { status: body.status === 'captured' ? 'succeeded' as const : body.status === 'refunded' ? 'refunded' as const : 'failed' as const, amountPaise: body.amount, currency: 'INR' as const }
  }
}

function safeEqual(expected: string, received: string) {
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}
