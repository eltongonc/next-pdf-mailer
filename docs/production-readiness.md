# Production readiness

Reviewed against the repository on 2026-09-22. This is an implementation checklist, not a certification or an audit of a deployed environment. Assumption: an internet-facing service with customer accounts, uploaded template HTML, and real email delivery.

Existing foundations: a production Docker image, PostgreSQL with owner-scoped queries, salted password hashes, hashed sessions and API keys, origin checks for cookie-authenticated writes, input validation, sandboxed PDF rendering, atomic send reservations, signed webhook verification, type-aware ESLint, and database/browser tests. The work below extends those foundations.

## How to use this list

Deployment foundation work now includes production startup validation, a standalone `compose.production.yaml`, and uncached liveness/database readiness endpoints; see [deployment](deployment.md). The deployment and health checklist items remain open until target-host restarts, graceful shutdown, and staging checks are demonstrated.

The 2026-10-16 dependency pass upgraded Next.js/its ESLint configuration to 16.4.2 and Handlebars to 4.7.10, and repaired missing Linux lockfile entries. npm still reports five high-severity findings in the development-only `eslint-config-next` → `fast-glob` → `micromatch` → `braces` chain. Track an upstream fix; the suggested forced downgrade is not an approved resolution. Container scanning and the maintenance policy remain open.

Local verification on 2026-10-16: zero-warning lint and type checking passed; all 17 tests passed with PostgreSQL integration enabled; the account browser test passed; the production Docker build passed (its database integration test is deliberately skipped without database credentials). Production-only `npm ci` reported zero advisories. The built image exited with status 1 without required configuration and became healthy with initialized local PostgreSQL using the production Compose file. One intermediate integration run timed out connecting to PostgreSQL; a direct connection check and the subsequent full rerun passed. This is local evidence, not staging delivery or target-host recovery evidence.

Tasks are grouped by estimated **focused work time for one developer familiar with this repository**, including implementation, relevant tests, and documentation. A day means roughly 5–8 focused hours. These are planning estimates, not measured commitments; infrastructure choices and unfamiliar tooling can increase them. DNS propagation, provider approval, and other external waits are additional elapsed time.

Keep priority separate from duration: **P0** is required before real customer traffic, **P1** before general availability or higher traffic, and **P2** covers product decisions. Shorter does not mean more urgent. Complete prerequisites before choosing a task solely by its size.

For a spare 15–60 minutes, use the small steps below. Finishing one step does **not** complete its parent checklist item:

- **15–30 minutes:** Inventory required production environment variables for startup validation (P0).
- **15–30 minutes:** List sensitive dashboard state that must clear on logout or account changes (P0).
- **30–60 minutes:** Draft a retention table covering each data category in the retention task (P0).
- **30–60 minutes:** Draft the rollback or provider-outage runbook, with verification still to follow (P0).
- **30–60 minutes:** Check mobile logout visibility and record keyboard/focus issues (P1).
- **30–60 minutes:** Outline API error and retry documentation; finalize it once delivery behavior is settled (P1).

## 30–60 minutes — decisions you can finish in one sitting

Time here covers recording a decision and its rationale; implementing the chosen features needs separate estimates.

- [ ] **P2** · Decide whether workspaces need multiple members, invitations, roles, or SSO/MFA; the current model is one account per workspace.
- [ ] **P2** · Decide whether billing and customer-specific quotas are needed before public signup.
- [ ] **P2** · Decide whether to offer template version history, reusable branding, configurable email content, and richer delivery analytics.

## 1–3 hours — small implementation tasks

- [ ] **P0** · **Clear sensitive dashboard state on logout and expiry.** `signOut()` does not clear the newly revealed API key. Clear it and other account-specific state on logout/account change; handle expired sessions centrally and verify that switching accounts exposes no prior account data.

## Half a day (3–5 hours) — a focused work block

