import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../../lib/api'

export type Persona = 'DONOR' | 'REQUESTER' | 'APPROVER_A' | 'APPROVER_B' | 'AUDITOR' | 'PLATFORM_ADMIN'

export type CurrentUser = { id: string; displayName: string; role: Persona; organizationName?: string }

const personas: Record<Persona, CurrentUser> = {
  DONOR: { id: 'demo-donor', displayName: 'Demo Donor', role: 'DONOR' },
  REQUESTER: { id: 'demo-requester', displayName: 'NGO Staff', role: 'REQUESTER', organizationName: 'KINDORA Learning Trust' },
  APPROVER_A: { id: 'demo-approver-a', displayName: 'Finance Trustee 1', role: 'APPROVER_A', organizationName: 'KINDORA Learning Trust' },
  APPROVER_B: { id: 'demo-approver-b', displayName: 'Board Signatory 2', role: 'APPROVER_B', organizationName: 'KINDORA Learning Trust' },
  AUDITOR: { id: 'demo-auditor', displayName: 'Compliance Reviewer', role: 'AUDITOR', organizationName: 'KINDORA Platform' },
  PLATFORM_ADMIN: { id: 'demo-admin', displayName: 'Platform Administrator', role: 'PLATFORM_ADMIN', organizationName: 'KINDORA Platform' },
}

type AuthContextValue = { user: CurrentUser | null; restoring: boolean; signIn: (user: CurrentUser) => void; signOut: () => void }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [restoring, setRestoring] = useState(true)
  useEffect(() => {
    if (!document.cookie.includes('csrf_token=')) {
      setRestoring(false)
      return
    }
    apiFetch<{ user: { id: string; displayName: string; platformRole: string }; memberships: Array<{ organization: { displayName: string } }> }>('/api/auth/me')
      .then(({ user: sessionUser, memberships }) => setUser({ id: sessionUser.id, displayName: sessionUser.displayName, role: sessionUser.platformRole as Persona, organizationName: memberships[0]?.organization.displayName }))
      .catch(() => setUser(null))
      .finally(() => setRestoring(false))
  }, [])
  const value = useMemo(() => ({
    user,
    restoring,
    signIn: (signedInUser: CurrentUser) => setUser(signedInUser),
    signOut: () => setUser(null),
  }), [user, restoring])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export { personas }
