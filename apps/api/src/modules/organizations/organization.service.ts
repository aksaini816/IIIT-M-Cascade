import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'

type OrganizationDatabase = { organization: { update: (args: { where: { id: string }; data: { verificationStatus: 'EXPIRED' } }) => Promise<unknown> } }
type OrganizationLike = {
  id: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED'
  verificationExpiresAt: Date | null
}

export async function assertOrganizationEligibleForFunds(org: OrganizationLike, database: OrganizationDatabase = prisma): Promise<OrganizationLike> {
  if (org.verificationStatus === 'VERIFIED' && (!org.verificationExpiresAt || org.verificationExpiresAt > new Date())) return org
  if (org.verificationStatus === 'VERIFIED' && org.verificationExpiresAt && org.verificationExpiresAt <= new Date()) {
    await database.organization.update({ where: { id: org.id }, data: { verificationStatus: 'EXPIRED' } })
    org.verificationStatus = 'EXPIRED'
  }
  throw new HttpError(403, 'ORGANIZATION_NOT_ELIGIBLE', 'This organization is not eligible to receive funds.')
}

export function assertNoSelfPromotion(actorUserId: string, targetUserId: string, role: 'ORG_STAFF' | 'APPROVER_A' | 'APPROVER_B' | 'AUDITOR') {
  if (actorUserId === targetUserId && role !== 'ORG_STAFF') throw new HttpError(403, 'SELF_PROMOTION_FORBIDDEN', 'Users cannot self-promote to an elevated organization role.')
}