- [x] **P0** · **Validate configuration at startup.** Production requires a valid PostgreSQL URL and exact HTTPS origin; enabling email requires valid provider settings together. Unit tests cover missing/invalid settings and secret redaction; the production image exits with status 1 without required configuration. Provider credentials still require live staging verification.
- [ ] **P0** · **Configure HTTPS and the public origin.** Terminate TLS at the ingress and set `APP_ORIGIN` to the exact public origin. Verify login, Secure cookies, logout, authenticated writes, and rejection of cross-origin requests through the actual proxy.
- [ ] **P0** · **Use a restricted runtime database role.** Separate schema ownership/migrations from application access; grant only required table/function privileges. Keep PostgreSQL private and verify encrypted connections when connecting across hosts.
- [ ] **P0** · **Configure and test response security headers.** Add an application-compatible CSP, frame restrictions, content-type protections, referrer policy, and HTTPS transport policy. Verify that the dashboard and sandboxed document previews still work.
- [ ] **P1** · **Establish dependency and image maintenance.** Pin deployment artifacts, scan dependencies and container images, set an update schedule for Node/Next.js/PostgreSQL/Chromium, and verify security updates through staging before rollout.
- [ ] **P1** · **Publish support and service documentation.** Document API errors, quotas, idempotency/retry behavior, maintenance expectations, and support escalation. Publish privacy/retention information matching the implemented behavior.

## One day (5–8 hours) — implementation plus verification

- [ ] **P0** · **Add a production deployment configuration.** `compose.yaml` currently starts the development target with source mounts and fixed database credentials. Deploy the production image without source mounts, configure restart behavior and CPU/memory limits, and prove it survives a host/service restart.
- [ ] **P0** · **Separate environments and manage secrets.** Give staging and production separate databases, provider credentials, and webhook secrets. Store secrets outside images/source control and document rotation of database credentials, email credentials, and webhook secrets.
- [ ] **P0** · **Add application health checks and shutdown handling.** Provide liveness and database/schema readiness endpoints; configure deployment probes. Stop accepting work during shutdown and close database connections and active browser processes within a documented grace period.
- [ ] **P0** · **Configure backups and prove restoration.** Automate encrypted backups, define retention and acceptable data loss/recovery time, and restore into a separate environment. Verify users, templates, keys, and delivery/idempotency records after restoration.
- [ ] **P0** · **Enforce limits before buffering large requests.** The webhook currently calls `request.text()` before checking its size. Add streaming byte limits and ingress body/time limits; bound generated PDF size before attempting provider submission.
- [ ] **P0** · **Verify the real email path in staging.** Configure the sender domain and provider-required DNS, sending identity, webhook URL, and signing secret. Send to controlled inboxes and verify PDF attachments plus delivered, bounced, failed, duplicate, and invalid-signature events.
- [ ] **P0** · **Add continuous integration.** Run lint with zero warnings, type checking, unit tests, PostgreSQL integration tests, both browser smoke tests, and a production-image build/start check on every change. Provision an isolated test database and ensure integration tests do not silently skip because `TEST_DATABASE_URL` is absent.
- [ ] **P0** · **Document operational recovery.** Write and exercise procedures for rollback, database restoration, compromised credentials, provider outage, stuck deliveries, and disabling sends. Assign an operator and a customer support contact before launch.
- [ ] **P1** · **Improve key and session lifecycle management.** Add API key rotation guidance, last-used tracking, optional expiry/scopes, and a way to revoke all account sessions. Record security-relevant actions in an audit trail without storing raw secrets.
- [ ] **P1** · **Run accessibility and browser checks.** Verify keyboard navigation, focus handling, form errors, contrast, mobile navigation, and representative browsers for the editor, preview, and authentication flows.

## 2–3 days — split across several sessions

