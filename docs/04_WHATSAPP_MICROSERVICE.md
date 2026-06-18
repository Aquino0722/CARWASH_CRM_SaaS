# 04_WHATSAPP_MICROSERVICE.md — WhatsApp Microservice Guide

## Purpose

This document defines the architecture of the WhatsApp microservice for CARWASH.

The WhatsApp service is responsible for:

* managing WhatsApp sessions,
* generating QR codes,
* isolating sessions by tenant,
* sending WhatsApp messages,
* reporting session status to the .NET API,
* reporting message status to the .NET API.

The WhatsApp service must be independent from the .NET API.

## Service Location

The service must live in:

```txt
apps/whatsapp-service/
```

Expected structure:

```txt
apps/whatsapp-service/
  src/
    server.ts
    app.ts
    config/
      env.ts
    routes/
      health.routes.ts
      session.routes.ts
      message.routes.ts
    controllers/
      session.controller.ts
      message.controller.ts
    middleware/
      internal-auth.middleware.ts
      correlation.middleware.ts
      error.middleware.ts
    providers/
      WhatsAppProvider.ts
      WWebJsProvider.ts
      EvolutionProvider.ts
      FakeWhatsAppProvider.ts
    sessions/
      SessionRegistry.ts
      SessionStore.ts
    webhooks/
      DotnetWebhookClient.ts
    utils/
      hmac.ts
      logger.ts
      phone.ts
  tests/
  package.json
  tsconfig.json
  Dockerfile
  .env.example
```

## Technology

Use:

* Node.js.
* TypeScript.
* Express.
* whatsapp-web.js or Evolution API adapter.
* Zod for validation.
* Pino for structured logs.
* Vitest for tests.

Do not merge this service into the .NET API.

## Provider Abstraction

Create a provider interface so implementation can be changed later.

File:

```txt
src/providers/WhatsAppProvider.ts
```

Required types:

```ts
export type SessionStatus =
  | "not_initialized"
  | "qr_pending"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "failed";

export interface StartSessionResult {
  tenantId: string;
  status: SessionStatus;
  qr?: string;
}

export interface SendMessageInput {
  tenantId: string;
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface SendMessageResult {
  providerMessageId: string;
}

export interface WhatsAppProvider {
  startSession(tenantId: string): Promise<StartSessionResult>;
  getQr(tenantId: string): Promise<string | null>;
  getStatus(tenantId: string): Promise<SessionStatus>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  logout(tenantId: string): Promise<void>;
}
```

## Providers

### WWebJsProvider

Used for MVP if whatsapp-web.js is selected.

Rules:

* One session per tenant.
* `clientId` must be tenant id.
* Session data must be isolated per tenant.
* Do not share browser sessions between tenants.
* Do not send messages if session is not ready.

Recommended session path:

```txt
.sessions/{tenantId}
```

### EvolutionProvider

Used if Evolution API is selected.

Rules:

* Must implement the same `WhatsAppProvider` interface.
* Must not change .NET API contract.
* Must translate CARWASH session/message requests into Evolution API calls.

### FakeWhatsAppProvider

Required for tests and local development.

Rules:

* Must simulate ready/not ready sessions.
* Must return fake provider message ids.
* Must not call real WhatsApp.

## Internal Security

The WhatsApp service must expose internal endpoints only.

Every internal endpoint must require authentication.

Use HMAC or equivalent internal token.

Required headers:

```txt
X-Internal-Timestamp
X-Internal-Signature
X-Correlation-Id
Idempotency-Key
```

Signature format:

```txt
sha256=<hmac>
```

Signature payload:

```txt
timestamp + "." + rawBody
```

HMAC algorithm:

```txt
HMAC-SHA256
```

Required secret:

```txt
INTERNAL_HMAC_SECRET
```

Reject if:

* signature is missing,
* timestamp is missing,
* timestamp is too old,
* signature is invalid,
* idempotency key is missing for message sending.

## Environment Variables

Required:

```env
PORT=4001
NODE_ENV=development

INTERNAL_HMAC_SECRET=change_me
DOTNET_API_BASE_URL=http://localhost:5000
DOTNET_WEBHOOK_SECRET=change_me

WHATSAPP_PROVIDER=wwebjs
WWEBJS_SESSION_DIR=.sessions
```

Optional:

```env
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
```

## Endpoints

