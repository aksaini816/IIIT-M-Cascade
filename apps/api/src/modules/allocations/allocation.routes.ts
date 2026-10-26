import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { reserveAllocationFunds } from './allocation.service.js'

const allocationSchema = z.object({ campaignId: z.string().uuid(), organizationId: z.string().uuid(), purpose: z.enum(['SCHOOL_FEES', 'BOOKS', 'UNIFORMS', 'STATIONERY', 'EDUCATION_SUPPLIES']), approvedBudgetPaise: z.number().int().positive().safe() })

async function canManage(organizationId: string, userId: string, platformRole: string) {
  return platformRole === 'PLATFORM_ADMIN' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId, userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }))
}

export const allocationRouter = Router()
allocationRouter.get('/', async (request, response, next) => {
  try {
    const campaignId = typeof request.query.campaignId === 'string' ? request.query.campaignId : undefined
    const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined
    const allocations = await prisma.allocation.findMany({ where: { ...(campaignId ? { campaignId } : {}), ...(organizationId ? { organizationId } : {}) }, orderBy: { createdAt: 'desc' } })
    response.json({ allocations: allocations.map((allocation) => ({ ...allocation, availablePaise: allocation.approvedBudgetPaise - allocation.reservedPaise - allocation.disbursedPaise })) })
  } catch (error) { next(error) }
})

allocationRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const data = allocationSchema.parse(request.body)
    if (!await canManage(data.organizationId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot manage allocations for this organization.')
    const campaign = await prisma.campaign.findUnique({ where: { id: data.campaignId } })
    if (!campaign || campaign.organizationId !== data.organizationId) throw new HttpError(400, 'CAMPAIGN_ORGANIZATION_MISMATCH', 'Campaign does not belong to this organization.')
    const allocation = await prisma.$transaction(async (tx) => {
      const created = await tx.allocation.create({ data: { ...data, correlationId: campaign.id } })
      await recordAuditEvent(tx, { correlationId: campaign.id, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'ALLOCATION_CREATED', entityType: 'Allocation', entityId: created.id, metadata: { purpose: created.purpose, approvedBudgetPaise: created.approvedBudgetPaise } })
      return created
    })
    response.status(201).json({ allocation })
  } catch (error) { next(error) }
})

allocationRouter.post('/:id/freeze', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const reason = z.object({ reason: z.string().trim().min(1).max(2000) }).parse(request.body).reason
    const allocation = await prisma.$transaction(async (tx) => {
      const updated = await tx.allocation.update({ where: { id }, data: { status: 'FROZEN', freezeReason: reason, frozenByUserId: request.sessionContext!.userId, frozenAt: new Date(), version: { increment: 1 } } })
      await recordAuditEvent(tx, { correlationId: updated.correlationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'ALLOCATION_FROZEN', entityType: 'Allocation', entityId: id, metadata: { reason } })
      return updated
    })
    response.json({ allocation })
  } catch (error) { next(error) }
})

allocationRouter.post('/:id/unfreeze', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const allocation = await prisma.$transaction(async (tx) => {
      const existing = await tx.allocation.findUnique({ where: { id } })
      if (!existing) throw new HttpError(404, 'ALLOCATION_NOT_FOUND', 'Allocation not found.')
      const updated = await tx.allocation.update({ where: { id }, data: { status: 'ACTIVE', freezeReason: null, frozenByUserId: null, frozenAt: null, version: { increment: 1 } } })
      await recordAuditEvent(tx, { correlationId: updated.correlationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'ALLOCATION_UNFROZEN', entityType: 'Allocation', entityId: id, metadata: { previousReason: existing.freezeReason } })
      return updated
    })
    response.json({ allocation })
  } catch (error) { next(error) }
})
