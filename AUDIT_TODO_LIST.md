# KINDORA Live Browser QA Audit

Date: 2026-10-26

## 1. ✅ Login Fix Status

Login was blocked in the browser because the Vite development server had no `/api`
proxy. Browser requests from `http://localhost:5173` therefore could not reach the
API on port 3000.

Fixed:

- Added the `/api` proxy in `apps/web/vite.config.ts`.
- Kept login and registration exempt from CSRF validation before a session exists.
- Added a readable `csrf_token` cookie and `x-csrf-token` response header after login.
- Preserved the JSON `csrfToken` response for the centralized `apiFetch` client.
- Kept the session cookie HttpOnly, SameSite=Lax, Path=/, and non-Secure on local HTTP.
- Confirmed seeded users use Argon2id hashes generated from `KindoraDemo!2026`.
- Updated quick-fill controls to use `setValue(..., { shouldValidate: true, shouldDirty: true })`.
- Added session restoration through `/api/auth/me` after browser refresh.
- Cleared both the session and CSRF cookies on logout.

Live browser verification:

- Donor login: passed.
- NGO Staff login: passed.
- Approver A login: passed.
- Approver B login: passed.
- Auditor login: passed.
- Platform Admin login: passed.
- Every account redirected to `/app/dashboard`.
- Refreshing `/app/dashboard` preserved the authenticated user.
- Logout returned to `/login` with HTTP 204 from the API.

## 2. ❌ Broken Features / Failing APIs

### Fixed during this audit

| Finding | Evidence | Resolution |
|---|---|---|
| Campaign detail used a non-seeded fallback slug | `GET /api/campaigns/rural-learning-center-ambala` returned HTTP 404 `CAMPAIGN_NOT_FOUND` | Browser now opens a real seeded campaign slug; the campaign detail renders allocations, bills, evidence, payouts, and impact data. |
| Vendor directory request omitted the required organization ID | `GET /api/vendors` returned HTTP 400 `ORG_ID_REQUIRED` | Vendor query now waits for an organization ID and calls `/api/vendors?organizationId=...`. |
| Public impact query treated `all` as a UUID | `GET /api/impact/public/all` returned HTTP 500 with Prisma UUID conversion error | Backend now supports the `all` aggregate query. |
| Required workspace paths were absent | `/app/expenses` and `/app/approvals` redirected to `/`; `/app/campaigns` redirected to `/` | Added route aliases for all three paths. |
| Authenticated user disappeared after a hard refresh | Workspace shell showed an empty session before restoration | Auth provider now restores the session from `/api/auth/me`. |

### Browser-only observations

- The first frontend launch emitted Vite `504 (Outdated Optimize Dep)` responses
  for React dependency pre-bundles. This was an old Vite cache issue; clearing
  `apps/web/node_modules/.vite` and restarting resolved it.
- One logout click produced a Playwright `net::ERR_ABORTED` request-failure event
  while navigation was occurring, but the same request completed with HTTP 204 and
  the browser correctly returned to `/login`. This is a browser navigation event,
  not a backend logout failure.
- Before the final logout-cookie fix, unauthenticated startup could produce
  expected `GET /api/auth/me` HTTP 401 responses. A fresh `/login` visit after
  logout now produces no failed requests or console errors.

## 3. ⚠️ Missing or Incomplete Items

These are not blank-page failures, but they remain product-completeness work:

- `/app/campaigns` currently reuses the public campaign explorer. A dedicated
  authenticated donation-management view and integrated test donation checkout
  are not exposed from this route.
- `DonationCheckout` exists in the frontend codebase but is not wired to a visible
  route from the audited campaign workspace flow. The browser audit did not
  complete a test INR donation because no checkout action was available on the
  authenticated campaign route.
- `/organizations/unknown` renders the static fallback organization profile
  rather than a server-backed organization lookup. A real seeded organization
  link should be used and the profile should fetch `/api/organizations/:id`.
- Some seeded campaign detail records intentionally show pending approval badges
  and flagged evidence. These are valid evaluator fixtures, not empty data.
- The Impact page displays seeded reports, but its creation/publish workflow was
  not submitted during this audit to avoid mutating the shared demo scenario.
- Expense creation and evidence upload controls are present, but a new expense
  was not submitted because the audit database is a deterministic seeded fixture
  and the UI requires manually selecting organization, allocation, and vendor IDs.
- Approvals, payout initiation, fraud review, and reconciliation actions were
  visible but were not committed during this read/write audit; they require
  intentional state changes and role-specific sessions.
- The application bundle still produces the existing non-blocking Vite warning
  for a JavaScript chunk larger than 500 KB.

## 4. 🛠️ Prioritized Action Plan

1. [ ] Add a dedicated authenticated campaign/donation management page at
   `/app/campaigns`.
2. [ ] Wire `DonationCheckout` to a visible campaign action and complete a
   sandbox INR donation flow from the browser.
3. [ ] Replace the organization profile fallback with a real organization ID
   from campaign links and a server-backed `/api/organizations/:id` query.
4. [ ] Improve expense creation defaults by selecting the active organization,
   allocation, and vendor automatically from authenticated membership data.
5. [ ] Add browser automation coverage for expense creation, evidence upload,
   approval A/B sequencing, payout initiation, fraud review, reconciliation
   resolution, and impact report publication.
6. [ ] Add automated browser assertions for all required routes, HTTP responses,
   console errors, page errors, and footer presence.
7. [ ] Add a Vite dependency-cache reset instruction or CI clean-install step
   to prevent stale `Outdated Optimize Dep` startup noise.
8. [ ] Split the large frontend bundle with route-level dynamic imports.
9. [ ] Keep live payment and payout integrations gated until provider credentials,
   KYC, webhook verification, and production compliance checks are complete.

## Browser Route Results

All audited routes rendered non-empty DOM content and the required footer:

- `/`
- `/campaigns`
- A real seeded `/campaigns/:slug` detail page
- `/transparency`
- `/organizations/:id` fallback route
- `/legal/privacy`
- `/legal/terms`
- `/legal/refund-policy`
- `/contact`
- `/login`
- `/app/dashboard`
- `/app/campaigns`
- `/app/organizations`
- `/app/allocations`
- `/app/expenses`
- `/app/approvals`
- `/app/fraud`
- `/app/payouts`
- `/app/audit`
- `/app/impact`
- `/app/settings`

Audit explorer interaction results:

- `Verify entire audit hash chain`: passed, `valid: true`, 60 events checked.
- `Anchor latest root`: passed using `EMBEDDED_LOCAL_EVM`, with transaction hash
  and incremented block number displayed.
- Local EVM commitments tab: rendered seeded and newly anchored commitments.
- Simulated cross-chain tab: rendered separately from Local EVM records.

Theme interaction results:

- System (Auto), Light, and Dark options were visible.
- Selecting Dark applied `<html class="dark">` and an `rgb(2, 6, 23)` body canvas.
- Selecting Light applied `<html class="light">`.
