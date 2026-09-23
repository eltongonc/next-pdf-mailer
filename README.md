# Paperpost

A Next.js application for creating PDF templates, declaring typed variables, and emailing personalized PDF attachments through an API.

See [the production-readiness checklist](TODO.md) for launch blockers, scaling work, and release criteria.

## Run with Docker

Requires Docker with Compose. Node.js, PostgreSQL, and Chromium run inside containers.

```sh
docker compose up --build -d
```

Open http://localhost:3000 and create an account. Compose starts PostgreSQL, applies `database/schema.sql` on the first start, and starts the development server once the database is healthy. Source and test edits are mounted into the app; rebuild after changing dependencies or configuration.

Database data lives in the `postgres_data` volume and survives `docker compose down`. Initialization scripts only run on an empty volume. The bundled database credentials are for local development; the database port is not published to the host.

The app runs as the non-root `node` user. Chromium keeps its sandbox enabled; the app container needs `SYS_ADMIN` for that sandbox and 1 GB of shared memory.

To configure email, copy `.env.example` to `.env`, fill in the Resend settings, and recreate the app with `docker compose up -d`. Compose supplies the internal database URL automatically.

```sh
docker compose logs -f app
docker compose exec db psql -U paperpost -d paperpost
docker compose down
```

For a production image, run `docker build --target production -t paperpost .`. The build runs lint, type checks, unit tests, and the Next.js build. Deploy behind HTTPS with your own `DATABASE_URL`, public `APP_ORIGIN` (for example `https://paperpost.example.com`), and email settings, plus the Chromium sandbox capability and shared-memory configuration above.

## Run without Docker

Requires Node.js 22+, PostgreSQL, and a machine capable of running Chromium.

```sh
npm ci
npm run dev
```

Without `DATABASE_URL`, the app runs as a local playground: edit templates, preview PDFs, and save templates in your browser. Demo mode cannot send email or create API keys. The unauthenticated PDF endpoint is available only in development.

## Configure an external database and email

1. Create an empty PostgreSQL database (version 16 or later) and run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql` once. This is a fresh-install schema, not a migration for an existing database.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`. Keep this connection string server-only. Set `APP_ORIGIN` to the exact browser origin (scheme, host, and port, without a trailing slash), so authenticated writes work behind containers and reverse proxies. Configure TLS through the connection string as required by your database provider.
3. Users can sign up and sign in with email and a password of at least 12 characters. Passwords use salted scrypt hashes; seven-day sessions use HTTP-only cookies and hashed tokens stored in PostgreSQL. Authentication is limited to 10 attempts per email address per 15 minutes. Email verification and password reset are not implemented.
4. Create a Resend account, verify a sending domain, and set `RESEND_API_KEY` and `MAIL_FROM`.
5. Restart the app. Save a template and create an API key in the UI.
6. Configure a Resend webhook at `https://your-host/api/webhooks/resend` for `email.delivered`, `email.bounced`, and `email.failed`. Set `RESEND_WEBHOOK_SECRET`.

Each account owns one isolated workspace. Team membership and invitations are not implemented. Templates created in the local playground are separate from account data.

## API

```sh
curl -X POST 'http://localhost:3000/api/v1/send' \
  -H 'Authorization: Bearer pp_YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: invoice-2026-001' \
  -d '{
    "template_id": "YOUR_SAVED_TEMPLATE_UUID",
    "to": "customer@example.com",
    "variables": {
      "customer_name": "Studio North",
      "invoice_number": "INV-2026-001",
      "invoice_date": "2026-09-19",
      "total": 1250,
      "items": [
        {"description": "Product design", "amount": 1000},
        {"description": "Development support", "amount": 250}
      ]
    }
  }'
```

Successful submissions return HTTP 202 with `{ "id": "…", "status": "accepted" }`. This confirms acceptance by Resend; actual delivery requires a webhook. The UI shows the latest 100 requests. Template names become email subjects, and the email contains a short fixed message and `document.pdf` attachment.

Use a new `Idempotency-Key` (8–128 letters, digits, underscores or hyphens) for each intended email. Replaying a key returns the original record without sending again. Using the same key with a different payload returns 409. Records are retained, so keys cannot be reused later. Failed or interrupted sends are not automatically retried: check provider logs before sending a new request to avoid duplicates.

