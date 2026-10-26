import { Router } from 'express'
import { prisma } from '../../prisma.js'
import { requireAuth } from '../../middleware/rbac.js'
import { initiatePayout } from './payouts.service.js'
export const payoutRouter = Router()
payoutRouter.use(requireAuth)
payoutRouter.get('/', async (_req, res, next) => { try { res.json({ payouts: await prisma.payout.findMany({ orderBy: { createdAt: 'desc' } }) }) } catch (e) { next(e) } })
payoutRouter.post('/initiate/:expenseId', async (req, res, next) => { try { res.status(201).json({ payout: await initiatePayout(String(req.params.expenseId), req.sessionContext!.userId) }) } catch (e) { next(e) } })
