# KINDORA security threat model

## Assets

- INR donation, allocation, reservation, disbursement, and payout ledger values.
- Private evidence documents and server-computed SHA-256 digests.
- User credentials, sessions, CSRF tokens, organization memberships, and payout destinations.
- Audit-event hash chain and local EVM commitment records.

## Trust boundaries

1. Browser to API: all authorization is rechecked server-side; UI role hiding is not a security control.
2. API to PostgreSQL: transactions and row-level locking protect reservations and payout idempotency.
3. Provider to webhook endpoint: raw-body HMAC verification precedes event processing.
4. API to private storage: object keys are unguessable and downloads require organization authorization or auditor/admin access.
5. API to local EVM: optional local-only commitment anchoring; unavailable nodes are reported as offline.

## Controls

### RBAC and organization isolation

Active organization memberships are required for organization-scoped actions. Approver roles are checked against the expense organization. Platform admins cannot bypass the mandatory two-person approval policy. Self-promotion to elevated organization roles is rejected.

### Two-person approval concurrency

Approval decisions lock the current expense and allocation in a transaction. The request version must match exactly, the requester cannot approve, and Approver A and Approver B must be distinct active members. Allocation reservations use row-level locking and reject insufficient available balance.

### Payout replay and concurrency

Payout idempotency keys are deterministic: `payout:<expenseId>:v<version>`. Duplicate initiation is rejected or returns the existing record. Ambiguous outcomes cannot be retried until provider reconciliation queries the provider status.

### Webhook replay

Webhook signatures are verified against the raw body. `(provider, providerEventId)` is unique, so duplicate deliveries are ignored without incrementing campaign revenue twice. Amount and currency are compared against the donation.

### Evidence limitations

Server SHA-256 proves byte-identical file consistency and catches duplicate uploads. It does not independently prove that an invoice is genuine. MIME type and magic-byte checks reject mismatched or executable content, and private files are never exposed through static URLs.

### PII and secret protection

Beneficiary names and raw records are not stored on-chain. Logs redact sensitive keys. Password hashes and encrypted payout destination references must not be serialized into public responses. Production secrets belong in a managed secret store.

### Audit hash chaining

Each audit event includes the previous hash and a deterministic SHA-256 hash over the event fields, metadata, and timestamp. Integrity verification detects sequence tampering. Local EVM anchoring stores only a commitment root and transaction metadata.

## Residual risks

- SHA-256 is not an authenticity or issuer-attestation mechanism.
- Local EVM is not a mainnet or bridge settlement guarantee.
- Malware scanning is an explicit provider hook and requires a production scanner integration.
- Rate limiting, centralized secret management, key rotation, operational alerting, and provider-specific compliance remain deployment responsibilities.
