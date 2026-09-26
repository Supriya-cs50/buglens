# BugLens — AI-Powered Bug Report Summarizer

BugLens turns inconsistent issue descriptions into concise, structured tickets for software maintenance teams. It preserves the user-provided report beside a server-generated triage summary, so engineers can review impact, severity, priority, reproduction steps, likely cause, and suggested next action without losing the source context.

## What it does

- Email/password registration and login with bcryptjs password hashes, JWT sessions in secure HTTP-only cookies, and a 12-hour expiry. The managed Manus OAuth identity remains available as an additional sign-in path.
- Role-aware `user` / `admin` authorization. Each report, batch, and processing event is scoped to its owner. Admin procedures and REST routes check the role on the server.
- Real report create, read, update, and delete operations, with search, severity/priority/category/status filters, date ordering, and pagination.
- Backend-only AI analysis through the platform's OpenAI-compatible LLM proxy using `gpt-5-mini`. Strict structured JSON mode is followed by server-side Zod validation, safe parsing, and one retry on invalid model output. Secrets are never sent to the browser.
- Database-backed user dashboard and organization-wide administrator metrics, report tables, and processing history.
- CSV import (up to 100 reports / 2 MB), row validation, persistent batch metadata, sequential analysis, visible progress, and resume after navigation or a stopped run.
- Responsive workspace navigation, loading/error/empty states, profile editing, report detail/edit screens, and severity/priority/status badges.

## Architecture

```text
React + TypeScript + Tailwind (client)
  ├── Wouter routes and responsive workspace UI
  └── typed tRPC queries/mutations + same-origin REST client compatibility
          ↓ HTTPS / same-origin
Express (server)
  ├── Helmet headers, body-size limits, secure session cookies
  ├── tRPC procedures (shared Zod validation and role checks)
  ├── /api REST router (auth, reports, analysis, batches, dashboard, admin)
  ├── BugLens AI service (server-only LLM proxy, strict JSON schema)
  └── Drizzle ORM
          ↓
Managed MySQL/TiDB
  ├── users
  ├── bug_reports
  ├── bug_summaries
  ├── batches
  └── processing_history
```

### Platform-specific stack note

The supplied specification requested PostgreSQL + Prisma + standalone Express REST + JWT/bcrypt. This project is implemented on the available managed full-stack runtime, which provides MySQL/TiDB + Drizzle, Express, React, and secure hosting. The application preserves the requested ownership, CRUD, roles, validation, AI, REST API, analytics, and account behaviors; the database and ORM are the intentional infrastructure substitutions. The frontend uses the scaffold's typed tRPC client for app screens and the server also exposes a REST API under `/api` for integrations.

## Technology

- React 19, TypeScript, Tailwind CSS 4, Wouter, Recharts, Lucide
- Express 4, tRPC 11, Zod, Helmet
- Drizzle ORM, managed MySQL/TiDB
- bcryptjs, JWT (`jose`), HTTP-only secure cookies
- Server-side platform LLM proxy (OpenAI-compatible chat-completions API)
- Vitest

## Project structure

```text
buglens/
├── client/
│   ├── src/components/       # Shared auth, navigation, and ticket UI
│   ├── src/pages/            # Landing, auth, dashboard, reports, batches, admin
│   ├── src/lib/trpc.ts       # Typed RPC client
│   └── src/App.tsx           # Routes
├── drizzle/
│   ├── schema.ts             # Users, reports, summaries, batches, history
│   └── migrations/           # Generated migration files
├── server/
│   ├── routers/buglens.ts    # Business procedures and access control
│   ├── rest.ts               # Same-origin REST endpoints
│   ├── auth.ts               # JWT sessions and request account resolution
│   ├── bugAnalysis.ts        # Backend AI integration and output validation
│   ├── db.ts                 # Drizzle database connection
│   └── _core/                # Managed runtime plumbing (OAuth, LLM, Express)
├── shared/buglens.ts         # Shared input/output Zod schemas and enums
├── README.md
└── todo.md
```

## Data model

- **User**: provider identity, name/email, optional password hash, role, disabled flag, account timestamps.
- **BugReport**: owner, optional batch, title, original description/raw text, environment, application module, user-reported severity, status, timestamps.
- **BugSummary**: one validated AI triage result per report; summary, severity, priority, category, impact, reproduction steps, expected/actual behavior, environment, possible cause, recommended action.
- **Batch**: owner, filename-derived name, status, total/processed/failed counts, timestamps.
- **ProcessingHistory**: owner, optional report/batch references, processing status, duration, timestamp.

Foreign keys cascade report and batch data with the owning user. Owner/date, owner/status, batch, triage, and user/history indexes support the core queries. User email and provider identity are unique.

## REST API

All responses are wrapped as `{ "success": true, "data": ... }`. Errors follow `{ "success": false, "message": "...", "error": "..." }`. Private routes require a session cookie; `/admin/*` routes require the `admin` role.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account (name, email, password) |
| POST | `/api/auth/login` | Start email/password session |
| POST | `/api/auth/logout` | Clear session cookies |
| GET | `/api/auth/me` | Current signed-in account |
| POST | `/api/reports` | Create report |
| GET | `/api/reports` | Search/filter/sort/paginate owned reports |
| GET | `/api/reports/:id` | Read owned report and summary |
| PUT | `/api/reports/:id` | Update report; content changes invalidate old analysis |
| DELETE | `/api/reports/:id` | Delete owned report |
| POST | `/api/reports/:id/analyze` | Analyze report |
| POST | `/api/reports/:id/reanalyze` | Re-run analysis |
| POST | `/api/batch/upload` | Save parsed CSV rows as a batch |
| GET | `/api/batch` | List owned batches |
| GET | `/api/batch/:id` | Read batch status and report results |
| POST | `/api/batch/:id/process` | Mark batch processing and return its reports |
| GET | `/api/dashboard/stats` | Owner-scoped metrics and chart data |
| GET | `/api/admin/users` | Search all users (admin) |
| GET | `/api/admin/reports` | Latest reports across the workspace (admin) |
| GET | `/api/admin/stats` | Organization-wide counts and distributions (admin) |
| PATCH | `/api/admin/users/:id` | Enable/disable account (admin) |
| DELETE | `/api/admin/reports/:id` | Moderate report (admin) |

