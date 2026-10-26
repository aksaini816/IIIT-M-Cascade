import type { PaymentProviderAdapter, PaymentProviderName } from './payment.types.js'
import { DodoPaymentAdapter } from './dodo.adapter.js'
import { RazorpayPaymentAdapter } from './razorpay.adapter.js'
import { SandboxPaymentAdapter } from './sandbox.adapter.js'
import { selectedPaymentProvider } from './config.js'

export function paymentAdapter(provider: PaymentProviderName = selectedPaymentProvider()): PaymentProviderAdapter {
  if (provider === 'dodo') return new DodoPaymentAdapter()
  if (provider === 'razorpay') return new RazorpayPaymentAdapter()
  return new SandboxPaymentAdapter()
}
