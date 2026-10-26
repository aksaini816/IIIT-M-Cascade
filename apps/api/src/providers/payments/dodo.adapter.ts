import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentProviderAdapter } from './payment.types.js'
import { assertIntegerPaise } from './payment.types.js'

export class DodoPaymentAdapter implements PaymentProviderAdapter {
  private readonly secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || ''
  async createOrder(input: Parameters<PaymentProviderAdapter['createOrder']>[0]) {
    assertIntegerPaise(input.amountPaise)
    const apiKey = process.env.DODO_PAYMENTS_API_KEY
    if (!apiKey) throw new Error('Dodo Payments credentials are not configured.')
    const response = await fetch(`${process.env.DODO_PAYMENTS_API_URL || 'https://api.dodopayments.com'}/payments`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, metadata: input.metadata }) })
    if (!response.ok) throw new Error(`Dodo payment creation failed with HTTP ${response.status}.`)
    const body = await response.json() as { id: string; checkout_url?: string }
    return { orderId: body.id, checkoutUrl: body.checkout_url, provider: 'dodo' as const }
  }
  verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(createHmac('sha256', this.secret).update(`${input.orderId}|${input.paymentId}`).digest('hex'), input.signature)
  }
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
    const [timestamp, signature] = signatureHeader.split(',')
    if (!timestamp || !signature) return false
    return safeEqual(createHmac('sha256', this.secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex'), signature)
  }
  async fetchPaymentStatus(providerPaymentId: string) {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY
    if (!apiKey) throw new Error('Dodo Payments credentials are not configured.')
    const response = await fetch(`${process.env.DODO_PAYMENTS_API_URL || 'https://api.dodopayments.com'}/payments/${encodeURIComponent(providerPaymentId)}`, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!response.ok) throw new Error(`Dodo payment lookup failed with HTTP ${response.status}.`)
    const body = await response.json() as { status: string; amount?: number; currency?: string }
    return { status: body.status === 'succeeded' || body.status === 'paid' ? 'succeeded' as const : body.status === 'refunded' ? 'refunded' as const : body.status === 'failed' ? 'failed' as const : 'created' as const, amountPaise: body.amount || 0, currency: 'INR' as const }
  }
}

function safeEqual(expected: string, received: string) {
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}
