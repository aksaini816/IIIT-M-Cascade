import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth } from '../../middleware/rbac.js'
import { recordAuditEvent } from '../audit/audit.service.js'

const vendorSchema = z.object({ organizationId: z.string().uuid(), legalName: z.string().trim().min(2), gstinOrPan: z.string().trim().min(4), payoutDestination: z.string().trim().min(4) })
const verifySchema = z.object({ status: z.enum(['VERIFIED', 'EXPIRED', 'SUSPENDED']), verificationExpiresAt: z.coerce.date().nullable().optional() })
const key = () => createHash('sha256').update(process.env.SESSION_SECRET || 'kindora-development-secret').digest()
function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}.${value.slice(-4)}`
}
function vendorView(vendor: { id: string; organizationId: string; legalName: string; gstinOrPan: string; verificationStatus: string; verificationExpiresAt: Date | null; encryptedPayoutDestRef: string; createdAt: Date; updatedAt: Date }) {
  return { id: vendor.id, organizationId: vendor.organizationId, legalName: vendor.legalName, gstinOrPan: vendor.gstinOrPan, verificationStatus: vendor.verificationStatus, verificationExpiresAt: vendor.verificationExpiresAt, payoutDestinationLabel: 'BANK-XXXX-' + vendor.encryptedPayoutDestRef.split('.').at(-1), createdAt: vendor.createdAt, updatedAt: vendor.updatedAt }
}

export const vendorRouter = Router()
vendorRouter.use(requireAuth)

vendorRouter.post('/', async (request, response, next) => {
  try {
    const data = vendorSchema.parse(request.body)
    const allowed = request.sessionContext!.user.platformRole === 'PLATFORM_ADMIN' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId: data.organizationId, userId: request.sessionContext!.userId, isActive: true, role: { in: ['ORG_STAFF', 'AUDITOR'] } } }))
    if (!allowed) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot manage vendors for this organization.')
    const vendor = await prisma.$transaction(async (tx) => {
      const created = await tx.vendor.create({ data: { organizationId: data.organizationId, legalName: data.legalName, gstinOrPan: data.gstinOrPan, encryptedPayoutDestRef: encrypt(data.payoutDestination) } })
      await recordAuditEvent(tx, { correlationId: data.organizationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'VENDOR_CREATED', entityType: 'Vendor', entityId: created.id, metadata: { organizationId: data.organizationId } })
      return created
    })
    response.status(201).json({ vendor: vendorView(vendor) })
  } catch (error) { next(error) }
})

vendorRouter.get('/', async (request, response, next) => {
  try {
    const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined
    if (!organizationId) throw new HttpError(400, 'ORG_ID_REQUIRED', 'organizationId is required.')
    const vendors = await prisma.vendor.findMany({ where: { organizationId }, orderBy: { legalName: 'asc' } })
    response.json({ vendors: vendors.map(vendorView) })
  } catch (error) { next(error) }
})

vendorRouter.post('/:id/verify', async (request, response, next) => {
  try {
    const data = verifySchema.parse(request.body)
    const id = typeof request.params.id === 'string' ? request.params.id : ''
    const vendor = await prisma.vendor.findUnique({ where: { id } })
    if (!vendor) throw new HttpError(404, 'VENDOR_NOT_FOUND', 'Vendor not found.')
    const allowed = request.sessionContext!.user.platformRole === 'PLATFORM_ADMIN' || request.sessionContext!.user.platformRole === 'AUDITOR' || Boolean(await prisma.organizationMembership.findFirst({ where: { organizationId: vendor.organizationId, userId: request.sessionContext!.userId, isActive: true, role: 'ORG_STAFF' } }))
    if (!allowed) throw new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You cannot verify vendors for this organization.')
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.vendor.update({ where: { id }, data: { verificationStatus: data.status, verificationExpiresAt: data.status === 'VERIFIED' ? data.verificationExpiresAt : null } })
      await recordAuditEvent(tx, { correlationId: vendor.organizationId, actorUserId: request.sessionContext!.userId, actorRole: request.sessionContext!.user.platformRole, action: 'VENDOR_VERIFICATION_UPDATED', entityType: 'Vendor', entityId: id, metadata: { status: data.status } })
      return saved
    })
    response.json({ vendor: vendorView(updated) })
  } catch (error) { next(error) }
})
