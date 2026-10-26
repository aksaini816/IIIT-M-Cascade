import { describe, expect, it, vi } from 'vitest'
import { SandboxPaymentAdapter } from '../src/providers/payments/sandbox.adapter.js'
import { assertSafePaymentConfiguration } from '../src/providers/payments/config.js'
import { confirmDonation } from '../src/modules/donations/donation.service.js'
import { HttpError } from '../src/middleware/errors.js'

describe('INR payment adapters and donation confirmation', () => {
  it('verifies valid sandbox checkout signatures and rejects forged signatures', () => {
    const adapter = new SandboxPaymentAdapter()
    const signature = SandboxPaymentAdapter.signCheckout('order-1', 'payment-1')
    expect(adapter.verifyCheckoutSignature({ orderId: 'order-1', paymentId: 'payment-1', signature })).toBe(true)
    expect(adapter.verifyCheckoutSignature({ orderId: 'order-1', paymentId: 'payment-1', signature: 'forged' })).toBe(false)
  })

  it('rejects live keys unless the explicit live-money gate is enabled', () => {
    const previous = process.env.RAZORPAY_KEY_ID
    const enabled = process.env.LIVE_PAYMENTS_ENABLED
    process.env.RAZORPAY_KEY_ID = 'rzp_live_secret'
    process.env.LIVE_PAYMENTS_ENABLED = 'false'
    expect(() => assertSafePaymentConfiguration()).toThrow()
    process.env.RAZORPAY_KEY_ID = previous
    process.env.LIVE_PAYMENTS_ENABLED = enabled
  })

  it('rejects a checkout amount mismatch before confirmation', async () => {
    const prisma: any = {
      donation: { findUnique: vi.fn().mockResolvedValue({ id: 'donation-1', paymentProvider: 'SANDBOX', amountPaise: 1000, providerOrderId: 'order-1' }) },
    }
    await expect(confirmDonation({ orderId: 'order-1', paymentId: 'amount_999', signature: SandboxPaymentAdapter.signCheckout('order-1', 'amount_999') }, prisma)).rejects.toMatchObject({ code: 'DONATION_AMOUNT_CURRENCY_MISMATCH' })
  })
})
