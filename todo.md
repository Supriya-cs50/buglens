# BugLens delivery checklist

## Implemented

- [x] Responsive marketing landing page and public account pages
- [x] Email/password registration/login using server-side bcrypt hashes and signed, secure HTTP-only JWT cookies
- [x] Shared auth state, logout cookie cleanup, expiring sessions, disabled-account checks
- [x] User/admin roles, server-side admin guards, user enable/disable and report moderation
- [x] Managed MySQL/TiDB schema with users, reports, AI summaries, batches, processing history, relationships, unique identifiers, and query indexes
- [x] Validated report create/read/update/delete, owner scoping, search, category/severity/priority/status filters, sort, and pagination
- [x] Server-only LLM call, strict structured output, safe JSON parsing, Zod validation, one retry, persisted summaries, and generic failure messages
- [x] Report details distinguish reporter content from AI triage; supports edit, copy, analyze/re-analyze, and delete
- [x] Database-backed user dashboard with severity/category/priority charts, weekly counts, high/critical metrics, 14-day report volume, and recent tickets; admin view adds system-wide analysis outcome trends
- [x] CSV import with quoted fields, row/header/size validation, saved batch state, per-report processing history, progress, and resume/retry
- [x] Processing history page and editable user profile
- [x] REST endpoints for auth, reports, analysis, batches, dashboard, and admin operations
- [x] Helmet and request size limits; parameter validation; persisted per-user analysis rate limit; duplicate analysis protection
- [x] Empty/loading/error states, responsive screens, persistent navigation, status/severity/priority badges, and toast feedback
- [x] README with platform stack substitution, routes, schema, auth, AI and CSV flows, setup, security, tests, and future improvements
- [x] Unit tests for logout cookies, structured AI validation, auth validation, and unauthenticated report access

## Verified in this sandbox

- [x] `pnpm check`
- [x] `pnpm test` — 6 tests passing
- [x] Reviewed and applied additive DB indexes and account email uniqueness
- [x] Preview captured for dashboard, reports, batch, admin, report creation, login, and registration
- [x] Production bundle build (`pnpm build`)

## Isolated end-to-end preview smoke test

- [x] Create and authenticate a disposable local test account through the actual signup/login forms
- [x] Verify member-only denial at `/admin` without exposing workspace data
- [x] Create a synthetic issue; save it and confirm live LLM analysis returns validated structured triage
- [x] Parse a quoted single-row CSV through the browser file-change flow; save and process its batch end-to-end
- [x] Confirm saved-batch list transitions from `PROCESSING` to `COMPLETED`
- [x] Delete the disposable test account and verify its reports, batch, and user rows are all removed

## Follow-up / operational items

- [ ] Configure a verified password-reset email sender before enabling an actual email recovery flow; current recovery page clearly directs users to an administrator
- [ ] For non-managed hosting, configure a dedicated database, a high-entropy `JWT_SECRET`, and a server-side OpenAI-compatible adapter/credential in the hosting secret manager
- [ ] Grant administrator status to intended users through the authorized database console; public registration never self-grants admin
- [ ] Run seeded browser end-to-end tests against a dedicated non-production test database
- [ ] Use a durable queue/worker if batch sizes or model latency grow beyond a user-held sequential session
- [ ] Consider scheduled cleanup/retention and audit-log policy before broad production roll-out

## Isolated end-to-end preview smoke test

- [x] Create and authenticate a disposable local test account through the actual signup/login forms
- [x] Verify member-only denial at `/admin` without exposing workspace data
- [x] Create a synthetic issue; save it and confirm live LLM analysis returns validated structured triage
- [x] Parse a quoted single-row CSV through the browser file-change flow; save and process its batch end-to-end
- [x] Confirm saved-batch list transitions from `PROCESSING` to `COMPLETED`
- [x] Delete the disposable test account and verify its reports, batch, and user rows are all removed
