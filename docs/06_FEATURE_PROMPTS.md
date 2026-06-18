# 06_FEATURE_PROMPTS.md — OpenCode Feature Prompts

## Purpose

This file stores surgical prompts for implementing CARWASH incrementally with OpenCode.

Do not ask the agent to build the entire SaaS at once.

Use one prompt per small feature or sub-feature.

Recommended flow:

```txt
plan → implement → verify → commit
```

## Universal Planning Prompt

Use this before implementation.

```txt
Read:
- AGENTS.md
- docs/00_MASTER_ROADMAP.md
- docs/01_ENGINEERING_PRINCIPLES.md

Do not modify files yet.

Analyze the requested task and return:
1. The exact phase/sub-feature.
2. Files that need to be created or modified.
3. Data model impact.
4. Backend impact.
5. Frontend impact.
6. WhatsApp service impact, if any.
7. Idempotency concerns.
8. Race condition concerns.
9. RLS/multitenancy concerns.
10. Acceptance criteria.
11. Commands to verify.

Do not implement until I approve.
```

## Universal Implementation Constraint

Add this to most implementation prompts.

```txt
Implement only the requested sub-feature.

Do not implement unrelated features.
Do not refactor unrelated files.
Do not add Redis, RabbitMQ, Kafka, SQS, GraphQL, NoSQL or Stripe.
Do not expose secrets.
Do not bypass RLS.
Do not put business logic in controllers.
Do not use UI libraries other than shadcn/ui.
Do not use GSAP unless this is a public/report/marketing page.

At the end, return:
1. Files created/modified.
2. Summary of changes.
3. How to test.
4. Known limitations.
5. Next recommended step.
```

## Prompt 01 — Create Repository Structure

```txt
Read AGENTS.md.

Implement only the base repository structure for CARWASH.

Create:

- apps/web
- apps/api
- apps/whatsapp-service
- infra/supabase/migrations
- infra/supabase/seeds
- infra/supabase/policies
- docs

Create or update:

- README.md
- .env.example
- docker-compose.dev.yml

Do not create Next.js app yet.
Do not create .NET solution yet.
Do not create Node service yet.
Do not create Supabase migrations yet.

Acceptance criteria:
1. Folder tree matches AGENTS.md.
2. No secrets are committed.
3. README explains the project at a high level.
4. .env.example lists placeholder sections for frontend, backend, Supabase and WhatsApp.
```

## Prompt 02 — Supabase Schemas and Tenant Migrations

```txt
Read:
- AGENTS.md
- docs/01_ENGINEERING_PRINCIPLES.md
- docs/02_SUPABASE_SCHEMA_AND_RLS.md

Implement only the initial Supabase migrations.

Create migrations for:

1. app schema.
2. internal schema.
3. required extensions.
4. app.tenants.
5. app.tenant_memberships.
6. RLS helper functions:
   - app.is_tenant_member
   - app.current_user_role
7. RLS policies for tenants and tenant_memberships.

Files must be placed in:
infra/supabase/migrations/

Do not create business tables yet.

Acceptance criteria:
1. Migrations are ordered with numeric prefixes.
2. RLS is enabled.
3. Cross-tenant access is blocked by design.
4. No frontend code is modified.
5. Provide SQL commands to manually test membership visibility.
```

## Prompt 03 — Business Core Tables

```txt
Read:
- AGENTS.md
- docs/02_SUPABASE_SCHEMA_AND_RLS.md

Implement only the core business database migrations.

Create tables:

- app.customers
- app.vehicles
- app.service_orders
- app.bays
- app.work_items
- internal.message_outbox

Also create required enum types and indexes.

Every tenant-owned table must include tenant_id and RLS policies.

Do not create visual inspections, reports or warranties yet.

Acceptance criteria:
1. All tenant-owned tables have tenant_id.
2. RLS is enabled on every tenant-owned table.
3. Basic indexes exist.
4. Outbox has unique tenant_id + idempotency_key.
5. Realtime publication is enabled for bays and work_items.
```

