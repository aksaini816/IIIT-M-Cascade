export function failedLoginUpdate(failedAttempts: number, now = Date.now()) {
  const attempts = failedAttempts + 1
  return {
    failedLoginAttempts: attempts,
    accountStatus: attempts >= 5 ? 'LOCKED' as const : 'ACTIVE' as const,
    lockedUntil: attempts >= 5 ? new Date(now + 15 * 60 * 1000) : null,
  }
}
