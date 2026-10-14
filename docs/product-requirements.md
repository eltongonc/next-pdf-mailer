# Paperpost Product Requirements Document

This document describes the intended product and MVP scope. It includes capabilities that are not yet implemented. See [technical requirements](technical-requirements.md) for the current implementation contract and [production readiness](production-readiness.md) for launch work.

## 1. Product Summary

Paperpost is a developer-first document automation platform for creating HTML-based templates, generating personalized PDFs through an API, and optionally delivering those PDFs by email.

The primary user is a software developer who needs reliable transactional PDF generation without maintaining custom rendering infrastructure. The product also provides a user interface so non-technical teammates can manage document content, layout, assets, and publishing without requiring an application deployment.

The initial document use cases are:

- invoices
- contract documents
- reports and changelogs

Paperpost is intentionally a PDF product. Other output formats are outside the current product scope.

The current technical concept already establishes an implementation based on Next.js, TypeScript, PostgreSQL, Handlebars, Puppeteer, and Resend.

---

## 2. Problem Statement

Developers frequently build transactional documents such as invoices, contracts, reports, and customer summaries inside their own applications.

This creates several recurring problems:

- engineering teams maintain browser/PDF rendering infrastructure themselves
- document presentation becomes coupled to application code
- minor content or layout changes often require developer involvement and deployment
- pagination, fonts, assets, and print rendering introduce significant edge cases
- sending the resulting PDF through email requires another integration
- retry, idempotency, delivery tracking, storage, and retention have to be implemented separately
- non-technical teams cannot safely control document presentation

Paperpost should allow developers to define the data contract once while allowing authorized workspace users to control how that data becomes a document.

A useful product principle is:

**Developers define the data. Teams control the documents. Paperpost handles generation and delivery.**

---

## 3. Target Users

### 3.1 Primary user: Developer

A developer integrates Paperpost into a SaaS product or internal application.

Typical responsibilities:

- create API keys
- define or integrate against template data schemas
- submit generation requests
- send transactional PDFs
- consume webhooks
- monitor generation failures
- manage production integrations

Typical use cases include:

- generating an invoice after a billing event
- creating a downloadable contract
- producing a recurring customer report
- generating a release summary or changelog PDF

### 3.2 Secondary user: Business or operations user

A non-technical or semi-technical workspace member manages document content after the integration has been created.

Typical responsibilities:

- update wording
- change branding
- edit HTML/CSS where appropriate
- manage logos and assets
- preview documents
- update sample data
- publish template changes

Full role-based permissions are not required for MVP. All workspace members may edit templates initially.

---

## 4. Product Goals

Paperpost should:

1. Make it fast for a developer to generate a reliable production PDF through an API.

2. Separate document presentation from application code.

3. Allow teams to manage and publish HTML/CSS document templates through a UI.

4. Support predictable personalization through typed variables.

5. Produce consistent PDF output with controlled fonts, images, pagination, headers, and footers.

6. Support both synchronous and asynchronous document generation.

7. Provide optional transactional email delivery without becoming a general-purpose email marketing platform.

8. Provide reliable API primitives including idempotency, webhooks, structured errors, rate limits, and status lookup.

9. Enforce strong tenant isolation and safe execution of untrusted template content.

10. Provide a foundation for a broader document automation platform without overloading the MVP with workflow features.

---

## 5. Non-Goals

The MVP is not intended to provide:

- a drag-and-drop visual document builder
- a general-purpose email marketing platform
- bulk campaign sending
- CSV mail merges
- arbitrary workflow automation
- electronic signatures
- contract lifecycle management
- approval workflows
- legal enforceability guarantees
- template version history
- complex expressions or calculations inside templates
- arbitrary template JavaScript
- arbitrary external network resources
- native chart generation
- arbitrary nested JSON
- a long-term document management archive
- SSO or enterprise identity management
- granular team roles and permissions
- multi-region infrastructure
- a formal availability SLA
- Python or other non-TypeScript SDKs in MVP

