# 03_DOTNET_BACKEND_ARCHITECTURE.md — .NET Backend Architecture

## Purpose

This document defines the .NET backend architecture for CARWASH.

The backend is the main business API.

It must be built using:

* .NET 8 or .NET 9.
* Clean Architecture.
* Hexagonal Architecture principles.
* CQRS with MediatR where useful.
* REST endpoints.
* Supabase JWT authentication.
* PostgreSQL/Supabase infrastructure.
* Structured logs.
* Correlation IDs.
* Background jobs.
* Outbox processing.

## Solution Structure

The backend must live in:

```txt
apps/api/
```

Expected structure:

```txt
apps/api/
  src/
    Carwash.Domain/
    Carwash.Application/
    Carwash.Infrastructure/
    Carwash.WebApi/
  tests/
    Carwash.UnitTests/
    Carwash.IntegrationTests/
```

## Dependency Rules

Allowed dependencies:

```txt
Carwash.WebApi → Carwash.Application
Carwash.WebApi → Carwash.Infrastructure

Carwash.Infrastructure → Carwash.Application
Carwash.Infrastructure → Carwash.Domain

Carwash.Application → Carwash.Domain

Carwash.Domain → no project dependencies
```

Forbidden:

```txt
Domain → Infrastructure
Domain → WebApi
Application → WebApi
Application → Infrastructure concrete implementations
Controllers → SQL directly
Controllers → Supabase directly
Controllers → WhatsApp HTTP directly
```

## Project Responsibilities

### Carwash.Domain

Contains pure business logic.

Should include:

* entities,
* value objects,
* domain services,
* domain events,
* domain errors,
* status transition rules,
* warranty status calculation,
* micron risk rules if pure enough.

Must not include:

* database access,
* HTTP clients,
* Supabase SDK,
* file storage,
* image processing,
* logging implementation,
* environment variables.

### Carwash.Application

Contains use cases.

Should include:

* commands,
* queries,
* handlers,
* validators,
* DTOs,
* interfaces/ports,
* authorization checks at use-case level if needed,
* business orchestration.

Should not include:

* direct SQL implementation,
* direct HTTP calls,
* concrete Supabase SDK calls,
* concrete WhatsApp service calls,
* controller code.

### Carwash.Infrastructure

Contains external implementations.

Should include:

* PostgreSQL repositories,
* Supabase SDK clients,
* Supabase Storage implementation,
* WhatsApp HTTP client,
* image processing service,
* background jobs,
* outbox processor,
* clock implementation,
* idempotency services,
* token hashing,
* file storage.

### Carwash.WebApi

Contains the REST API.

Should include:

* controllers or minimal API endpoints,
* middleware,
* authentication configuration,
* dependency injection setup,
* swagger,
* filters,
* exception handling,
* health checks.

Controllers must remain thin.

## CQRS Folder Convention

Use this structure:

```txt
Carwash.Application/
  Features/
    Customers/
      CreateCustomer/
        CreateCustomerCommand.cs
        CreateCustomerCommandHandler.cs
        CreateCustomerValidator.cs
        CreateCustomerResult.cs
      GetCustomerDetail/
        GetCustomerDetailQuery.cs
        GetCustomerDetailQueryHandler.cs
        CustomerDetailDto.cs
```

Rules:

* Commands mutate state.
* Queries read state.
* Handlers should represent one use case.
* Validators should use FluentValidation.
* Handlers should not return database entities directly.
* Handlers should return DTOs or result objects.

## API Style

Use REST.

Examples:

```txt
GET    /api/tenants/my
GET    /api/customers
POST   /api/customers
GET    /api/customers/{id}
PATCH  /api/customers/{id}

POST   /api/customers/{customerId}/vehicles
GET    /api/vehicles/{id}

POST   /api/service-orders
GET    /api/service-orders
GET    /api/service-orders/{id}
PATCH  /api/service-orders/{id}/status

GET    /api/bays/board
POST   /api/bays
PATCH  /api/work-items/{id}/move

POST   /api/service-orders/{id}/inspections
PATCH  /api/inspections/{id}/visual-state
POST   /api/inspections/{id}/micron-readings

POST   /api/service-orders/{id}/reports/publish
GET    /public/reports/{token}

POST   /api/service-orders/{id}/warranty
GET    /api/warranties
POST   /api/admin/jobs/warranties/run-once
```

