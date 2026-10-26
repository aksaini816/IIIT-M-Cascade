import { createHash } from 'node:crypto'

export const GENESIS_HASH = 'GENESIS_KINDORA_AUDIT_0000000000000000'

export function computeAuditEventHash(input: {
  previousEventHash: string
  correlationId: string
  action: string
  entityType: string
  entityId: string
  sequenceNumber?: number
}): string {
  const canonical = [
    input.previousEventHash,
    input.correlationId,
    input.action,
    input.entityType,
    input.entityId,
    String(input.sequenceNumber ?? ''),
  ].map((value) => `${value.length}:${value}`).join('|')
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
