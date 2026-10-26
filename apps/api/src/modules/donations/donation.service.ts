import { randomUUID } from 'node:crypto'
import type { PaymentProvider } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { assertOrganizationEligibleForFunds } from '../organizations/organization.service.js'
import { paymentAdapter } from '../../providers/payments/index.js'
import { selectedPaymentProvider } from '../../providers/payments/config.js'
import { recordAuditEvent } from '../audit/audit.service.js'

const providerEnum: Record<string, PaymentProvider> = { dodo: 'DODO', razorpay: 'RAZORPAY', sandbox: 'SANDBOX' }

export async function createDonationOrder(input: { campaignId: string; amountPaise: number; donorUserId?: string; donorDisplayName?: string; isAnonymous?: boolean; idempotencyKey: string }) {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) throw new HttpError(400, 'INVALID_DONATION_AMOUNT', 'Donation amount must be a positive integer number of paise.')
  const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, include: { organization: true } })
  if (!campaign || campaign.status !== 'ACTIVE' || !campaign.isPublic) throw new HttpError(400, 'CAMPAIGN_NOT_ACTIVE', 'Campaign is not accepting donations.')
  await assertOrganizationEligibleForFunds(campaign.organization)
  const provider = selectedPaymentProvider()
  const donation = await prisma.donation.create({ data: { correlationId: randomUUID(), campaignId: campaign.id, donorUserId: input.donorUserId, donorDisplayName: input.isAnonymous ? null : input.donorDisplayName, isAnonymous: input.isAnonymous ?? false, amountPaise: input.amountPaise, currency: 'INR', paymentProvider: providerEnum[provider], idempotencyKey: input.idempotencyKey, isTestMode: process.env.PAYMENT_MODE !== 'live' } })
  try {
    const order = await paymentAdapter(provider).createOrder({ donationId: donation.id, amountPaise: donation.amountPaise, currency: 'INR', receipt: donation.id, metadata: { campaignId: campaign.id, donationId: donation.id } })
    const updated = await prisma.donation.update({ where: { id: donation.id }, data: { providerOrderId: order.orderId } })
    return { donation: updated, checkout: order }
  } catch (error) {
    await prisma.donation.update({ where: { id: donation.id }, data: { status: 'FAILED' } })
    throw error
  }
}

export async function confirmDonation(input: { orderId: string; paymentId: string; signature: string }, database = prisma) {
  const donation = await database.donation.findUnique({ where: { providerOrderId: input.orderId } })
  if (!donation) throw new HttpError(404, 'DONATION_NOT_FOUND', 'Donation order not found.')
  const provider = donation.paymentProvider.toLowerCase() as 'dodo' | 'razorpay' | 'sandbox'
  if (!paymentAdapter(provider).verifyCheckoutSignature(input)) throw new HttpError(400, 'INVALID_CHECKOUT_SIGNATURE', 'Checkout signature is invalid.')
  const status = await paymentAdapter(provider).fetchPaymentStatus(input.paymentId)
  if (status.amountPaise !== 0 && (status.amountPaise !== donation.amountPaise || status.currency !== 'INR')) throw new HttpError(400, 'DONATION_AMOUNT_CURRENCY_MISMATCH', 'Payment amount or currency does not match the donation.')
  if (status.status !== 'succeeded') throw new HttpError(409, 'PAYMENT_NOT_SUCCESSFUL', 'Payment has not completed successfully.')
  return database.$transaction(async (tx: any) => {
    const current = await tx.donation.findUnique({ where: { id: donation.id } })
    if (!current) throw new HttpError(404, 'DONATION_NOT_FOUND', 'Donation not found.')
    if (current.status === 'CONFIRMED') return current
    const updated = await tx.donation.update({ where: { id: current.id }, data: { status: 'CONFIRMED', providerPaymentId: input.paymentId, verifiedAt: new Date() } })
    await tx.campaign.update({ where: { id: current.campaignId }, data: { confirmedRaisedPaise: { increment: current.amountPaise } } })
    await recordAuditEvent(tx, { correlationId: current.correlationId, actorRole: 'CHECKOUT_CALLBACK', action: 'DONATION_CONFIRMED', entityType: 'Donation', entityId: current.id, metadata: { paymentId: input.paymentId } })
    return updated
  })
}
