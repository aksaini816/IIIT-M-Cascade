import type { DemoState } from '../types'

export const INITIAL_DEMO_STATE: DemoState = {
  donations: [
    { id: 'DON-1001', amountInr: 250000, date: '2026-10-01', purpose: 'Annual School Fees', ngoId: 'NGO-EDU-01', status: 'Verified', donor: 'Anita Sharma' },
    { id: 'DON-1002', amountInr: 150000, date: '2026-10-04', purpose: 'Books & Learning Kits', ngoId: 'NGO-EDU-03', status: 'Allocated', donor: 'Rohan Khanna' },
    { id: 'DON-1003', amountInr: 500000, date: '2026-10-08', purpose: '50 ETH Education Corpus (Demo)', ngoId: 'NGO-EDU-02', status: 'Pending', donor: 'BlueRiver Foundation' },
    { id: 'DON-1004', amountInr: 300000, date: '2026-10-12', purpose: 'Uniform & Transport Aid', ngoId: 'NGO-EDU-04', status: 'Received', donor: 'Maya Iyer' },
    { id: 'DON-1005', amountInr: 50000, date: '2026-10-15', purpose: 'Stationery Essentials', ngoId: 'NGO-EDU-05', status: 'Flagged', donor: 'Suresh Verma' },
  ],
  fundEvents: [
    { id: 'FE-1', donationId: 'DON-1003', type: 'Donation', amountLabel: '50 ETH', timestamp: '2026-10-08T09:15:00.000Z', status: 'Completed', isDemoChainEvent: true, description: 'Education donation recorded on source chain (DEMO DATA)' },
    { id: 'FE-2', donationId: 'DON-1003', type: 'Swap', amountLabel: '50 ETH → 150,000 USDC', timestamp: '2026-10-08T09:25:00.000Z', status: 'Completed', isDemoChainEvent: true, description: 'Simulated DEX swap to stablecoin (DEMO DATA)' },
    { id: 'FE-3', donationId: 'DON-1003', type: 'Bridge', amountLabel: '150,000 USDC', timestamp: '2026-10-08T09:40:00.000Z', status: 'Completed', isDemoChainEvent: true, description: 'Simulated cross-chain bridge transfer (DEMO DATA)' },
    { id: 'FE-4', donationId: 'DON-1003', type: 'Fiat Off-ramp', amountLabel: '₹4,90,000 equivalent', timestamp: '2026-10-08T11:05:00.000Z', status: 'Completed', isDemoChainEvent: true, description: 'Simulated off-ramp into escrow wallet (DEMO DATA)' },
    { id: 'FE-5', donationId: 'DON-1003', type: 'Allocation', amountLabel: '₹2,50,000', timestamp: '2026-10-09T09:00:00.000Z', status: 'Completed', description: 'Allocated to school fee pool' },
    { id: 'FE-6', donationId: 'DON-1003', type: 'Transfer', amountLabel: '₹1,00,000', timestamp: '2026-10-10T10:30:00.000Z', status: 'Pending', description: 'Pending beneficiary transfer confirmation' },
    { id: 'FE-7', donationId: 'DON-1001', type: 'Expense', amountLabel: '₹2,00,000', timestamp: '2026-10-11T08:20:00.000Z', status: 'Completed', description: 'School tuition invoices submitted' },
    { id: 'FE-8', donationId: 'DON-1001', type: 'Evidence Verification', amountLabel: '₹2,00,000', timestamp: '2026-10-11T12:15:00.000Z', status: 'Completed', description: 'Receipts verified by operations reviewer' },
  ],
  evidenceRecords: [
    { id: 'EV-1001', donationId: 'DON-1001', category: 'School Fees', amountInr: 200000, submittedAt: '2026-10-11T08:00:00.000Z', status: 'Verified', evidenceHash: '0xabc1001', receiptPreview: 'Invoice #SF-2026-091 from Sunrise Public School.' },
    { id: 'EV-1002', donationId: 'DON-1002', category: 'Books', amountInr: 150000, submittedAt: '2026-10-12T08:00:00.000Z', status: 'Verified', evidenceHash: '0xabc1002', receiptPreview: 'Bulk books invoice #BK-8821 from EduBooks distributor.' },
    { id: 'EV-1003', donationId: 'DON-1003', category: 'School Fees', amountInr: 125000, submittedAt: '2026-10-13T08:00:00.000Z', status: 'Verified', evidenceHash: '0xabc1003', receiptPreview: 'Semester fee ledger upload from Starlight Academy.' },
    { id: 'EV-1004', donationId: 'DON-1004', category: 'Uniforms', amountInr: 100000, submittedAt: '2026-10-14T08:00:00.000Z', status: 'Verified', evidenceHash: '0xabc1004', receiptPreview: 'Uniform vendor invoice #UF-77 with student count details.' },
    { id: 'EV-1005', donationId: 'DON-1004', category: 'Stationery', amountInr: 50000, submittedAt: '2026-10-14T10:00:00.000Z', status: 'Verified', evidenceHash: '0xabc1005', receiptPreview: 'Stationery pack receipt #ST-122 with itemized SKUs.' },
    { id: 'EV-1006', donationId: 'DON-1003', category: 'School Fees', amountInr: 100000, submittedAt: '2026-10-15T08:00:00.000Z', status: 'Pending', evidenceHash: '0xabc1006', receiptPreview: 'Pending cross-check with school ledger.' },
    { id: 'EV-1007', donationId: 'DON-1002', category: 'Books', amountInr: 75000, submittedAt: '2026-10-15T10:00:00.000Z', status: 'Pending', evidenceHash: '0xabc1007', receiptPreview: 'Awaiting confirmation from district warehouse.' },
    { id: 'EV-1008', donationId: 'DON-1005', category: 'Stationery', amountInr: 10000, submittedAt: '2026-10-15T12:00:00.000Z', status: 'Flagged', evidenceHash: '0xdup2001', receiptPreview: 'Duplicate invoice metadata pattern detected.' },
    { id: 'EV-1009', donationId: 'DON-1005', category: 'Books', amountInr: 8000, submittedAt: '2026-10-15T12:10:00.000Z', status: 'Flagged', evidenceHash: '0xdup2002', receiptPreview: 'Unauthorized category mapping for books expense.' },
    { id: 'EV-1010', donationId: 'DON-1005', category: 'Uniforms', amountInr: 9000, submittedAt: '2026-10-15T12:20:00.000Z', status: 'Flagged', evidenceHash: '0xdup2003', receiptPreview: 'Repeated receipt serial from previous month.' },
    { id: 'EV-1011', donationId: 'DON-1005', category: 'School Fees', amountInr: 12000, submittedAt: '2026-10-15T12:30:00.000Z', status: 'Flagged', evidenceHash: '0xdup2004', receiptPreview: 'Suspicious amount split across multiple claims.' },
    { id: 'EV-1012', donationId: 'DON-1005', category: 'Books', amountInr: 5000, submittedAt: '2026-10-15T12:40:00.000Z', status: 'Duplicate', evidenceHash: '0xdup2001', receiptPreview: 'Same invoice hash appears in another submission.' },
    { id: 'EV-1013', donationId: 'DON-1005', category: 'Uniforms', amountInr: 4000, submittedAt: '2026-10-15T12:50:00.000Z', status: 'Duplicate', evidenceHash: '0xdup2002', receiptPreview: 'Hash collision in duplicate receipt check.' },
    { id: 'EV-1014', donationId: 'DON-1005', category: 'Stationery', amountInr: 3000, submittedAt: '2026-10-15T13:00:00.000Z', status: 'Duplicate', evidenceHash: '0xdup2003', receiptPreview: 'Receipt image fingerprint repeats prior upload.' },
    { id: 'EV-1015', donationId: 'DON-1005', category: 'School Fees', amountInr: 6000, submittedAt: '2026-10-15T13:10:00.000Z', status: 'Duplicate', evidenceHash: '0xdup2004', receiptPreview: 'Potential duplicate fee claim across cycles.' },
  ],
  fraudAlerts: [
    { id: 'FR-1001', title: 'Duplicate Evidence Claim', description: 'Evidence hash 0xdup2001 submitted in two records.', severity: 'High', status: 'Open', createdAt: '2026-10-15T12:55:00.000Z', relatedId: 'EV-1012' },
    { id: 'FR-1002', title: 'Unauthorized Expense Category', description: 'Expense tagged as transport under books allocation.', severity: 'Medium', status: 'Under Review', createdAt: '2026-10-15T13:05:00.000Z', relatedId: 'DON-1005' },
    { id: 'FR-1003', title: 'Suspicious Transfer Velocity', description: 'High-frequency micro-transfers from one allocation.', severity: 'Critical', status: 'Open', createdAt: '2026-10-15T13:15:00.000Z', relatedId: 'AL-1004' },
  ],
  allocations: [
    { id: 'AL-1001', purpose: 'School Fee Disbursement', amountInr: 400000, releasedInr: 300000, status: 'Funded', isFrozen: false },
    { id: 'AL-1002', purpose: 'Learning Materials', amountInr: 250000, releasedInr: 150000, status: 'Eligible for Release', isFrozen: false },
    { id: 'AL-1003', purpose: 'Uniform Assistance', amountInr: 200000, releasedInr: 100000, status: 'Pending Verification', isFrozen: false },
    { id: 'AL-1004', purpose: 'Emergency Stationery Buffer', amountInr: 50000, releasedInr: 0, status: 'Frozen', isFrozen: true },
  ],
  auditLog: [
    { id: 'AUD-1001', timestamp: '2026-10-15T12:55:00.000Z', category: 'Fraud', action: 'Alert Created', details: 'FR-1001 raised for duplicate claim pattern.' },
    { id: 'AUD-1002', timestamp: '2026-10-15T13:00:00.000Z', category: 'Evidence', action: 'Evidence Submitted', details: 'EV-1012 uploaded for DON-1005.' },
    { id: 'AUD-1003', timestamp: '2026-10-15T13:10:00.000Z', category: 'Escrow', action: 'Allocation Frozen', details: 'AL-1004 frozen pending review.' },
    { id: 'AUD-1004', timestamp: '2026-10-15T13:15:00.000Z', category: 'Donation', action: 'Donation Received', details: 'DON-1004 credited to NGO-EDU-04.' },
  ],
}

export const STORAGE_KEY = 'tracetrust-demo-state-v1'
