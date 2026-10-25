import { createContext, useContext, useEffect, useState } from 'react'
import { INITIAL_DEMO_STATE, STORAGE_KEY } from '../data/seedData'
import type { AllocationStatus, AuditEvent, DemoState, Donation, EvidenceRecord, FraudAlert } from '../types'
import { nowIso } from '../utils/format'

interface DemoStoreContextValue {
  state: DemoState
  isLoading: boolean
  createDonation: (donation: Omit<Donation, 'id' | 'status'>) => void
  createFraudAlert: (alert: Omit<FraudAlert, 'id' | 'createdAt' | 'status'>) => void
  toggleFreezeAllocation: (allocationId: string) => void
  attemptRelease: (allocationId: string, amountInr: number) => { success: boolean; message: string }
  runDuplicateCheck: (value: string) => EvidenceRecord[]
  resetDemoData: () => void
}

const DemoStoreContext = createContext<DemoStoreContextValue | undefined>(undefined)

const cloneInitialState = (): DemoState => structuredClone(INITIAL_DEMO_STATE)

const loadInitialState = (): DemoState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as DemoState
    }
  } catch {
    return cloneInitialState()
  }
  return cloneInitialState()
}

const createAudit = (category: AuditEvent['category'], action: string, details: string): AuditEvent => ({
  id: `AUD-${Date.now()}`,
  timestamp: nowIso(),
  category,
  action,
  details,
})

const updateAllocationStatus = (allocation: DemoState['allocations'][number]): AllocationStatus => {
  if (allocation.isFrozen) return 'Frozen'
  const remaining = allocation.amountInr - allocation.releasedInr
  if (remaining <= 0) return 'Funded'
  if (allocation.releasedInr === 0) return 'Pending Verification'
  return 'Eligible for Release'
}

export const DemoStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<DemoState>(loadInitialState)
  const isLoading = false

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const createDonation = (donation: Omit<Donation, 'id' | 'status'>) => {
    setState((prev) => {
      const id = `DON-${1000 + prev.donations.length + 1}`
      const nextDonation: Donation = { ...donation, id, status: 'Received' }
      return {
        ...prev,
        donations: [nextDonation, ...prev.donations],
        auditLog: [
          createAudit('Donation', 'Demo Donation Created', `${id} created for ${donation.ngoId} (${donation.purpose}).`),
          ...prev.auditLog,
        ],
      }
    })
  }

  const createFraudAlert = (alert: Omit<FraudAlert, 'id' | 'createdAt' | 'status'>) => {
    setState((prev) => {
      const nextAlert: FraudAlert = {
        ...alert,
        id: `FR-${1000 + prev.fraudAlerts.length + 1}`,
        createdAt: nowIso(),
        status: 'Open',
      }
      return {
        ...prev,
        fraudAlerts: [nextAlert, ...prev.fraudAlerts],
        auditLog: [createAudit('Fraud', 'Fraud Alert Simulated', `${nextAlert.id} created with ${alert.severity} severity.`), ...prev.auditLog],
      }
    })
  }

  const toggleFreezeAllocation = (allocationId: string) => {
    setState((prev) => {
      const allocations = prev.allocations.map((allocation) => {
        if (allocation.id !== allocationId) return allocation
        const next = { ...allocation, isFrozen: !allocation.isFrozen }
        next.status = updateAllocationStatus(next)
        return next
      })
      const updated = allocations.find((allocation) => allocation.id === allocationId)
      if (!updated) return prev
      const action = updated.isFrozen ? 'Allocation Frozen' : 'Allocation Unfrozen'
      return {
        ...prev,
        allocations,
        auditLog: [createAudit('Escrow', action, `${allocationId} is now ${updated.status}.`), ...prev.auditLog],
      }
    })
  }

  const attemptRelease = (allocationId: string, amountInr: number) => {
    let response = { success: false, message: 'Allocation not found.' }
    setState((prev) => {
      const target = prev.allocations.find((allocation) => allocation.id === allocationId)
      if (!target) return prev
      if (target.isFrozen) {
        response = { success: false, message: 'Release blocked. Allocation is frozen in this frontend demo.' }
        return {
          ...prev,
          auditLog: [createAudit('Escrow', 'Release Blocked', `${allocationId} release attempt blocked while frozen.`), ...prev.auditLog],
        }
      }
      const remaining = target.amountInr - target.releasedInr
      if (amountInr <= 0 || amountInr > remaining) {
        response = { success: false, message: 'Release amount must be greater than zero and within remaining balance.' }
        return prev
      }
      const allocations = prev.allocations.map((allocation) => {
        if (allocation.id !== allocationId) return allocation
        const next = { ...allocation, releasedInr: allocation.releasedInr + amountInr }
        next.status = updateAllocationStatus(next)
        return next
      })
      response = { success: true, message: `Demo release of ₹${amountInr.toLocaleString('en-IN')} completed.` }
      return {
        ...prev,
        allocations,
        auditLog: [createAudit('Escrow', 'Release Simulated', `${allocationId} released ₹${amountInr.toLocaleString('en-IN')}.`), ...prev.auditLog],
      }
    })
    return response
  }

  const runDuplicateCheck = (value: string) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return []
    return state.evidenceRecords.filter((record) => record.id.toLowerCase() === normalized || record.evidenceHash.toLowerCase() === normalized)
  }

  const resetDemoData = () => {
    setState(cloneInitialState())
    localStorage.removeItem(STORAGE_KEY)
  }

  return <DemoStoreContext.Provider value={{ state, isLoading, createDonation, createFraudAlert, toggleFreezeAllocation, attemptRelease, runDuplicateCheck, resetDemoData }}>{children}</DemoStoreContext.Provider>
}

export const useDemoStore = () => {
  const context = useContext(DemoStoreContext)
  if (!context) throw new Error('useDemoStore must be used within DemoStoreProvider')
  return context
}
