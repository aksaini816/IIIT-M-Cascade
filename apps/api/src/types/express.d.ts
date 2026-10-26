import type { OrganizationMembership, User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      sessionContext?: { sessionId: string; csrfToken: string; userId: string; user: User }
      organizationMembership?: OrganizationMembership
    }
  }
}

export {}
