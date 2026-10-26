import type { Allocation, AuditLogEntry, CrossChainGrant, Donation, ExpenseClaim, FraudAlert, ReceiptEvidence, Verification } from '../types/tracetrust'

const now = '2026-10-25T10:00:00.000Z'
const duplicateHash = 'a'.repeat(64)
const forgedHashes = ['b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64)]

export const seedDonations: Donation[] = [
  { id: 'DON-INR-001', donorReference: 'DONOR-FOUNDATION-042', currency: 'INR', amount: 450000, receivedAt: now, purpose: 'Books & Curriculum', allocationIds: ['ALLOC-001'], note: 'Curriculum access for an anonymized rural school cluster.' },
  { id: 'DON-INR-002', donorReference: 'DONOR-INDIA-117', currency: 'INR', amount: 300000, receivedAt: now, purpose: 'School Fees', allocationIds: ['ALLOC-002'], note: 'Frozen after duplicate evidence and unauthorized category rules fired.' },
  { id: 'DON-INR-003', donorReference: 'DONOR-EDTECH-008', currency: 'INR', amount: 200000, receivedAt: now, purpose: 'Stationery & Lab Kits', allocationIds: ['ALLOC-003'], note: 'Issuer and GSTIN registry mismatches are simulated test fixtures.' },
  { id: 'DON-ETH-004', donorReference: 'INSTITUTIONAL-GRANT-50ETH', currency: 'ETH', amount: 50, receivedAt: now, purpose: 'Education Supplies (Cross-Border Grant)', allocationIds: ['ALLOC-004'], note: 'Simulated conversion value: ₹1,15,00,000.' },
]

export const seedAllocations: Allocation[] = [
  { id: 'ALLOC-001', donationId: 'DON-INR-001', beneficiaryId: 'BEN-COHORT-2026-A', schoolLabel: 'SCH-HR-208 (Rural Learning Center, Ambala Cluster)', purpose: 'Books & Curriculum', allocatedAmount: 450000, spentAmount: 120000, escrowState: 'Eligible for Release', claimIds: ['CLAIM-001'] },
  { id: 'ALLOC-002', donationId: 'DON-INR-002', beneficiaryId: 'BEN-COHORT-2026-B', schoolLabel: 'SCH-MH-104 (Z.P. Primary School Cluster)', purpose: 'School Fees', allocatedAmount: 300000, spentAmount: 180000, escrowState: 'Frozen', claimIds: ['CLAIM-002', 'CLAIM-003', 'CLAIM-004'], frozenReason: 'Duplicate evidence reuse and unauthorized category claim require manual audit.' },
  { id: 'ALLOC-003', donationId: 'DON-INR-003', beneficiaryId: 'BEN-COHORT-2026-C', schoolLabel: 'SCH-UP-412 (Community Learning Cluster)', purpose: 'Stationery & Lab Kits', allocatedAmount: 200000, spentAmount: 0, escrowState: 'Pending Verification', claimIds: ['CLAIM-005', 'CLAIM-006', 'CLAIM-007', 'CLAIM-008'] },
  { id: 'ALLOC-004', donationId: 'DON-ETH-004', beneficiaryId: 'BEN-CROSSBORDER-2026-A', schoolLabel: 'SCH-GRANT-INDIA-01 (Anonymized Vendor Consortium)', purpose: 'Education Supplies (Cross-Border Grant)', allocatedAmount: 11500000, spentAmount: 0, escrowState: 'Funded', claimIds: [] },
]

export const seedClaims: ExpenseClaim[] = [
  { id: 'CLAIM-001', allocationId: 'ALLOC-001', vendorName: 'Ambala Learning Cooperative', claimedAmount: 120000, purpose: 'Books & Curriculum', evidenceIds: ['EVID-001'], verificationStatus: 'Verified', issuerSignatureVerified: true, gstinRegistryVerified: true },
  { id: 'CLAIM-002', allocationId: 'ALLOC-002', vendorName: 'Maharashtra School Services', claimedAmount: 90000, purpose: 'School Fees', evidenceIds: ['EVID-002'], verificationStatus: 'Verified', issuerSignatureVerified: true, gstinRegistryVerified: true },
  { id: 'CLAIM-003', allocationId: 'ALLOC-002', vendorName: 'Maharashtra School Services', claimedAmount: 90000, purpose: 'School Fees', evidenceIds: ['EVID-003'], verificationStatus: 'Rejected - Duplicate Hash', issuerSignatureVerified: true, gstinRegistryVerified: true, rejectionReason: 'Evidence hash already registered against CLAIM-002.' },
  { id: 'CLAIM-004', allocationId: 'ALLOC-002', vendorName: 'Regional Uniform Vendor', claimedAmount: 60000, purpose: 'Uniforms & Footwear', evidenceIds: ['EVID-004'], verificationStatus: 'Flagged - Rule Violation', issuerSignatureVerified: true, gstinRegistryVerified: true, rejectionReason: 'Purpose-bound allocation does not permit Uniforms & Footwear.' },
  ...forgedHashes.map((_, index): ExpenseClaim => ({ id: `CLAIM-00${5 + index}`, allocationId: 'ALLOC-003', vendorName: `Test Vendor Fixture ${index + 1}`, claimedAmount: 25000, purpose: 'Stationery & Lab Kits', evidenceIds: [`EVID-00${5 + index}`], verificationStatus: 'Flagged - Unverified Issuer', issuerSignatureVerified: false, gstinRegistryVerified: false, isForgedFixture: true, rejectionReason: 'Issuer signature/GSTIN registry mismatch; not image detection.' })),
  { id: 'CLAIM-008', allocationId: 'ALLOC-003', vendorName: 'Overclaim Test Fixture', claimedAmount: 240000, purpose: 'Stationery & Lab Kits', evidenceIds: ['EVID-008'], verificationStatus: 'Rejected - Overspent', issuerSignatureVerified: true, gstinRegistryVerified: true, rejectionReason: 'Claim exceeds ₹2,00,000 remaining allocation.' },
]

export const seedEvidence: ReceiptEvidence[] = [
  { id: 'EVID-001', claimId: 'CLAIM-001', fileName: 'ambala-books-invoice.pdf', sha256: '1'.repeat(64), capturedAt: now, issuerSignatureStatus: 'Verified', gstinRegistryStatus: 'Verified', note: 'Signed vendor invoice; byte-consistent receipt.' },
  { id: 'EVID-002', claimId: 'CLAIM-002', fileName: 'school-fees-april.pdf', sha256: duplicateHash, capturedAt: now, issuerSignatureStatus: 'Verified', gstinRegistryStatus: 'Verified', note: 'Original receipt hash.' },
  { id: 'EVID-003', claimId: 'CLAIM-003', fileName: 'school-fees-reused-copy.pdf', sha256: duplicateHash, capturedAt: now, issuerSignatureStatus: 'Verified', gstinRegistryStatus: 'Verified', note: 'Exact duplicate hash detected globally.' },
  { id: 'EVID-004', claimId: 'CLAIM-004', fileName: 'uniforms-unauthorized.pdf', sha256: 'e'.repeat(64), capturedAt: now, issuerSignatureStatus: 'Verified', gstinRegistryStatus: 'Verified', note: 'Category mismatch against School Fees allocation.' },
  ...forgedHashes.map((hash, index): ReceiptEvidence => ({ id: `EVID-00${5 + index}`, claimId: `CLAIM-00${5 + index}`, fileName: `FORGED-FIXTURE-0${index + 1}.pdf`, sha256: hash, capturedAt: now, issuerSignatureStatus: 'Mismatch', gstinRegistryStatus: 'Mismatch', note: 'Explicit forged-receipt fixture: issuer signature/registry mismatch, not magic image detection.' })),
  { id: 'EVID-008', claimId: 'CLAIM-008', fileName: 'overspend-test-fixture.pdf', sha256: 'f'.repeat(64), capturedAt: now, issuerSignatureStatus: 'Verified', gstinRegistryStatus: 'Verified', note: 'Valid issuer but amount exceeds allocation.' },
]

export const seedVerifications: Verification[] = [{ id: 'VER-001', claimId: 'CLAIM-001', verifiedAt: now, verifier: 'Rules Engine v1.0', outcome: 'Verified', explanation: 'Purpose, issuer signature, GSTIN registry, and amount checks passed.' }, { id: 'VER-002', claimId: 'CLAIM-003', verifiedAt: now, verifier: 'Evidence Registry', outcome: 'Rejected - Duplicate Hash', explanation: 'Evidence hash is already registered against another claim.' }]
export const seedFraudAlerts: FraudAlert[] = [
  { id: 'ALERT-001', claimId: 'CLAIM-003', severity: 'High', rule: 'GLOBAL_DUPLICATE_HASH', message: 'Receipt hash reused across claims; allocation frozen.', createdAt: now, resolved: false },
  { id: 'ALERT-002', claimId: 'CLAIM-004', severity: 'High', rule: 'PURPOSE_BOUNDARY', message: 'Uniforms claimed against a School Fees allocation.', createdAt: now, resolved: false },
  { id: 'ALERT-003', claimId: 'CLAIM-008', severity: 'Medium', rule: 'ALLOCATION_OVERSPEND', message: 'Claimed amount exceeds remaining allocation.', createdAt: now, resolved: false },
]
export const seedAuditLogs: AuditLogEntry[] = [
  { id: 'LOG-001', timestamp: now, actor: 'Intake Module', eventType: 'DONATION_CREATED', referenceId: 'DON-INR-001', explanation: 'Donation received and purpose-bound to Books & Curriculum.' },
  { id: 'LOG-002', timestamp: now, actor: 'Evidence Vault', eventType: 'EVIDENCE_HASHED', referenceId: 'EVID-001', explanation: 'Receipt byte content hashed with SHA-256.' },
  { id: 'LOG-003', timestamp: now, actor: 'Fraud Detection Engine', eventType: 'DUPLICATE_DETECTED', referenceId: 'CLAIM-003', explanation: 'Exact evidence hash previously registered on CLAIM-002.' },
  { id: 'LOG-004', timestamp: now, actor: 'Escrow Control', eventType: 'ESCROW_FROZEN', referenceId: 'ALLOC-002', explanation: 'Release frozen pending duplicate and category rule review.' },
]
export const seedEvidenceRegistry = { [duplicateHash]: { claimId: 'CLAIM-002', donationId: 'DON-INR-002', fileName: 'school-fees-april.pdf', timestamp: now } }
export const seedGrant: CrossChainGrant = { donationId: 'DON-ETH-004', ethAmount: 50, simulatedInrValue: 11500000, purpose: 'Education Supplies (Cross-Border Grant)', events: [
  { id: 'GRANT-01', type: 'ETH Deposit', timestamp: now, amount: 50, currency: 'ETH', status: 'Simulated complete', transactionReference: '0xSIM-ETH-DEPOSIT-50', explanation: 'Institutional grant deposited into monitored escrow.' },
  { id: 'GRANT-02', type: 'DEX Swap (ETH to USDC)', timestamp: now, amount: 132500, currency: 'USDC', status: 'Simulated complete', transactionReference: '0xSIM-DEX-USDC', explanation: '50 ETH converted to 132,500 USDC after simulated fees and slippage.' },
  { id: 'GRANT-03', type: 'Cross-Chain Bridge', timestamp: now, amount: 132500, currency: 'USDC', status: 'Simulated complete', transactionReference: '0xSIM-BRIDGE-BASE-IN', explanation: '132,500 USDC bridged to the settlement network.' },
  { id: 'GRANT-04', type: 'Regulated Fiat On/Off-Ramp (INR Settlement)', timestamp: now, amount: 11500000, currency: 'INR', status: 'Simulated complete', transactionReference: 'FIAT-SIM-INR-115L', explanation: 'Regulated off-ramp simulated at ₹1,15,00,000 INR.' },
  { id: 'GRANT-05', type: 'Vendor Payout', timestamp: now, amount: 11500000, currency: 'INR', status: 'Pending', transactionReference: 'ESCROW-PENDING-VENDOR', explanation: 'Vendor payout awaits eligible supply claims.' },
] }
