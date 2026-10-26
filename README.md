# KINDORA

KINDORA is an INR-first education donation transparency platform. Its core design principle is that a confirmed donation, an approved expense, an executed payout, and verified educational impact are four distinct states.

## Architecture

```text
apps/web          React + TypeScript + Vite institutional workspace
apps/api          Express + Prisma API, RBAC, audit, payments, payouts
packages/shared   Paise-safe money utilities, schemas, and shared enums
packages/blockchain
                   Privacy-preserving Solidity commitment ledger
```

Financial amounts are integer paise. Private evidence is stored outside the web root and is served only through an authenticated authorization check. Public and on-chain data use anonymized identifiers and cryptographic commitments rather than beneficiary PII or raw documents.

## Local setup

Requirements: Node.js 20+, npm, PostgreSQL 16, and optionally Docker Desktop.

```powershell
npm install
$env:DATABASE_URL='postgresql://kindora:kindora_dev_only@127.0.0.1:5432/kindora'
```

Start PostgreSQL with Docker Compose:

```powershell
docker compose up -d postgres
```

Apply the Prisma schema and generate the client:

```powershell
npm.cmd exec --workspace=apps/api prisma migrate dev --name init
npm.cmd exec --workspace=apps/api prisma generate
```

Seed the deterministic synthetic evaluation scenario. Re-running this command resets and replays the scenario:

```powershell
npm.cmd exec --workspace=apps/api prisma db seed
```

The seed prints the audit-chain integrity result and fails if the generated chain is invalid.

## Local EVM commitments

The Solidity package uses Hardhat's local network:

```powershell
npm.cmd run compile --workspace=packages/blockchain
npm.cmd test --workspace=packages/blockchain
```

For a persistent local node, use either a local Hardhat node or the optional Compose profile:

```powershell
npx hardhat node --config packages/blockchain/hardhat.config.ts
docker compose --profile evm up -d evm
```

Configure the API when anchoring audit roots:

```text
LOCAL_RPC_URL=http://127.0.0.1:8545
KINDORA_COMMITMENT_LEDGER_ADDRESS=<deployed-local-address>
LOCAL_EVM_PRIVATE_KEY=<local-only-private-key>
```

If the node is unavailable, the API reports offline status and queues an explicit local-EVM anchor event; it does not claim a confirmed transaction.

## Demo accounts

The seed creates development-only accounts with the shared password `KindoraDemo!2026`:

| Persona | Email |
|---|---|
| Donor 1 | donor1@demo.kindora.org |
| Donor 2 | donor2@demo.kindora.org |
| Vidya requester | staff.vidya@demo.kindora.org |
| Pragati requester | staff.pragati@demo.kindora.org |
| Approver A | approver.a@demo.kindora.org |
| Approver B | approver.b@demo.kindora.org |
| Auditor | auditor@demo.kindora.org |
| Platform administrator | admin@demo.kindora.org |

These credentials are for local evaluation only and must never be used in a deployed environment.

## Implemented, simulated, and gated features

| Area | Implemented working features | Simulated features | Gated live features |
|---|---|---|---|
| Donations | INR paise validation, provider order lifecycle, signed callback, webhook deduplication | Sandbox provider and local payment simulator | Dodo/Razorpay live keys |
| Allocations | Purpose binding, reservations, row locks, freeze/unfreeze, derived balance | None | None |
| Expenses | Versioning, approval invalidation, private evidence, fraud hooks | Synthetic seed fixtures | None |
| Approvals | Mandatory distinct Approver A/B policy, stale-version protection, self-approval rejection | Synthetic evaluator personas | None |
| Evidence | Private storage, MIME/magic-byte validation, server SHA-256, authorized download | Malware scan hook is an integration point | Production object storage/malware provider |
| Payouts | 13-point gate, deterministic idempotency, reconciliation ledger updates | `SimulationPayoutAdapter`, ambiguous timeout outcomes | Live payout adapter requires `LIVE_PAYOUTS_ENABLED=true` and compliance approval |
| Blockchain | Privacy-preserving Solidity commitment ledger and optional local EVM anchoring | Explicit `SIMULATED_CROSS_CHAIN` namespace with `SIM-NO-TX-*` references | Mainnet deployment and bridge integrations |
| Impact | Submit, review, publish, and public retrieval | Synthetic reports | None |

## Verification commands

```powershell
npm.cmd test --workspace=packages/shared
npm.cmd test --workspace=apps/api
npm.cmd run typecheck --workspace=apps/api
npm.cmd run compile --workspace=packages/blockchain
npm.cmd test --workspace=packages/blockchain
npm.cmd run build --workspace=apps/web
npm.cmd run lint
```

Further operational guidance:

- [Payment setup](./docs/PAYMENT_SETUP.md)
- [Security threat model](./docs/SECURITY_THREAT_MODEL.md)
- [Compliance checklist](./docs/COMPLIANCE_CHECKLIST.md)
