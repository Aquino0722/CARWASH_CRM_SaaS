# 01_ENGINEERING_PRINCIPLES.md — CARWASH Engineering Principles

## Purpose

This document defines the engineering concepts that must be preserved throughout the CARWASH SaaS codebase.

These are not optional style preferences. They are architectural requirements.

## Mandatory Concepts From Day One

### 1. Multitenancy

CARWASH is a multi-tenant SaaS.

Every workshop is a tenant.

Rules:

* Every tenant-owned table must include `tenant_id`.
* The backend must validate tenant access through Supabase JWT and `app.tenant_memberships`.
* Never trust `tenant_id` from the frontend as authorization proof.
* The frontend may send `X-Tenant-Id`, but the backend must verify it.
* Cross-tenant reads and writes must be impossible.

Required tables:

```txt
app.tenants
app.tenant_memberships
```

### 2. SQL First

PostgreSQL through Supabase is the primary database.

Rules:

* Use relational modeling for core business data.
* Use foreign keys.
* Use indexes.
* Use constraints.
* Use JSONB only where flexibility is needed.

Good JSONB use cases:

* visual vehicle inspection state,
* SVG damage marks,
* micron summaries,
* report themes,
* checklists,
* metadata.

Bad JSONB use cases:

* customers,
* vehicles,
* service orders,
* warranties,
* tenant memberships.

### 3. RLS

Row Level Security is mandatory for tenant-owned tables.

Rules:

* Every tenant-owned table must have RLS enabled.
* Policies must prevent cross-tenant reads.
* Policies must prevent cross-tenant writes.
* Service Role must never be exposed to frontend code.
* RLS should be tested before considering a table complete.

### 4. REST First

The main API must expose REST endpoints.

Rules:

* Use REST for the MVP.
* Do not introduce GraphQL initially.
* Keep endpoints predictable and resource-oriented.
* Use DTOs.
* Do not expose database entities directly.

Example endpoint style:

```txt
GET    /api/customers
POST   /api/customers
GET    /api/customers/{id}
PATCH  /api/customers/{id}
POST   /api/customers/{id}/vehicles
```

### 5. Idempotency

Idempotency is required for operations that can be retried or duplicated.

Required for:

* WhatsApp messages,
* report publishing,
* warranty alerts,
* background jobs,
* future payment webhooks,
* external webhooks.

Rules:

* Use idempotency keys.
* Enforce idempotency with unique constraints where possible.
* Do not retry unsafe operations unless idempotency protection exists.

Example:

```txt
tenant_id + idempotency_key must be unique
```

### 6. Race Condition Protection

The system must protect against concurrent writes.

Use:

* SQL transactions,
* optimistic concurrency,
* version fields,
* unique constraints,
* row locks when necessary.

Required for:

* work item movement,
* service order status transitions,
* report publishing,
* warranty alert generation,
* outbox processing.

Example:

```txt
work_items.version
service_orders.version
```

### 7. Outbox Pattern

External side effects must go through the outbox.

Do not directly send WhatsApp messages inside business logic.

Correct flow:

```txt
Business operation
→ database transaction
→ insert outbox record
→ commit
→ background worker processes outbox
→ WhatsApp service sends message
→ mark outbox as sent
```

Required outbox fields:

```txt
id
tenant_id
channel
recipient_phone_e164
template_key
payload
status
attempts
max_attempts
scheduled_at
processing_at
sent_at
failed_at
provider_message_id
idempotency_key
last_error
created_at
```

### 8. DLQ Strategy

For MVP, failed outbox records act as a simple DLQ.

Rules:

* If attempts exceed max attempts, mark record as `failed`.
* Keep `last_error`.
* Failed records must be inspectable.
* Do not delete failed records automatically.

External DLQ with RabbitMQ, Kafka or SQS can be added later only if needed.

### 9. Logs

Use structured logs.

Logs should include:

* timestamp,
* level,
* correlation id,
* tenant id when available,
* user id when available,
* operation name,
* error code,
* error details.

Never log:

* access tokens,
* refresh tokens,
* service role keys,
* passwords,
* full sensitive customer data.

### 10. Traces and Correlation IDs

Important flows must be traceable across services.

A correlation id must be propagated through:

```txt
Next.js frontend
→ .NET API
→ background worker
→ Node WhatsApp service
```

Header:

```txt
X-Correlation-Id
```

If the request has no correlation id, the .NET API should create one.

### 11. Timeouts

All HTTP calls between services must have explicit timeouts.

Required for:

* .NET API calling WhatsApp service,
* WhatsApp service calling .NET webhooks,
* frontend calling backend if custom fetch wrapper supports it,
* image processing operations if external resources are fetched.

