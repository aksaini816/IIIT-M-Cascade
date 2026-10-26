import type { AuditEvent, Prisma } from '@prisma/client'
import { redact } from '../../utils/logger.js'
import { computeAuditEventHash, GENESIS_HASH } from './audit.hash.js'
export { computeAuditEventHash, GENESIS_HASH } from './audit.hash.js'

type AuditTransaction = Pick<Prisma.TransactionClient, 'auditEvent'>
type AuditInput = {
  correlationId: string
  actorUserId?: string | null
  actorRole: string
  action: string
  entityType: string
  entityId: string
  metadata?: unknown
  createdAt?: Date
}

function redactedMetadata(metadata: unknown): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) return undefined
  return redact(metadata) as Prisma.InputJsonValue
}

export async function recordAuditEvent(tx: AuditTransaction, input: AuditInput): Promise<AuditEvent> {
  const transaction = tx as AuditTransaction & { $executeRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> }
  if (transaction.$executeRaw) await transaction.$executeRaw`SELECT pg_advisory_xact_lock(73657384)`
  const latest = await tx.auditEvent.findFirst({ orderBy: { sequenceNumber: 'desc' } })
  const createdAt = input.createdAt ?? new Date()
  const metadata = redactedMetadata(input.metadata)
  const previousEventHash = latest?.currentEventHash ?? GENESIS_HASH
  const sequenceNumber = (latest?.sequenceNumber ?? 0) + 1
  const currentEventHash = computeAuditEventHash({ previousEventHash, correlationId: input.correlationId, action: input.action, entityType: input.entityType, entityId: input.entityId, sequenceNumber })
  return tx.auditEvent.create({
    data: {
      sequenceNumber,
      correlationId: input.correlationId,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      redactedMetadataJson: metadata,
      previousEventHash,
      currentEventHash,
      createdAt,
    },
  })
}

export type IntegrityResult = { valid: boolean; totalEventsChecked: number; brokenAtSequence: number | null; genesisHash: string; latestRootHash: string; verifiedAt: string }

export function verifyIntegrity(events: Pick<AuditEvent, 'sequenceNumber' | 'correlationId' | 'action' | 'entityType' | 'entityId' | 'redactedMetadataJson' | 'previousEventHash' | 'currentEventHash' | 'createdAt'>[]): IntegrityResult {
  let expectedPrevious = GENESIS_HASH
  let latestRootHash = GENESIS_HASH
  for (const event of [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber)) {
    const expected = computeAuditEventHash({ previousEventHash: expectedPrevious, correlationId: event.correlationId, action: event.action, entityType: event.entityType, entityId: event.entityId, sequenceNumber: event.sequenceNumber })
    if (event.previousEventHash !== expectedPrevious || event.currentEventHash !== expected) return { valid: false, totalEventsChecked: events.length, brokenAtSequence: event.sequenceNumber, genesisHash: GENESIS_HASH, latestRootHash, verifiedAt: new Date().toISOString() }
    expectedPrevious = event.currentEventHash
    latestRootHash = event.currentEventHash
  }
  return { valid: true, totalEventsChecked: events.length, brokenAtSequence: null, genesisHash: GENESIS_HASH, latestRootHash, verifiedAt: new Date().toISOString() }
}

export async function verifyIntegrityFromStore(tx: Pick<Prisma.TransactionClient, 'auditEvent'>): Promise<IntegrityResult> {
  const events = await tx.auditEvent.findMany({ orderBy: { sequenceNumber: 'asc' } })
  return verifyIntegrity(events)
}