## Prompt 04 — .NET Clean Architecture Solution

```txt
Read:
- AGENTS.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md

Create the .NET backend solution inside apps/api.

Create projects:

- Carwash.Domain
- Carwash.Application
- Carwash.Infrastructure
- Carwash.WebApi
- Carwash.UnitTests
- Carwash.IntegrationTests

Set correct project references according to Clean Architecture.

Do not implement business endpoints yet.

Acceptance criteria:
1. dotnet build succeeds.
2. Project dependencies follow the allowed direction.
3. WebApi starts with a /health endpoint.
4. No database access is implemented yet.
```

## Prompt 05 — Supabase JWT Auth and Tenant Context

```txt
Read:
- AGENTS.md
- docs/01_ENGINEERING_PRINCIPLES.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md

Implement authentication and tenant resolution in the .NET API.

Create:

- IUserContext
- ITenantContext
- HttpUserContext
- TenantResolutionMiddleware
- Supabase JWT authentication configuration
- tenant membership lookup using PostgreSQL
- /api/me endpoint
- /api/tenants/my endpoint

Rules:
- Frontend may send X-Tenant-Id.
- Backend must verify tenant membership.
- Missing or invalid token returns 401.
- Invalid tenant membership returns 403.

Acceptance criteria:
1. /api/me rejects missing token.
2. /api/me returns user id with valid token.
3. API rejects X-Tenant-Id if user is not a member.
4. dotnet build succeeds.
```

## Prompt 06 — Customers and Vehicles Feature

```txt
Read:
- AGENTS.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md

Implement the Customers and Vehicles feature.

Backend endpoints:

- POST /api/customers
- GET /api/customers
- GET /api/customers/{id}
- PATCH /api/customers/{id}
- POST /api/customers/{customerId}/vehicles
- GET /api/vehicles/{id}
- PATCH /api/vehicles/{id}

Use CQRS folders.

Create validators.

Use tenant context.

Do not trust tenant_id from payload.

Acceptance criteria:
1. Customer can be created for active tenant.
2. Vehicle can be created for customer.
3. User cannot access another tenant's customer.
4. Duplicate plate in same tenant is rejected.
5. dotnet build succeeds.
```

## Prompt 07 — Next.js Base, Supabase SSR and Dashboard Shell

```txt
Read:
- AGENTS.md
- docs/05_NEXTJS_FRONTEND_UX.md

Create the Next.js frontend app inside apps/web.

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase SSR Auth

Create:

- login page
- auth callback route
- dashboard layout
- sidebar
- topbar
- tenant switcher placeholder
- dashboard page with placeholder KPI cards

Rules:
- dark mode by default
- premium automotive aesthetic
- use shadcn/ui
- do not use GSAP in dashboard
- do not use other UI libraries

Acceptance criteria:
1. pnpm build succeeds.
2. Dashboard layout renders.
3. Login route exists.
4. No service role key is used.
5. UI uses shadcn/ui components.
```

## Prompt 08 — Service Orders Feature

```txt
Read:
- AGENTS.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md

Implement Service Orders.

Backend endpoints:

- POST /api/service-orders
- GET /api/service-orders
- GET /api/service-orders/{id}
- PATCH /api/service-orders/{id}/status
- PATCH /api/service-orders/{id}/schedule
- PATCH /api/service-orders/{id}/deliver

Rules:
- Use CQRS.
- Enforce valid status transitions.
- Use version for optimistic concurrency.
- Use tenant context.
- Return 409 for invalid transitions or version conflict.

Acceptance criteria:
1. Can create service order.
2. Can transition through valid statuses.
3. Invalid status transition returns 409.
4. Cross-tenant access is rejected.
5. dotnet build succeeds.
```

## Prompt 09 — Bays Realtime Board

