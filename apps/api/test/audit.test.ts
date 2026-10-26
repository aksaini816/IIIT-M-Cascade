import { describe, expect, it } from 'vitest'
import { GENESIS_HASH, recordAuditEvent, verifyIntegrity } from '../src/modules/audit/audit.service.js'

function store() {
  const events: any[] = []
  return {
    events,
    auditEvent: {
      findFirst: async () => events.at(-1) ?? null,
      create: async ({ data }: any) => { const event = { id: crypto.randomUUID(), sequenceNumber: events.length + 1, ...data }; events.push(event); return event },
      findMany: async () => events,
    },
  } as any
}

describe('tamper-evident audit chain', () => {
  it('creates a valid genesis-linked chain', async () => {
    const tx = store()
    await recordAuditEvent(tx, { correlationId: 'corr-1', actorRole: 'DONOR', action: 'DONATION_CREATED', entityType: 'Donation', entityId: 'don-1', metadata: { password: 'hidden', amountPaise: 100 }, createdAt: new Date('2026-01-01T00:00:00.000Z') })
    await recordAuditEvent(tx, { correlationId: 'corr-1', actorRole: 'AUDITOR', action: 'EVIDENCE_HASHED', entityType: 'EvidenceFile', entityId: 'ev-1', metadata: { ok: true }, createdAt: new Date('2026-01-01T00:01:00.000Z') })
    expect(tx.events[0].previousEventHash).toBe(GENESIS_HASH)
    expect(tx.events[0].redactedMetadataJson.password).toBe('[REDACTED]')
    expect(verifyIntegrity(tx.events)).toMatchObject({ valid: true, totalEventsChecked: 2, brokenAtSequence: null })
  })

  it('detects the exact sequence containing historical tampering', async () => {
    const tx = store()
    await recordAuditEvent(tx, { correlationId: 'corr-2', actorRole: 'SYSTEM', action: 'DONATION_CREATED', entityType: 'Donation', entityId: 'don-2', metadata: {}, createdAt: new Date('2026-01-02T00:00:00.000Z') })
    await recordAuditEvent(tx, { correlationId: 'corr-2', actorRole: 'SYSTEM', action: 'ALLOCATION_UPDATED', entityType: 'Allocation', entityId: 'alloc-2', metadata: {}, createdAt: new Date('2026-01-02T00:01:00.000Z') })
    tx.events[1].entityId = 'alloc-tampered'
    expect(verifyIntegrity(tx.events)).toMatchObject({ valid: false, brokenAtSequence: 2 })
  })
})
