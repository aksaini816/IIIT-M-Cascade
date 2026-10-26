import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/rbac.js'
import { createDonationOrder, confirmDonation } from './donation.service.js'

const orderSchema = z.object({ campaignId: z.string().uuid(), amountPaise: z.number().int().positive().safe(), currency: z.literal('INR'), donorDisplayName: z.string().trim().optional(), isAnonymous: z.boolean().default(false), idempotencyKey: z.string().trim().min(8) })
const callbackSchema = z.object({ orderId: z.string().min(1), paymentId: z.string().min(1), signature: z.string().min(1) })

export const donationRouter = Router()
donationRouter.post('/orders', requireAuth, async (request, response, next) => {
  try {
    const data = orderSchema.parse(request.body)
    response.status(201).json(await createDonationOrder({ ...data, donorUserId: request.sessionContext!.userId }))
  } catch (error) { next(error) }
})
donationRouter.post('/verify-callback', requireAuth, async (request, response, next) => {
  try {
    response.json({ donation: await confirmDonation(callbackSchema.parse(request.body)) })
  } catch (error) { next(error) }
})
