import type { RequestHandler } from 'express'
import { HttpError } from './errors.js'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function isSignedProviderWebhook(request: { path: string; header(name: string): string | undefined }): boolean {
  return request.path.startsWith('/api/webhooks/') && Boolean(request.header('x-provider-signature') || request.header('x-razorpay-signature') || request.header('webhook-signature'))
}

export const csrfProtection: RequestHandler = (request, _response, next) => {
  if (!MUTATING_METHODS.has(request.method) || isSignedProviderWebhook(request) || request.path === '/api/auth/login' || request.path === '/api/auth/register') return next()
  const submitted = request.header('x-csrf-token')
  if (!request.sessionContext || !submitted || submitted !== request.sessionContext.csrfToken) return next(new HttpError(403, 'CSRF_INVALID', 'A valid CSRF token is required.'))
  next()
}