Contracts are supported as generated PDF documents only. Paperpost must not position itself as an e-signature or contract-management product.

---

## 6. Core Product Concepts

### 6.1 Workspace

A workspace is the primary tenant boundary.

A workspace owns:

- users
- templates
- published template snapshots
- API keys
- assets
- fonts
- reusable components
- generations
- retained PDFs
- email deliveries
- webhook configuration
- usage and quota records

MVP workspaces may contain multiple users, but all users may edit content. Granular roles are deferred.

Every workspace resource must be isolated from every other workspace.

The current implementation already scopes templates, API keys, and delivery history by owner and requires explicit ownership checks.

### 6.2 Template

A template defines how structured input data becomes a PDF.

Each template contains:

- name
- HTML
- CSS
- variable schema
- sample data
- page settings
- reusable component references
- asset references
- font references
- draft state
- published snapshot

Templates use restricted Handlebars-style interpolation.

The current technical design already supports escaped interpolation, `if`, `unless`, and `each`, while disabling raw HTML interpolation, custom helpers, partials, decorators, nested loops, and arbitrary path traversal.

### 6.3 Generation

A generation is one request to render one template using one input dataset.

A successful generation produces exactly one PDF.

A generation may execute:

- synchronously
- asynchronously

Async is the default mode.

### 6.4 Email

An email is an optional transactional delivery action for an already generated PDF.

Each email contains exactly one generated PDF attachment in MVP.

Generation and email are separate product resources.

### 6.5 Asset

Workspace assets may include:

- logos
- signatures
- static images
- charts supplied as images
- branding graphics

External network assets are not allowed during document rendering.

### 6.6 Font

Fonts may be uploaded to a workspace and referenced by templates.

Fonts must be stored privately and included in the self-contained rendering context.

---

## 7. Primary User Stories

## Developer

As a developer, I want to create an API key so that my application can authenticate against Paperpost.

As a developer, I want to call an API with a template ID and structured data so that Paperpost generates a personalized PDF.

As a developer, I want invalid input to fail before generation with a structured error so that I can fix my integration.

As a developer, I want generation requests to be idempotent so that retries cannot accidentally create duplicate documents.

As a developer, I want asynchronous generation so that large or slower documents do not block my application.

As a developer, I want synchronous generation for smaller documents so that I can immediately return a PDF to an end user.

As a developer, I want status APIs and webhooks so that I can react when asynchronous jobs complete or fail.

As a developer, I want to send a generated PDF via email without building a separate delivery pipeline.

As a developer, I want predictable rate limits and usage information so that my application can handle quota conditions gracefully.

## Template editor

As a template editor, I want to edit HTML and CSS with live preview so that I can control the appearance of documents.

As a template editor, I want Paperpost to detect variables used in my template so that defining a schema is faster.

As a template editor, I want to configure each variable's type and required state so that invalid API data can be rejected.

As a template editor, I want sample data so that I can preview realistic documents.

As a template editor, I want to save drafts without changing production output.

As a template editor, I want to explicitly publish changes so that production documents only change intentionally.

As a template editor, I want reusable workspace components so that branding and repeated sections do not have to be duplicated across templates.

As a template editor, I want workspace fonts and assets so that documents can match company branding.

---

## 8. Functional Requirements

### 8.1 Must Have — MVP

### Accounts and workspaces

- Users must be able to sign up, sign in, and sign out.
- Each account must belong to an isolated workspace.
- A workspace may contain multiple users.
- All workspace users may edit templates in MVP.
- API keys must belong to a workspace.
- API keys must be revocable immediately.
- Complete API keys must only be revealed at creation time.
- Stored API keys must be hashed.

The existing technical requirements already define salted password storage, hashed sessions, hashed bearer API keys, secure session cookies, and owner isolation.

### Template creation

Users must be able to:

- create a template
- edit HTML and CSS
- configure sample data
- see a live preview
- generate a PDF preview
- save a draft
- publish a template
- use starter templates

