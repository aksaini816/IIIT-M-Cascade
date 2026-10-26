import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedAllocations, seedAuditLogs, seedClaims, seedDonations, seedEvidence, seedEvidenceRegistry, seedFraudAlerts, seedGrant, seedVerifications } from '../data/seedScenario'
import type { Allocation, AuditLogEntry, CrossChainGrant, Donation, ExpenseClaim, EvidenceHashRecord, EscrowPolicyCheck, FraudAlert, PurposeCategory, ReceiptEvidence, Verification } from '../types/tracetrust'

interface TraceTrustState { donations: Donation[]; allocations: Allocation[]; claims: ExpenseClaim[]; evidence: ReceiptEvidence[]; verifications: Verification[]; evidenceRegistry: Record<string, EvidenceHashRecord>; fraudAlerts: FraudAlert[]; auditLogs: AuditLogEntry[]; grant: CrossChainGrant; loadDemoScenario: () => void; resetState: () => void; createDonation: (input: { amount: number; donorDisplayName?: string; schoolIdentifier: string; purpose: PurposeCategory; referenceId: string }) => void; submitEvidenceClaim: (input: { donationId: string; purpose: PurposeCategory; amount: number; vendorId: string; file: File | null; sha256: string; description: string; beneficiaryCohortId: string; issuerVerified: boolean }) => { claimId: string; status: string; message: string }; approveRelease: (allocationId: string) => { ok: boolean; message: string }; attemptRelease: (allocationId: string) => string; toggleManualFreeze: (allocationId: string, reason: string) => void; getPolicyChecks: (allocationId: string) => EscrowPolicyCheck[] }
const TraceTrustContext = createContext<TraceTrustState | null>(null)
const STORAGE_KEY = 'tracetrust-state-v1'
type PersistedState = Omit<TraceTrustState, 'loadDemoScenario' | 'resetState' | 'createDonation' | 'submitEvidenceClaim' | 'approveRelease' | 'attemptRelease' | 'toggleManualFreeze' | 'getPolicyChecks'>
const seedState = (): PersistedState => ({ donations: seedDonations, allocations: seedAllocations, claims: seedClaims, evidence: seedEvidence, verifications: seedVerifications, evidenceRegistry: seedEvidenceRegistry, fraudAlerts: seedFraudAlerts, auditLogs: seedAuditLogs, grant: seedGrant })

