import type { RequestHandler } from 'express'
import type { OrgRole, PlatformRole } from '@prisma/client'
import { prisma } from '../prisma.js'
import { HttpError } from './errors.js'

export const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.sessionContext) return next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required.'))
  next()
}

export function requirePlatformRole(allowedRoles: PlatformRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.sessionContext) return next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required.'))
    if (!allowedRoles.includes(request.sessionContext.user.platformRole)) return next(new HttpError(403, 'PLATFORM_ROLE_FORBIDDEN', 'Your platform role cannot perform this action.'))
    next()
  }
}

export function requireOrgRole(orgIdParam: string, allowedRoles: OrgRole[]): RequestHandler {
  return async (request, _response, next) => {
    if (!request.sessionContext) return next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required.'))
    const organizationId = typeof request.params[orgIdParam] === 'string' ? request.params[orgIdParam] : undefined
    if (!organizationId) return next(new HttpError(400, 'ORG_ID_REQUIRED', 'An organization identifier is required.'))
    try {
      const membership = await prisma.organizationMembership.findFirst({ where: { userId: request.sessionContext.userId, organizationId, isActive: true } })
      if (!membership || !allowedRoles.includes(membership.role)) return next(new HttpError(403, 'ORG_ROLE_FORBIDDEN', 'You do not have the required active organization role.'))
      request.organizationMembership = membership
      next()
    } catch (error) {
      next(error)
    }
  }
}