Starter templates must include at least:

- invoice
- contract
- report/changelog

### Variable detection and schema

Paperpost must automatically detect template variables.

Users must then configure detected variables.

Supported MVP data structures:

- text
- number
- date
- image
- list of predefined scalar fields

Variables may be:

- required
- optional
- configured with a default where supported

Required variables must cause validation failure when absent.

Optional variables may resolve to a configured default or an empty value.

Undeclared input fields must be rejected.

The existing technical concept already defines typed variables, list limits, validation, reserved-name handling, and undeclared-field rejection.

### Template logic

MVP templates may support:

- escaped variable interpolation
- `if`
- `unless`
- `each`

MVP templates must not support:

- arbitrary JavaScript
- arbitrary expressions
- user-defined helper functions
- calculations
- nested arbitrary traversal
- raw HTML interpolation
- arbitrary nested loops

Business calculations such as tax, totals, discounts, and balances must be performed by the customer's application before sending data to Paperpost.

### Presentation formatting

Presentation formatting may be configured separately from source values.

Examples:

- number → currency display
- date → localized date display

Formatting must not mutate source data or perform business calculations.

### Draft and published state

A template must maintain:

- one editable draft
- one immutable published snapshot

Saving a draft must never alter production rendering.

Publishing must atomically replace the active published snapshot.

Full user-visible version history is not required in MVP.

### Immutable generation snapshots

When an asynchronous generation is accepted, Paperpost must snapshot everything needed to reproduce that generation, including:

- published template
- variable schema
- submitted data
- referenced components
- assets
- fonts
- page configuration

Subsequent template edits or publications must not change an already accepted generation job.

### Workspace components

Users must be able to define reusable workspace-level document components.

Examples:

- company header
- footer
- address block
- terms section
- branding block

Components referenced by a published template must resolve to immutable content for each accepted generation.

### Workspace asset library

Users must be able to upload workspace assets.

Supported image types should initially include:

- PNG
- JPEG
- WebP

Embedded base64 image data must also remain supported.

External image requests must not be allowed during rendering.

### Workspace font library

Users must be able to upload supported font files to a workspace.

Templates must be able to reference workspace fonts without external network calls.

### PDF layout

Templates must support:

- A4
- Letter
- configurable margins
- CSS margin overrides
- repeating headers
- repeating footers
- page numbers where supported
- background printing
- print-specific CSS

The existing renderer already uses Chromium print media, A4 defaults, margins, background printing, and CSS page-size preferences.

### PDF generation limits

Paperpost must enforce limits for:

- rendered pages
- generated PDF byte size
- render duration
- input request size
- assets
- fonts
- concurrent renders

Requests exceeding configured limits must fail safely.

Exact production values must be established through load testing and cost analysis rather than treated as final product assumptions.

### Synchronous generation

The API must support synchronous generation for documents that fit configured sync limits.

A successful sync request should return the generated PDF directly.

If a document cannot be processed within sync limits, the API must return a defined error rather than silently switching execution modes.

### Asynchronous generation

Async generation must be the default generation method.

Creating an async generation must return a generation resource containing at least:

- generation ID
- status
- template ID
- creation time

Supported high-level statuses should include:

- queued
- processing
- completed
- failed

### PDF retention

Generated PDFs may be temporarily stored.

Retention must be:

- limited by subscription plan
- configurable by the workspace up to the plan maximum
- automatically enforced

A workspace must be able to choose immediate deletion after successful delivery where appropriate.

Retention expiry must remove the retained document from active storage.

### Individual deletion

Authorized users must be able to delete individual retained PDFs before their scheduled expiration.

### Email delivery

Paperpost must allow a generated PDF to be sent through transactional email.

Generation and sending must remain separate resources.

MVP email must support:

- exactly one generated PDF attachment
- configurable subject
- configurable plain-text body
- configurable HTML body
- configurable reply-to
- variables in subject/body where safe

### Sender identities

Paperpost must support:

- a Paperpost-controlled sending identity
- verified custom customer sender domains

Custom sender domains should be available on paid plans.

### Email states

At minimum, Paperpost should expose:

- queued
- processing
- accepted
- delivered
- bounced
- complained
- failed

Email status should be available through:

- dashboard
- API
- webhooks

The current technical implementation already tracks processing, accepted, delivered, bounced, and failed events through the email provider webhook flow.

### Email retries

Paperpost must automatically retry transient delivery failures using bounded retries.

Permanent failures must not be repeatedly retried.

### Suppression

Hard bounces and complaints must result in recipient suppression.

Repeated sends to suppressed recipients must be prevented unless the suppression is deliberately cleared through an authorized process.

### Abuse prevention

Production email sending must require appropriate account verification.

Paperpost must support:

- send quotas
- rate limits
- attachment size limits
- sender/domain verification
- bounce monitoring
- complaint monitoring
- workspace suspension
- API key suspension

Paperpost must not provide bulk marketing-email features in MVP.

### API authentication

MVP server-to-server authentication must use API bearer keys.

OAuth is not required.

Granular API scopes are deferred.

### API resources

The public API should be organized around:

- `/v1/templates`
- `/v1/generations`
- `/v1/emails`
- `/v1/assets`
- `/v1/webhooks`

Exact REST operations may evolve during API design, but generation and email must remain distinct resources.

### Idempotency

Idempotency keys must be required for:

- generation creation
- email creation

Reusing an idempotency key with an equivalent request must return the existing resource without duplicating the operation.

Reusing the same key with a conflicting request must fail with a conflict response.

The current implementation already contains owner-scoped send idempotency, although its comparison semantics and dependency on current template state require improvement.

### API errors

Errors must use a structured machine-readable format.

Example:

```json
{
  "error": {
    "code": "missing_required_field",
    "message": "customer_name is required",
    "field": "data.customer_name",
    "request_id": "req_123"
  }
}
```

Internal exception details, secrets, or provider internals must never be exposed.

### Customer webhooks

MVP webhook events should include:

- `generation.completed`
- `generation.failed`
- `email.accepted`
- `email.delivered`
- `email.bounced`
- `email.complained`
- `email.failed`

Customer webhooks must:

- be signed
- be retryable
- provide at-least-once delivery semantics
- tolerate duplicate delivery
- have delivery attempts visible in the dashboard

### API versioning

The API must use URL-based major versioning.

Initial API:

`/v1/...`

Backwards-compatible additions may be introduced within `v1`.

Breaking changes require a new major API version.

### TypeScript SDK

MVP must include an official TypeScript SDK covering core generation and email workflows.

### API documentation

MVP developer documentation should include:

- interactive API documentation
- authentication guide
- curl examples
- TypeScript examples
- generation examples
- webhook documentation
- API key management guidance
- error reference
- rate-limit behavior

### Dashboard

The dashboard must provide at least:

- templates
- API keys
- assets
- fonts
- recent generations
- recent email deliveries
- status/error visibility
- quota/usage visibility
- webhook configuration

---

### 8.2 Should Have

The following are desirable but may be deferred if necessary to protect MVP launch scope.

- webhook delivery inspection
- webhook replay
- richer delivery filtering
- better generation search
- reusable document branding presets
- advanced template editor ergonomics
- improved email preview
- configurable download expiration
- retention controls directly exposed in the dashboard
- automatic status polling in the TypeScript SDK
- improved component dependency visualization
- account-level audit events
- richer rate-limit reporting
- customer-configurable hard usage caps
- improved report/changelog starter templates

---

### 8.3 Could Have / Later Phase

- granular Owner/Admin/Editor/Viewer permissions
- template version history
- rollback to previous template versions
- preview environments
- staging/production template environments
- SSO
- MFA
- API key expiry
- API key scopes
- nested structured objects
- richer template helpers
- bulk generation API
- CSV imports
- Python SDK
- additional SDKs
- visual drag-and-drop builder
- native charts
- document approval workflows
- scheduled generation
- workflow automation
- e-signatures
- long-term document archive
- document search
- advanced analytics
- enterprise data residency
- multi-region deployment
- formal SLA
- bring-your-own email provider

