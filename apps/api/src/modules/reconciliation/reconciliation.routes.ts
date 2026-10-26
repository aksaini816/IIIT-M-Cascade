import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import { payoutAdapter } from '../../providers/payouts/index.js'
import { commitDisbursedFunds, releaseReservedFunds } from '../allocations/allocation.service.js'
import { recordAuditEvent } from '../audit/audit.service.js'
export const reconciliationRouter = Router()
reconciliationRouter.use(requireAuth)
reconciliationRouter.get('/exceptions', async (_req, res, next) => { try { res.json({ payouts: await prisma.payout.findMany({ where: { status: { in: ['FAILED', 'AMBIGUOUS_RECONCILIATION_REQUIRED'] } } }), donations: await prisma.donation.findMany({ where: { status: { in: ['FAILED', 'REFUNDED', 'DISPUTED'] } } }) }) } catch (e) { next(e) } })
reconciliationRouter.post('/:payoutId/resolve', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (req, res, next) => { try {
  const id = String(req.params.payoutId)
  const result = await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id }, include: { expenseRequest: true } })
    if (!payout || !payout.providerTransferRef) throw new Error('Payout cannot be reconciled without a provider transfer reference.')
    const status = await payoutAdapter().reconcilePayout(payout)
    if (status === 'AMBIGUOUS_RECONCILIATION_REQUIRED') throw new Error('Provider outcome remains ambiguous; no ledger mutation was made.')
    const updated = await tx.payout.update({ where: { id }, data: { status, reconciledAt: new Date() } })
    if (status === 'PAID') await commitDisbursedFunds(tx, payout.expenseRequest.allocationId, payout.amountPaise)
    else await releaseReservedFunds(tx, payout.expenseRequest.allocationId, payout.amountPaise)
    await recordAuditEvent(tx, { correlationId: payout.correlationId, actorUserId: req.sessionContext!.userId, actorRole: req.sessionContext!.user.platformRole, action: `PAYOUT_RECONCILED_${status}`, entityType: 'Payout', entityId: id, metadata: { status } })
    return updated
  })
  res.json({ payout: result })
} catch (e) { next(e) } })
