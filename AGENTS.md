# Repository instructions

## Scope and sources

These instructions apply to the whole Paperpost repository. Read [README.md](README.md) for setup and [docs/README.md](docs/README.md) for documentation ownership. Check the actual implementation before treating a requirement as completed: the product requirements describe the intended product, while the technical requirements distinguish current behavior from production work.

## Implementation conventions

- Use TypeScript, React, and the Next.js App Router. Read the relevant installed Next.js guide before changing framework code; preserve the generated rules below.
- Keep interactive state in client components and database, authentication, email, and PDF services in server code. Validate untrusted data with Zod, use parameterized SQL, and enforce owner checks on every workspace operation.
- Follow the type-aware ESLint configuration. Avoid explicit `any`, non-null assertions, unsafe values, and unhandled promises. Lint must pass with zero warnings.
- Keep request callbacks stable with `useCallback` when effects depend on them, and include their dependencies. Abort pending workspace requests and reset account-specific state and editor drafts at authentication boundaries. Preserve cross-tab session updates and expiry checks.
- Keep browser playground templates separate from account data. Preserve the existing authentication, origin, idempotency, and rendering boundaries when changing UI or routes.
- Treat template HTML as untrusted. Keep Chromium sandboxing enabled, JavaScript disabled, external requests blocked, and rendering limits enforced. Never expose credentials or raw API keys in logs.

## UI and design system

- Follow [the design-system conventions](docs/design-system.md). Reuse Mantine controls and the existing provider; use semantic Paperpost tokens for application styling.
- Put shared token definitions in `src/app/design-tokens.css`, Mantine theme defaults in `src/components/ui-provider.tsx`, shared control overrides in `src/components/ui-theme.module.css`, and application layout styles in `src/app/globals.css`.
- Preserve Inter and IBM Plex Mono through `next/font` and the forced light color scheme. Keep supporting text readable and pair status foregrounds with their matching backgrounds.
- Use accessible labels, explicit form button types, visible focus states, and keyboard navigation. Check desktop and mobile layouts after control or layout changes.
- Avoid shared input-height selectors that also constrain textareas. Keep the HTML and sample-data editors large enough for multiple lines.

## Verification

- Run `npm run lint` and `npm run typecheck` for code changes. Run relevant tests and `npm run build` for framework, dependency, theme, or stylesheet changes.
- Use the [README check commands](README.md#checks) for Docker verification. Database tests require `TEST_DATABASE_URL`; report skipped integration tests explicitly.
- Run `tests/browser-accounts.mjs` against the configured app for account changes. Run `tests/browser-smoke.mjs` against a separate unconfigured development server for playground/editor changes. Preserve account cleanup in tests.
- Prefer browser selectors based on accessible names or specific form context. Password controls contain a visibility button; a generic first `button[type="button"]` selector can click the wrong control.
- Keep `package.json` and `package-lock.json` synchronized. Verify dependency changes with Docker's `npm ci`, since a locally successful install can miss Linux optional dependency entries. If necessary, repair the lockfile in an isolated Linux/Node 22 environment without existing `node_modules`, then rebuild.
- Verify a production Docker build after dependency or container changes. Do not describe build success as proof of production readiness or real provider delivery.

## Documentation

- Keep setup and a short project overview in root `README.md`; keep detailed documentation in `docs/` with lowercase kebab-case filenames and a discoverable index.
- Keep one top-level heading per document, a consistent heading hierarchy, and relative links. Update all references when moving or renaming files.
- Update documentation when behavior changes. Keep future product scope, current implementation, and unresolved launch work distinct. Mark checklist work complete only with evidence that satisfies the whole item.
- Keep this file as the shared instruction source; `CLAUDE.md` imports it. Avoid duplicating the same rules across agent files.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