---

## 9. API Overview

### 9.1 Generate PDF asynchronously

Example conceptual request:

```http
POST /v1/generations
Authorization: Bearer pp_...
Idempotency-Key: invoice-1042
Content-Type: application/json
```

```json
{
  "template_id": "tpl_123",
  "data": {
    "invoice_number": "INV-1042",
    "customer_name": "Acme Ltd",
    "issue_date": "2026-10-07",
    "items": [
      {
        "description": "Subscription",
        "quantity": 1,
        "price": 1250
      }
    ],
    "total": 1250
  }
}
```

Conceptual response:

```json
{
  "id": "gen_123",
  "status": "queued"
}
```

### 9.2 Generation status

```http
GET /v1/generations/gen_123
```

Conceptual completed response:

```json
{
  "id": "gen_123",
  "status": "completed",
  "template_id": "tpl_123",
  "created_at": "...",
  "completed_at": "...",
  "download_url": "..."
}
```

The download URL should be private and short-lived.

### 9.3 Synchronous generation

The API must provide an explicit synchronous mode for eligible documents.

The exact route/query design should be finalized during API specification work.

The API must clearly document synchronous limits.

### 9.4 Email generated PDF

Conceptual request:

```http
POST /v1/emails
Authorization: Bearer pp_...
Idempotency-Key: send-invoice-1042
```

```json
{
  "generation_id": "gen_123",
  "to": "customer@example.com",
  "subject": "Invoice INV-1042",
  "html": "<p>Your invoice is attached.</p>"
}
```

Conceptual response:

```json
{
  "id": "email_123",
  "status": "queued"
}
```

### 9.5 API status semantics

Async creation APIs should normally return `202 Accepted`.

Acceptance means Paperpost accepted responsibility for processing the operation. It does not mean:

- PDF generation has completed
- email delivery has completed
- the recipient received the email

These states must remain distinguishable.

---

## 10. Non-Functional Requirements

### 10.1 Tenant isolation

Tenant isolation is a hard security requirement.

Every access to a workspace resource must verify workspace ownership.

This includes:

- database records
- PDFs
- assets
- fonts
- components
- API keys
- email deliveries
- webhook configuration
- storage paths
- signed URLs

Automated tests must verify cross-workspace isolation.

### 10.2 Template security

Customer templates must be treated as untrusted input.

PDF rendering must:

- disable JavaScript
- block arbitrary outbound network requests
- block external images
- block external fonts
- block external stylesheets
- prevent access to internal services
- prevent access to infrastructure credentials
- restrict dangerous interpolation
- enforce rendering limits
- enforce memory/resource limits where supported

The existing technical requirements already call for JavaScript-disabled Chromium, request interception, CSP restrictions, browser sandboxing, and hostile HTML/CSS review.

### 10.3 Data encryption

Paperpost must use:

- TLS for data in transit
- platform/storage encryption at rest
- encrypted database backups
- private object storage

Per-workspace application-level encryption is not required for MVP.

### 10.4 Logging

Paperpost must not log:

- API keys
- credentials
- full document contents
- full PDF bytes
- full personalization payloads by default

Recipient data should be minimized or redacted in logs.

Operational diagnosis should rely primarily on:

- request IDs
- generation IDs
- email IDs
- workspace IDs
- structured status/error metadata

This aligns with the current production requirement to keep credentials and document/recipient content out of logs.

### 10.5 GDPR and deletion capabilities

The MVP must provide capabilities needed to support privacy compliance, including:

- account deletion
- workspace deletion
- template deletion
- asset deletion
- generated-document deletion
- retention controls
- retention expiry
- backup retention documentation

The product should not make unsupported claims of legal or regulatory certification.

