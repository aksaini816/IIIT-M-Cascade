import { createHash } from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { paymentAdapter } from '../../providers/payments/index.js'
import type { PaymentProviderName } from '../../providers/payments/payment.types.js'
import { recordAuditEvent } from '../audit/audit.service.js'

function providerFromPath(path: string): PaymentProviderName {
  if (path.endsWith('/razorpay')) return 'razorpay'
  if (path.endsWith('/dodo')) return 'dodo'
  return 'sandbox'
}

export const paymentWebhookRouter = Router()
paymentWebhookRouter.post('/payments', handleWebhook)
paymentWebhookRouter.post('/razorpay', handleWebhook)
paymentWebhookRouter.post('/dodo', handleWebhook)

async function handleWebhook(request: { path: string; body: Buffer; header(name: string): string | undefined }, response: { status(code: number): { json(body: unknown): void }; json(body: unknown): void }, next: (error: unknown) => void) {
  try {
    const provider = providerFromPath(request.path)
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from('')
    const signature = provider === 'dodo'
      ? `${request.header('webhook-timestamp') || ''},${request.header('webhook-signature') || ''}`
      : request.header(provider === 'razorpay' ? 'x-razorpay-signature' : 'x-provider-signature') || ''
    if (!paymentAdapter(provider).verifyWebhookSignature(rawBody, signature)) throw new HttpError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is invalid.')
    const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, any>
    const eventId = String(payload.id || request.header('webhook-id') || payload.event_id || '')
    if (!eventId) throw new HttpError(400, 'WEBHOOK_EVENT_ID_REQUIRED', 'Webhook event ID is required.')
    const eventType = String(payload.event || payload.type || '')
    const payment = payload.payload?.payment?.entity || payload.data?.payment || payload.payment || payload.data || payload
    const orderId = String(payment.order_id || payment.orderId || payload.metadata?.orderId || '')
    const paymentId = String(payment.id || payment.payment_id || payload.paymentId || '')
    const amountPaise = Number(payment.amount ?? payment.amountPaise ?? 0)
    const currency = String(payment.currency || 'INR')
    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.paymentWebhookEvent.create({ data: { provider: provider === 'razorpay' ? 'RAZORPAY' : provider === 'dodo' ? 'DODO' : 'SANDBOX', providerEventId: eventId, eventType, payloadSha256: createHash('sha256').update(rawBody).digest('hex') } })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') return { status: 'IGNORED_DUPLICATE' }
        throw error
      }
      const donation = orderId ? await tx.donation.findUnique({ where: { providerOrderId: orderId } }) : null
      if (!donation) return { status: 'PROCESSED' }
      if (amountPaise && (amountPaise !== donation.amountPaise || currency !== 'INR')) throw new HttpError(400, 'DONATION_AMOUNT_CURRENCY_MISMATCH', 'Webhook amount or currency does not match the donation.')
      let transition: string | undefined
      if (eventType.includes('captured') || eventType.includes('succeeded')) {
        if (donation.status !== 'CONFIRMED') {
          await tx.donation.update({ where: { id: donation.id }, data: { status: 'CONFIRMED', providerPaymentId: paymentId || donation.providerPaymentId, verifiedAt: new Date() } })
          await tx.campaign.update({ where: { id: donation.campaignId }, data: { confirmedRaisedPaise: { increment: donation.amountPaise } } })
          transition = 'DONATION_CONFIRMED'
        }
      } else if (eventType.includes('failed')) { await tx.donation.update({ where: { id: donation.id }, data: { status: 'FAILED', providerPaymentId: paymentId || donation.providerPaymentId } }); transition = 'DONATION_FAILED' }
      else if (eventType.includes('refund')) { await tx.donation.update({ where: { id: donation.id }, data: { status: 'REFUNDED', providerPaymentId: paymentId || donation.providerPaymentId } }); transition = 'DONATION_REFUNDED' }
      else if (eventType.includes('dispute')) { await tx.donation.update({ where: { id: donation.id }, data: { status: 'DISPUTED', providerPaymentId: paymentId || donation.providerPaymentId } }); transition = 'DONATION_DISPUTED' }
      await tx.paymentWebhookEvent.update({ where: { provider_providerEventId: { provider: provider === 'razorpay' ? 'RAZORPAY' : provider === 'dodo' ? 'DODO' : 'SANDBOX', providerEventId: eventId } }, data: { status: 'PROCESSED', processedAt: new Date() } })
      if (transition) await recordAuditEvent(tx, { correlationId: donation.correlationId, actorRole: `WEBHOOK_${provider.toUpperCase()}`, action: transition, entityType: 'Donation', entityId: donation.id, metadata: { eventType, providerEventId: eventId } })
      return { status: 'PROCESSED' }
    })
    response.status(200).json(result)
  } catch (error) { next(error) }
}