## Authentication

Authentication uses Supabase JWT.

Every authenticated request must include:

```txt
Authorization: Bearer <supabase_access_token>
```

The API must validate the token before executing protected endpoints.

Create:

```txt
Application/Abstractions/IUserContext.cs
Infrastructure/Security/HttpUserContext.cs
```

Interface:

```csharp
public interface IUserContext
{
    Guid UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
}
```

## Tenant Resolution

The frontend may send:

```txt
X-Tenant-Id: <uuid>
```

But the backend must verify membership.

Required interface:

```csharp
public interface ITenantContext
{
    Guid TenantId { get; }
    string Role { get; }
}
```

Resolution logic:

```txt
1. Read user id from validated Supabase JWT.
2. Read X-Tenant-Id header.
3. Query app.tenant_memberships.
4. Ensure membership is active.
5. Ensure tenant is active.
6. Set TenantContext.
7. Reject if invalid.
```

Failure cases:

```txt
Missing token            → 401
Invalid token            → 401
Missing tenant header    → 400 or 428
Invalid membership       → 403
Suspended tenant         → 403
```

## Authorization Rules

Tenant membership is mandatory for tenant-owned operations.

Role-based authorization can be introduced progressively.

Initial role rules:

```txt
owner/admin       → full access
manager           → operational access
detailer          → inspections, work items, photos
receptionist      → customers, vehicles, service orders
viewer            → read-only
```

Do not hardcode role logic inside controllers.

Use policies or application-level authorization services.

## Database Access

Preferred approach:

* Dapper/Npgsql for explicit SQL and performance-sensitive queries.
* Supabase SDK only where useful for Storage/Auth/Data API operations.
* Do not make the entire backend depend on Supabase SDK abstractions.

Required interfaces:

```txt
Application/Abstractions/Persistence/ICustomerRepository.cs
Application/Abstractions/Persistence/IVehicleRepository.cs
Application/Abstractions/Persistence/IServiceOrderRepository.cs
Application/Abstractions/Persistence/IOutboxRepository.cs
```

Infrastructure implementations:

```txt
Infrastructure/Persistence/Customers/CustomerRepository.cs
Infrastructure/Persistence/Vehicles/VehicleRepository.cs
Infrastructure/Persistence/ServiceOrders/ServiceOrderRepository.cs
Infrastructure/Persistence/Outbox/OutboxRepository.cs
```

## Transactions

Use database transactions for multi-step writes.

Required when:

* creating service order and work item together,
* publishing report and creating outbox message,
* generating warranty and alert records,
* claiming outbox records,
* moving work items with version checks.

Do not split related writes across independent operations if they must succeed/fail together.

## Idempotency

Required for:

* report publishing,
* WhatsApp message creation,
* warranty alerts,
* outbox processing,
* webhooks,
* future payments.

Use:

```txt
tenant_id + idempotency_key
```

Enforce at DB level when possible.

Do not rely only on application memory.

## Race Conditions

Use optimistic concurrency for:

* service_orders,
* work_items,
* visual_inspections.

Required field:

```txt
version int not null default 1
```

Pattern:

```txt
client sends expectedVersion
backend compares current version
if mismatch → 409 Conflict
if match → update and increment version
```

## Outbox Pattern

External side effects must go through the outbox.

Do not send WhatsApp messages directly from business handlers.

Correct flow:

```txt
Application handler
→ writes business data
→ inserts internal.message_outbox
→ commits transaction
→ background worker processes outbox
→ calls WhatsApp service
→ marks outbox sent/failed
```

Outbox statuses:

```txt
pending
processing
sent
failed
cancelled
```

Outbox processor must:

1. Claim pending messages safely.
2. Avoid double-processing.
3. Use max attempts.
4. Apply timeout.
5. Retry transient errors.
6. Mark failed after max attempts.
7. Log all failures.