### 10.6 Asset dependency safety

An asset or font that is referenced by a published template must not be silently deleted.

Paperpost should either:

- prevent deletion while referenced, or
- require the user to replace/remove references first

### 10.7 Hosting region

MVP production hosting should be EU-based.

Multi-region data residency is outside MVP.

### 10.8 Availability

The beta should not provide a contractual SLA.

The system should nevertheless be designed toward an internal 99.9% availability objective.

A formal SLA may later become an enterprise plan feature.

### 10.9 Backups and recovery

Paperpost must provide:

- encrypted automated database backups
- backup retention
- documented restore procedures
- periodic restoration testing
- durable storage for retained PDFs and workspace assets
- graceful service restart/recovery

Active-active multi-region recovery is not required.

The current production requirements also call for versioned migrations, health checks, graceful shutdown, encrypted backups, restoration, and rollback procedures.

### 10.10 Scalability

Initial expected customer volume is relatively low: typically tens or hundreds of PDFs per customer per month.

The architecture should nevertheless support horizontal worker scaling.

Async rendering must use durable jobs rather than depending on a request process remaining alive.

Jobs require:

- atomic claiming
- immutable input snapshots
- bounded concurrency
- retries
- leases or equivalent crash recovery
- dead-letter handling

The current technical requirements identify durable jobs and immutable snapshots as required for higher production traffic.

### 10.11 Resource and cost protection

The system must enforce workspace and platform limits including:

- monthly generation quota
- monthly email quota
- generation rate
- concurrent synchronous generation
- asset storage
- font storage
- retained PDF storage
- maximum PDF size
- maximum page count
- maximum render duration
- maximum API payload size

The platform must support suspension of abusive or unexpectedly expensive workloads.

### 10.12 Performance targets

Exact targets remain to be established through load tests.

The product should separately measure:

- API acceptance latency
- queue wait time
- render time
- total async completion time
- email submission latency

Large reports should not define the synchronous performance expectation.

---

## 11. Usage and Pricing Model

### 11.1 Pricing model

Initial pricing should use monthly plans with included PDF generation quotas.

The model may evolve toward:

**base subscription + usage**

as customer usage becomes better understood.

Exact prices are outside this PRD.

### 11.2 Billable event

A successful PDF generation consumes generation quota.

The following should not consume quota:

- validation failures
- Paperpost platform failures
- renderer failures caused by Paperpost
- requests rejected before successful generation

Regenerating a document counts as another successful generation.

### 11.3 Email usage

Transactional email should initially be included within reasonable plan limits rather than priced as the primary usage dimension.

### 11.4 Retention

Plans may provide different maximum retention windows.

Example conceptual structure:

- Free: short retention
- Starter: moderate retention
- Pro: longer retention
- Enterprise: custom retention

Exact durations remain open.

Workspace administrators may configure a retention period lower than the plan maximum.

### 11.5 Sender domains

Paperpost-controlled sending may be available on the Free plan.

Custom sender domains should require a paid plan.

### 11.6 Seats

MVP pricing should not be primarily seat-based.

Paperpost should avoid discouraging collaboration between developers, finance, operations, and content teams.

### 11.7 Free tier

Paperpost should offer a permanent constrained free tier.

The free tier should have:

- low monthly generation allowance
- lower rate limits
- lower concurrency
- short document retention
- limited storage
- Paperpost sender
- no SLA

Customer PDFs should not be watermarked solely because they were generated on the Free plan.

### 11.8 Quota exhaustion

MVP should use hard usage caps rather than automatic paid overages.

Once quota is exhausted, new billable operations should fail with a structured quota error until:

- the billing period resets, or
- the customer upgrades

Customer-configurable paid overage may be introduced later.

### 11.9 Enterprise

Enterprise capabilities may later include:

- custom contracts
- SLA
- SSO
- custom retention
- higher quotas
- custom rate limits
- dedicated support
- residency options

Enterprise-specific capabilities are not part of MVP.

---

