import type { Prisma } from '@prisma/client'
import { HttpError } from '../../middleware/errors.js'

export const FRAUD_RULES = {
  RULE_01_DUPLICATE_EVIDENCE_HASH: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_02_DUPLICATE_INVOICE_REF: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_03_DUPLICATE_PROVIDER_TRANSFER_REF: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_04_REPEATED_VENDOR_INVOICE_AMOUNT_COMBO: ['HIGH_SUSPICIOUS', true],
  RULE_05_SUSPICIOUS_ROUND_AMOUNT_VELOCITY: ['MEDIUM_SUSPICIOUS', false],
  RULE_06_CLAIM_AGAINST_FROZEN_ALLOCATION: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_07_VENDOR_OR_ORG_VERIFICATION_EXPIRED: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_08_ALLOCATION_BUDGET_OVERRUN: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_09_INVALID_APPROVAL_SEQUENCE: ['CRITICAL_CONFIRMED_BLOCKING', true],
  RULE_10_PAYOUT_AMOUNT_MISMATCH: ['CRITICAL_CONFIRMED_BLOCKING', true],
} as const

type FraudTx = Prisma.TransactionClient
type Rule = keyof typeof FRAUD_RULES

async function createCase(tx: FraudTx, expense: { id: string; organizationId: string }, ruleCode: Rule, explanation: string) {
  const [severity, isBlocking] = FRAUD_RULES[ruleCode]
  return tx.fraudCase.create({ data: { organizationId: expense.organizationId, expenseRequestId: expense.id, ruleCode, ruleName: ruleCode, severity, isBlocking, explanation } })
}

export async function evaluateEvidenceFraud(tx: FraudTx, expense: { id: string; organizationId: string }, sha256Hash: string) {
  const duplicate = await tx.evidenceFile.findFirst({ where: { sha256Hash, expenseRequestId: { not: expense.id } } })
  if (!duplicate) return []
  return [await createCase(tx, expense, 'RULE_01_DUPLICATE_EVIDENCE_HASH', 'Identical evidence SHA-256 was already used by another expense claim.')]
}

export async function evaluateExpenseFraud(tx: FraudTx, expenseId: string, options: { payoutAmountPaise?: number } = {}) {
  const expense = await tx.expenseRequest.findUnique({ where: { id: expenseId }, include: { allocation: true, organization: true, vendor: true, evidenceFiles: true } })
  if (!expense) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense request not found.')
  const cases = []
  const duplicateInvoice = await tx.expenseRequest.findFirst({ where: { id: { not: expense.id }, organizationId: expense.organizationId, vendorId: expense.vendorId, invoiceReference: expense.invoiceReference } })
  if (duplicateInvoice) cases.push(await createCase(tx, expense, 'RULE_02_DUPLICATE_INVOICE_REF', 'The invoice reference was already submitted for this vendor and organization.'))
  const duplicateTransfer = await tx.payout.findFirst({ where: { expenseRequestId: { not: expense.id }, providerTransferRef: { not: null }, status: { in: ['SUBMITTED', 'PROCESSING', 'PAID'] } } })
  if (duplicateTransfer) cases.push(await createCase(tx, expense, 'RULE_03_DUPLICATE_PROVIDER_TRANSFER_REF', 'A provider transfer reference was reused.'))
  const repeatedCombo = await tx.expenseRequest.findFirst({ where: { id: { not: expense.id }, organizationId: expense.organizationId, vendorId: expense.vendorId, amountPaise: expense.amountPaise, invoiceReference: { not: expense.invoiceReference } } })
  if (repeatedCombo) cases.push(await createCase(tx, expense, 'RULE_04_REPEATED_VENDOR_INVOICE_AMOUNT_COMBO', 'The same vendor and amount combination repeats with a different invoice reference.'))
  if (expense.amountPaise % 10000 === 0 || expense.amountPaise % 100000 === 99900) cases.push(await createCase(tx, expense, 'RULE_05_SUSPICIOUS_ROUND_AMOUNT_VELOCITY', 'The claim amount matches a suspicious round or just-below-threshold pattern.'))
  if (expense.allocation.status === 'FROZEN') cases.push(await createCase(tx, expense, 'RULE_06_CLAIM_AGAINST_FROZEN_ALLOCATION', 'The expense targets a frozen allocation.'))
  if (expense.amountPaise > expense.allocation.approvedBudgetPaise - expense.allocation.reservedPaise - expense.allocation.disbursedPaise) cases.push(await createCase(tx, expense, 'RULE_08_ALLOCATION_BUDGET_OVERRUN', 'The expense exceeds the allocation available balance.'))
  const expired = (date: Date | null) => Boolean(date && date <= new Date())
  if (['EXPIRED', 'SUSPENDED'].includes(expense.organization.verificationStatus) || expired(expense.organization.verificationExpiresAt) || ['EXPIRED', 'SUSPENDED'].includes(expense.vendor.verificationStatus) || expired(expense.vendor.verificationExpiresAt)) cases.push(await createCase(tx, expense, 'RULE_07_VENDOR_OR_ORG_VERIFICATION_EXPIRED', 'Organization or vendor verification is expired or suspended.'))
  if (options.payoutAmountPaise !== undefined && options.payoutAmountPaise !== expense.amountPaise) cases.push(await createCase(tx, expense, 'RULE_10_PAYOUT_AMOUNT_MISMATCH', 'Requested payout amount does not match the approved expense amount.'))
  const approvals = await tx.approval.findMany({ where: { expenseRequestId: expense.id, requestVersion: expense.version } })
  if (approvals.some((approval) => approvals.filter((candidate) => candidate.approverId === approval.approverId).length > 1) || approvals.some((approval) => approval.approverId === expense.requesterId)) cases.push(await createCase(tx, expense, 'RULE_09_INVALID_APPROVAL_SEQUENCE', 'Approval history contains a duplicate approver or requester self-approval.'))
  return cases
}

export async function assertPayoutEligible(tx: FraudTx, expenseId: string) {
  const blocking = await tx.fraudCase.findFirst({ where: { expenseRequestId: expenseId, isBlocking: true, status: { not: 'FALSE_POSITIVE_RESOLVED' } } })
  if (blocking) throw new HttpError(409, 'PAYOUT_BLOCKED_FRAUD', 'Payout is blocked by an unresolved fraud case.')
}

export async function runPrePayoutFraudCheck(tx: FraudTx, expenseId: string, payoutAmountPaise: number) {
  await evaluateExpenseFraud(tx, expenseId, { payoutAmountPaise })
  await assertPayoutEligible(tx, expenseId)
}
