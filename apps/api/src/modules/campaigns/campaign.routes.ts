import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth } from '../../middleware/rbac.js'
import { assertOrganizationEligibleForFunds } from '../organizations/organization.service.js'
import { recordAuditEvent } from '../audit/audit.service.js'

const campaignSchema = z.object({ organizationId: z.string().uuid(), slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/), title: z.string().trim().min(2), description: z.string().trim().min(2), purposeCategory: z.enum(['SCHOOL_FEES', 'BOOKS', 'UNIFORMS', 'STATIONERY', 'EDUCATION_SUPPLIES']), targetAmountPaise: z.number().int().positive().safe(), status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('DRAFT'), isPublic: z.boolean().default(false) })

async function stats(campaignId: string) {
  const [donations, allocations, payouts, impact] = await Promise.all([
    prisma.donation.aggregate({ where: { campaignId, status: 'CONFIRMED' }, _sum: { amountPaise: true } }),
    prisma.allocation.aggregate({ where: { campaignId }, _sum: { approvedBudgetPaise: true } }),
    prisma.payout.aggregate({ where: { expenseRequest: { allocation: { campaignId } }, status: 'PAID' }, _sum: { amountPaise: true } }),
    prisma.impactReport.count({ where: { campaignId, reviewStatus: 'VERIFIED_PUBLISHED' } }),
  ])
  return { confirmedDonationsPaise: donations._sum.amountPaise ?? 0, allocatedBudgetPaise: allocations._sum.approvedBudgetPaise ?? 0, executedPayoutsPaise: payouts._sum.amountPaise ?? 0, verifiedSpendPaise: payouts._sum.amountPaise ?? 0, verifiedImpactReports: impact }
}

export const campaignRouter = Router()
campaignRouter.get('/', async (request, response, next) => {
  try {
    const purposeCategory = typeof request.query.purposeCategory === 'string' ? request.query.purposeCategory : undefined
    const campaigns = await prisma.campaign.findMany({ where: { status: 'ACTIVE', isPublic: true, organization: { verificationStatus: 'VERIFIED' }, ...(purposeCategory ? { purposeCategory: purposeCategory as never } : {}) }, include: { organization: { select: { id: true, displayName: true, type: true, verificationStatus: true } } }, orderBy: { createdAt: 'desc' } })
    response.json({ campaigns: await Promise.all(campaigns.map(async (campaign) => ({ ...campaign, story: campaign.description, purpose: campaign.purposeCategory, organizationName: campaign.organization.displayName, organizationType: campaign.organization.type, organizationVerified: campaign.organization.verificationStatus === 'VERIFIED', stats: await stats(campaign.id) }))) })
  } catch (error) { next(error) }
})

campaignRouter.get('/:slugOrId', async (request, response, next) => {
  try {
    const key = typeof request.params.slugOrId === 'string' ? request.params.slugOrId : ''
    const lookup = [{ slug: key }, ...(z.string().uuid().safeParse(key).success ? [{ id: key }] : [])]
    const campaign = await prisma.campaign.findFirst({ where: { OR: lookup, isPublic: true, status: 'ACTIVE', organization: { verificationStatus: 'VERIFIED' } }, include: { organization: { select: { id: true, displayName: true, type: true, verificationStatus: true } }, allocations: { include: { expenseRequests: { include: { vendor: true, evidenceFiles: true, payouts: true, approvals: { include: { approver: { select: { displayName: true } } } } }, orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } }, impactReports: { where: { reviewStatus: 'VERIFIED_PUBLISHED' }, orderBy: { publishedAt: 'desc' } }, donations: { where: { status: 'CONFIRMED' }, select: { id: true, amountPaise: true, isAnonymous: true, createdAt: true }, orderBy: { createdAt: 'desc' } } } })
    if (!campaign) throw new HttpError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
    const { allocations, impactReports, donations, ...campaignFields } = campaign
    response.json({ campaign: { ...campaignFields, story: campaign.description, purpose: campaign.purposeCategory, organizationName: campaign.organization.displayName, organizationType: campaign.organization.type, organizationVerified: campaign.organization.verificationStatus === 'VERIFIED' }, transparency: await stats(campaign.id), allocations, expenseBills: allocations.flatMap((allocation) => allocation.expenseRequests), impactReports, confirmedDonations: donations })
  } catch (error) { next(error) }
})

campaignRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const data = campaignSchema.parse(request.body)
    const organization = await prisma.organization.findUnique({ where: { id: data.organizationId } })
    if (!organization) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found.')
    if (!await prisma.organizationMembership.findFirst({ where: { organizationId: data.organizationId, userId: request.sessionContext!.userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }) && request.sessionContext!.user.platformRole !== 'PLATFORM_ADMIN') throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot manage campaigns for this organization.')
    if (data.status === 'ACTIVE' || data.isPublic) await assertOrganizationEligibleForFunds(organization)
    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({ data })
      await recordAuditEvent(tx, { correlationId: created.id, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'CAMPAIGN_CREATED', entityType: 'Campaign', entityId: created.id, metadata: { status: created.status, isPublic: created.isPublic } })
      return created
    })
    response.status(201).json({ campaign })
  } catch (error) { next(error) }
})

campaignRouter.patch('/:id', requireAuth, async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const existing = await prisma.campaign.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
    if (!await prisma.organizationMembership.findFirst({ where: { organizationId: existing.organizationId, userId: request.sessionContext!.userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }) && request.sessionContext!.user.platformRole !== 'PLATFORM_ADMIN') throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot manage this campaign.')
    const data = campaignSchema.partial().omit({ organizationId: true }).parse(request.body)
    const organization = await prisma.organization.findUnique({ where: { id: existing.organizationId } })
    if ((data.status === 'ACTIVE' || data.isPublic === true) && organization) await assertOrganizationEligibleForFunds(organization)
    const campaign = await prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({ where: { id }, data })
      await recordAuditEvent(tx, { correlationId: id, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'CAMPAIGN_UPDATED', entityType: 'Campaign', entityId: id, metadata: data })
      return updated
    })
    response.json({ campaign })
  } catch (error) { next(error) }
})