## 12. Success Metrics

Initial MVP success should be evaluated across four areas.

### 12.1 Developer activation

Measure whether developers can successfully reach their first generated PDF.

Candidate metrics:

- percentage of registered workspaces that create a template
- percentage that create an API key
- percentage that successfully generate a PDF
- median time from signup to first successful API-generated PDF

Hard targets should be established after initial beta data.

### 12.2 Reliability

Measure:

- successful generation rate
- platform-attributable generation failure rate
- renderer timeout rate
- async job recovery rate
- webhook success rate
- email submission success rate

### 12.3 Product adoption

Measure whether users move document presentation outside application code.

Candidate metrics:

- published templates per active workspace
- API-generated PDFs per active workspace
- percentage of workspaces with more than one user
- workspace asset/component usage
- percentage of templates edited after first API integration

### 12.4 Commercial validation

Measure:

- free-to-paid conversion
- plan upgrades caused by generation quota
- plan upgrades caused by retention
- custom sender-domain adoption
- paid workspace retention
- average successful PDF volume per paid workspace

No hard numeric targets are defined in this PRD because there is not yet sufficient beta data.

---

## 13. MVP Scope

The MVP consists of:

### Workspace and identity

- signup/login
- workspace membership
- basic account management
- API keys

### Template system

- HTML/CSS editor
- live preview
- PDF preview
- starter templates
- automatic variable detection
- typed variable configuration
- required/optional fields
- simple lists
- `if`, `unless`, and `each`
- sample data
- Draft / Published states
- immutable published snapshots
- reusable workspace components

### Document branding

- workspace assets
- embedded image support
- workspace fonts
- A4 and Letter
- configurable margins
- headers/footers

### Generation

- PDF-only output
- sync mode
- async default mode
- durable generation jobs
- immutable generation snapshots
- status lookup
- temporary storage
- configurable retention
- deletion
- resource limits

### Email

- transactional email
- one generated PDF attachment
- Paperpost sender
- custom verified sender domains on paid plans
- configurable subject/body/reply-to
- retries
- bounce handling
- complaint handling
- suppression
- delivery status

### Developer platform

- REST `/v1`
- API keys
- required idempotency
- structured errors
- customer webhooks
- TypeScript SDK
- API documentation
- plan-based quotas
- rate limits

### Operations and security

- EU-hosted production
- strict tenant isolation
- renderer isolation
- private asset/document storage
- encryption
- safe logging
- backups
- restoration procedure
- abuse controls
- usage caps
- monitoring and alerting

---

## 14. Post-MVP Direction

Paperpost's longer-term opportunity is broader document automation.

Likely expansion areas include:

### Collaboration

- granular roles
- approvals
- audit logs
- template version history
- rollback

### Authoring

- visual editor
- themes
- more reusable design components
- richer formatters

### Generation

- batch jobs
- CSV import
- scheduling
- higher-volume processing

### Developer platform

- Python SDK
- additional SDKs
- richer webhook tooling
- test environments
- environment-specific templates

### Enterprise

- SSO
- MFA policies
- SLA
- residency
- advanced security
- larger quotas
- dedicated support

### Workflow

Potential future workflows might combine:

`event → generate document → deliver → retain → notify`

However, general workflow automation is explicitly outside the MVP and should only be added after the core PDF-generation product is validated.

---

## 15. Key Risks and Product Challenges

### 15.1 Commodity PDF API risk

Basic HTML-to-PDF conversion is widely available.

Paperpost must differentiate through:

- team-managed templates
- safe publishing
- developer-quality APIs
- reusable assets/components
- retention
- delivery
- reliability
- operational simplicity

The value proposition should not be reduced to “we run Puppeteer for you.”

### 15.2 Template publication risk

Allowing non-technical users to change production templates can break customer workflows.

Mitigation:

- Draft/Published model
- validation before publishing
- preview before publishing
- immutable published snapshots
- later version history/rollback

### 15.3 Renderer security

