# Paperpost technical requirements

This document defines the technical requirements for Paperpost: a service that lets users create HTML templates, generate personalized PDFs, and email them through an API. It is based on the repository as reviewed on 2026-10-06.

Sections 1–7 describe the current implementation contract and its constraints. Section 8 defines additional production requirements; these must not be treated as already implemented. See [README.md](../README.md) for setup instructions and [production-readiness.md](production-readiness.md) for the implementation checklist and launch gate.

## 1. Runtime and architecture

- Use Next.js App Router, React, and TypeScript. Dependency versions must follow `package.json` and the lockfile.
- Run server routes on Node.js 22 or later. PDF generation requires a host capable of running Puppeteer's Chromium with its sandbox enabled; standard edge/serverless deployment is not supported out of the box.
- Use PostgreSQL 16 or later for accounts, sessions, templates, API keys, authentication limits, and delivery records.
- Use Handlebars for restricted template interpolation, Zod for request/schema validation, Puppeteer for PDF generation, and Resend for email delivery and signed webhooks.
- Keep database access and provider credentials on the server. Use parameterized SQL and explicit owner checks.
- Support a database-backed account mode and a browser-only local playground. The playground must not send email or create API keys; unauthenticated PDF generation is permitted only outside production.

## 2. Accounts and workspace isolation

- Each account owns one isolated workspace. Templates, API keys, and delivery history must be scoped to that owner on every access.
- Support signup, sign-in, session inspection, and logout using email and password. Normalize email addresses by trimming and lowercasing them.
- Accept passwords of 12–128 characters and store salted scrypt hashes. Compare derived password hashes using a timing-safe comparison.
- Generate cryptographically random session tokens and store only their SHA-256 hashes. Sessions expire after seven days.
- Set session cookies with `HttpOnly`, `SameSite=Lax`, and `Path=/`; production cookies must also use `Secure`.
- Require a matching `Origin` header for authentication mutations and cookie-authenticated writes. Use `APP_ORIGIN` when configured.
- Persist the authentication attempt limit in PostgreSQL: at most 10 attempts per email address within a 15-minute window.
- Generate bearer keys with the `pp_` prefix, reveal the complete key on creation, and store only its hash and display prefix. Revoked keys must immediately fail authentication.

Current limitations: team membership, invitations, email verification, password reset, and API key expiry/scopes are not implemented.

## 3. Templates and variables

- Support creating, editing, saving, previewing, and downloading HTML-based PDF templates, with an included invoice starter.
- Persist each template's UUID, owner, name, HTML, variable definitions, sample data, and creation/update timestamps. Browser-only templates remain separate from account data.
- Validate sample data and render the template before accepting a save.
- Require unique variable names beginning with a letter, followed by letters, digits, or underscores, with a maximum length of 64 characters. Reject reserved prototype-related names.
- Support these variable types:

| Type | Required behavior |
| --- | --- |
| Text | Accept strings; support optional scalar defaults. |
| Number | Accept finite JSON numbers; reject numeric strings. |
| Date | Accept valid calendar dates in `YYYY-MM-DD` format. |
| Image | Accept embedded PNG, JPEG, or WebP base64 data URLs. |
| List | Accept up to 100 rows with predefined scalar fields; reject nested lists. |

- Reject undeclared input fields, undeclared template references, duplicate variable names, invalid values, and missing required fields.
- Resolve omitted optional scalars without defaults to empty strings and omitted optional lists to empty lists.
- Support escaped `{{field}}` interpolation and `#if`, `#unless`, and `#each` blocks. List rows use their declared row fields.
- Disable raw HTML interpolation, custom helpers, partials, decorators, nested loops, and arbitrary path traversal. Limit block nesting to eight levels.
- Escape interpolated values and block external assets. Templates may use inline CSS or `<style>` tags.

## 4. PDF rendering

- Generate PDF bytes using headless Chromium with JavaScript disabled, request interception enabled, and the browser sandbox enabled.
- Allow embedded image/font data URLs; block other network requests. Apply the restrictive document CSP to both HTML previews and PDF rendering.
- Render using print media, A4 defaults, 18 mm default margins, background printing, and CSS page-size preferences.
- Limit concurrent renders to two per Node process. Return HTTP 429 when the renderer is busy.
- Apply a 20-second browser launch timeout and 15-second page/PDF operation timeouts. Close the browser and release concurrency capacity after success or failure.
- Return preview downloads as `application/pdf`, with attachment filename `preview.pdf` and `Cache-Control: no-store`.
- Treat the responsive HTML preview as an editing aid; verify pagination against the generated PDF.

