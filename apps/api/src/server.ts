import express from 'express'
import { formatINRFromPaise } from '@kindora/shared'
import { authRouter } from './modules/auth/authRouter.js'
import { sessionContext } from './middleware/requestContext.js'
import { csrfProtection } from './middleware/csrf.js'
import { errorHandler } from './middleware/errors.js'
import { auditRouter } from './modules/audit/audit.routes.js'
import { organizationRouter } from './modules/organizations/organization.routes.js'
import { vendorRouter } from './modules/vendors/vendor.routes.js'
import { campaignRouter } from './modules/campaigns/campaign.routes.js'
import { allocationRouter } from './modules/allocations/allocation.routes.js'
import { expenseRouter } from './modules/expenses/expenses.routes.js'
import { approvalsRouter, expenseFreezeRouter } from './modules/approvals/approvals.routes.js'
import { evidenceRouter } from './modules/evidence/evidence.routes.js'
import { fraudRouter } from './modules/fraud/fraud.routes.js'
import { donationRouter } from './modules/donations/donation.routes.js'
import { paymentWebhookRouter } from './modules/webhooks/payment.webhook.js'
import { assertSafePaymentConfiguration } from './providers/payments/config.js'
import { payoutRouter } from './modules/payouts/payouts.routes.js'
import { reconciliationRouter } from './modules/reconciliation/reconciliation.routes.js'
import { impactRouter } from './modules/impact/impact.routes.js'
import { blockchainRouter } from './modules/blockchain/blockchain.routes.js'

export const app = express()
assertSafePaymentConfiguration()
app.use('/api/evidence', express.raw({ limit: '5mb', type: () => true }))
app.use('/api/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))
app.use(sessionContext)
app.use(csrfProtection)
app.get('/health', (_request, response) => response.json({ ok: true, service: 'kindora-api', currency: formatINRFromPaise(0) }))
app.use('/api/auth', authRouter)
app.use('/api/audit', auditRouter)
app.use('/api/organizations', organizationRouter)
app.use('/api/vendors', vendorRouter)
app.use('/api/campaigns', campaignRouter)
app.use('/api/allocations', allocationRouter)
app.use('/api/expenses', expenseRouter)
app.use('/api/expenses', expenseFreezeRouter)
app.use('/api/approvals', approvalsRouter)
app.use('/api/evidence', evidenceRouter)
app.use('/api/fraud-cases', fraudRouter)
app.use('/api/donations', donationRouter)
app.use('/api/webhooks', paymentWebhookRouter)
app.use('/api/payouts', payoutRouter)
app.use('/api/reconciliation', reconciliationRouter)
app.use('/api/impact', impactRouter)
app.use('/api/blockchain', blockchainRouter)
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') app.listen(3000, () => console.log('KINDORA API listening on http://127.0.0.1:3000'))
