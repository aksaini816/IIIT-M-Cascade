import { describe, expect, it, vi } from 'vitest'
import { authorizedEvidenceAccess } from '../src/modules/evidence/evidence.routes.js'
import { assertPayoutEligible, evaluateEvidenceFraud } from '../src/modules/fraud/fraud.engine.js'
import { validateEvidenceBytes } from '../src/modules/evidence/evidence.validation.js'

describe('private evidence and duplicate fraud rule', () => {
  it('detects a repeated SHA-256 evidence hash as RULE_01', async () => {
    const create = vi.fn().mockResolvedValue({ ruleCode: 'RULE_01_DUPLICATE_EVIDENCE_HASH' })
    const tx: any = {
      evidenceFile: { findFirst: vi.fn().mockResolvedValue({ id: 'existing', expenseRequestId: 'other' }) },
      fraudCase: { create },
    }
    const cases = await evaluateEvidenceFraud(tx, { id: 'expense-2', organizationId: 'org-1' }, 'abc123')
    expect(cases[0].ruleCode).toBe('RULE_01_DUPLICATE_EVIDENCE_HASH')
    expect(create).toHaveBeenCalled()
  })

  it('blocks payout eligibility when the duplicate hash case is unresolved', async () => {
    const tx: any = { fraudCase: { findFirst: vi.fn().mockResolvedValue({ ruleCode: 'RULE_01_DUPLICATE_EVIDENCE_HASH', isBlocking: true, status: 'OPEN' }) } }
    await expect(assertPayoutEligible(tx, 'expense-2')).rejects.toMatchObject({ code: 'PAYOUT_BLOCKED_FRAUD' })
  })

  it('rejects mismatched magic bytes before storage', () => {
    expect(() => validateEvidenceBytes(Buffer.from('not-a-pdf'), 'application/pdf')).toThrowError(expect.objectContaining({ code: 'EVIDENCE_MAGIC_BYTES_INVALID' }))
  })

  it('does not authorize an unrelated user to download private evidence', async () => {
    const database: any = {
      expenseRequest: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) },
      organizationMembership: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    await expect(authorizedEvidenceAccess('expense-1', 'unrelated-user', 'DONOR', database)).resolves.toBe(false)
    await expect(authorizedEvidenceAccess('expense-1', 'auditor', 'AUDITOR', database)).resolves.toBe(true)
  })
})