### Health

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "whatsapp-service"
}
```

### Start Session

```http
POST /internal/sessions/:tenantId/start
```

Response:

```json
{
  "tenantId": "uuid",
  "status": "qr_pending",
  "qr": "data:image/png;base64,..."
}
```

If already ready:

```json
{
  "tenantId": "uuid",
  "status": "ready"
}
```

### Get QR

```http
GET /internal/sessions/:tenantId/qr
```

Response:

```json
{
  "tenantId": "uuid",
  "qr": "data:image/png;base64,..."
}
```

If no QR:

```json
{
  "tenantId": "uuid",
  "qr": null
}
```

### Get Session Status

```http
GET /internal/sessions/:tenantId/status
```

Response:

```json
{
  "tenantId": "uuid",
  "status": "ready"
}
```

### Logout Session

```http
POST /internal/sessions/:tenantId/logout
```

Response:

```json
{
  "tenantId": "uuid",
  "status": "disconnected"
}
```

### Send Message

```http
POST /internal/messages/send
```

Payload:

```json
{
  "tenantId": "uuid",
  "to": "+51999999999",
  "body": "Your report is ready: https://app.com/r/token",
  "mediaUrl": null
}
```

Response:

```json
{
  "status": "sent",
  "providerMessageId": "provider-id"
}
```

If session is not ready:

```json
{
  "error": "WHATSAPP_SESSION_NOT_READY",
  "message": "WhatsApp session is not ready for this tenant."
}
```

HTTP status:

```txt
409 Conflict
```

## Validation Rules

Use Zod for payload validation.

Tenant id:

```txt
required
valid uuid
```

Phone:

```txt
required
E.164 format
```

Body:

```txt
required
non-empty
max length configurable
```

Media URL:

```txt
optional
must be valid URL if provided
```

## Idempotency

The WhatsApp service must require `Idempotency-Key` for message sending.

For MVP, idempotency is mainly enforced by .NET outbox.

The Node service must still log the idempotency key and avoid unsafe duplicate behavior where possible.

Do not implement a complex idempotency store in Node unless needed.

## Session Isolation

Each tenant must have an isolated WhatsApp session.

Do not share:

* QR,
* local session files,
* browser instance identity,
* provider session id.

Tenant session identity:

```txt
tenantId
```

## Logs

Use structured logs.

Every log should include when available:

```txt
correlationId
tenantId
operation
provider
status
errorCode
```

Do not log:

* full message body if sensitive,
* internal secrets,
* tokens,
* HMAC secret,
* QR payload in production logs.

Allowed logs:

```txt
[session.start] tenant=<id> status=qr_pending
[session.ready] tenant=<id>
[message.send] tenant=<id> to=<masked-phone> status=sent
[message.failed] tenant=<id> error=<error-code>
```

Mask phone numbers:

```txt
+51999****99
```

## Webhooks to .NET

The service should notify the .NET API about important events.

Required endpoints in .NET:

```txt
POST /api/webhooks/whatsapp/session-status
POST /api/webhooks/whatsapp/message-status
```

### Session Status Payload

```json
{
  "tenantId": "uuid",
  "status": "ready",
  "phone": "+51999999999",
  "timestamp": "2026-06-17T20:00:00Z"
}
```

### Message Status Payload

```json
{
  "tenantId": "uuid",
  "providerMessageId": "provider-id",
  "status": "sent",
  "timestamp": "2026-06-17T20:00:00Z"
}
```

Webhook calls must include:

```txt
X-Correlation-Id
X-Internal-Timestamp
X-Internal-Signature
```

## Timeouts

All HTTP calls must have explicit timeouts.

Required:

* .NET API calling Node WhatsApp service.
* Node WhatsApp service calling .NET webhook endpoints.
* Evolution API calls if used.

Default timeout:

```txt
10 seconds
```

Long operations must be handled asynchronously.

## Retries

The WhatsApp service itself should not aggressively retry sending messages.

Primary retry logic belongs to .NET outbox processor.

Node may retry webhook notifications to .NET if transient errors occur.

Retryable:

```txt
network timeout
502
503
504
```

Non-retryable:

```txt
invalid payload
invalid signature
invalid phone
session not ready
```

## ACK Semantics

A message is considered successfully sent only when the provider confirms success.

Flow:

```txt
.NET outbox pending
→ .NET calls Node /internal/messages/send
→ Node sends using provider
→ provider returns message id
→ Node responds success
→ .NET marks outbox sent
```

Node must not return success before provider confirmation.

## Error Shape

Use consistent errors:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "correlationId": "..."
}
```

Common errors:

```txt
INVALID_INTERNAL_SIGNATURE
MISSING_IDEMPOTENCY_KEY
INVALID_PAYLOAD
WHATSAPP_SESSION_NOT_READY
WHATSAPP_SEND_FAILED
SESSION_NOT_FOUND
PROVIDER_ERROR
INTERNAL_ERROR
```

## Docker

The WhatsApp service must be deployable with Docker.

Required file:

```txt
apps/whatsapp-service/Dockerfile
```

Important:

* Expose `PORT`.
* Use environment variables.
* Do not hardcode local paths.
* Ensure session storage strategy is documented.

## Production Warning

If using whatsapp-web.js, session persistence matters.

If the deployment filesystem is ephemeral, WhatsApp sessions may be lost after restart.

Production options:

1. Use persistent volume if supported.
2. Use a remote auth/session strategy.
3. Use Evolution API.
4. Later consider official WhatsApp Cloud API if business requirements allow.

## Tests

Required tests:

1. Health endpoint returns OK.
2. HMAC middleware rejects missing signature.
3. HMAC middleware accepts valid signature.
4. Send message rejects invalid phone.
5. Send message rejects missing idempotency key.
6. Send message rejects session not ready.
7. Send message succeeds with fake provider ready.
8. Start session returns QR pending with fake provider.
9. Webhook client sends expected payload.

## Done Definition

WhatsApp service work is complete only when:

1. Endpoint exists.
2. Payload validation exists.
3. Internal auth exists.
4. Correlation id is logged.
5. Tenant id is respected.
6. Session isolation is preserved.
7. Timeout behavior exists.
8. Failure response is consistent.
9. Basic test or manual curl verification exists.