## 5. API and email delivery

### Endpoints

| Endpoint | Methods | Contract |
| --- | --- | --- |
| `/api/auth` | GET, POST, DELETE | Inspect configuration/session, sign up or sign in, and log out. |
| `/api/console` | GET, POST | Read owner-scoped templates, active keys, and the latest 100 deliveries; save templates and create/revoke keys. Requires a session. |
| `/api/preview` | POST | Generate a PDF from a supplied template and its sample data. Requires a session in database-backed mode. |
| `/api/v1/send` | POST | Validate variables, generate a PDF, submit an email, and record its status. Accepts a bearer API key or a valid same-origin session. |
| `/api/webhooks/resend` | POST | Verify signed Resend events and update delivery status. |

### Send contract

- Accept a strict JSON object containing `template_id` (UUID), `to` (email address), and `variables` (object). The template must belong to the authenticated owner.
- Require an `Idempotency-Key` header of 8–128 letters, digits, underscores, or hyphens.
- Atomically reserve delivery records in PostgreSQL, enforce owner-scoped key uniqueness, and limit new reservations to 20 per minute per workspace.
- Replay an existing reservation without resending, returning its ID, current status, and `replay: true`. Return HTTP 409 if the stored request hash differs.
- Forward an owner-scoped idempotency key to Resend. Current payload comparison hashes `JSON.stringify(input)`; it does not canonicalize equivalent JSON objects.
- Use the template name as the subject, a fixed message body, and a `document.pdf` attachment.
- Return HTTP 202 with `{ "id": "…", "status": "accepted" }` after provider acceptance. Acceptance does not prove inbox delivery. Existing reservation replays currently return HTTP 200.
- Persist statuses `processing`, `accepted`, `delivered`, `bounced`, and `failed`, together with recipient, template name, provider ID, request hash, idempotency key, timestamps, and any recorded error.
- Verify webhook signatures using the raw payload and Svix headers. Map `email.delivered`, `email.bounced`, and `email.failed` events to delivery statuses.
- Return HTTP 503 for recognized webhook events whose provider ID has not yet been linked, allowing provider retries. Update only records currently `accepted` or `processing`.

Current limitations: rendering and sending are synchronous; there is no durable queue or automatic retry. A crash can leave a record `processing`, and ambiguous provider outcomes require reconciliation before submitting a new key. Replays currently depend on provider configuration and successful validation against the current template before the reservation is checked.

### Error contract

Return JSON errors as `{ "error": "…" }` without exposing internal exceptions.

| HTTP status | Meaning |
| --- | --- |
| 400 | Invalid JSON, schema, variables, template, or idempotency header. |
| 401 | Missing/invalid credentials or invalid webhook signature. |
| 403 | Invalid request origin. |
| 404 | Template missing or inaccessible to the owner. |
| 409 | Conflicting idempotency payload or signup conflict. |
| 413 | Request exceeds the applicable size limit. |
| 429 | Authentication, send-rate, or rendering concurrency limit. |
| 500 | Internal or provider failure. |
| 503 | Required services are unconfigured or a webhook record is not yet available. |

## 6. Data, configuration, and limits

The database must contain `users`, `auth_attempts`, `sessions`, `templates`, `api_keys`, and `deliveries`, plus the atomic `reserve_delivery` function. Enforce foreign keys, unique email/key hashes, owner/idempotency uniqueness, and allowed delivery statuses. Deleting a user cascades to owned records; deleting a template preserves its delivery history with a null template reference. `database/schema.sql` currently initializes an empty database and is not an upgrade mechanism.

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only PostgreSQL connection string; enables account mode. |
| `APP_ORIGIN` | Exact public browser origin, including scheme and any port, without a trailing slash. |
| `RESEND_API_KEY` | Email provider credential. |
| `MAIL_FROM` | Sending identity using a verified domain. |
| `RESEND_WEBHOOK_SECRET` | Signing secret for delivery tracking events. |
| `PUPPETEER_EXECUTABLE_PATH` | Optional path to a preinstalled Chrome/Chromium binary. |
| `TEST_DATABASE_URL` | Isolated PostgreSQL connection used by integration tests. |

