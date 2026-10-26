import { createHash } from 'node:crypto'
import type { RequestHandler } from 'express'
import { prisma } from '../prisma.js'

export const sessionContext: RequestHandler = async (request, _response, next) => {
  try {
    const raw = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('kindora_session='))?.slice('kindora_session='.length)
    if (!raw) return next()
    const tokenHash = createHash('sha256').update(raw).digest('hex')
    const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } })
    if (session && !session.revokedAt && session.expiresAt > new Date() && session.user.accountStatus === 'ACTIVE') request.sessionContext = { sessionId: session.id, csrfToken: session.csrfToken, userId: session.userId, user: session.user }
    next()
  } catch (error) {
    next(error)
  }
}
