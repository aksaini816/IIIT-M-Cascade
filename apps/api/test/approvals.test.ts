import { describe, expect, it, vi } from 'vitest'
import { submitApprovalDecision } from '../src/modules/approvals/approvals.service.js'

function approvalDatabase() {
  const expense: any = { id: 'expense-1', correlationId: 'corr-1', organizationId: 'org-1', allocationId: 'allocation-1', requesterId: 'requester-1', vendorId: 'vendor-1', amountPaise: 700_000, version: 1, status: 'PENDING_APPROVALS' }
  const allocation: any = { id: 'allocation-1', status: 'ACTIVE', approvedBudgetPaise: 1_000_000, reservedPaise: 0, disbursedPaise: 0, version: 1 }
  const approvals: any[] = []
  const memberships = new Map([['approver-a', 'APPROVER_A'], ['approver-b', 'APPROVER_B']])
  const tx: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    expenseRequest: { findUnique: vi.fn().mockResolvedValue(expense), update: vi.fn().mockImplementation(({ data }: any) => Object.assign(expense, data)) },
    organizationMembership: { findFirst: vi.fn().mockImplementation(({ where }: any) => Promise.resolve(memberships.has(where.userId) && (!where.role?.in || where.role.in.includes(memberships.get(where.userId))) ? { role: memberships.get(where.userId) } : null)) },
    approval: { findMany: vi.fn().mockResolvedValue(approvals), create: vi.fn().mockImplementation(({ data }: any) => { const approval = { id: `approval-${approvals.length + 1}`, ...data }; approvals.push(approval); return Promise.resolve(approval) }) },
    organization: { findUnique: vi.fn().mockResolvedValue({ id: 'org-1', verificationStatus: 'VERIFIED', verificationExpiresAt: null }) },
    vendor: { findUnique: vi.fn().mockResolvedValue({ id: 'vendor-1', organizationId: 'org-1', verificationStatus: 'VERIFIED', verificationExpiresAt: null }) },
    allocation: { findUnique: vi.fn().mockResolvedValue(allocation), update: vi.fn().mockImplementation(({ data }: any) => { allocation.reservedPaise += data.reservedPaise.increment ?? 0; return Promise.resolve(allocation) }) },
    fraudCase: { findFirst: vi.fn().mockResolvedValue(null) },
    auditEvent: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
  }
  return { database: { $transaction: (callback: (transaction: any) => unknown) => callback(tx) } as any, tx, expense, allocation, approvals }
}

describe('mandatory two-person approval', () => {
  it('requires two distinct approvers and reserves funds on the second approval', async () => {
    const fixture = approvalDatabase()
    await submitApprovalDecision('approver-a', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)
    const result = await submitApprovalDecision('approver-b', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)
    expect(result.expense.status).toBe('APPROVED')
    expect(fixture.approvals).toHaveLength(2)
    expect(fixture.allocation.reservedPaise).toBe(700_000)
  })

  it('rejects self-approval', async () => {
    const fixture = approvalDatabase()
    await expect(submitApprovalDecision('requester-1', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)).rejects.toMatchObject({ code: 'SELF_APPROVAL_FORBIDDEN' })
  })

  it('rejects the same user from approving twice', async () => {
    const fixture = approvalDatabase()
    await submitApprovalDecision('approver-a', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)
    await expect(submitApprovalDecision('approver-a', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)).rejects.toMatchObject({ code: 'DUPLICATE_APPROVAL' })
  })

  it('does not allow a platform-admin role to bypass approver membership', async () => {
    const fixture = approvalDatabase()
    await expect(submitApprovalDecision('platform-admin', 'expense-1', { requestVersion: 1, decision: 'APPROVED' }, fixture.database)).rejects.toMatchObject({ code: 'APPROVER_ROLE_REQUIRED' })
  })
})
