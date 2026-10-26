import type { PaymentProviderName } from './payment.types.js'

export function selectedPaymentProvider(): PaymentProviderName {
  const provider = (process.env.PAYMENT_PROVIDER || 'sandbox').toLowerCase()
  if (!['dodo', 'razorpay', 'sandbox'].includes(provider)) throw new Error('PAYMENT_PROVIDER must be dodo, razorpay, or sandbox.')
  return provider as PaymentProviderName
}

export function assertSafePaymentConfiguration() {
  if (process.env.LIVE_PAYMENTS_ENABLED === 'true') return
  const keys = [process.env.RAZORPAY_KEY_ID, process.env.DODO_PAYMENTS_API_KEY].filter(Boolean)
  if (keys.some((key) => key?.startsWith('rzp_live_') || key?.startsWith('dodo_live_'))) throw new Error('Live payment keys require LIVE_PAYMENTS_ENABLED=true.')
}