Rules:

* No unbounded external calls.
* Timeout errors must be logged.
* Timeout errors in outbox processing must be retryable if idempotent.

### 12. Retries

Retries must be controlled.

Rules:

* Use retries only for transient failures.
* Do not retry validation errors.
* Do not retry authorization errors.
* Do not retry non-idempotent operations.
* Use exponential backoff where possible.

Retryable examples:

* temporary WhatsApp service unavailable,
* network timeout,
* 502/503 from internal service.

Non-retryable examples:

* invalid phone number,
* invalid tenant,
* unauthorized request,
* malformed payload.

### 13. ACK Semantics

A task is acknowledged only after the external action succeeds.

For WhatsApp:

```txt
outbox status pending
→ worker claims record
→ status processing
→ Node sends message
→ Node returns provider message id
→ status sent
```

Do not mark a message as sent before provider confirmation.

### 14. Pub/Sub

For MVP, use Supabase Realtime for realtime UI.

Required for:

* work bay board,
* work item movement,
* service order board updates.

Do not introduce Kafka, RabbitMQ, or SQS for realtime dashboard updates during MVP.

### 15. Locks

Use locks only when necessary.

Preferred order:

1. Unique constraints.
2. Optimistic concurrency with version fields.
3. SQL transaction.
4. Row-level lock.
5. Distributed lock only if PostgreSQL is insufficient.

Redis locks are not needed for MVP unless explicitly approved.

### 16. Pipelines

CI/CD must be handled through GitHub Actions.

Required checks:

* frontend lint,
* frontend build,
* backend build,
* backend tests,
* WhatsApp service build,
* WhatsApp service tests.

### 17. Docker

Backend and WhatsApp services must be container-friendly.

Rules:

* No hardcoded local paths.
* Configuration through environment variables.
* Dockerfiles for deployable services.
* Local Docker Compose may be used for development.

### 18. Cloud Deployment

Target deployment:

* Frontend: Vercel.
* Backend API: Render or Railway.
* WhatsApp service: Render or Railway.
* Database/Auth/Storage: Supabase.

Rules:

* Secrets must be environment variables.
* Public frontend env vars must use `NEXT_PUBLIC_`.
* Secret values must not be committed.

### 19. Backups

Supabase PostgreSQL backup strategy must be documented.

Critical data:

* tenants,
* tenant memberships,
* customers,
* vehicles,
* service orders,
* visual inspections,
* micron readings,
* reports,
* warranties,
* outbox records.

### 20. Stripe

Stripe is deferred.

Do not implement billing until:

* core CRM is stable,
* tenant model is stable,
* plan limits are defined,
* payment webhooks can be handled idempotently.

### 21. Redis

Redis is deferred.

Use only if needed for:

* cache,
* rate limiting,
* distributed locks,
* ephemeral coordination.

Do not add Redis by default.

### 22. RabbitMQ, Kafka, SQS

Message brokers are deferred.

For MVP:

```txt
PostgreSQL outbox > external broker
```

Add a broker only when:

* outbox throughput is insufficient,
* multiple consumers need event streams,
* delayed jobs become too complex,
* stronger queue semantics are required.

### 23. NoSQL

NoSQL is deferred.

For MVP:

```txt
PostgreSQL JSONB > NoSQL database
```

Do not add MongoDB, DynamoDB, or similar databases unless explicitly approved.

### 24. GraphQL

GraphQL is deferred.

For MVP:

```txt
REST > GraphQL
```

GraphQL may be considered later if the frontend needs highly flexible data fetching.

## Feature Implementation Checklist

Before implementing any feature, answer:

1. Does this feature require tenant isolation?
2. Does this feature need RLS?
3. Does this feature need idempotency?
4. Can this feature suffer race conditions?
5. Does this feature need a transaction?
6. Does this feature trigger an external side effect?
7. Should this feature use the outbox?
8. Does this feature need retries?
9. What timeout applies?
10. What is the ACK condition?
11. What logs are needed?
12. What correlation id propagation is needed?
13. What is the negative test case?
14. What is the acceptance criterion?

## MVP Defaults

Use these defaults unless told otherwise:

```txt
API style: REST
Database: Supabase PostgreSQL
Flexible data: JSONB
Auth: Supabase Auth
Authorization: RLS + backend tenant validation
Queue: PostgreSQL outbox
DLQ: failed outbox records
Realtime: Supabase Realtime
Payments: deferred
Cache: no Redis initially
Message broker: no RabbitMQ/Kafka/SQS initially
Frontend UI: shadcn/ui
Animation: GSAP only for public premium pages
Deployment: Vercel + Render/Railway
```