Error responses use `{ "error": "…" }`: 400 invalid input, 401 authentication failure, 404 missing template, 409 conflicting idempotency key, 413 oversized request, 429 rate/concurrency limit, 503 unconfigured services, 500 internal/provider failure.

## Template format

Templates are HTML fragments with inline CSS or a `<style>` tag. Start with the included invoice. Use `{{customer_name}}`, `{{#if field}}…{{/if}}`, `{{#unless field}}…{{/unless}}`, and `{{#each items}}{{description}}{{/each}}`.

Variables are defined in the UI before use:

- Text: strings, with optional defaults.
- Number: finite JSON numbers; numeric strings are rejected.
- Date: valid calendar dates in `YYYY-MM-DD` format.
- Image: embedded PNG, JPEG, or WebP base64 data URLs, used as `<img src="{{logo}}">`.
- List: up to 100 rows of predefined scalar fields. Row fields added in the UI are required.

Unknown fields, undeclared template references, and missing required fields fail validation. Optional scalar fields without defaults render as empty strings; optional lists render as empty lists. Preview sample data must be valid before saving.

Values are HTML-escaped. Raw HTML interpolation, custom helpers, partials, nested loops, and external assets are disabled. PDF generation uses Chromium with JavaScript disabled and network requests blocked. A4 is the default; download a PDF to verify exact print pagination, since the browser preview is responsive.

## Architecture and limits

- Next.js App Router, React, TypeScript, custom responsive CSS.
- PostgreSQL via a pooled `pg` connection; cookie sessions for the dashboard and hashed bearer API keys for sending.
- Database access goes through server routes with explicit owner checks and parameterized SQL. PostgreSQL credentials must only be available to the server; there is no public database API. Cookie-authenticated writes require a matching Origin header.
- Atomic Postgres reservation implements persistent idempotency and 20 sends per minute per workspace.
- Maximum request size: 1 MB. Maximum rendered HTML: 2 MB. Two concurrent PDF renders per Node process, with browser timeouts and cleanup.
- Synchronous rendering and sending: no durable background queue. A process failure can leave a delivery `processing`; investigate/reconcile it against provider logs. Multi-instance rendering capacity needs a shared queue/worker before larger-scale use.
- Webhook delivery tracking is implemented; live database isolation and provider delivery must be verified with configured services before launch.

Deploy to a Node.js host that can run Puppeteer's Chromium with its sandbox enabled. Install the required Linux browser libraries on that host. A standard serverless/edge deployment is not supported out of the box. `PUPPETEER_EXECUTABLE_PATH` can point at a preinstalled Chrome/Chromium binary. Keep browser installation available to the runtime user and use Node runtime routes. Do not disable the Chromium sandbox for customer-supplied HTML.

## Checks

```sh
docker compose exec app npm run lint
docker compose exec app npm run typecheck
docker compose exec app npm test
docker compose exec -e TEST_DATABASE_URL=postgresql://paperpost:paperpost@db:5432/paperpost app npm test
docker compose exec app node tests/browser-accounts.mjs
docker build --target production -t paperpost .
# Browser playground smoke test requires a separate unconfigured dev server:
# node tests/browser-smoke.mjs
```

ESLint uses type-aware TypeScript rules, rejects unsafe values, unhandled promises, explicit `any`, non-null assertions, and unused variables, and fails on warnings.

The tests cover data validation, escaping, defaults, unknown fields, input limits, password hashing, and authentication boundaries. With `TEST_DATABASE_URL`, the database test also checks account login/logout, session expiry, workspace isolation, API key revocation, concurrent idempotency, rate limiting, and real PDF bytes; it cleans up its temporary accounts. The account browser test checks signup, persistent login, logout, and sign-in against Compose. The separate playground browser test checks local persistence, rendering, PDF bytes, mobile overflow, and the send endpoint's authentication boundary, and writes screenshots to `/tmp/paperpost-*.png`.

Provider references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [node-postgres](https://node-postgres.com/), [Resend email API](https://resend.com/docs/api-reference/emails/send-email), [Puppeteer request interception](https://pptr.dev/api/puppeteer.page.setrequestinterception).
