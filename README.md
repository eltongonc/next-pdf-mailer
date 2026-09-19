# Paperpost

A Next.js application for creating PDF templates, declaring typed variables, and emailing personalized PDF attachments through an API.

## Run locally

Requires Node.js 22+ and a machine capable of running Chromium.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without credentials, the app runs as a local playground: edit the example invoice, define variables, preview it, download a real PDF, and save templates in your browser. Demo mode cannot send email or create API keys. The unauthenticated PDF endpoint is available only in development.

## Connect accounts and email

1. Create a Supabase project and run `supabase/schema.sql` once in the SQL editor.
2. Copy `.env.example` to `.env.local`. Set the Supabase URL, anon key, and service role key. The service role key must remain server-only.
3. Enable Supabase email/password authentication and set your site URL. Users sign up, confirm their email if confirmation is enabled, and sign in.
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
- Supabase Auth and Postgres; bearer session authentication for the dashboard and hashed API keys for sending.
- RLS on all tables; templates and deliveries have owner-scoped read policies. All writes and API key access go through server routes with explicit owner checks. The service role is only used on the server.
- Atomic Postgres reservation implements persistent idempotency and 20 sends per minute per workspace.
- Maximum request size: 1 MB. Maximum rendered HTML: 2 MB. Two concurrent PDF renders per Node process, with browser timeouts and cleanup.
- Synchronous rendering and sending: no durable background queue. A process failure can leave a delivery `processing`; investigate/reconcile it against provider logs. Multi-instance rendering capacity needs a shared queue/worker before larger-scale use.
- Webhook delivery tracking is implemented; live database isolation and provider delivery must be verified with configured services before launch.

Deploy to a Node.js host that can run Puppeteer's Chromium with its sandbox enabled. Install the required Linux browser libraries on that host. A standard serverless/edge deployment is not supported out of the box. `PUPPETEER_EXECUTABLE_PATH` can point at a preinstalled Chrome/Chromium binary. Keep browser installation available to the runtime user and use Node runtime routes. Do not disable the Chromium sandbox for customer-supplied HTML.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
# With an unconfigured local dev server running on port 3000:
node tests/browser-smoke.mjs
```

The unit tests cover data validation, escaping, defaults, unknown fields, input limits, and unauthenticated access. The browser smoke test checks local persistence, rendering, actual PDF bytes, mobile overflow, and the send endpoint's authentication boundary. It writes screenshots to `/tmp/paperpost-*.png`.

Provider references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Resend email API](https://resend.com/docs/api-reference/emails/send-email), [Puppeteer request interception](https://pptr.dev/api/puppeteer.page.setrequestinterception).
