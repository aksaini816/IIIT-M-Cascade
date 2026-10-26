import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { requireAuth, requirePlatformRole } from '../../middleware/rbac.js'
import type { Prisma } from '@prisma/client'
import { recordAuditEvent } from '../audit/audit.service.js'
const schema = z.object({ organizationId: z.string().uuid(), campaignId: z.string().uuid(), title: z.string().min(2), narrative: z.string().min(10), beneficiaryCountAnonymized: z.number().int().nonnegative(), metricsJson: z.record(z.string(), z.unknown()), evidenceFileIdsJson: z.array(z.string()) })
export const impactRouter = Router()
impactRouter.get('/public/:campaignId', async (req, res, next) => { try { const campaignId = String(req.params.campaignId); const where = campaignId === 'all' ? { reviewStatus: 'VERIFIED_PUBLISHED' as const } : { campaignId, reviewStatus: 'VERIFIED_PUBLISHED' as const }; res.json({ reports: await prisma.impactReport.findMany({ where }) }) } catch (e) { next(e) } })
impactRouter.use(requireAuth)
impactRouter.post('/', async (req, res, next) => { try { const data = schema.parse(req.body); const report = await prisma.impactReport.create({ data: { ...data, metricsJson: data.metricsJson as Prisma.InputJsonValue, evidenceFileIdsJson: data.evidenceFileIdsJson as Prisma.InputJsonValue } }); res.status(201).json({ report }) } catch (e) { next(e) } })
impactRouter.post('/:id/verify', requirePlatformRole(['PLATFORM_ADMIN', 'AUDITOR']), async (req, res, next) => { try { const report = await prisma.$transaction(async (tx) => { const updated = await tx.impactReport.update({ where: { id: String(req.params.id) }, data: { reviewStatus: 'VERIFIED_PUBLISHED', reviewerId: req.sessionContext!.userId, publishedAt: new Date() } }); await recordAuditEvent(tx, { correlationId: updated.campaignId, actorUserId: req.sessionContext!.userId, actorRole: req.sessionContext!.user.platformRole, action: 'IMPACT_REPORT_VERIFIED_PUBLISHED', entityType: 'ImpactReport', entityId: updated.id, metadata: { beneficiaryCountAnonymized: updated.beneficiaryCountAnonymized } }); return updated }); res.json({ report }) } catch (e) { next(e) } })
