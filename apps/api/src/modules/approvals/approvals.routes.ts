import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import { freezeExpense, submitApprovalDecision, unfreezeExpense } from './approvals.service.js'

const decisionSchema = z.object({ requestVersion: z.number().int().positive(), decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().max(2000).optional() })
const freezeSchema = z.object({ reason: z.string().trim().min(1).max(2000) })
const reviewSchema = z.object({ reviewNote: z.string().trim().min(1).max(4000) })

export const approvalsRouter = Router()
approvalsRouter.get('/queue', requireAuth, async (request, response, next) => {
  try {
    const memberships = await prisma.organizationMembership.findMany({ where: { userId: request.sessionContext!.userId, isActive: true, role: { in: ['APPROVER_A', 'APPROVER_B'] } }, select: { organizationId: true } })
    const expenses = await prisma.expenseRequest.findMany({ where: { organizationId: { in: memberships.map((membership) => membership.organizationId) }, status: { in: ['SUBMITTED', 'PENDING_APPROVALS'] } }, include: { approvals: true, organization: true, vendor: true, allocation: true }, orderBy: { updatedAt: 'asc' } })
    response.json({ expenses })
  } catch (error) { next(error) }
})

approvalsRouter.post('/:expenseId/decide', requireAuth, async (request, response, next) => {
  try {
    const expenseId = typeof request.params.expenseId === 'string' ? request.params.expenseId : ''
    const result = await submitApprovalDecision(request.sessionContext!.userId, expenseId, decisionSchema.parse(request.body))
    response.json(result)
  } catch (error) { next(error) }
})

export const expenseFreezeRouter = Router()
expenseFreezeRouter.post('/:id/freeze', requireAuth, async (request, response, next) => {
  try {
    const expenseId = typeof request.params.id === 'string' ? request.params.id : ''
    const existing = await prisma.expenseRequest.findUnique({ where: { id: expenseId } })
    if (!existing) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    const canFreeze = request.sessionContext!.user.platformRole === 'PLATFORM_ADMIN' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId: existing.organizationId, userId: request.sessionContext!.userId, isActive: true, role: 'AUDITOR' } }))
    if (!canFreeze) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'Only auditors can freeze expenses.')
    response.json({ expense: await freezeExpense(expenseId, request.sessionContext!.userId, freezeSchema.parse(request.body).reason) })
  } catch (error) { next(error) }
})

expenseFreezeRouter.post('/:id/unfreeze', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (request, response, next) => {
  try {
    const expenseId = typeof request.params.id === 'string' ? request.params.id : ''
    response.json({ expense: await unfreezeExpense(expenseId, request.sessionContext!.userId, reviewSchema.parse(request.body).reviewNote) })
  } catch (error) { next(error) }
})
