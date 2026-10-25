# Deployment

This is the deployment foundation for a single-host release using an external PostgreSQL database and an HTTPS reverse proxy. It does not close the [production launch gate](production-readiness.md#launch-gate). Confirm the audience, operator, hostname, backup plan, and remaining launch exceptions before exposing customer traffic.

## Build and configure

Build an immutable image for each release and retain the previous image for rollback:

```sh
docker build --target production -t paperpost:RELEASE .
```

Create a secrets file outside the checkout, readable only by the operator. Supply `PAPERPOST_IMAGE=paperpost:RELEASE`, `DATABASE_URL`, and `APP_ORIGIN=https://your-hostname`. Use a separate database and secrets for staging. Initialize a fresh database with `database/schema.sql` as described in the root README; this is not an upgrade script. Use TLS for a database connection across hosts, according to the provider's requirements.

Production startup rejects a missing or invalid PostgreSQL URL and any public origin that is not an exact HTTPS origin (no path or trailing slash). Email is disabled if all three provider variables are empty. To enable it, supply `RESEND_API_KEY`, `MAIL_FROM` (a mailbox or display name plus mailbox), and `RESEND_WEBHOOK_SECRET` together. Format validation does not prove credentials, DNS, or provider delivery work.

```sh
docker compose --env-file /secure/path/paperpost.env -f compose.production.yaml up -d
docker compose --env-file /secure/path/paperpost.env -f compose.production.yaml ps
```

The standalone production Compose file has no source mounts or bundled database credentials. It binds port 3000 to loopback; `PAPERPOST_PORT` changes the host port. Configure an HTTPS reverse proxy on the same host, preserve the public Host header, and set the exact public `APP_ORIGIN`. Enforce a 1 MB request limit and request timeouts at ingress. Keep the service off public interfaces until staging verification succeeds.

The app runs as the image's non-root user with Chromium sandboxing enabled, `SYS_ADMIN`, 1 GB shared memory, a 3 GB memory limit, and two CPUs. These are starting limits requiring measurement on the target host. The rendering process still shares application secrets and network access; renderer isolation remains launch work.

## Probes and restarts

`GET /api/health/live` reports process responsiveness. `GET /api/health/ready` returns 200 only when PostgreSQL can resolve required tables, selected columns, and the delivery reservation function with the runtime role. It returns a generic 503 on failure and never includes database diagnostics or customer data. Both responses prohibit caching. Readiness does not verify Chromium, Resend, schema migration versions, or every schema constraint.

Database connections time out after five seconds; queries have ten-second client and database statement timeouts. Compose checks readiness every 30 seconds and bounds each probe to ten seconds. An unhealthy status does not automatically restart a Docker container: monitor it and configure the ingress to withdraw unhealthy instances. The restart policy restarts exited containers and services after host reboot when Docker starts.

Compose allows 60 seconds before forced termination. Application-level draining and explicit database/browser shutdown handling remain unfinished. Do not assume this grace period makes deployment during an active send safe: pause incoming sends and reconcile processing deliveries against provider logs before restarting. Never automatically resend an ambiguous delivery.

## Staging release verification

1. Check production startup fails when required configuration is absent. Confirm liveness and readiness succeed with initialized PostgreSQL and readiness fails when the database is unavailable.
2. Through the actual HTTPS proxy, verify signup, login, Secure cookies, logout, template saving, PDF rendering, API key creation/revocation, and cross-origin write rejection.
3. Send to controlled inboxes using the verified sender. Confirm PDF bytes, attachment contents, provider acceptance, signed delivery events, duplicate requests, and invalid webhook signatures.
4. Restart the service and host; verify probes and account data recover. Exercise a restart during a send only in staging and reconcile the result without duplicate emails.
5. Restore an encrypted backup into a separate database and verify accounts, templates, API keys, delivery history, and idempotency records. Record recovery time and acceptable data loss.
6. Retain the previous image and rehearse changing `PAPERPOST_IMAGE` back followed by the same Compose command. Image rollback does not roll back database changes; check schema compatibility first.

Record evidence, operator ownership, and any time-limited exceptions in the readiness checklist. Production hostname, provider delivery, backup restoration, monitoring, and host restart verification require the intended environment.
