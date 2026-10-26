import type { RequestHandler } from 'express'
import { prisma } from '../../prisma.js'
import { verifyIntegrityFromStore } from './audit.service.js'

export const listAuditEvents: RequestHandler = async (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 50, 1), 100)
    const q = request.query
    const createdAt = q.from || q.to ? { ...(q.from ? { gte: new Date(String(q.from)) } : {}), ...(q.to ? { lte: new Date(String(q.to)) } : {}) } : undefined
    const where = {
      ...(q.correlationId ? { correlationId: String(q.correlationId) } : {}),
      ...(q.entityType ? { entityType: String(q.entityType) } : {}),
      ...(q.entityId ? { entityId: String(q.entityId) } : {}),
      ...(q.action ? { action: String(q.action) } : {}),
      ...(q.actorUserId ? { actorUserId: String(q.actorUserId) } : {}),
      ...(createdAt ? { createdAt } : {}),
    }
    const [events, total] = await prisma.$transaction([prisma.auditEvent.findMany({ where, orderBy: { sequenceNumber: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.auditEvent.count({ where })])
    response.json({ data: events, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  } catch (error) {
    next(error)
  }
}

export const auditTimeline: RequestHandler = async (request, response, next) => {
  try {
    const correlationId = typeof request.params.correlationId === 'string' ? request.params.correlationId : ''
    const events = await prisma.auditEvent.findMany({ where: { correlationId }, orderBy: { sequenceNumber: 'asc' } })
    response.json({ correlationId, lifecycle: events })
  } catch (error) {
    next(error)
  }
}

export const verifyAuditIntegrity: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await verifyIntegrityFromStore(prisma))
  } catch (error) {
    next(error)
  }
}
