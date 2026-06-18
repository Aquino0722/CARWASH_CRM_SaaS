# AGENTS.md — CARWASH SaaS CRM

## Project Identity

This repository is named `CARWASH`.

It is a multi-tenant SaaS CRM for high-ticket car detailing and premium car wash businesses.

The software solves four core business pillars:

1. Visual vehicle clinical history and paint micron measurement.
2. Automated before/after viral reports sent by WhatsApp.
3. Warranty and wear-level traffic-light alerts.
4. Real-time work bay management.

## Mandatory Tech Stack

Use only this stack unless explicitly instructed otherwise:

* Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
* Backend: .NET 8/9 Web API using Clean Architecture / Hexagonal Architecture.
* Backend patterns: CQRS with MediatR where useful.
* Database and Auth: Supabase PostgreSQL, Supabase Auth, RLS, JSONB, Realtime.
* WhatsApp service: independent Node.js Express service using whatsapp-web.js or Evolution API adapter.
* Deployment target: Vercel for frontend; Render or Railway for .NET API and Node WhatsApp service.

## Expected Repository Structure

```txt
CARWASH/
  AGENTS.md
  apps/
    web/
    api/
    whatsapp-service/
  infra/
    supabase/
      migrations/
      seeds/
      policies/
  docs/
    00_MASTER_ROADMAP.md
    01_ENGINEERING_PRINCIPLES.md
    02_SUPABASE_SCHEMA_AND_RLS.md
    03_DOTNET_BACKEND_ARCHITECTURE.md
    04_WHATSAPP_MICROSERVICE.md
    05_NEXTJS_FRONTEND_UX.md
    06_FEATURE_PROMPTS.md
    07_DEPLOYMENT_AND_ENV.md
```

## Required Reading Before Any Implementation

Before implementing any feature, read:

1. `AGENTS.md`
2. `docs/00_MASTER_ROADMAP.md`
3. `docs/01_ENGINEERING_PRINCIPLES.md`

For specific areas, also read:

* Database/RLS work: `docs/02_SUPABASE_SCHEMA_AND_RLS.md`
* Backend work: `docs/03_DOTNET_BACKEND_ARCHITECTURE.md`
* WhatsApp work: `docs/04_WHATSAPP_MICROSERVICE.md`
* Frontend/UI work: `docs/05_NEXTJS_FRONTEND_UX.md`
* Prompt execution: `docs/06_FEATURE_PROMPTS.md`
* Deployment/env work: `docs/07_DEPLOYMENT_AND_ENV.md`

## Development Method

Work bottom-up and feature-driven.

Do not implement many features at once.

For every task:

1. Understand the exact phase.
2. Produce a short implementation plan.
3. Modify only the necessary files.
4. Run or describe the smallest useful verification.
5. Stop after completing the requested feature.

## Preferred Implementation Order

1. Repository structure.
2. Supabase schemas, tenants, memberships, RLS.
3. .NET solution structure.
4. JWT authentication and tenant context.
5. Customers and vehicles.
6. Service orders.
7. Bays and realtime board.
8. Visual inspection and micron readings.
9. WhatsApp microservice.
10. Report publishing and public landing.
11. Warranty alerts and background jobs.
12. CI/CD and deployment.

## Critical Architecture Rules

1. This project is multi-tenant from the beginning.
2. Never trust `tenant_id` from the client as authorization proof.
3. The frontend may send `X-Tenant-Id`, but the .NET API must verify membership before executing any use case.
4. The backend must resolve tenant access using:

   * Supabase JWT user id.
   * `app.tenant_memberships`.
   * active membership status.
   * active tenant status.
5. Never expose Supabase Service Role Key in frontend code.
6. Never use Service Role from Next.js client components.
7. Never bypass RLS casually.
8. Controllers must remain thin.
9. Business logic belongs in Application handlers or Domain services.
10. SQL migrations must be incremental.
11. Every feature must include a manual or automated acceptance test before moving to the next feature.

## Backend Rules

The .NET solution should follow this structure:

```txt
apps/api/src/
  Carwash.Domain/
  Carwash.Application/
  Carwash.Infrastructure/
  Carwash.WebApi/
```

Expected dependency direction:

```txt
WebApi → Application → Domain
Infrastructure → Application → Domain
Domain → no dependency on other layers
```

Use MediatR for commands and queries when it improves separation.

