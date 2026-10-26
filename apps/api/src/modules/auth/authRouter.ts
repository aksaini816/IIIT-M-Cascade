import { createHash, randomBytes } from 'node:crypto'
import { Router, type Response } from 'express'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'
import { requireAuth } from '../../middleware/rbac.js'
import { hashPassword, verifyPassword } from './password.js'
import { failedLoginUpdate } from './loginPolicy.js'

const SESSION_DAYS = 7
const cookieName = 'kindora_session'
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
const publicUser = (user: { id: string; email: string; displayName: string; platformRole: string; accountStatus: string }) => ({ id: user.id, email: user.email, displayName: user.displayName, platformRole: user.platformRole, accountStatus: user.accountStatus })

function setSessionCookie(response: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`)
}

export const authRouter = Router()

authRouter.post('/register', async (request, response, next) => {
  try {
    const { email, password, displayName } = request.body as Record<string, unknown>
    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string' || password.length < 12) throw new HttpError(400, 'INVALID_REGISTRATION', 'Email, display name, and a password of at least 12 characters are required.')
    const user = await prisma.user.create({ data: { email: email.trim().toLowerCase(), passwordHash: await hashPassword(password), displayName: displayName.trim(), platformRole: 'DONOR' } })
    response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (request, response, next) => {
  try {
    const { email, password } = request.body as Record<string, unknown>
    if (typeof email !== 'string' || typeof password !== 'string') throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user || user.accountStatus === 'DISABLED' || (user.lockedUntil && user.lockedUntil > new Date())) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    const valid = await verifyPassword(user.passwordHash, password)
    if (!valid) {
      await prisma.user.update({ where: { id: user.id }, data: failedLoginUpdate(user.failedLoginAttempts) })
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }
    const token = randomBytes(32).toString('hex')
    const csrfToken = randomBytes(24).toString('hex')
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, accountStatus: 'ACTIVE', lockedUntil: null } })
    await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), csrfToken, ipAddress: request.ip ?? '', userAgent: request.get('user-agent') ?? '', expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) } })
    setSessionCookie(response, token)
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    response.setHeader('Set-Cookie', [
      `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`,
      `csrf_token=${csrfToken}; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`,
    ])
    response.setHeader('x-csrf-token', csrfToken)
    response.json({ user: publicUser(user), csrfToken })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', requireAuth, async (request, response, next) => {
  try {
    await prisma.session.update({ where: { id: request.sessionContext!.sessionId }, data: { revokedAt: new Date() } })
    response.setHeader('Set-Cookie', [
      `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      'csrf_token=; SameSite=Lax; Path=/; Max-Age=0',
    ])
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const memberships = await prisma.organizationMembership.findMany({ where: { userId: request.sessionContext!.userId, isActive: true }, select: { organizationId: true, role: true, organization: { select: { id: true, displayName: true, legalName: true } } } })
    response.json({ user: publicUser(request.sessionContext!.user), memberships })
  } catch (error) {
    next(error)
  }
})
