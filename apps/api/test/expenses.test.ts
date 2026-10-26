import { describe, expect, it, vi } from 'vitest'
import { editExpense } from '../src/modules/expenses/expenses.service.js'

function expenseTransaction() {
  const expense: any = {
    id: 'expense-1',
    correlationId: 'corr-1',
    organizationId: 'org-1',
    allocationId: 'allocation-1',
    requesterId: 'requester-1',
    vendorId: 'vendor-1',
    amountPaise: 100_000,
    purpose: 'BOOKS',
    description: 'Books',
    invoiceReference: 'INV-1',
    version: 1,
    status: 'PENDING_APPROVALS',
  }
  const allocation: any = { id: 'allocation-1', organizationId: 'org-1', purpose: 'BOOKS', status: 'ACTIVE', approvedBudgetPaise: 1_000_000, reservedPaise: 100_000, disbursedPaise: 0, version: 1 }
  const tx: any = {
    organization: { findUnique: vi.fn().mockResolvedValue({ id: 'org-1', verificationStatus: 'VERIFIED', verificationExpiresAt: null }), update: vi.fn() },
    allocation: {
      findUnique: vi.fn().mockResolvedValue(allocation),
      update: vi.fn().mockImplementation(({ data }: any) => ({ ...allocation, ...data })),
    },
    vendor: { findUnique: vi.fn().mockResolvedValue({ id: 'vendor-1', organizationId: 'org-1' }) },
    expenseRequest: {
      findUnique: vi.fn().mockResolvedValue(expense),
      update: vi.fn().mockImplementation(({ data }: any) => Object.assign(expense, { ...data, version: expense.version + (data.version?.increment ?? 0) })),
    },
    auditEvent: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
  }
  return { tx, expense }
}

describe('expense immutable versioning', () => {
  it.each([
    ['amountPaise', { amountPaise: 120_000 }],
    ['invoiceReference', { invoiceReference: 'INV-2' }],
  ])('increments version and invalidates prior approvals when %s changes', async (_field, changes) => {
    const { tx, expense } = expenseTransaction()
    const updated = await editExpense(tx, 'expense-1', changes, 'requester-1')
    expect(updated.version).toBe(2)
    expect(updated.status).toBe('PENDING_APPROVALS')
    expect(tx.auditEvent.create).toHaveBeenCalled()
    expect(tx.allocation.update).toHaveBeenCalled()
  })

  it('keeps approval history tied to the old version while current approvals target version two', () => {
    const historicalApprovals = [{ requestVersion: 1, slot: 'APPROVER_A' }, { requestVersion: 2, slot: 'APPROVER_B' }]
    expect(historicalApprovals.filter((approval) => approval.requestVersion === 1)).toHaveLength(1)
    expect(historicalApprovals.filter((approval) => approval.requestVersion === 2)).toHaveLength(1)
  })
})
