const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'secret', 'token', 'cookie', 'encryptedPayoutDestRef', 'authorization', 'bankAccount'])

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item, seen))
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(child, seen)]))
  }
  return value
}

export function createLogger(destination: Pick<Console, 'info' | 'warn' | 'error'> = console) {
  const write = (level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) => destination[level](JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...redact(context) as object }))
  return { info: (message: string, context?: Record<string, unknown>) => write('info', message, context), warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context), error: (message: string, context?: Record<string, unknown>) => write('error', message, context) }
}

export const logger = createLogger()
