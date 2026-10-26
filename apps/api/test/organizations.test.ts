import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/middleware/errors.js'
import { assertNoSelfPromotion, assertOrganizationEligibleForFunds } from '../src/modules/organizations/organization.service.js'

describe('organization fund eligibility', () => {
  for (const status of ['PENDING', 'REJECTED', 'SUSPENDED', 'EXPIRED'] as const) {
    it(`blocks ${status} organizations`, async () => {
      await expect(assertOrganizationEligibleForFunds({ id: 'org-1', verificationStatus: status, verificationExpiresAt: null }, { organization: { update: vi.fn() } } as never)).rejects.toMatchObject({ code: 'ORGANIZATION_NOT_ELIGIBLE' })
    })
  }

  it('expires and blocks an organization whose verification date has passed', async () => {
    const update = vi.fn()
    const organization = { id: 'org-1', verificationStatus: 'VERIFIED' as const, verificationExpiresAt: new Date(Date.now() - 1) }
    await expect(assertOrganizationEligibleForFunds(organization, { organization: { update } } as never)).rejects.toBeInstanceOf(HttpError)
    expect(organization.verificationStatus).toBe('EXPIRED')
    expect(update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { verificationStatus: 'EXPIRED' } })
  })

  it('rejects staff self-promotion to an approver role', () => {
    expect(() => assertNoSelfPromotion('user-1', 'user-1', 'APPROVER_A')).toThrowError(expect.objectContaining({ code: 'SELF_PROMOTION_FORBIDDEN' }))
    expect(() => assertNoSelfPromotion('user-1', 'user-1', 'ORG_STAFF')).not.toThrow()
  })
})
