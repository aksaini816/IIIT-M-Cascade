import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth } from '../../middleware/rbac.js'
import { createExpense, editExpense } from './expenses.service.js'
import { reserveAllocationFunds } from '../allocations/allocation.service.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { evaluateExpenseFraud } from '../fraud/fraud.engine.js'

const expenseSchema = z.object({
  organizationId: z.string().uuid(),
  allocationId: z.string().uuid(),
  vendorId: z.string().uuid(),
  amountPaise: z.number().int().positive().safe(),
  purpose: z.enum(['SCHOOL_FEES', 'BOOKS', 'UNIFORMS', 'STATIONERY', 'EDUCATION_SUPPLIES']),
  description: z.string().trim().min(1),
  invoiceReference: z.string().trim().min(1),
  submit: z.boolean().default(false),
})
const editSchema = expenseSchema.partial().omit({ organizationId: true, submit: true })

async function canManage(organizationId: string, userId: string, platformRole: string) {
  return platformRole === 'PLATFORM_ADMIN' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId, userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }))
}

export const expenseRouter = Router()
expenseRouter.use(requireAuth)

expenseRouter.post('/', async (request, response, next) => {
  try {
    const data = expenseSchema.parse(request.body)
    if (!await canManage(data.organizationId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot create expenses for this organization.')
    const expense = await prisma.$transaction((tx) => createExpense(tx, { ...data, requesterId: request.sessionContext!.userId }))
    response.status(201).json({ expense })
  } catch (error) { next(error) }
})

expenseRouter.patch('/:id', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const existing = await prisma.expenseRequest.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    if (!await canManage(existing.organizationId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot edit this expense.')
    const expense = await prisma.$transaction((tx) => editExpense(tx, id, editSchema.parse(request.body), request.sessionContext!.userId))
    response.json({ expense })
  } catch (error) { next(error) }
})

expenseRouter.post('/:id/submit', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const existing = await prisma.expenseRequest.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    if (existing.status !== 'DRAFT') throw new HttpError(409, 'EXPENSE_NOT_DRAFT', 'Only draft expenses can be submitted.')
    if (!await canManage(existing.organizationId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot submit this expense.')
    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseRequest.update({ where: { id }, data: { status: 'PENDING_APPROVALS' } })
      await reserveAllocationFunds(tx, existing.allocationId, existing.amountPaise)
      const fraudCases = await evaluateExpenseFraud(tx, id, {})
      if (fraudCases.some((fraudCase) => fraudCase.isBlocking)) await tx.expenseRequest.update({ where: { id }, data: { status: 'FROZEN', freezeReason: 'Blocked by automatic fraud detection.', frozenById: request.sessionContext!.userId, frozenAt: new Date() } })
      await recordAuditEvent(tx, { correlationId: existing.correlationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'EXPENSE_SUBMITTED', entityType: 'ExpenseRequest', entityId: id, metadata: { version: existing.version } })
      return updated
    })
    response.json({ expense })
  } catch (error) { next(error) }
})

expenseRouter.post('/:id/cancel', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const existing = await prisma.expenseRequest.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    if (existing.requesterId !== request.sessionContext!.userId && request.sessionContext!.user.platformRole !== 'PLATFORM_ADMIN') throw new HttpError(403, 'EXPENSE_FORBIDDEN', 'You cannot cancel this expense.')
    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseRequest.update({ where: { id }, data: { status: 'CANCELLED' } })
      await recordAuditEvent(tx, { correlationId: existing.correlationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'EXPENSE_CANCELLED', entityType: 'ExpenseRequest', entityId: id, metadata: { previousStatus: existing.status } })
      return updated
    })
    response.json({ expense })
  } catch (error) { next(error) }
})

expenseRouter.get('/', async (request, response, next) => {
  try {
    const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined
    const expenses = await prisma.expenseRequest.findMany({ where: { ...(organizationId ? { organizationId } : {}), ...(request.sessionContext!.user.platformRole === 'PLATFORM_ADMIN' ? {} : { requesterId: request.sessionContext!.userId }) }, include: { approvals: { orderBy: { requestVersion: 'desc' } }, evidenceFiles: true, fraudCases: true }, orderBy: { updatedAt: 'desc' } })
    response.json({ expenses })
  } catch (error) { next(error) }
})

expenseRouter.get('/:id', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const expense = await prisma.expenseRequest.findUnique({ where: { id }, include: { approvals: { orderBy: { requestVersion: 'asc' } }, evidenceFiles: true, fraudCases: true, allocation: true, vendor: true } })
    if (!expense) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    response.json({ expense, versionHistory: [...new Set(expense.approvals.map((approval) => approval.requestVersion).concat(expense.version))].sort((a, b) => a - b), currentVersionApprovals: expense.approvals.filter((approval) => approval.requestVersion === expense.version) })
  } catch (error) { next(error) }
})