The application UI uses the same protected procedures through `/api/trpc`, including Zod input validation and typed client contracts.

## Authentication and roles

1. Register with a name, unique email, and an 8+ character password containing uppercase, lowercase, and numeric characters.
2. The server hashes the password with bcryptjs (cost factor 12) and issues a signed HS256 JWT in an HTTP-only, Secure, SameSite=Lax cookie, using an app-specific SHA-256 key derived from the provisioned platform `JWT_SECRET`.
3. The server resolves the account on every private request and rejects expired sessions and disabled users.
4. Every report query includes the authenticated user ID; no client-provided owner ID is trusted.
5. Admin procedures check `role === "admin"` in the backend. Hiding the admin navigation is only a UI affordance, not the security boundary.

New local accounts default to `user`. To grant the first administrator, update that account's `users.role` to `admin` using the project's authorized database console. Do not grant admin automatically to the first public registrant.

## AI and batch workflows

### Single report

1. Validate title, description, environment, and module on the server.
2. Save the source report first.
3. Send only the needed report fields from the Express server to the configured OpenAI-compatible LLM proxy; report text is treated as untrusted data.
4. Request a strict JSON schema; safely parse and validate every field and enum with Zod. Retry once, then return a generic error without leaking proxy details.
5. Store the validated summary and a processing-history row in the database.

The AI key is not included in Vite/client bundles. AI summaries are suggestions and should be checked against the original report before prioritization.

### CSV batch

The browser checks file type and size, parses quoted CSV fields, validates headers and rows, and submits normalized records. The backend re-validates the name and every row before inserting the batch and reports. Reports are analyzed sequentially in the browser to avoid long-lived server workers in the managed serverless runtime. Results and progress persist in MySQL; returning to the batch screen allows a user to resume remaining or failed rows. Closing the current page pauses the current sequence rather than deleting work.

Required headers: `title,description`; optional: `environment`. Maximums: 100 reports, 2 MB CSV, 255-character title, 20,000-character description.

## Environment and setup

### Managed BugLens project

The project uses the managed database and built-in LLM proxy configured by the hosting runtime. No browser-side AI key or customer-provided secret is needed for the managed preview.

###Local Development

#### Prerequisites

- Node.js 20+
- pnpm
- MySQL/TiDB database
- OpenAI-compatible LLM API access

#### 1. Clone the repository

git clone https://github.com/YOUR_USERNAME/buglens.git
cd buglens

#### 2. Install dependencies

pnpm install

#### 3. Configure environment variables

Create a `.env` file:

DATABASE_URL="your_database_url"
JWT_SECRET="your_random_secret"
LLM_API_KEY="your_api_key"
LLM_BASE_URL="your_provider_endpoint"

#### 4. Setup the database

pnpm drizzle-kit generate

## Apply migrations using the configured database

#### 5. Start the application

pnpm dev

`DATABASE_URL` must point to a MySQL/TiDB database for this Drizzle schema. The selected LLM model is `gpt-5-mini`; the server calls the managed OpenAI-compatible proxy helper. For a non-managed deployment, implement/maintain a server-side provider adapter and set its private endpoint/key in the hosting environment; do not put credentials in variables prefixed with `VITE_`.

## Running and tests

- Development server: `pnpm dev`
- Type check: `pnpm check`
- Unit tests: `pnpm test`
- Build: `pnpm build`
- Generate schema SQL: `pnpm drizzle-kit generate`

Tests cover secure logout cookies, AI result schema constraints, password/email validation, malformed registration, and unauthenticated report access. Database-backed end-to-end tests should run against a dedicated isolated test database, never production data.

## Security considerations

- bcrypt password hashes only; no plaintext password persistence.
- Signed, expiring JWT sessions in HTTP-only, Secure cookies.
- Helmet response headers, same-origin API usage, request-body size limits, Zod validation, and parameterized Drizzle queries.
- Server-side AI invocation and generic model failure responses.
- Owner scoping on reports, batches, dashboards, and processing history; admin checks on every administrative procedure.
- AI rate limiting uses persisted per-user processing attempts (120 per minute); duplicate concurrent analysis is rejected and abandoned `ANALYZING` claims can be retried after five minutes.
- CSV is parsed as text only; no executable file processing or arbitrary file storage.
- Password-reset email delivery is not configured. The forgot-password page explicitly directs users to their workspace administrator and does not claim to send mail.

## Future improvements

- Add a verified outbound email provider and tokenized password-reset flow.
- Move batch orchestration to a durable queue/worker for long-running jobs and finer-grained retries.
- Add SSO/team workspaces, data-retention controls, report exports, and audit logs.
- Run integration and browser E2E tests against a dedicated seeded test database.
- Offer PostgreSQL/Prisma packaging for self-hosted installations that require the original requested database stack.
