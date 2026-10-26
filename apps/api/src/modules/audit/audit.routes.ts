import { Router } from 'express'
import { requireAuth } from '../../middleware/rbac.js'
import { auditTimeline, listAuditEvents, verifyAuditIntegrity } from './audit.controller.js'

export const auditRouter = Router()
auditRouter.use(requireAuth)
auditRouter.get('/', listAuditEvents)
auditRouter.get('/timeline/:correlationId', auditTimeline)
auditRouter.get('/verify-integrity', verifyAuditIntegrity)
auditRouter.post('/verify-integrity', verifyAuditIntegrity)