| Resource | Current limit |
| --- | --- |
| JSON request body | 1,048,576 bytes, enforced while reading. |
| Template name / HTML | 100 / 100,000 characters. |
| Variables per template | 40. |
| Fields per list / rows per list | 20 / 100. |
| Text/image variable value | 200,000 characters. |
| Rendered template content | 2,000,000 JavaScript string characters before the document wrapper; not a byte limit. |
| Webhook payload | 100,000 string characters, currently checked after buffering. |
| PostgreSQL pool | 10 connections per Node process; 5-second connection timeout and 30-second idle timeout. |

## 7. Development and verification

- Support Docker Compose development with a private PostgreSQL service, persistent database volume, and source/test mounts.
- Run the app container as a non-root user. The current Chromium sandbox configuration requires `SYS_ADMIN` and 1 GB of shared memory.
- Build production artifacts with the Docker production target. Serve production over HTTPS on a Node host with the required Chromium libraries.
- Read the installed Next.js guides in `node_modules/next/dist/docs/` before changing framework code, as required by [AGENTS.md](../AGENTS.md).
- Require zero-warning lint, TypeScript checks, unit tests, configured PostgreSQL integration tests, browser account tests, a separate playground smoke test, and a production image build for release verification.
- Verify validation/escaping, authentication and expiry, owner isolation, key revocation, concurrent idempotency, rate limits, PDF bytes, browser persistence, and mobile overflow. Database tests must use an isolated test database.

## 8. Additional production requirements

The following requirements remain launch work or require deployment evidence. Track completion and any approved limited-launch exceptions in [production-readiness.md](production-readiness.md).

### Before real customer traffic (P0)

- Validate production configuration at startup; prevent silent production playground fallback. Deploy the production image without development mounts or bundled credentials, with restart and resource policies.
- Configure and verify HTTPS, the exact public origin, application security headers, private database access, and a restricted runtime database role. Separate staging/production credentials and document secret rotation.
- Introduce versioned migrations, readiness/liveness checks, graceful shutdown, encrypted backups, and demonstrated restoration and rollback.
- Clear sensitive client state on logout, account changes, and session expiry. Implement account recovery and ownership verification, or record the limited-launch signup mitigation defined in the checklist.
- Add shared network/global authentication limits, preview and storage quotas, spending caps, and account/key suspension controls.
- Enforce streaming webhook/ingress limits and a generated PDF byte limit. Review hostile HTML/CSS, embedded assets, renderer crashes, and renderer isolation from application secrets and database access.
- Make idempotency replay independent of template edits and define comparison semantics. Reconcile stale or ambiguous deliveries without duplicate emails.
- Persist webhook events and processing outcomes; handle duplicates, event ordering, early/unmatched events, and recoverable status transitions.
- Implement recipient suppression and bounce/complaint handling. Verify actual sending, attachments, and tracking against configured services in staging.
- Add structured logs, metrics, alerts, operational runbooks, and assigned operator/support contacts. Exclude credentials and document/recipient content from logs.
- Define retention and deletion for application data, logs, and backups, preserving the chosen idempotency guarantees.
- Add CI covering the checks in section 7 and failure paths, including cross-account access, provider timeouts, database failures after acceptance, webhook races, and restarts during sends. Integration checks must not silently skip.

### Before general availability or higher traffic (P1)

- Introduce durable jobs with immutable template/data snapshots, atomic claiming, bounded workers, leases, recovery, and dead-letter handling. Document any change from provider-accepted to queued HTTP 202 semantics.
- Add owner-authorized delivery status lookup, pagination, and filtering.
- Improve session/key lifecycle, audit trails, mobile logout, unsaved-edit protection, error recovery, template export/deletion, and accessibility.
- Establish dependency/image update procedures and publish API, support, retry, quota, and retention documentation.
- Load-test realistic documents and bursts; choose capacity limits and database timeouts from measured results.

### Decisions still required (P2)

Team roles/invitations, SSO/MFA, billing and customer quotas, template versioning, reusable branding, configurable email content, and richer analytics remain product decisions. Availability targets, latency targets, expected traffic, backup retention, recovery time, and acceptable data loss must be agreed and recorded before production capacity and recovery acceptance can be finalized.
