import type { Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { commitDisbursedFunds, releaseReservedFunds } from '../allocations/allocation.service.js'
import { payoutAdapter } from '../../providers/payouts/index.js'

type Tx = Prisma.TransactionClient & { $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> }
export function payoutIdempotencyKey(expenseId: string, version: number) { return `payout:${expenseId}:v${version}` }
async function lockExpense(tx: Tx, id: string) {
  if (tx.$queryRaw) await tx.$queryRaw`SELECT id FROM "ExpenseRequest" WHERE id = ${id}::uuid FOR UPDATE`
  const expense = await tx.expenseRequest.findUnique({ where: { id }, include: { organization: true, allocation: true, vendor: true, evidenceFiles: true } })
  if (!expense) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
  return expense
}
export async function initiatePayout(expenseId: string, actorUserId: string, database = prisma) {
  return database.$transaction(async (rawTx) => {
    const tx = rawTx as Tx
    const expense = await lockExpense(tx, expenseId)
    if (expense.organization.verificationStatus !== 'VERIFIED' || (expense.organization.verificationExpiresAt && expense.organization.verificationExpiresAt <= new Date())) throw new HttpError(409, 'ORGANIZATION_NOT_ELIGIBLE', 'Organization is not active and verified.')
    if (expense.allocation.status !== 'ACTIVE' || expense.allocation.purpose !== expense.purpose || expense.allocation.reservedPaise < expense.amountPaise) throw new HttpError(409, 'ALLOCATION_GATE_FAILED', 'Allocation is incompatible or lacks reserved balance.')
    if (expense.status !== 'APPROVED') throw new HttpError(409, 'EXPENSE_NOT_APPROVED', 'Only approved expenses can be paid.')
    const blocking = await tx.fraudCase.findFirst({ where: { expenseRequestId: expenseId, isBlocking: true, status: { not: 'FALSE_POSITIVE_RESOLVED' } } })
    if (blocking) throw new HttpError(409, 'PAYOUT_BLOCKED_FRAUD', 'Payout is blocked by an unresolved fraud case.')
    if (!expense.evidenceFiles.some((file) => file.verificationStatus === 'VERIFIED')) throw new HttpError(409, 'VERIFIED_EVIDENCE_REQUIRED', 'At least one verified evidence file is required.')
    const approvals = await tx.approval.findMany({ where: { expenseRequestId: expenseId, requestVersion: expense.version, decision: 'APPROVED' } })
    if (approvals.length !== 2 || new Set(approvals.map((a) => a.approverId)).size !== 2 || approvals.some((a) => a.approverId === expense.requesterId)) throw new HttpError(409, 'DUAL_APPROVAL_GATE_FAILED', 'Exactly two distinct authorized approvals are required.')
    if (expense.vendor.verificationStatus !== 'VERIFIED' || !expense.vendor.encryptedPayoutDestRef) throw new HttpError(409, 'VENDOR_GATE_FAILED', 'Vendor destination is not verified.')
    const existing = await tx.payout.findFirst({ where: { expenseRequestId: expenseId, status: { in: ['PENDING', 'SUBMITTED', 'PROCESSING', 'PAID', 'AMBIGUOUS_RECONCILIATION_REQUIRED'] } } })
    if (existing) throw new HttpError(409, 'PAYOUT_ALREADY_EXISTS', 'A payout already exists for this expense.')
    const idempotencyKey = payoutIdempotencyKey(expense.id, expense.version)
    const payout = await tx.payout.create({ data: { correlationId: expense.correlationId, expenseRequestId: expense.id, approvedVersion: expense.version, amountPaise: expense.amountPaise, provider: 'SIMULATION', idempotencyKey, status: 'SUBMITTED', isSimulated: true, initiatedAt: new Date() } })
    const outcome = await payoutAdapter().createPayout({ payoutId: payout.id, idempotencyKey, amountPaise: payout.amountPaise, currency: 'INR', destinationRef: expense.vendor.encryptedPayoutDestRef, narration: `KINDORA payout ${expense.id}` })
    const updated = await tx.payout.update({ where: { id: payout.id }, data: { providerTransferRef: outcome.providerTransferRef, status: outcome.status } })
    if (outcome.status === 'PAID') {
      await commitDisbursedFunds(tx, expense.allocationId, expense.amountPaise)
      await tx.expenseRequest.update({ where: { id: expense.id }, data: { status: 'PAID' } })
    } else if (outcome.status === 'FAILED') await releaseReservedFunds(tx, expense.allocationId, expense.amountPaise)
    await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId, actorRole: 'PAYOUT_ENGINE', action: outcome.status === 'PAID' ? 'PAYOUT_PAID' : outcome.status === 'FAILED' ? 'PAYOUT_FAILED' : 'PAYOUT_AMBIGUOUS', entityType: 'Payout', entityId: payout.id, metadata: { amountPaise: payout.amountPaise, approvedVersion: expense.version } })
    return updated
  }, { isolationLevel: 'Serializable' })
}