export function TraceTrustProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as PersistedState : seedState() })
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  const loadDemoScenario = useCallback(() => setState(seedState()), [])
  const resetState = useCallback(() => setState({ donations: [], allocations: [], claims: [], evidence: [], verifications: [], evidenceRegistry: {}, fraudAlerts: [], auditLogs: [], grant: { ...seedGrant, events: [] } }), [])
  const createDonation = useCallback((input: { amount: number; donorDisplayName?: string; schoolIdentifier: string; purpose: PurposeCategory; referenceId: string }) => {
    const timestamp = new Date().toISOString()
    const serial = `${Date.now()}`
    const donationId = `DON-${serial}`
    const allocationId = `ALLOC-${serial}`
    const donation: Donation = { id: donationId, donorReference: input.referenceId, currency: 'INR', amount: input.amount, receivedAt: timestamp, purpose: input.purpose, allocationIds: [allocationId], donorDisplayName: input.donorDisplayName, schoolIdentifier: input.schoolIdentifier, note: 'Simulated donation intake.' }
    const allocation: Allocation = { id: allocationId, donationId, beneficiaryId: `BEN-COHORT-${serial.slice(-4)}`, schoolLabel: input.schoolIdentifier, purpose: input.purpose, allocatedAmount: input.amount, spentAmount: 0, escrowState: 'Funded', claimIds: [] }
    const logs: AuditLogEntry[] = [
      { id: `LOG-${serial}-D`, timestamp, actor: 'Donations & Intake', eventType: 'DONATION_CREATED', referenceId: donationId, explanation: `Donation ${input.referenceId} received and recorded as a simulated INR contribution.` },
      { id: `LOG-${serial}-A`, timestamp, actor: 'Donations & Intake', eventType: 'ALLOCATION_CREATED', referenceId: allocationId, explanation: `Purpose-bound escrow created for ${input.purpose} at ${input.schoolIdentifier}.` },
    ]
    setState((current) => ({ ...current, donations: [donation, ...current.donations], allocations: [allocation, ...current.allocations], auditLogs: [...logs, ...current.auditLogs] }))
  }, [])
  const submitEvidenceClaim = useCallback((input: { donationId: string; purpose: PurposeCategory; amount: number; vendorId: string; file: File | null; sha256: string; description: string; beneficiaryCohortId: string; issuerVerified: boolean }) => {
    const timestamp = new Date().toISOString()
    const serial = `${Date.now()}`
    const allocation = state.allocations.find((item) => item.donationId === input.donationId)
    const donation = state.donations.find((item) => item.id === input.donationId)
    if (!allocation || !donation) return { claimId: `CLM-${serial}`, status: 'Pending', message: 'Donation allocation could not be found.' }
    const claimId = `CLM-${serial}`
    const evidenceId = `EVID-${serial}`
    const duplicate = input.sha256 ? Object.entries(state.evidenceRegistry).find(([hash]) => hash === input.sha256) : undefined
    const missing = !input.file || !input.sha256 || !input.vendorId.trim() || !input.description.trim() || !input.beneficiaryCohortId.trim()
    const mismatch = input.purpose !== allocation.purpose
    const overspend = input.amount > Math.max(0, allocation.allocatedAmount - allocation.spentAmount)
    const issuerFailed = !input.issuerVerified || input.vendorId.toUpperCase().includes('FORGED') || input.vendorId.toUpperCase().includes('UNVERIFIED')
    const status = missing ? 'Pending' : duplicate ? 'Rejected - Duplicate Hash' : mismatch ? 'Flagged - Rule Violation' : overspend ? 'Rejected - Overspent' : issuerFailed ? 'Flagged - Unverified Issuer' : 'Verified'
    const message = missing ? 'Missing required evidence or metadata; release remains blocked.' : duplicate ? `Submitted hash ${input.sha256.slice(0, 12)}…${input.sha256.slice(-10)} collides with ${duplicate[1].claimId} on donation ${duplicate[1].donationId}.` : mismatch ? `Expense category ${input.purpose} does not match bound purpose ${allocation.purpose}.` : overspend ? `Claim ${input.amount.toLocaleString('en-IN')} exceeds remaining eligible balance ${Math.max(0, allocation.allocatedAmount - allocation.spentAmount).toLocaleString('en-IN')}.` : issuerFailed ? 'Failed digital signature / vendor registry verification; this is not visual image detection.' : 'All deterministic purpose, budget, hash, and issuer checks passed.'
    const claim: ExpenseClaim = { id: claimId, allocationId: allocation.id, vendorName: input.vendorId, claimedAmount: input.amount, purpose: input.purpose, evidenceIds: input.sha256 ? [evidenceId] : [], verificationStatus: status as ExpenseClaim['verificationStatus'], issuerSignatureVerified: input.issuerVerified, gstinRegistryVerified: input.issuerVerified, isForgedFixture: issuerFailed, rejectionReason: message, description: input.description, beneficiaryCohortId: input.beneficiaryCohortId }
    const receipt: ReceiptEvidence | null = input.file && input.sha256 ? { id: evidenceId, claimId, fileName: input.file.name, sha256: input.sha256, capturedAt: timestamp, issuerSignatureStatus: input.issuerVerified ? 'Verified' : 'Mismatch', gstinRegistryStatus: input.issuerVerified ? 'Verified' : 'Mismatch', note: message } : null
    const alert: FraudAlert | null = status === 'Verified' ? null : { id: `ALERT-${serial}`, claimId, severity: duplicate ? 'High' : issuerFailed ? 'High' : mismatch || overspend ? 'Medium' : 'Low', rule: duplicate ? 'DUPLICATE_EVIDENCE_HASH' : mismatch ? 'PURPOSE_CATEGORY_MISMATCH' : overspend ? 'ALLOCATION_OVERSPEND' : issuerFailed ? 'INVALID_ISSUER_SIGNATURE' : 'MISSING_REQUIRED_EVIDENCE', message, createdAt: timestamp, resolved: false }
    const freeze = Boolean(duplicate || (issuerFailed && input.file))
    const nextAllocation = { ...allocation, claimIds: [...allocation.claimIds, claimId], escrowState: freeze ? 'Frozen' as const : allocation.escrowState, frozenReason: freeze ? message : allocation.frozenReason }
    const logs: AuditLogEntry[] = [{ id: `LOG-${serial}-E`, timestamp, actor: 'Evidence Vault', eventType: 'EVIDENCE_HASHED', referenceId: claimId, explanation: input.sha256 ? `SHA-256 ${input.sha256} calculated for ${input.file?.name ?? 'uploaded evidence'}.` : 'Evidence submission received without a valid hash.' }]
    if (alert) logs.push({ id: `LOG-${serial}-A`, timestamp, actor: 'Fraud Detection Engine', eventType: 'FRAUD_ALERT', referenceId: claimId, explanation: message })
    if (duplicate) logs.push({ id: `LOG-${serial}-D`, timestamp, actor: 'Fraud Detection Engine', eventType: 'DUPLICATE_EVIDENCE_HASH', referenceId: claimId, explanation: message })
    if (freeze) logs.push({ id: `LOG-${serial}-F`, timestamp, actor: 'Escrow Control', eventType: 'ESCROW_FROZEN', referenceId: allocation.id, explanation: message })
    setState((current) => ({ ...current, claims: [claim, ...current.claims], evidence: receipt ? [receipt, ...current.evidence] : current.evidence, evidenceRegistry: receipt && !duplicate ? { ...current.evidenceRegistry, [receipt.sha256]: { claimId, donationId: donation.id, fileName: receipt.fileName, timestamp } } : current.evidenceRegistry, fraudAlerts: alert ? [alert, ...current.fraudAlerts] : current.fraudAlerts, allocations: current.allocations.map((item) => item.id === allocation.id ? nextAllocation : item), auditLogs: [...logs, ...current.auditLogs] }))
    return { claimId, status, message }
  }, [state])
  const getPolicyChecks = useCallback((allocationId: string): EscrowPolicyCheck[] => {
    const allocation = state.allocations.find((item) => item.id === allocationId)
    if (!allocation) return []
    const claims = state.claims.filter((claim) => claim.allocationId === allocationId)
    const validClaims = claims.filter((claim) => claim.verificationStatus === 'Verified')
    const evidenceAttached = validClaims.length > 0 && validClaims.every((claim) => claim.evidenceIds.length > 0)
    const collisions = validClaims.some((claim) => claim.evidenceIds.some((evidenceId) => { const evidence = state.evidence.find((item) => item.id === evidenceId); return evidence ? Object.values(state.evidenceRegistry).filter((record) => record.claimId === claim.id).length > 1 : false }))
    const purposeMatches = claims.length > 0 && claims.every((claim) => claim.purpose === allocation.purpose)
    const withinBalance = claims.filter((claim) => claim.verificationStatus !== 'Rejected - Duplicate Hash' && claim.verificationStatus !== 'Rejected - Overspent').reduce((sum, claim) => sum + claim.claimedAmount, 0) <= allocation.allocatedAmount - allocation.spentAmount
    const issuerVerified = validClaims.length > 0 && validClaims.every((claim) => claim.issuerSignatureVerified && claim.gstinRegistryVerified)
    return [
      { label: 'Valid SHA-256 Evidence Attached', passed: evidenceAttached, explanation: evidenceAttached ? 'Verified claims include receipt evidence.' : 'No fully verified claim has attached evidence.' },
      { label: 'Zero Global Hash Collisions', passed: !collisions && !claims.some((claim) => claim.verificationStatus === 'Rejected - Duplicate Hash'), explanation: collisions ? 'A global evidence collision was found.' : claims.some((claim) => claim.verificationStatus === 'Rejected - Duplicate Hash') ? 'A claim was rejected for duplicate evidence.' : 'No duplicate evidence collision recorded.' },
      { label: 'Purpose Category Matches Donation Covenant', passed: purposeMatches, explanation: purposeMatches ? 'Every submitted claim matches the allocation purpose.' : 'One or more claims violate the purpose covenant.' },
      { label: 'Claim Amount Within Remaining Balance', passed: withinBalance, explanation: withinBalance ? 'Claim totals are within the remaining balance.' : 'Claim amount exceeds the remaining eligible balance.' },
      { label: 'Vendor Issuer Signature Verified', passed: issuerVerified, explanation: issuerVerified ? 'Issuer and tax registry checks passed.' : 'Issuer signature or registry checks failed.' },
      { label: 'Allocation Not Frozen', passed: allocation.escrowState !== 'Frozen', explanation: allocation.escrowState === 'Frozen' ? allocation.frozenReason ?? 'Allocation is frozen.' : 'Allocation is not frozen.' },
    ]
  }, [state])
  const attemptRelease = useCallback((allocationId: string) => {
    const allocation = state.allocations.find((item) => item.id === allocationId)
    const checks = getPolicyChecks(allocationId)
    const failed = checks.find((check) => !check.passed)
    const message = !allocation ? 'Allocation not found.' : failed ? `${failed.label}: ${failed.explanation}` : allocation.escrowState !== 'Eligible for Release' ? `Escrow state is ${allocation.escrowState}; release requires Eligible for Release.` : 'Release policy gate passed.'
    const timestamp = new Date().toISOString()
    setState((current) => ({ ...current, auditLogs: [{ id: `LOG-${Date.now()}`, timestamp, actor: 'Escrow Control', eventType: 'RELEASE_BLOCKED', referenceId: allocationId, explanation: message }, ...current.auditLogs] }))
    return message
  }, [getPolicyChecks, state.allocations])
  const approveRelease = useCallback((allocationId: string) => {
    const allocation = state.allocations.find((item) => item.id === allocationId)
    const checks = getPolicyChecks(allocationId)
    if (!allocation || allocation.escrowState !== 'Eligible for Release' || checks.some((check) => !check.passed)) return { ok: false, message: 'Release blocked by escrow policy.' }
    const timestamp = new Date().toISOString()
    setState((current) => ({ ...current, allocations: current.allocations.map((item) => item.id === allocationId ? { ...item, escrowState: 'Released' } : item), auditLogs: [{ id: `LOG-${Date.now()}`, timestamp, actor: 'Escrow Control', eventType: 'RELEASE_APPROVED', referenceId: allocationId, explanation: 'Verified funds released after all escrow policy gates passed.' }, ...current.auditLogs] }))
    return { ok: true, message: 'Verified funds released.' }
  }, [getPolicyChecks, state.allocations])
  const toggleManualFreeze = useCallback((allocationId: string, reason: string) => {
    const timestamp = new Date().toISOString()
    setState((current) => {
      const allocation = current.allocations.find((item) => item.id === allocationId)
      if (!allocation) return current
      const unfreeze = allocation.escrowState === 'Frozen'
      const nextState = unfreeze ? 'Pending Verification' : 'Frozen'
      return { ...current, allocations: current.allocations.map((item) => item.id === allocationId ? { ...item, escrowState: nextState, frozenReason: unfreeze ? undefined : reason } : item), auditLogs: [{ id: `LOG-${Date.now()}`, timestamp, actor: 'Manual Auditor', eventType: unfreeze ? 'ALLOCATION_UPDATED' : 'ESCROW_FROZEN', referenceId: allocationId, explanation: unfreeze ? `Manual auditor unfreeze: ${reason}` : `Manual auditor freeze: ${reason}` }, ...current.auditLogs] }
    })
  }, [])
  const value = useMemo(() => ({ ...state, loadDemoScenario, resetState, createDonation, submitEvidenceClaim, approveRelease, attemptRelease, toggleManualFreeze, getPolicyChecks }), [state, loadDemoScenario, resetState, createDonation, submitEvidenceClaim, approveRelease, attemptRelease, toggleManualFreeze, getPolicyChecks])
  return <TraceTrustContext.Provider value={value}>{children}</TraceTrustContext.Provider>
}
export function useTraceTrust() { const context = useContext(TraceTrustContext); if (!context) throw new Error('useTraceTrust must be used within TraceTrustProvider'); return context }
