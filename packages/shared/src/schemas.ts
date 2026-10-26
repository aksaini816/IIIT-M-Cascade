import { z } from 'zod'
import { DonationStatus, ExpenseStatus, FraudSeverity, OrgRole, OrgType, OrgVerificationStatus, PayoutStatus } from './enums.js'

export const moneyPaiseSchema = z.number().int().safe().positive()
export const organizationSchema = z.object({ id: z.string().min(1), type: z.nativeEnum(OrgType), verificationStatus: z.nativeEnum(OrgVerificationStatus) })
export const roleSchema = z.nativeEnum(OrgRole)
export const donationStatusSchema = z.nativeEnum(DonationStatus)
export const expenseStatusSchema = z.nativeEnum(ExpenseStatus)
export const payoutStatusSchema = z.nativeEnum(PayoutStatus)
export const fraudSeveritySchema = z.nativeEnum(FraudSeverity)