```txt
Read:
- AGENTS.md
- docs/02_SUPABASE_SCHEMA_AND_RLS.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md
- docs/05_NEXTJS_FRONTEND_UX.md

Implement the work bay realtime board.

Backend:

- GET /api/bays/board
- POST /api/bays
- PATCH /api/work-items/{id}/move

Frontend:

- /bays page
- bay board
- bay columns
- work item cards
- Supabase Realtime subscription
- optimistic update
- 409 conflict handling

Rules:
- Use version field for race condition protection.
- Use Supabase Realtime for board updates.
- Use shadcn/ui.
- Do not use GSAP.

Acceptance criteria:
1. Board renders bays and work items.
2. Moving a card updates backend.
3. Another browser tab receives realtime update.
4. Version conflict returns 409 and refreshes board.
5. No cross-tenant data appears.
```

## Prompt 10 — Visual Inspection and Micron Readings

```txt
Read:
- AGENTS.md
- docs/02_SUPABASE_SCHEMA_AND_RLS.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md
- docs/05_NEXTJS_FRONTEND_UX.md

Implement visual inspections and micron readings.

Database:
- app.visual_inspections
- app.micron_readings
- app.inspection_photos

Backend:
- POST /api/service-orders/{id}/inspections
- GET /api/inspections/{id}
- PATCH /api/inspections/{id}/visual-state
- POST /api/inspections/{id}/micron-readings

Frontend:
- inspection page
- interactive SVG editor
- damage marks
- micron reading table

Rules:
- Store visual state as JSONB.
- Use version for concurrent edits.
- Reconstruct SVG state from saved JSONB.
- Use shadcn/ui.
- Use Client Components for SVG editor.

Acceptance criteria:
1. Inspection can be created.
2. Damage mark can be saved.
3. Micron reading can be added.
4. Risk summary updates.
5. Refreshing page reconstructs saved state.
```

## Prompt 11 — WhatsApp Microservice Base

```txt
Read:
- AGENTS.md
- docs/04_WHATSAPP_MICROSERVICE.md

Create the WhatsApp microservice base in apps/whatsapp-service.

Use:
- Node.js
- TypeScript
- Express
- Zod
- Pino
- Vitest

Create:
- /health endpoint
- correlation middleware
- HMAC internal auth middleware
- WhatsAppProvider interface
- FakeWhatsAppProvider
- basic session routes
- basic send message route

Do not connect real whatsapp-web.js yet unless explicitly asked.

Acceptance criteria:
1. pnpm build succeeds.
2. tests pass.
3. /health returns ok.
4. internal endpoints reject missing signature.
5. fake provider can simulate ready session and message send.
```

## Prompt 12 — WhatsApp Real Provider

```txt
Read:
- AGENTS.md
- docs/04_WHATSAPP_MICROSERVICE.md

Implement WWebJsProvider for the WhatsApp service.

Rules:
- isolate sessions by tenant id.
- session path must be tenant-specific.
- generate QR per tenant.
- report ready/disconnected status.
- do not send if session is not ready.
- keep provider behind WhatsAppProvider interface.

Acceptance criteria:
1. POST /internal/sessions/:tenantId/start returns QR pending.
2. GET /internal/sessions/:tenantId/status returns current status.
3. message send rejects if session is not ready.
4. logs include tenant id and correlation id.
```

## Prompt 13 — .NET Outbox Processor

```txt
Read:
- AGENTS.md
- docs/01_ENGINEERING_PRINCIPLES.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md
- docs/04_WHATSAPP_MICROSERVICE.md

Implement .NET outbox processing.

Create:
- IOutboxRepository
- OutboxRepository
- OutboxProcessorJob
- WhatsAppHttpDispatcher
- manual endpoint POST /api/admin/jobs/outbox/run-once for development

Rules:
- claim pending records safely.
- mark processing.
- call Node service with HMAC.
- include timeout.
- include X-Correlation-Id.
- include Idempotency-Key.
- mark sent only after Node returns success.
- increment attempts on failure.
- mark failed after max attempts.

Acceptance criteria:
1. Pending outbox message is sent through fake/local WhatsApp service.
2. Successful send marks outbox sent.
3. Failed send increments attempts.
4. Max attempts marks failed.
5. dotnet build succeeds.
```