- [ ] **P0** · **Introduce versioned database migrations.** `database/schema.sql` only initializes an empty database. Add tracked, repeatable migration execution; test upgrades against a populated database and document recovery from a failed migration.
- [ ] **P0** · **Expand authentication rate limiting.** The current limiter only counts attempts per email address. Add shared limits for client/network and total signup/login traffic, with a trusted-proxy policy. Test rotating email addresses and deliberate lockout of another account.
- [ ] **P0** · **Add preview and spending quotas.** `/api/preview` has process-local concurrency protection but no per-account quota. Apply shared limits to previews, sends, account creation, and stored resources; cap daily email usage and provide a way to suspend an abusive account or key.
- [ ] **P0** · **Make idempotency replay independent of template edits.** The send route currently loads and renders the current template before checking the reservation. Check existing requests first, define payload comparison semantics, and test replay after template changes, provider outages, and a previous failure.
- [ ] **P0** · **Handle bounces and complaints operationally.** Define recipient suppression and account suspension behavior, and test that repeated sending to suppressed recipients is blocked.
- [ ] **P0** · **Add structured logs, metrics, and alerts.** Correlate request, workspace, delivery, and provider IDs without logging passwords, raw keys, template data, or recipient content. Alert on error rates, failed/stale deliveries, database saturation, renderer failures, and abnormal spending.
- [ ] **P0** · **Set data retention and deletion rules.** Define retention for templates, sample data, recipient addresses, deliveries, sessions, auth-attempt records, logs, and backups. Add account deletion and scheduled cleanup; preserve idempotency guarantees when expiring delivery history.
- [ ] **P1** · **Make delivery history queryable.** Add pagination, filtering, and an owner-authorized delivery-status endpoint. The current console only shows the latest 100 records; queued clients will need a reliable status lookup.
- [ ] **P1** · **Finish account and editor UX.** Make logout available at mobile sizes, recover cleanly from session/network failures, protect unsaved edits, and distinguish failed saves from successful ones. Add template export/deletion and document how browser-only templates move into an account.

## 3–5+ days — larger engineering work

- [ ] **P0** · **Complete account recovery and ownership verification.** Add expiring, single-use email verification and password-reset flows, password changes, and session invalidation after a reset. Require verified ownership before enabling sends; an invite-only launch can temporarily gate signup.
- [ ] **P0** · **Review the HTML-rendering security boundary.** Exercise hostile HTML/CSS, embedded assets, file/network access attempts, oversized documents, and renderer crashes. Keep Chromium sandboxing enabled; isolate the renderer from application secrets and database access, especially because the current app container has `SYS_ADMIN`.
- [ ] **P0** · **Define delivery recovery for interrupted sends.** A crash after reservation can leave `processing`; provider acceptance followed by a failed database update can lose the provider ID. Add reconciliation for stale/ambiguous records and a recovery procedure that checks provider state before any resend.
- [ ] **P0** · **Persist and reconcile webhook events.** Store event IDs, relevant timestamps, and processing outcomes. Handle duplicates, out-of-order events, and events arriving before `provider_id` is saved; define status transition rules and a recovery path for unmatched events.
- [ ] **P0** · **Test failure paths as well as the happy path.** Cover cross-account reads/writes/sends, expired/revoked credentials, provider timeouts, database failure after provider acceptance, webhook races, duplicate concurrent requests, and deployment during a send. Assert no duplicate emails or cross-account access.
- [ ] **P1** · **Move PDF generation and sending into durable jobs.** Persist an immutable template/data snapshot with each job, claim jobs atomically, bound concurrency, and add leases, recovery, and dead-letter handling. Preserve provider idempotency and distinguish safe retries from ambiguous sends. If the API returns before provider acceptance, introduce a queued status and document the changed `202` semantics.
- [ ] **P1** · **Load-test the intended deployment.** Measure PDF render time, memory, provider latency, and database connections under realistic documents and bursts. Size pools across all replicas, set database statement/lock timeouts, and choose limits from measured capacity.

## Dependencies to keep in mind

- Establish production deployment configuration before verifying HTTPS, probes, or staging delivery.
- Introduce migrations before adding persistent recovery, webhook, quota, or lifecycle records.
- Settle delivery recovery and idempotency behavior before durable jobs and final retry documentation.
- Use a production-like staging environment for restoration drills, load tests, and end-to-end release verification.
- CI can start early; expand it as new checks become available.

## Launch gate

- [ ] P0 items are complete, or a limited-launch exception has a documented owner, mitigation, and expiry date.
- [ ] A production-like staging deployment passes account → template → PDF → real email → webhook tracking, including a restart during a send.
- [ ] Backup restoration and application rollback have been demonstrated, monitoring reaches the responsible operator, and launch traffic limits are recorded.

Suggested order: production configuration and migrations → account/abuse controls → delivery recovery → CI and staging verification → backup/monitoring drills → limited launch. Do not expose public sending until the P0 checks are satisfied.
