import { Router } from 'express'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth } from '../../middleware/rbac.js'
import { recordAuditEvent } from '../audit/audit.service.js'
import { evaluateEvidenceFraud } from '../fraud/fraud.engine.js'
import { EVIDENCE_SHA256_NOTE, validateEvidenceBytes } from './evidence.validation.js'
import { LocalPrivateStorage, privateObjectKeyFor } from './storage.js'

const storage = new LocalPrivateStorage()

export async function authorizedEvidenceAccess(expenseId: string, userId: string, platformRole: string, database = prisma) {
  if (platformRole === 'PLATFORM_ADMIN' || platformRole === 'AUDITOR') return true
  const expense = await database.expenseRequest.findUnique({ where: { id: expenseId }, select: { organizationId: true } })
  return Boolean(expense && await database.organizationMembership.findFirst({ where: { userId, organizationId: expense.organizationId, isActive: true } }))
}

export const evidenceRouter = Router()
evidenceRouter.use(requireAuth)

evidenceRouter.post('/:expenseId/upload', async (request, response, next) => {
  try {
    const expenseId = typeof request.params.expenseId === 'string' ? request.params.expenseId : ''
    const expense = await prisma.expenseRequest.findUnique({ where: { id: expenseId } })
    if (!expense) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
    if (!await authorizedEvidenceAccess(expenseId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'EVIDENCE_FORBIDDEN', 'You are not authorized to upload evidence for this organization.')
    const content = Buffer.isBuffer(request.body) ? request.body : Buffer.from([])
    const mimeType = request.header('content-type')?.split(';')[0] || ''
    const originalFilename = request.header('x-original-filename') || 'evidence.bin'
    const sha256Hash = validateEvidenceBytes(content, mimeType)
    const scan = await storage.scanFileForMalwareHook(content)
    if (!scan.clean) throw new HttpError(422, 'MALWARE_SCAN_REJECTED', scan.reason || 'The malware scan rejected this file.')
    const duplicate = await prisma.evidenceFile.findFirst({ where: { sha256Hash } })
    const privateObjectKey = privateObjectKeyFor(originalFilename)
    await storage.savePrivateFile(privateObjectKey, content)
    const evidence = await prisma.$transaction(async (tx) => {
      const created = await tx.evidenceFile.create({ data: { expenseRequestId: expenseId, uploaderId: request.sessionContext!.userId, originalFilename: originalFilename.replace(/[/\\\0]/g, '_'), privateObjectKey, sha256Hash, mimeType, sizeBytes: content.length } })
      if (duplicate && duplicate.expenseRequestId !== expenseId) await evaluateEvidenceFraud(tx, expense, sha256Hash)
      await recordAuditEvent(tx, { correlationId: expense.correlationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: duplicate ? 'DUPLICATE_EVIDENCE_DETECTED' : 'EVIDENCE_UPLOADED', entityType: 'EvidenceFile', entityId: created.id, metadata: { sha256Hash, duplicate: Boolean(duplicate) } })
      return created
    })
    response.status(201).json({ evidence: { id: evidence.id, sha256Hash, originalFilename: evidence.originalFilename, sizeBytes: evidence.sizeBytes, verificationStatus: evidence.verificationStatus }, metadataNote: EVIDENCE_SHA256_NOTE, payoutBlocked: Boolean(duplicate && duplicate.expenseRequestId !== expenseId) })
  } catch (error) { next(error) }
})

evidenceRouter.get('/:id/download', async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const evidence = await prisma.evidenceFile.findUnique({ where: { id } })
    if (!evidence) throw new HttpError(404, 'EVIDENCE_NOT_FOUND', 'Evidence file not found.')
    if (!await authorizedEvidenceAccess(evidence.expenseRequestId, request.sessionContext!.userId, request.sessionContext!.user.platformRole)) throw new HttpError(403, 'EVIDENCE_FORBIDDEN', 'You are not authorized to download this private evidence.')
    response.setHeader('Content-Type', evidence.mimeType)
    response.setHeader('Content-Disposition', `attachment; filename="${evidence.originalFilename.replace(/["\r\n]/g, '_')}"`)
    storage.readPrivateFileStream(evidence.privateObjectKey).pipe(response)
  } catch (error) { next(error) }
})
