# 07_DEPLOYMENT_AND_ENV.md — Deployment and Environment Guide

## Purpose

This document defines deployment targets, environment variables, CI/CD expectations, Docker rules, and backup strategy for CARWASH.

Target platforms:

* Frontend: Vercel.
* Backend API: Render or Railway.
* WhatsApp service: Render or Railway.
* Database/Auth/Storage: Supabase.
* CI/CD: GitHub Actions.

## Deployment Philosophy

Deploy only after local build works.

Do not configure production deployment before:

1. database migrations exist,
2. backend builds,
3. frontend builds,
4. WhatsApp service builds,
5. required environment variables are documented,
6. secrets are not committed.

## Environments

Recommended environments:

```txt
local
preview
production
```

Environment responsibilities:

```txt
local       → developer machine
preview     → pull request / staging deployment
production  → real users
```

## Root .env.example

Root file:

```txt
.env.example
```

Recommended content:

```env
# =====================================================
# CARWASH — Root Environment Example
# =====================================================

# -------------------------
# Supabase
# -------------------------
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_ISSUER=
SUPABASE_JWT_AUDIENCE=authenticated
DATABASE_URL=

# -------------------------
# Frontend - Next.js
# -------------------------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_APP_URL=

# -------------------------
# Backend - .NET API
# -------------------------
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://localhost:5000

Supabase__Url=
Supabase__AnonKey=
Supabase__ServiceRoleKey=
Supabase__JwtIssuer=
Supabase__JwtAudience=authenticated

Database__ConnectionString=

WhatsApp__BaseUrl=http://localhost:4001
WhatsApp__InternalHmacSecret=

Frontend__PublicBaseUrl=http://localhost:3000

Report__TokenPepper=

# -------------------------
# WhatsApp Service - Node.js
# -------------------------
PORT=4001
NODE_ENV=development
INTERNAL_HMAC_SECRET=
DOTNET_API_BASE_URL=http://localhost:5000
DOTNET_WEBHOOK_SECRET=
WHATSAPP_PROVIDER=fake
WWEBJS_SESSION_DIR=.sessions

# Optional Evolution API
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
```

## Secret Rules

Never commit real values for:

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
Report__TokenPepper
INTERNAL_HMAC_SECRET
DOTNET_WEBHOOK_SECRET
EVOLUTION_API_KEY
```

Frontend must never receive:

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
INTERNAL_HMAC_SECRET
Report__TokenPepper
```

Only variables prefixed with `NEXT_PUBLIC_` are safe for browser exposure.

## Frontend Deployment — Vercel

Frontend location:

```txt
apps/web/
```

Vercel project root should be:

```txt
apps/web
```

Required environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_APP_URL=
```

Optional server-only variable:

```env
API_BASE_URL=
```

Do not add:

```env
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## Frontend Build Commands

Recommended:

```bash
pnpm install
pnpm build
```

If monorepo root is used, configure Vercel accordingly.

## Backend Deployment — Render or Railway

Backend location:

```txt
apps/api/
```

Service type:

```txt
Web Service
```

Runtime:

```txt
Docker or .NET native build
```

Recommended production port:

```txt
8080
```

Required env vars:

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:8080

Supabase__Url=
Supabase__AnonKey=
Supabase__ServiceRoleKey=
Supabase__JwtIssuer=
Supabase__JwtAudience=authenticated

Database__ConnectionString=

WhatsApp__BaseUrl=
WhatsApp__InternalHmacSecret=

Frontend__PublicBaseUrl=
Report__TokenPepper=
```

## Backend Health Checks

Required endpoints:

```txt
GET /health
GET /health/db
GET /health/whatsapp
```

Render/Railway health check should use:

```txt
/health
```

## Backend Dockerfile

Required:

```txt
apps/api/Dockerfile
```

Rules:

* use multi-stage build,
* restore dependencies,
* build release,
* publish release,
* expose port 8080,
* do not bake secrets into image.

Expected Docker behavior:

```bash
docker build -t carwash-api ./apps/api
docker run -p 8080:8080 --env-file .env carwash-api
```

## WhatsApp Service Deployment — Render or Railway

Service location:

```txt
apps/whatsapp-service/
```

Service type:

```txt
Web Service
```

Required env vars:

```env
NODE_ENV=production
PORT=4001

INTERNAL_HMAC_SECRET=
DOTNET_API_BASE_URL=
DOTNET_WEBHOOK_SECRET=

