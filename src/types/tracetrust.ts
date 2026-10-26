export type PurposeCategory = 'School Fees' | 'Books & Curriculum' | 'Uniforms & Footwear' | 'Stationery & Lab Kits' | 'Education Supplies (Cross-Border Grant)'
export type EscrowState = 'Funded' | 'Pending Verification' | 'Eligible for Release' | 'Released' | 'Frozen'
export type ClaimVerificationStatus = 'Pending' | 'Verified' | 'Flagged - Rule Violation' | 'Flagged - Unverified Issuer' | 'Rejected - Duplicate Hash' | 'Rejected - Overspent'

export interface Donation { id: string; donorReference: string; currency: 'INR' | 'ETH'; amount: number; receivedAt: string; purpose: PurposeCategory; allocationIds: string[]; note: string; donorDisplayName?: string; schoolIdentifier?: string }
export interface Allocation { id: string; donationId: string; beneficiaryId: string; schoolLabel: string; purpose: PurposeCategory; allocatedAmount: number; spentAmount: number; escrowState: EscrowState; claimIds: string[]; frozenReason?: string }
export interface ExpenseClaim { id: string; allocationId: string; vendorName: string; claimedAmount: number; purpose: PurposeCategory; evidenceIds: string[]; verificationStatus: ClaimVerificationStatus; issuerSignatureVerified: boolean; gstinRegistryVerified: boolean; isForgedFixture?: boolean; rejectionReason?: string; description?: string; beneficiaryCohortId?: string }
export interface ReceiptEvidence { id: string; claimId: string; fileName: string; sha256: string; capturedAt: string; issuerSignatureStatus: 'Verified' | 'Mismatch'; gstinRegistryStatus: 'Verified' | 'Mismatch'; note: string }
export interface Verification { id: string; claimId: string; verifiedAt: string; verifier: string; outcome: ClaimVerificationStatus; explanation: string }
export interface EvidenceHashRecord { claimId: string; donationId: string; fileName: string; timestamp: string }
export interface FraudAlert { id: string; claimId: string; severity: 'High' | 'Medium' | 'Low'; rule: string; message: string; createdAt: string; resolved: boolean }
export type AuditEventType = 'DONATION_CREATED' | 'ALLOCATION_CREATED' | 'ALLOCATION_UPDATED' | 'EVIDENCE_HASHED' | 'DUPLICATE_DETECTED' | 'DUPLICATE_EVIDENCE_HASH' | 'FRAUD_ALERT' | 'ESCROW_FROZEN' | 'RELEASE_BLOCKED' | 'RELEASE_APPROVED'
export interface AuditLogEntry { id: string; timestamp: string; actor: string; eventType: AuditEventType; referenceId: string; explanation: string }
export interface EscrowPolicyCheck { label: string; passed: boolean; explanation: string }
export type GrantEventType = 'ETH Deposit' | 'DEX Swap (ETH to USDC)' | 'Cross-Chain Bridge' | 'Regulated Fiat On/Off-Ramp (INR Settlement)' | 'Vendor Payout'
export interface GrantPipelineEvent { id: string; type: GrantEventType; timestamp: string; amount: number; currency: 'ETH' | 'USDC' | 'INR'; status: 'Simulated complete' | 'Pending'; transactionReference: string; explanation: string }
export interface CrossChainGrant { donationId: string; ethAmount: number; simulatedInrValue: number; purpose: 'Education Supplies (Cross-Border Grant)'; events: GrantPipelineEvent[] }
