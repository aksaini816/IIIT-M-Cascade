import { describe, expect, it, vi } from 'vitest'
import { hashPassword, verifyPassword } from '../src/modules/auth/password.js'
import { failedLoginUpdate } from '../src/modules/auth/loginPolicy.js'
import { redact } from '../src/utils/logger.js'
import { csrfProtection } from '../src/middleware/csrf.js'
import { requirePlatformRole, requireOrgRole } from '../src/middleware/rbac.js'
import { prisma } from '../src/prisma.js'

function responseNext() {
  return vi.fn()
}

describe('authentication security', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await hashPassword('a-secure-password')
    expect(hash).toContain('$argon2id$')
    expect(await verifyPassword(hash, 'a-secure-password')).toBe(true)
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false)
  })

  it('locks an account on the fifth failed login', () => {
    const update = failedLoginUpdate(4, 1_000)
    expect(update.failedLoginAttempts).toBe(5)
    expect(update.accountStatus).toBe('LOCKED')
    expect(update.lockedUntil).toEqual(new Date(901_000))
  })

  it('rejects CSRF-less state changes and accepts the matching token', () => {
    const request = { method: 'POST', path: '/api/protected', sessionContext: { csrfToken: 'expected' }, header: vi.fn().mockReturnValue(undefined) } as never
    const next = responseNext()
    csrfProtection(request, {} as never, next)
    expect(next.mock.calls[0][0].code).toBe('CSRF_INVALID')
    request.header = vi.fn().mockReturnValue('expected')
    const accepted = responseNext()
    csrfProtection(request, {} as never, accepted)
    expect(accepted).toHaveBeenCalledWith()
  })

  it('rejects a donor from a platform admin action', () => {
    const request = { sessionContext: { user: { platformRole: 'DONOR' } } } as never
    const next = responseNext()
    requirePlatformRole(['PLATFORM_ADMIN'])(request, {} as never, next)
    expect(next.mock.calls[0][0].code).toBe('PLATFORM_ROLE_FORBIDDEN')
  })

  it('requires an active organization membership for approver actions', async () => {
    vi.spyOn(prisma.organizationMembership, 'findFirst').mockResolvedValue(null)
    const request = { params: { organizationId: 'org-1' }, sessionContext: { userId: 'user-1' } } as never
    const next = responseNext()
    await requireOrgRole('organizationId', ['APPROVER_A'])(request, {} as never, next)
    expect(next.mock.calls[0][0].code).toBe('ORG_ROLE_FORBIDDEN')
  })

  it('redacts credentials from structured log context', () => {
    expect(redact({ password: 'secret', nested: { token: 'abc' }, visible: 'ok' })).toEqual({ password: '[REDACTED]', nested: { token: '[REDACTED]' }, visible: 'ok' })
  })
})