WHATSAPP_PROVIDER=wwebjs
WWEBJS_SESSION_DIR=/data/sessions
```

Optional Evolution API:

```env
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
```

## WhatsApp Session Persistence Warning

If using `whatsapp-web.js`, session persistence is critical.

If the deployment filesystem is ephemeral:

```txt
WhatsApp session may be lost after restart.
Tenant may need to scan QR again.
```

Production options:

1. Use persistent disk/volume if available.
2. Use a remote auth/session strategy.
3. Use Evolution API.
4. Later consider official WhatsApp Cloud API if business requirements allow.

## WhatsApp Dockerfile

Required:

```txt
apps/whatsapp-service/Dockerfile
```

Rules:

* use Node LTS,
* install production dependencies,
* build TypeScript,
* expose `PORT`,
* use environment variables,
* do not commit session files,
* do not commit QR codes.

Add to `.gitignore`:

```txt
apps/whatsapp-service/.sessions/
apps/whatsapp-service/dist/
```

## Supabase Deployment

Supabase handles:

* PostgreSQL,
* Auth,
* Storage,
* Realtime.

Required setup:

```txt
app schema
internal schema
migrations
storage bucket
RLS policies
Realtime publication
```

## Supabase Migrations

Migrations location:

```txt
infra/supabase/migrations/
```

Rules:

* numeric prefixes,
* small incremental migrations,
* do not edit old migrations after they are applied in production,
* create new migration for changes.

Recommended local commands:

```bash
cd infra/supabase
supabase start
supabase db reset
supabase migration new <name>
```

## Supabase Storage

Required bucket:

```txt
tenant-assets
```

Recommended paths:

```txt
tenant-assets/
  tenants/{tenantId}/orders/{serviceOrderId}/before/
  tenants/{tenantId}/orders/{serviceOrderId}/after/
  tenants/{tenantId}/reports/{reportId}/watermarked/
```

Storage policy must not expose private tenant assets unintentionally.

Public report assets may be public only if they are sanitized and intended to be shared.

## CI/CD — GitHub Actions

Workflows location:

```txt
.github/workflows/
```

Required workflows:

```txt
api-ci.yml
web-ci.yml
whatsapp-ci.yml
```

## api-ci.yml

Purpose:

```txt
Build and test .NET backend.
```

Required checks:

```txt
dotnet restore
dotnet build
dotnet test
```

Path filter:

```txt
apps/api/**
```

## web-ci.yml

Purpose:

```txt
Build frontend.
```

Required checks:

```txt
pnpm install
pnpm lint
pnpm build
```

Path filter:

```txt
apps/web/**
```

## whatsapp-ci.yml

Purpose:

```txt
Build and test WhatsApp service.
```

Required checks:

```txt
pnpm install
pnpm test
pnpm build
```

Path filter:

```txt
apps/whatsapp-service/**
```

## Docker Compose for Local Development

Optional root file:

```txt
docker-compose.dev.yml
```

Can include:

* .NET API,
* WhatsApp service,
* local dependencies if needed.

Supabase local stack is usually managed by Supabase CLI, so do not duplicate it unless necessary.

## Logging in Production

Logs must include:

```txt
correlationId
tenantId when available
userId when available
service name
operation
error code
```

Services:

```txt
web
api
whatsapp-service
background-jobs
```

Never log:

```txt
tokens
service role keys
passwords
HMAC secrets
full sensitive customer data
```

## Correlation ID

Use header:

```txt
X-Correlation-Id
```

Flow:

```txt
Next.js
→ .NET API
→ Outbox Processor
→ WhatsApp Service
→ .NET Webhook
```

Every service should preserve or generate a correlation id.

## Backups

Supabase PostgreSQL backup strategy must be documented before production.

Critical tables:

```txt
app.tenants
app.tenant_memberships
app.customers
app.vehicles
app.service_orders
app.visual_inspections
app.micron_readings
app.inspection_photos
app.reports
app.report_assets
app.warranty_policies
app.warranties
app.warranty_alerts
app.bays
app.work_items
internal.message_outbox
```

Backup requirements:

1. Know Supabase plan backup limits.
2. Document recovery procedure.
3. Test restore procedure before real production usage.
4. Keep exported reports/images strategy in mind.

## Deployment Checklist

Before deploying production:

```txt
[ ] Frontend builds locally.
[ ] Backend builds locally.
[ ] WhatsApp service builds locally.
[ ] Supabase migrations applied.
[ ] RLS tested.
[ ] Service role key not exposed.
[ ] Environment variables configured.
[ ] Health checks working.
[ ] Outbox processor tested.
[ ] WhatsApp session strategy documented.
[ ] Public report token hashing configured.
[ ] Backups documented.
[ ] CI passing.
```

## Production Readiness Checklist

```txt
[ ] Tenant isolation verified.
[ ] Cross-tenant access blocked.
[ ] Auth works.
[ ] Dashboard loads.
[ ] Customer creation works.
[ ] Vehicle creation works.
[ ] Service order creation works.
[ ] Bays realtime works.
[ ] Visual inspection saves JSONB.
[ ] WhatsApp session connects.
[ ] Outbox sends message.
[ ] Report public page loads.
[ ] Warranty job runs.
[ ] Logs are structured.
[ ] Correlation ids are present.
[ ] No secrets in repository.
```

## Rollback Strategy

For MVP:

* rollback frontend through Vercel deployment history,
* rollback backend through Render/Railway previous deploy,
* avoid destructive database migrations,
* use additive migrations when possible,
* never drop production columns without a multi-step migration.

## Done Definition

Deployment setup is done only when:

1. All required env vars are documented.
2. CI workflows exist.
3. Dockerfiles exist for backend and WhatsApp service.
4. Frontend deployment target is documented.
5. Backend deployment target is documented.
6. WhatsApp deployment target is documented.
7. Supabase migration strategy is documented.
8. Backup strategy is documented.
9. No real secrets are committed.