HTML/CSS rendering creates potential denial-of-service, SSRF, local-network access, memory exhaustion, and rendering-engine risks.

Mitigation requires strong renderer isolation and resource limits.

The current requirements already identify this as a production concern.

### 15.4 Email abuse

An email API creates spam and reputation risk even if email is secondary.

Mitigation:

- transactional-only positioning
- account verification
- quotas
- verified domains
- suppression
- bounce/complaint monitoring
- suspension tools
- no mailing-list product features

### 15.5 Large PDFs

Reports may contain long tables, images, fonts, and many pages.

Mitigation:

- async-by-default architecture
- page limits
- byte limits
- render limits
- durable queues
- capacity controls

### 15.6 Contracts create expectation risk

Calling out contracts may cause customers to expect:

- signatures
- legal audit trails
- approval workflows
- enforceability guarantees
- permanent archival

Product messaging must make clear that MVP provides **contract document generation**, not contract lifecycle management.

### 15.7 Retention/compliance confusion

Paid retention duration must not be presented as determining whether storage is legally permitted.

Commercial plan limits and customers' legal/compliance obligations are separate concerns.

### 15.8 Async consistency

Without immutable snapshots, an accepted job could render different content after a template edit.

Every generation must therefore capture its complete rendering inputs when accepted.

### 15.9 Asset dependency failures

Deleting referenced components, fonts, or images can silently break production templates.

Dependency-aware deletion is required.

---

## 16. Open Questions

These decisions do not block the product definition but must be resolved before production launch or pricing launch.

## Capacity and limits

- maximum generated PDF byte size
- maximum page count
- maximum template size
- maximum workspace asset size
- maximum workspace font storage
- synchronous rendering timeout
- async rendering timeout
- synchronous concurrency by plan
- generation rate limits by plan

The current implementation contains preliminary limits for request size, HTML size, variables, lists, rendered content, and renderer concurrency, but these should not automatically be treated as final product limits.

## Pricing

- plan names
- monthly prices
- included generations
- included emails
- storage quotas
- retention duration per plan
- rate/concurrency limits per plan

## Reliability

- formal post-beta availability target
- recovery time objective
- recovery point objective
- support expectations
- SLA eligibility

## Retention

- default retention
- minimum retention
- maximum plan retention
- backup retention
- deletion propagation timing

## Email

- Paperpost default sender identity
- domain verification UX
- maximum attachment size
- retry policy
- suppression-clearance workflow

## Template editor

- exact code editor implementation
- supported font formats
- allowed CSS restrictions
- header/footer editing UX
- component dependency UX

## Billing

- billing provider
- upgrade/downgrade behavior
- quota reset behavior
- future overage model

---

## 17. Launch Gate

Before allowing real customer traffic, Paperpost must demonstrate:

- correct workspace isolation
- secure API authentication
- safe key revocation
- production database configuration
- production object storage
- renderer isolation
- HTTPS
- private database access
- secret separation
- durable async jobs
- immutable job snapshots
- rate limiting
- quota enforcement
- generated PDF byte/page limits
- account suspension capability
- suppression handling
- webhook deduplication and retry handling
- recovery from worker/process crashes
- safe logging
- encrypted backups
- tested restore process
- monitoring
- alerts
- operational runbooks
- successful staging email delivery
- successful custom-domain delivery
- CI covering failure paths

Many of these production requirements are already identified in the current technical concept, including global limits, renderer isolation, webhook persistence, bounce/complaint handling, structured monitoring, retention policies, CI failure-path coverage, durable jobs, and load testing.

---

## 18. Product Principle for MVP Decisions

When scope decisions arise during implementation, prioritize in this order:

1. **Reliable PDF generation**
2. **Safe developer integration**
3. **Safe template publishing**
4. **Strong tenant and data isolation**
5. **Good template editing experience**
6. **Transactional delivery**
7. **Broader workflow features**

If a feature adds substantial complexity without improving one of the first four priorities, it should normally be deferred beyond MVP.
