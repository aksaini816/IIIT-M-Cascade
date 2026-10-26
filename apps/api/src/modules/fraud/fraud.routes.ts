import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import { recordAuditEvent } from '../audit/audit.service.js'

export const fraudRouter = Router()
fraudRouter.use(requireAuth)
fraudRouter.get('/', async (request, response, next) => {
  try {
    const severity = typeof request.query.severity === 'string' ? request.query.severity : undefined
    const status = typeof request.query.status === 'string' ? request.query.status : undefined
    const isBlocking = typeof request.query.isBlocking === 'string' ? request.query.isBlocking === 'true' : undefined
    response.json({ cases: await prisma.fraudCase.findMany({ where: { ...(severity ? { severity: severity as never } : {}), ...(status ? { status: status as never } : {}), ...(isBlocking === undefined ? {} : { isBlocking }) }, orderBy: { createdAt: 'desc' } }) })
  } catch (error) { next(error) }
})

fraudRouter.post('/:id/review', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const data = z.object({ decision: z.enum(['CONFIRMED_FRAUD', 'FALSE_POSITIVE_RESOLVED']), resolutionNotes: z.string().trim().min(1) }).parse(request.body)
    const fraudCase = await prisma.fraudCase.findUnique({ where: { id } })
    if (!fraudCase) throw new HttpError(404, 'FRAUD_CASE_NOT_FOUND', 'Fraud case not found.')
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.fraudCase.update({ where: { id }, data: { status: data.decision, resolutionNotes: data.resolutionNotes, reviewerId: request.sessionContext!.userId, resolvedAt: new Date() } })
      if (data.decision === 'CONFIRMED_FRAUD') {
        await tx.expenseRequest.update({ where: { id: fraudCase.expenseRequestId }, data: { status: 'FROZEN', freezeReason: data.resolutionNotes, frozenById: request.sessionContext!.userId, frozenAt: new Date() } })
        const expense = await tx.expenseRequest.findUnique({ where: { id: fraudCase.expenseRequestId } })
        if (expense) await tx.allocation.update({ where: { id: expense.allocationId }, data: { status: 'FROZEN', freezeReason: data.resolutionNotes, frozenByUserId: request.sessionContext!.userId, frozenAt: new Date() } })
      }
      await recordAuditEvent(tx, { correlationId: fraudCase.expenseRequestId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'FRAUD_CASE_REVIEWED', entityType: 'FraudCase', entityId: id, metadata: { decision: data.decision } })
      return saved
    })
    response.json({ fraudCase: updated })
  } catch (error) { next(error) }
})
