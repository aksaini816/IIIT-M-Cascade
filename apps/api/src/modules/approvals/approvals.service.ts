import type { ApprovalDecision, Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { releaseReservedFunds, reserveAllocationFunds } from '../allocations/allocation.service.js'

type ApprovalTx = Prisma.TransactionClient & { $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> }
type DecisionInput = { requestVersion: number; decision: ApprovalDecision; reason?: string }

async function lockExpense(tx: ApprovalTx, expenseId: string) {
  if (tx.$queryRaw) await tx.$queryRaw`SELECT id FROM "ExpenseRequest" WHERE id = ${expenseId}::uuid FOR UPDATE`
  const expense = await tx.expenseRequest.findUnique({ where: { id: expenseId } })
  if (!expense) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
  return expense
}

export async function submitApprovalDecision(userId: string, expenseId: string, input: DecisionInput, database = prisma) {
  return database.$transaction(async (rawTx) => {
    const tx = rawTx as ApprovalTx
    const expense = await lockExpense(tx, expenseId)
    if (!['SUBMITTED', 'PENDING_APPROVALS'].includes(expense.status)) throw new HttpError(409, 'EXPENSE_NOT_APPROVABLE', 'This expense is not awaiting approval.')
    if (input.requestVersion !== expense.version) throw new HttpError(409, 'STALE_EXPENSE_VERSION', 'The approval targets an outdated expense version.')
    if (userId === expense.requesterId) {
      await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: userId, actorRole: 'APPROVER', action: 'SELF_APPROVAL_BLOCKED', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { requestVersion: input.requestVersion } })
      throw new HttpError(403, 'SELF_APPROVAL_FORBIDDEN', 'The expense requester cannot approve their own expense.')
    }

    const membership = await tx.organizationMembership.findFirst({ where: { userId, organizationId: expense.organizationId, isActive: true, role: { in: ['APPROVER_A', 'APPROVER_B'] } } })
    if (!membership) throw new HttpError(403, 'APPROVER_ROLE_REQUIRED', 'An active approver membership is required.')
    const existing = await tx.approval.findMany({ where: { expenseRequestId: expenseId, requestVersion: expense.version }, orderBy: { createdAt: 'asc' } })
    const priorApprovals = [...existing]
    if (existing.some((approval) => approval.approverId === userId)) throw new HttpError(409, 'DUPLICATE_APPROVAL', 'An approver cannot decide twice on the same expense version.')
    const slot: 'APPROVER_A' | 'APPROVER_B' = membership.role === 'APPROVER_A' ? 'APPROVER_A' : 'APPROVER_B'
    if (existing.some((approval) => approval.slot === slot)) throw new HttpError(409, 'APPROVER_SLOT_UNAVAILABLE', 'The required approver slot has already been filled.')

    const [organization, vendor, allocation] = await Promise.all([
      tx.organization.findUnique({ where: { id: expense.organizationId } }),
      tx.vendor.findUnique({ where: { id: expense.vendorId } }),
      (async () => {
        if (tx.$queryRaw) await tx.$queryRaw`SELECT id FROM "Allocation" WHERE id = ${expense.allocationId}::uuid FOR UPDATE`
        return tx.allocation.findUnique({ where: { id: expense.allocationId } })
      })(),
    ])
    if (!organization || organization.verificationStatus !== 'VERIFIED' || (organization.verificationExpiresAt && organization.verificationExpiresAt <= new Date())) throw new HttpError(403, 'ORGANIZATION_NOT_ELIGIBLE', 'The organization is not eligible for approval.')
    if (!vendor || vendor.verificationStatus !== 'VERIFIED' || (vendor.verificationExpiresAt && vendor.verificationExpiresAt <= new Date())) throw new HttpError(403, 'VENDOR_NOT_ELIGIBLE', 'The vendor is not verified for payout.')
    if (!allocation || allocation.status === 'FROZEN') throw new HttpError(409, 'ALLOCATION_FROZEN', 'The allocation is frozen.')
    const blockingFraud = await tx.fraudCase.findFirst({ where: { expenseRequestId: expenseId, severity: 'CRITICAL_CONFIRMED_BLOCKING', status: { not: 'FALSE_POSITIVE_RESOLVED' } } })
    if (blockingFraud) throw new HttpError(409, 'BLOCKING_FRAUD_CASE', 'A blocking fraud case prevents approval.')

    const approval = await tx.approval.create({ data: { expenseRequestId: expenseId, requestVersion: expense.version, approverId: userId, slot, decision: input.decision, reason: input.reason } })
    if (input.decision === 'REJECTED') {
      const rejected = await tx.expenseRequest.update({ where: { id: expenseId }, data: { status: 'REJECTED' } })
      await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: userId, actorRole: slot, action: 'EXPENSE_REJECTED', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { requestVersion: expense.version, reason: input.reason } })
      return { approval, expense: rejected }
    }
    if (priorApprovals.some((item) => item.decision === 'APPROVED')) {
      if (allocation.reservedPaise < expense.amountPaise) await reserveAllocationFunds(tx, allocation.id, expense.amountPaise - allocation.reservedPaise)
      const approved = await tx.expenseRequest.update({ where: { id: expenseId }, data: { status: 'APPROVED' } })
      await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: userId, actorRole: slot, action: 'EXPENSE_DUAL_APPROVED', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { requestVersion: expense.version, approverCount: 2 } })
      return { approval, expense: approved }
    }
    await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: userId, actorRole: slot, action: 'EXPENSE_APPROVAL_RECORDED', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { requestVersion: expense.version, approverCount: 1 } })
    return { approval, expense }
  }, { isolationLevel: 'Serializable' })
}

export async function freezeExpense(expenseId: string, actorUserId: string, reason: string, database = prisma) {
  if (!reason.trim()) throw new HttpError(400, 'FREEZE_REASON_REQUIRED', 'A freeze reason is required.')
  return database.$transaction(async (rawTx) => {
    const tx = rawTx as ApprovalTx
    const expense = await lockExpense(tx, expenseId)
    const updated = await tx.expenseRequest.update({ where: { id: expenseId }, data: { status: 'FROZEN', freezeReason: reason, frozenById: actorUserId, frozenAt: new Date() } })
    await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId, actorRole: 'AUDITOR', action: 'EXPENSE_FROZEN', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { reason } })
    return updated
  })
}

export async function unfreezeExpense(expenseId: string, actorUserId: string, reviewNote: string, database = prisma) {
  if (!reviewNote.trim()) throw new HttpError(400, 'REVIEW_NOTE_REQUIRED', 'A review note is required to unfreeze an expense.')
  return database.$transaction(async (rawTx) => {
    const tx = rawTx as ApprovalTx
    const expense = await lockExpense(tx, expenseId)
    if (expense.status !== 'FROZEN') throw new HttpError(409, 'EXPENSE_NOT_FROZEN', 'The expense is not frozen.')
    const allocation = await tx.allocation.findUnique({ where: { id: expense.allocationId } })
    if (allocation && allocation.reservedPaise >= expense.amountPaise) await releaseReservedFunds(tx, allocation.id, expense.amountPaise)
    const updated = await tx.expenseRequest.update({ where: { id: expenseId }, data: { status: 'PENDING_APPROVALS', version: { increment: 1 }, freezeReason: null, frozenById: null, frozenAt: null } })
    await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId, actorRole: 'AUDITOR', action: 'EXPENSE_UNFROZEN_VERSION_RESET', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { previousVersion: expense.version, reviewNote } })
    return updated
  })
}
