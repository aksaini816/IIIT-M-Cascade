export type DonationStatus = 'Received' | 'Allocated' | 'Verified' | 'Pending' | 'Flagged'
export type EvidenceStatus = 'Verified' | 'Pending' | 'Flagged' | 'Duplicate'
export type FraudSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type FraudStatus = 'Open' | 'Under Review' | 'Resolved'
export type AllocationStatus = 'Funded' | 'Pending Verification' | 'Eligible for Release' | 'Frozen'

export interface Donation {
  id: string
  amountInr: number
  date: string
  purpose: string
  ngoId: string
  status: DonationStatus
  donor: string
}

export interface FundEvent {
  id: string
  donationId: string
  type: 'Donation' | 'Allocation' | 'Transfer' | 'Expense' | 'Evidence Verification' | 'Swap' | 'Bridge' | 'Fiat Off-ramp'
  amountLabel: string
  timestamp: string
  status: 'Completed' | 'Pending' | 'Flagged'
  isDemoChainEvent?: boolean
  description: string
}

export interface EvidenceRecord {
  id: string
  donationId: string
  category: 'School Fees' | 'Books' | 'Uniforms' | 'Stationery'
  amountInr: number
  submittedAt: string
  status: EvidenceStatus
  evidenceHash: string
  receiptPreview: string
}

export interface FraudAlert {
  id: string
  title: string
  description: string
  severity: FraudSeverity
  status: FraudStatus
  createdAt: string
  relatedId: string
}

export interface EscrowAllocation {
  id: string
  purpose: string
  amountInr: number
  releasedInr: number
  status: AllocationStatus
  isFrozen: boolean
}

export interface AuditEvent {
  id: string
  timestamp: string
  category: 'Donation' | 'Evidence' | 'Fraud' | 'Escrow' | 'System'
  action: string
  details: string
}

export interface DemoState {
  donations: Donation[]
  fundEvents: FundEvent[]
  evidenceRecords: EvidenceRecord[]
  fraudAlerts: FraudAlert[]
  allocations: EscrowAllocation[]
  auditLog: AuditEvent[]
}
