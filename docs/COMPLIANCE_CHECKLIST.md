# Production compliance checklist

Use this checklist before enabling live money or publishing a production deployment.

## Governance and legal

- [ ] Legal entity, platform operator, and each recipient organization are identified.
- [ ] Organization verification scope and expiry policy are approved.
- [ ] Donation, refund, dispute, privacy, and support disclosures are published.
- [ ] Tax-deduction claims are made only from verified organization-specific records.
- [ ] Data retention and deletion policies are approved.
- [ ] Incident response, escalation, and evidence-preservation owners are assigned.

## Identity and access

- [ ] Production passwords are replaced with managed onboarding credentials.
- [ ] MFA or equivalent elevated-role protection is enabled.
- [ ] Platform admin and auditor access is least-privilege and reviewed periodically.
- [ ] Organization membership changes require audit logging and approval.
- [ ] Session expiry, revocation, secure cookies, CSRF protection, and login lockout are enabled.

## Money movement

- [ ] Provider KYC and production merchant onboarding are complete.
- [ ] Razorpay/Dodo production webhook secrets are stored in a secret manager.
- [ ] `LIVE_PAYMENTS_ENABLED=true` is enabled only through an approved release change.
- [ ] `LIVE_PAYOUTS_ENABLED=true` is separately approved and monitored.
- [ ] INR amount and currency mismatch tests pass.
- [ ] Refund, dispute, failed payment, duplicate webhook, and out-of-order webhook tests pass.
- [ ] Payout reconciliation ownership and bank settlement reconciliation are documented.

## Approval and fraud controls

- [ ] Two distinct active approvers are configured for every funded organization.
- [ ] Requesters cannot approve their own expenses.
- [ ] Material edits increment the version and invalidate prior approvals.
- [ ] Blocking fraud cases freeze payout eligibility.
- [ ] Frozen allocations and expenses cannot reserve, approve, or pay.
- [ ] Ambiguous payouts cannot be retried without provider reconciliation.

## Evidence and privacy

- [ ] Private storage is outside the web root and access-controlled.
- [ ] Maximum file size and MIME/magic-byte validation are enforced.
- [ ] Malware scanning hook is connected to a production scanner.
- [ ] SHA-256 limitations are shown to reviewers and donors.
- [ ] Beneficiary PII is excluded from blockchain payloads and public responses.
- [ ] Logs are checked for password hashes, secrets, and encrypted payout references.

## Infrastructure and blockchain

- [ ] PostgreSQL backups, restore tests, TLS, monitoring, and migrations are configured.
- [ ] Audit-chain integrity verification is monitored.
- [ ] Local EVM configuration is not confused with mainnet settlement.
- [ ] Mainnet or bridge deployment has a separate security review and key-management plan.
- [ ] Simulated cross-chain records remain isolated from financial totals.

## Release evidence

- [ ] Shared tests pass.
- [ ] API security, concurrency, and integration tests pass.
- [ ] Hardhat compilation and contract tests pass.
- [ ] Web production build passes.
- [ ] Lint and typecheck pass.
- [ ] Seed is deterministic and safe to replay in a disposable evaluation database.
- [ ] A signed release artifact and rollback plan are available.