## Prompt 14 — Report Publishing and Public Landing

```txt
Read:
- AGENTS.md
- docs/01_ENGINEERING_PRINCIPLES.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md
- docs/05_NEXTJS_FRONTEND_UX.md

Implement before/after report publishing.

Backend:
- POST /api/service-orders/{id}/reports/publish
- GET /public/reports/{token}

Rules:
- generate secure public token.
- store only token hash.
- generate public-safe report DTO.
- insert WhatsApp outbox message.
- use idempotency key.
- do not expose internal customer data.

Frontend:
- /r/[token] public page
- ReportHero
- BeforeAfterSlider
- ProcessTimeline
- GalleryGrid
- ShareWhatsAppButton
- GSAP + ScrollTrigger only in client components.

Acceptance criteria:
1. Report can be published.
2. Public page loads without login.
3. Token hash is stored, not plain token.
4. WhatsApp outbox record is created.
5. GSAP does not break SSR.
```

## Prompt 15 — Warranty Alerts

```txt
Read:
- AGENTS.md
- docs/01_ENGINEERING_PRINCIPLES.md
- docs/03_DOTNET_BACKEND_ARCHITECTURE.md

Implement warranty alerts.

Database:
- warranty_policies
- warranties
- warranty_alerts

Backend:
- POST /api/warranty-policies
- GET /api/warranty-policies
- POST /api/service-orders/{id}/warranty
- GET /api/warranties
- GET /api/warranties/dashboard
- POST /api/admin/jobs/warranties/run-once

Rules:
- calculate green/yellow/red/expired.
- create alerts idempotently.
- insert WhatsApp outbox records.
- do not duplicate alerts.
- use background job.

Acceptance criteria:
1. Warranty can be created from delivered order.
2. Recalculation changes status correctly.
3. Alert creates outbox message once.
4. Duplicate job run does not duplicate message.
5. dotnet build succeeds.
```

## Prompt 16 — CI/CD

```txt
Read:
- AGENTS.md
- docs/07_DEPLOYMENT_AND_ENV.md

Implement GitHub Actions CI.

Create workflows:

- api-ci.yml
- web-ci.yml
- whatsapp-ci.yml

Rules:
- API workflow runs dotnet restore/build/test.
- Web workflow runs pnpm install/lint/build.
- WhatsApp workflow runs pnpm install/test/build.
- Do not add deployment secrets.
- Do not hardcode environment secrets.

Acceptance criteria:
1. Workflow files exist.
2. Workflows are path-filtered.
3. No secret values are committed.
4. Commands match project structure.
```

## Prompt 17 — Dockerfiles

```txt
Read:
- AGENTS.md
- docs/07_DEPLOYMENT_AND_ENV.md

Create Dockerfiles for:

- apps/api
- apps/whatsapp-service

Rules:
- use environment variables.
- do not hardcode local paths.
- expose correct port.
- production build only.
- keep images reasonably small.

Acceptance criteria:
1. Dockerfiles exist.
2. Build instructions are documented.
3. No secrets are baked into images.
```

## Emergency Scope Control Prompt

Use this if OpenCode starts doing too much.

```txt
Stop.

Reduce scope.

Only implement this sub-feature:
[WRITE SUB-FEATURE HERE]

Allowed files:
[WRITE FILES HERE]

Do not modify anything else.
Do not add unrelated dependencies.
Do not refactor unrelated code.
Do not implement future phases.

Return:
1. What you changed.
2. Why you changed it.
3. How to test it.
4. What remains pending.
```
