import type { ExpenseRequest, Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { assertOrganizationEligibleForFunds } from '../organizations/organization.service.js'
import { releaseReservedFunds, reserveAllocationFunds } from '../allocations/allocation.service.js'
import { recordAuditEvent } from '../audit/audit.service.js'

type ExpenseTx = Prisma.TransactionClient
type ExpenseInput = {
  organizationId: string
  allocationId: string
  requesterId: string
  vendorId: string
  amountPaise: number
  purpose: 'SCHOOL_FEES' | 'BOOKS' | 'UNIFORMS' | 'STATIONERY' | 'EDUCATION_SUPPLIES'
  description: string
  invoiceReference: string
  submit: boolean
}

async function validateExpense(tx: ExpenseTx, input: ExpenseInput) {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) throw new HttpError(400, 'INVALID_PAISA_AMOUNT', 'Amount must be a positive integer number of paise.')
  const [organization, allocation, vendor] = await Promise.all([
    tx.organization.findUnique({ where: { id: input.organizationId } }),
    tx.allocation.findUnique({ where: { id: input.allocationId } }),
    tx.vendor.findUnique({ where: { id: input.vendorId } }),
  ])
  if (!organization) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found.')
  await assertOrganizationEligibleForFunds(organization, tx)
  if (!allocation || allocation.organizationId !== input.organizationId) throw new HttpError(400, 'ALLOCATION_ORGANIZATION_MISMATCH', 'Allocation does not belong to this organization.')
  if (allocation.status !== 'ACTIVE') throw new HttpError(409, 'ALLOCATION_NOT_ACTIVE', 'Expenses require an active allocation.')
  if (allocation.purpose !== input.purpose) throw new HttpError(409, 'PURPOSE_MISMATCH', 'Expense purpose must match the allocation purpose.')
  if (!vendor || vendor.organizationId !== input.organizationId) throw new HttpError(400, 'VENDOR_ORGANIZATION_MISMATCH', 'Vendor does not belong to this organization.')
  return allocation
}

export async function createExpense(tx: ExpenseTx, input: ExpenseInput): Promise<ExpenseRequest> {
  const allocation = await validateExpense(tx, input)
  const status = input.submit ? 'PENDING_APPROVALS' : 'DRAFT'
  if (input.submit) await reserveAllocationFunds(tx, allocation.id, input.amountPaise)
  const expense = await tx.expenseRequest.create({ data: { organizationId: input.organizationId, allocationId: input.allocationId, requesterId: input.requesterId, vendorId: input.vendorId, amountPaise: input.amountPaise, purpose: input.purpose, description: input.description, invoiceReference: input.invoiceReference, correlationId: crypto.randomUUID(), version: 1, status } })
  await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: input.requesterId, actorRole: 'ORG_STAFF', action: input.submit ? 'EXPENSE_SUBMITTED' : 'EXPENSE_CREATED', entityType: 'ExpenseRequest', entityId: expense.id, metadata: { version: 1, amountPaise: expense.amountPaise, purpose: expense.purpose } })
  return expense
}

const MATERIAL_FIELDS = ['amountPaise', 'vendorId', 'purpose', 'invoiceReference', 'allocationId'] as const
type MaterialChanges = Partial<Pick<ExpenseInput, (typeof MATERIAL_FIELDS)[number]>>

export async function editExpense(tx: ExpenseTx, expenseId: string, changes: MaterialChanges, actorUserId: string): Promise<ExpenseRequest> {
  const existing = await tx.expenseRequest.findUnique({ where: { id: expenseId } })
  if (!existing) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
  if (!['SUBMITTED', 'PENDING_APPROVALS', 'APPROVED'].includes(existing.status)) throw new HttpError(409, 'EXPENSE_NOT_EDITABLE', 'This expense cannot be materially edited in its current state.')
  const materialChanged = MATERIAL_FIELDS.some((field) => changes[field] !== undefined && changes[field] !== existing[field])
  if (!materialChanged) return existing
  const next = { organizationId: existing.organizationId, allocationId: changes.allocationId ?? existing.allocationId, requesterId: existing.requesterId, vendorId: changes.vendorId ?? existing.vendorId, amountPaise: changes.amountPaise ?? existing.amountPaise, purpose: changes.purpose ?? existing.purpose, description: existing.description, invoiceReference: changes.invoiceReference ?? existing.invoiceReference, submit: true }
  await validateExpense(tx, next)
  if (existing.status === 'APPROVED' || existing.status === 'PENDING_APPROVALS') await releaseReservedFunds(tx, existing.allocationId, existing.amountPaise)
  await reserveAllocationFunds(tx, next.allocationId, next.amountPaise)
  const updated = await tx.expenseRequest.update({ where: { id: expenseId }, data: { allocationId: next.allocationId, vendorId: next.vendorId, amountPaise: next.amountPaise, purpose: next.purpose, invoiceReference: next.invoiceReference, version: { increment: 1 }, status: 'PENDING_APPROVALS' } })
  await recordAuditEvent(tx, { correlationId: updated.correlationId, actorUserId, actorRole: 'ORG_STAFF', action: 'EXPENSE_VERSION_INCREMENTED_APPROVALS_INVALIDATED', entityType: 'ExpenseRequest', entityId: expenseId, metadata: { previousVersion: existing.version, currentVersion: updated.version, changedFields: MATERIAL_FIELDS.filter((field) => changes[field] !== undefined) } })
  return updated
}