## Background Jobs

Use Coravel for MVP unless Hangfire is explicitly selected.

Background jobs:

```txt
OutboxProcessorJob
WarrantyStatusJob
ReportCleanupJob
```

Admin/manual endpoints may exist only in development or protected admin mode:

```txt
POST /api/admin/jobs/outbox/run-once
POST /api/admin/jobs/warranties/run-once
```

## WhatsApp Client Port

Application interface:

```csharp
public interface IWhatsAppDispatcher
{
    Task<WhatsAppDispatchResult> SendAsync(
        WhatsAppDispatchRequest request,
        CancellationToken cancellationToken);
}
```

Infrastructure implementation:

```txt
Infrastructure/WhatsApp/WhatsAppHttpDispatcher.cs
```

Rules:

* Use HttpClientFactory.
* Use explicit timeout.
* Use HMAC/internal auth.
* Include X-Correlation-Id.
* Include Idempotency-Key.
* Do not put WhatsApp HTTP calls in controllers.

## Image Processing

Required for report publishing.

Application interface:

```csharp
public interface IImageWatermarkService
{
    Task<WatermarkResult> CreateWatermarkedImageAsync(
        WatermarkRequest request,
        CancellationToken cancellationToken);
}
```

Infrastructure implementation:

```txt
Infrastructure/ImageProcessing/SkiaImageWatermarkService.cs
```

Rules:

* Do not process images in controllers.
* Do not block request indefinitely.
* For MVP, processing may happen synchronously in a command.
* Later, move heavy processing to background jobs.

## Public Report Token

Public report URLs must use secure tokens.

Rules:

* Generate a random token.
* Store only hash in database.
* Do not store plain token.
* Validate token through .NET public endpoint.
* Return sanitized report DTO.

Hash rule:

```txt
SHA256(token + REPORT_TOKEN_PEPPER)
```

Required env var:

```txt
Report__TokenPepper
```

## Logging

Use structured logging.

Required fields:

```txt
correlationId
tenantId
userId
operation
entityId when available
errorCode when available
```

Never log:

* access token,
* refresh token,
* service role key,
* password,
* full customer sensitive data.

## Correlation ID

Use header:

```txt
X-Correlation-Id
```

Middleware behavior:

```txt
if request has X-Correlation-Id:
  use it
else:
  generate one
```

Propagate to:

* logs,
* WhatsApp service calls,
* webhook calls,
* outbox processing logs.

## Error Handling

Use a centralized exception handler.

Return consistent error shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "correlationId": "..."
}
```

Common errors:

```txt
VALIDATION_ERROR             → 400
UNAUTHORIZED                 → 401
TENANT_REQUIRED              → 428 or 400
FORBIDDEN_TENANT             → 403
NOT_FOUND                    → 404
VERSION_CONFLICT             → 409
INVALID_STATE_TRANSITION     → 409
IDEMPOTENCY_CONFLICT         → 409
INTERNAL_ERROR               → 500
```

## Health Checks

Required endpoints:

```txt
GET /health
GET /health/db
GET /health/whatsapp
```

Expected:

```json
{
  "api": "ok",
  "version": "0.1.0"
}
```

## Testing

Required projects:

```txt
tests/Carwash.UnitTests
tests/Carwash.IntegrationTests
```

Unit tests should cover:

* service order transitions,
* warranty status calculation,
* micron risk classification,
* token hashing,
* idempotency key generation,
* outbox retry decision logic.

Integration tests should cover:

* auth protected endpoint,
* tenant rejection,
* customer creation,
* service order creation,
* work item movement conflict,
* report publishing,
* outbox processing.

## Backend Done Definition

A backend feature is complete only when:

1. Command/query exists.
2. Validator exists if input is accepted.
3. Repository or infrastructure implementation exists.
4. Controller endpoint exists.
5. Tenant isolation is enforced.
6. Idempotency is considered.
7. Race conditions are considered.
8. Logs include correlation id.
9. Negative case is tested or documented.
10. `dotnet build` succeeds.