Do not put SQL, Supabase calls, image processing, HTTP calls, or WhatsApp calls inside controllers.

## Frontend Rules

The Next.js app should live in:

```txt
apps/web/
```

Use:

* Next.js App Router.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* Supabase SSR Auth.
* GSAP only where appropriate.

Use server components by default.

Use client components only for:

* forms with interactivity,
* drag and drop,
* realtime subscriptions,
* GSAP animations,
* before/after sliders,
* dashboard widgets requiring browser APIs.

## UI/UX Rules

The frontend must use:

* shadcn/ui as the base component system.
* Tailwind CSS for styling.
* GSAP for premium animations.
* ScrollTrigger only for public report pages or marketing/public pages.
* Dark mode by default.
* Premium automotive aesthetic.

Do not use:

* Material UI,
* Bootstrap,
* Chakra UI,
* Ant Design,
* DaisyUI,
* custom UI libraries unless explicitly approved.

Use shadcn/ui components for:

* buttons,
* cards,
* dialogs,
* forms,
* tables,
* badges,
* tabs,
* sheets,
* dropdowns,
* skeletons,
* toast notifications.

Use GSAP only where animation adds product value:

* public report landing,
* before/after reveal sections,
* scroll-based storytelling,
* premium landing pages.

Do not overanimate the operational dashboard.

## WhatsApp Service Rules

The WhatsApp service must live in:

```txt
apps/whatsapp-service/
```

It must be independent from the .NET API.

It must expose internal endpoints only.

It must require internal authentication using HMAC or equivalent internal token.

It must isolate WhatsApp sessions by tenant.

The .NET API should communicate with it through an interface, not hardcoded HTTP calls inside handlers.

## Supabase Rules

Database files live in:

```txt
infra/supabase/migrations/
```

Use schemas:

```txt
app
internal
```

Business tables go in `app`.

Technical tables such as outbox messages go in `internal`.

Every tenant-owned table must include:

```txt
tenant_id uuid not null
```

Every tenant-owned table must have RLS enabled.

Every tenant-owned table must have policies preventing cross-tenant reads and writes.

## Cross-Cutting Engineering Rules

Every implementation must consider:

* multitenancy,
* RLS,
* idempotency,
* race conditions,
* outbox pattern,
* locks when needed,
* pub/sub when needed,
* structured logs,
* traces/correlation ids,
* pipelines,
* Docker,
* cloud deployment,
* backups,
* retries,
* ACK semantics,
* timeouts.

Do not introduce Redis, RabbitMQ, Kafka, SQS, GraphQL, NoSQL or Stripe unless explicitly approved.

For MVP:

* PostgreSQL outbox is preferred over external queues.
* PostgreSQL JSONB is preferred over NoSQL.
* REST is preferred over GraphQL.
* Supabase Realtime is preferred over a custom pub/sub service.
* Failed outbox records act as a simple DLQ.

## Testing Rules

Before marking a task complete, verify at least one of:

* successful build,
* successful migration,
* endpoint tested with Postman/curl,
* unit test,
* integration test,
* visible UI behavior,
* relevant logs.

Do not say a feature is complete without a concrete acceptance check.

## Commands

Frontend:

```bash
cd apps/web
pnpm install
pnpm lint
pnpm build
pnpm dev
```

Backend:

```bash
cd apps/api
dotnet restore
dotnet build
dotnet test
dotnet run --project src/Carwash.WebApi
```

WhatsApp service:

```bash
cd apps/whatsapp-service
pnpm install
pnpm test
pnpm build
pnpm dev
```

Supabase:

```bash
cd infra/supabase
supabase start
supabase db reset
supabase migration new <name>
```

## Forbidden Actions

Do not:

* rewrite the entire project without being asked,
* create unrelated frameworks,
* mix frontend and backend responsibilities,
* store secrets in committed files,
* expose service role key to the browser,
* skip RLS for tenant data,
* implement WhatsApp inside .NET directly,
* implement reports without token hashing,
* add large dependencies without justification,
* modify deployment configuration before local code works,
* implement multiple phases at once.

## Done Definition

A feature is considered done only when:

1. Database changes are migrated if needed.
2. RLS behavior is considered.
3. Backend endpoint exists if needed.
4. Frontend integration exists if needed.
5. Negative case is considered.
6. Acceptance criterion is documented.
7. The project still builds.
