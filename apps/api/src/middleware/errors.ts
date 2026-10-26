import type { ErrorRequestHandler } from 'express'
import { logger } from '../utils/logger.js'

export class HttpError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message)
    this.name = 'HttpError'
  }
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const normalized = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  logger.error('Request failed', { method: request.method, path: request.path, code: normalized.code, error: error instanceof Error ? error.message : error })
  const body: { error: { code: string; message: string; details?: unknown } } = { error: { code: normalized.code, message: normalized.message } }
  if (normalized.details !== undefined && process.env.NODE_ENV !== 'production') body.error.details = normalized.details
  response.status(normalized.statusCode).json(body)
}
