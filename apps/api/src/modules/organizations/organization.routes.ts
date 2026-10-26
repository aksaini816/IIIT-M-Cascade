import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { assertNoSelfPromotion } from './organization.service.js'

const onboardingSchema = z.object({
  legalName: z.string().trim().min(2),
  displayName: z.string().trim().min(2),
  type: z.enum(['NGO', 'SCHOOL']),
  registrationNumber: z.string().trim().optional(),
  panOrDarpanRef: z.string().trim().optional(),
  privateDocRefsJson: z.record(z.string(), z.unknown()).optional(),
})
const verifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED']),
  reviewNotes: z.string().trim().max(4000).optional(),
  verificationExpiresAt: z.coerce.date().nullable().optional(),
})
const memberSchema = z.object({ userId: z.string().uuid(), role: z.enum(['ORG_STAFF', 'APPROVER_A', 'APPROVER_B', 'AUDITOR']) })

function publicOrganization(org: Record<string, unknown>, includePrivate: boolean) {
  if (includePrivate) return org
  const { privateDocRefsJson: _privateDocs, ...safe } = org
  return safe
}

export const organizationRouter = Router()

organizationRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const data = onboardingSchema.parse(request.body)
    const organization = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: { ...data, privateDocRefsJson: data.privateDocRefsJson as Prisma.InputJsonValue, verificationStatus: 'PENDING' } })
      await tx.organizationMembership.create({ data: { organizationId: created.id, userId: request.sessionContext!.userId, role: 'ORG_STAFF' } })
      await recordAuditEvent(tx, { correlationId: created.id, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'ORGANIZATION_CREATED', entityType: 'Organization', entityId: created.id, metadata: { type: created.type, verificationStatus: created.verificationStatus } })
      return created
    })
    response.status(201).json({ organization: publicOrganization(organization, true) })
  } catch (error) {
    next(error)
  }
})

organizationRouter.get('/', async (request, response, next) => {
  try {
    const isAdmin = request.sessionContext?.user.platformRole === 'PLATFORM_ADMIN'
    const organizations = await prisma.organization.findMany({ where: isAdmin ? undefined : { verificationStatus: 'VERIFIED' }, orderBy: { displayName: 'asc' } })
    response.json({ organizations: organizations.map((org) => publicOrganization(org, Boolean(isAdmin))) })
  } catch (error) {
    next(error)
  }
})

organizationRouter.get('/:id', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const organization = await prisma.organization.findUnique({ where: { id } })
    if (!organization) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found.')
    const isReviewer = request.sessionContext?.user.platformRole === 'PLATFORM_ADMIN' || request.sessionContext?.user.platformRole === 'AUDITOR' || organization.reviewerId === request.sessionContext?.userId
    response.json({ organization: publicOrganization(organization, Boolean(isReviewer)) })
  } catch (error) {
    next(error)
  }
})

organizationRouter.post('/:id/verify', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (request, response, next) => {
  try {
    const data = verifySchema.parse(request.body)
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const organization = await prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findUnique({ where: { id } })
      if (!existing) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found.')
      const updated = await tx.organization.update({ where: { id }, data: { verificationStatus: data.status, reviewNotes: data.reviewNotes, reviewerId: request.sessionContext!.userId, reviewedAt: new Date(), verificationExpiresAt: data.status === 'VERIFIED' ? data.verificationExpiresAt : null } })
      await recordAuditEvent(tx, { correlationId: id, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'ORGANIZATION_VERIFICATION_UPDATED', entityType: 'Organization', entityId: id, metadata: { status: data.status, reviewNotes: data.reviewNotes } })
      return updated
    })
    response.json({ organization })
  } catch (error) {
    next(error)
  }
})

organizationRouter.post('/:id/members', requireAuth, async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const data = memberSchema.parse(request.body)
    const actor = request.sessionContext!
    const canManage = actor.user.platformRole === 'PLATFORM_ADMIN' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId: id, userId: actor.userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }))
    if (!canManage) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot manage this organization membership.')
    assertNoSelfPromotion(actor.userId, data.userId, data.role)
    const conflicting = data.role === 'APPROVER_A' ? 'APPROVER_B' : data.role === 'APPROVER_B' ? 'APPROVER_A' : null
    if (conflicting && await prisma.organizationMembership.findFirst({ where: { organizationId: id, userId: data.userId, role: conflicting, isActive: true } })) throw new HttpError(409, 'APPROVER_ROLE_CONFLICT', 'A user cannot hold both approver roles.')
    const membership = await prisma.$transaction(async (tx) => {
      const created = await tx.organizationMembership.upsert({ where: { userId_organizationId_role: { userId: data.userId, organizationId: id, role: data.role } }, create: { userId: data.userId, organizationId: id, role: data.role }, update: { isActive: true } })
      await recordAuditEvent(tx, { correlationId: id, actorUserId: actor.userId, actorRole: actor.user.platformRole, action: 'ORGANIZATION_MEMBER_ROLE_ASSIGNED', entityType: 'OrganizationMembership', entityId: created.id, metadata: { targetUserId: data.userId, role: data.role } })
      return created
    })
    response.status(201).json({ membership })
  } catch (error) {
    next(error)
  }
})
