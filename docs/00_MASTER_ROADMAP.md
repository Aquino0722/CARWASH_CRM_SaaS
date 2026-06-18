
# 0. Visión de arquitectura

## Objetivo del SaaS

Construir un CRM especializado para talleres premium de car detailing donde cada taller pueda:

1. Registrar historial visual del vehículo como una “ficha clínica estética”.
2. Generar reportes virales de antes/después y enviarlos por WhatsApp.
3. Gestionar alertas de garantía y desgaste con semáforo automático.
4. Administrar bahías/cajones de trabajo en tiempo real.

## Principio arquitectónico central

El sistema debe ser **multi-tenant desde el primer commit**.

Nunca se debe confiar en un `tenant_id` enviado desde el frontend. El `tenant_id` válido debe resolverse desde:

```txt
JWT Supabase Auth
→ auth.users.id
→ app.tenant_memberships
→ tenant activo + rol activo
→ TenantContext en .NET
```

## Arquitectura de alto nivel

```txt
apps/
  web/                         Next.js App Router + TypeScript
  api/                         .NET 8/9 Clean Architecture + CQRS
  whatsapp-service/            Node.js Express + whatsapp-web.js/Evolution adapter

infra/
  supabase/
    migrations/
    seed.sql
    policies/
    storage.sql

docs/
  architecture/
  api-contracts/
  prompts/
```

## Flujo general

```txt
Usuario autenticado en Next.js
  ↓ Supabase Auth SSR
Next.js obtiene access_token
  ↓ Authorization: Bearer <supabase_jwt>
.NET API valida JWT
  ↓ resuelve tenant + rol
.NET ejecuta caso de uso
  ↓ Supabase PostgreSQL / Storage
  ↓ Outbox de mensajes
.NET worker despacha a Node WhatsApp
  ↓ Node envía mensaje por sesión aislada del tenant
Cliente final recibe link de reporte
  ↓ /r/[token] en Next.js
```

---

# Fase 0 — Preparación del entorno y modelo de datos

## 0.1. Crear monorepo base

### Objetivo técnico

Separar claramente frontend, backend principal, microservicio WhatsApp e infraestructura Supabase.

### Estructura

```txt
CARWASH/
  apps/
    web/
    api/
    whatsapp-service/
  infra/
    supabase/
      migrations/
      seeds/
      storage/
  .github/
    workflows/
  README.md
  docker-compose.dev.yml
  .env.example
```

### Archivos clave

```txt
.env.example
docker-compose.dev.yml
README.md
infra/supabase/README.md
apps/web/README.md
apps/api/README.md
apps/whatsapp-service/README.md
```

### Criterio de aceptación

Debe poder ejecutarse:

```bash
git clone <repo>
cp .env.example .env
```

Y cada app debe tener un README mínimo con:

```txt
Cómo instalar
Cómo ejecutar
Variables necesarias
Cómo probar salud local
```

---

## 0.2. Crear proyecto Supabase

### Objetivo técnico

Tener una instancia PostgreSQL administrada por Supabase con Auth, Storage, RLS y Realtime habilitados.

### Configuración inicial

Crear estos esquemas:

```sql
create schema if not exists app;
create schema if not exists internal;
```

Uso recomendado:

```txt
app       → tablas de negocio multi-tenant
internal  → tablas técnicas, outbox, webhooks, locks, eventos internos
public    → evitar lógica de negocio aquí, salvo funciones muy controladas
auth      → gestionado por Supabase
storage   → gestionado por Supabase
```

### Criterio de aceptación

En Supabase SQL Editor:

```sql
select schema_name
from information_schema.schemata
where schema_name in ('app', 'internal');
```

Debe devolver:

```txt
app
internal
```

---

## 0.3. Modelo multi-tenant base

### Objetivo técnico

Crear la base de seguridad: tenants, membresías, roles y helper functions para RLS.

### Migración

Archivo:

```txt
infra/supabase/migrations/0001_core_tenants.sql
```

SQL:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create type app.tenant_status as enum (
  'active',
  'suspended',
  'cancelled'
);

create type app.member_role as enum (
  'owner',
  'admin',
  'manager',
  'detailer',
  'receptionist',
  'viewer'
);

create type app.member_status as enum (
  'active',
  'invited',
  'disabled'
);

create table app.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status app.tenant_status not null default 'active',
  plan_code text not null default 'starter',
  timezone text not null default 'America/Lima',
  default_currency text not null default 'PEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app.member_role not null,
  status app.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index ix_tenant_memberships_user
on app.tenant_memberships(user_id);

create index ix_tenant_memberships_tenant
on app.tenant_memberships(tenant_id);
```

### Helper function RLS

Archivo:

```txt
infra/supabase/migrations/0002_rls_helpers.sql
```

SQL:

```sql
create or replace function app.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = app, public
as $$
  select exists (
    select 1
    from app.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function app.current_user_role(p_tenant_id uuid)
returns app.member_role
language sql
security definer
set search_path = app, public
as $$
  select tm.role
  from app.tenant_memberships tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = auth.uid()
    and tm.status = 'active'
  limit 1;
$$;
```

### Habilitar RLS

```sql
alter table app.tenants enable row level security;
alter table app.tenant_memberships enable row level security;
```

### Políticas

```sql
create policy "members can view their tenants"
on app.tenants
for select
using (
  exists (
    select 1
    from app.tenant_memberships tm
    where tm.tenant_id = app.tenants.id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  )
);

create policy "members can view memberships of own tenant"
on app.tenant_memberships
for select
using (app.is_tenant_member(tenant_id));
```

### Criterio de aceptación

Crear manualmente un usuario en Supabase Auth y asociarlo a un tenant.

Luego, desde SQL Editor usando service role, verificar:

```sql
select * from app.tenants;
select * from app.tenant_memberships;
```

Desde cliente autenticado con Supabase, el usuario solo debe ver tenants donde tenga membresía.

---

## 0.4. Tablas núcleo del dominio

### Objetivo técnico

Crear las entidades que sostienen los cuatro pilares.

### Archivo

```txt
infra/supabase/migrations/0003_business_core.sql
```

### Tipos base

```sql
create type app.service_order_status as enum (
  'draft',
  'quoted',
  'scheduled',
  'checked_in',
  'in_progress',
  'quality_check',
  'ready_for_delivery',
  'delivered',
  'cancelled'
);

create type app.photo_stage as enum (
  'before',
  'progress',
  'after',
  'defect',
  'delivery'
);

create type app.report_status as enum (
  'draft',
  'processing',
  'published',
  'sent',
  'expired',
  'failed'
);

create type app.warranty_status as enum (
  'green',
  'yellow',
  'red',
  'expired',
  'claimed',
  'void'
);

create type app.bay_status as enum (
  'available',
  'occupied',
  'blocked',
  'maintenance'
);

create type internal.outbox_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);
```

---

## 0.5. Clientes y vehículos

```sql
create table app.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  full_name text not null,
  phone_e164 text,
  email text,
  notes text,
  tags jsonb not null default '[]',
  whatsapp_consent boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_customers_tenant on app.customers(tenant_id);
create index ix_customers_phone on app.customers(tenant_id, phone_e164);

create table app.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid not null references app.customers(id) on delete cascade,
  plate text,
  vin text,
  make text not null,
  model text not null,
  year int,
  color text,
  trim text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_vehicles_tenant on app.vehicles(tenant_id);
create index ix_vehicles_customer on app.vehicles(customer_id);
create unique index ux_vehicles_plate_per_tenant
on app.vehicles(tenant_id, lower(plate))
where plate is not null;
```

### RLS

```sql
alter table app.customers enable row level security;
alter table app.vehicles enable row level security;

create policy "tenant members select customers"
on app.customers
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert customers"
on app.customers
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members update customers"
on app.customers
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

create policy "tenant members select vehicles"
on app.vehicles
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert vehicles"
on app.vehicles
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members update vehicles"
on app.vehicles
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));
```

### Criterio de aceptación

Usuario A de tenant A no puede leer clientes del tenant B usando Supabase client.

Prueba esperada:

```txt
Query customers como usuario A
→ devuelve solo filas tenant A

Insert customer con tenant_id B
→ falla por RLS
```

---

## 0.6. Órdenes de servicio

```sql
create table app.service_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  customer_id uuid not null references app.customers(id),
  vehicle_id uuid not null references app.vehicles(id),
  status app.service_order_status not null default 'draft',
  title text not null,
  package_name text,
  estimated_price numeric(12,2),
  final_price numeric(12,2),
  check_in_at timestamptz,
  scheduled_at timestamptz,
  due_at timestamptz,
  delivered_at timestamptz,
  internal_notes text,
  customer_notes text,
  version int not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_service_orders_tenant_status
on app.service_orders(tenant_id, status);

create index ix_service_orders_vehicle
on app.service_orders(vehicle_id);
```

### RLS

```sql
alter table app.service_orders enable row level security;

create policy "tenant members select service orders"
on app.service_orders
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert service orders"
on app.service_orders
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members update service orders"
on app.service_orders
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));
```

### Criterio de aceptación

Crear orden desde Postman contra .NET:

```http
POST /api/service-orders
Authorization: Bearer <supabase_user_token>
```

Payload sin `tenant_id`:

```json
{
  "customerId": "uuid",
  "vehicleId": "uuid",
  "title": "Paint Correction + Ceramic Coating",
  "packageName": "Signature Coating",
  "estimatedPrice": 1800
}
```

Respuesta esperada:

```json
{
  "id": "...",
  "status": "draft",
  "tenantId": "resuelto por backend"
}
```

---

## 0.7. Ficha clínica visual y micras

```sql
create table app.visual_inspections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  service_order_id uuid not null references app.service_orders(id) on delete cascade,
  vehicle_id uuid not null references app.vehicles(id),
  schema_version int not null default 1,
  svg_template_key text not null default 'sedan-v1',
  visual_state jsonb not null default '{}',
  micron_summary jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.micron_readings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  visual_inspection_id uuid not null references app.visual_inspections(id) on delete cascade,
  panel_code text not null,
  reading_microns numeric(8,2) not null,
  risk_level text not null check (risk_level in ('normal', 'thin', 'repainted', 'unknown')),
  notes text,
  created_at timestamptz not null default now()
);

create index ix_visual_inspections_order
on app.visual_inspections(service_order_id);

create index ix_micron_readings_inspection
on app.micron_readings(visual_inspection_id);
```

Ejemplo de `visual_state`:

```json
{
  "panels": {
    "hood": {
      "damage": [
        {
          "id": "mark_001",
          "type": "scratch",
          "severity": "medium",
          "x": 41.2,
          "y": 18.8,
          "note": "Rayón visible bajo luz LED"
        }
      ],
      "condition": "yellow"
    },
    "front_bumper": {
      "damage": [],
      "condition": "green"
    }
  },
  "cameraViews": ["front", "left", "right", "rear", "top"]
}
```

Ejemplo de `micron_summary`:

```json
{
  "hood": {
    "min": 82,
    "max": 140,
    "avg": 110,
    "risk": "thin"
  },
  "left_door": {
    "min": 160,
    "max": 260,
    "avg": 212,
    "risk": "repainted"
  }
}
```

### RLS

```sql
alter table app.visual_inspections enable row level security;
alter table app.micron_readings enable row level security;

create policy "tenant members select visual inspections"
on app.visual_inspections
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert visual inspections"
on app.visual_inspections
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members update visual inspections"
on app.visual_inspections
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

create policy "tenant members select micron readings"
on app.micron_readings
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert micron readings"
on app.micron_readings
for insert
with check (app.is_tenant_member(tenant_id));
```

### Criterio de aceptación

Insertar una inspección como usuario de tenant A.

Luego intentar:

```sql
select * from app.visual_inspections;
```

Como usuario de tenant B.

Resultado esperado:

```txt
0 rows
```

---

## 0.8. Fotos, reportes y assets

```sql
create table app.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  service_order_id uuid not null references app.service_orders(id) on delete cascade,
  visual_inspection_id uuid references app.visual_inspections(id) on delete set null,
  stage app.photo_stage not null,
  storage_path text not null,
  thumbnail_path text,
  panel_code text,
  caption text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table app.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  service_order_id uuid not null references app.service_orders(id) on delete cascade,
  status app.report_status not null default 'draft',
  public_slug text not null,
  public_token_hash text not null,
  expires_at timestamptz,
  title text not null,
  summary text,
  theme jsonb not null default '{}',
  published_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(public_slug),
  unique(public_token_hash)
);

create table app.report_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  report_id uuid not null references app.reports(id) on delete cascade,
  asset_type text not null check (asset_type in ('before', 'after', 'watermarked', 'composite', 'hero')),
  storage_path text not null,
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

### RLS

```sql
alter table app.inspection_photos enable row level security;
alter table app.reports enable row level security;
alter table app.report_assets enable row level security;

create policy "tenant members select photos"
on app.inspection_photos
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert photos"
on app.inspection_photos
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members select reports"
on app.reports
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert reports"
on app.reports
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members update reports"
on app.reports
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

create policy "tenant members select report assets"
on app.report_assets
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members insert report assets"
on app.report_assets
for insert
with check (app.is_tenant_member(tenant_id));
```

### Nota de seguridad

Los reportes públicos **no deben leer directamente por RLS desde el navegador**. El acceso público debe ser:

```txt
/r/[token] en Next.js
→ llama a .NET /public/reports/{token}
→ .NET valida hash del token
→ devuelve DTO público sanitizado
```

### Criterio de aceptación

Un reporte publicado debe tener:

```txt
public_slug no predecible
public_token_hash
status = published
```

El token plano nunca debe guardarse en base de datos.

---

## 0.9. Garantías, semáforo y alertas

```sql
create table app.warranty_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  duration_days int not null,
  yellow_before_days int not null default 30,
  red_before_days int not null default 7,
  created_at timestamptz not null default now()
);

create table app.warranties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  service_order_id uuid not null references app.service_orders(id),
  vehicle_id uuid not null references app.vehicles(id),
  customer_id uuid not null references app.customers(id),
  policy_id uuid references app.warranty_policies(id),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status app.warranty_status not null default 'green',
  last_alert_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table app.warranty_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  warranty_id uuid not null references app.warranties(id) on delete cascade,
  alert_level text not null check (alert_level in ('yellow', 'red', 'expired')),
  due_at timestamptz not null,
  status internal.outbox_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  unique(warranty_id, alert_level)
);
```

### Criterio de aceptación

Crear garantía de 90 días.

Simular fecha actual cerca al vencimiento.

Esperado:

```txt
status = yellow si faltan <= yellow_before_days
status = red si faltan <= red_before_days
status = expired si now() > ends_at
```

---

## 0.10. Bahías/cajones y tablero realtime

```sql
create table app.bays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  status app.bay_status not null default 'available',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(tenant_id, name)
);

create table app.work_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  bay_id uuid references app.bays(id) on delete set null,
  service_order_id uuid not null references app.service_orders(id) on delete cascade,
  title text not null,
  status text not null default 'waiting',
  position numeric(12,4) not null default 1000,
  assigned_to uuid references auth.users(id),
  checklist jsonb not null default '[]',
  version int not null default 1,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index ix_work_items_tenant_bay_position
on app.work_items(tenant_id, bay_id, position);
```

### Realtime

```sql
alter publication supabase_realtime add table app.bays;
alter publication supabase_realtime add table app.work_items;
alter publication supabase_realtime add table app.service_orders;
```

### RLS

```sql
alter table app.bays enable row level security;
alter table app.work_items enable row level security;

create policy "tenant members select bays"
on app.bays
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members manage bays"
on app.bays
for all
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

create policy "tenant members select work items"
on app.work_items
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members manage work items"
on app.work_items
for all
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));
```

### Criterio de aceptación

Abrir dos navegadores con el mismo tenant.

Actualizar un `work_item` desde SQL:

```sql
update app.work_items
set position = position + 100
where id = '<id>';
```

El segundo navegador debe recibir el cambio vía Supabase Realtime.

---

## 0.11. Outbox interno para WhatsApp

```sql
create table internal.message_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  channel text not null check (channel in ('whatsapp')),
  recipient_phone_e164 text not null,
  template_key text not null,
  payload jsonb not null default '{}',
  status internal.outbox_status not null default 'pending',
  attempts int not null default 0,
  max_attempts int not null default 3,
  scheduled_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  idempotency_key text not null,
  last_error text,
  created_at timestamptz not null default now(),
  unique(tenant_id, idempotency_key)
);

create index ix_outbox_pending
on internal.message_outbox(status, scheduled_at)
where status = 'pending';
```

### Criterio de aceptación

Intentar insertar dos mensajes con mismo:

```txt
tenant_id + idempotency_key
```

Resultado esperado:

```txt
Segundo insert falla por unique constraint.
```

---

# Fase 1 — Núcleo de automatización aislado: microservicio WhatsApp Node.js

## 1.1. Crear microservicio Node.js Express

### Objetivo técnico

Construir un servicio independiente, reemplazable y aislado para manejar sesiones QR por taller.

### Archivos

```txt
apps/whatsapp-service/
  src/
    server.ts
    app.ts
    config/env.ts
    routes/health.routes.ts
    routes/session.routes.ts
    routes/message.routes.ts
    middleware/internal-auth.middleware.ts
    providers/
      WhatsAppProvider.ts
      WWebJsProvider.ts
      EvolutionProvider.ts
    sessions/
      SessionRegistry.ts
      SessionStore.ts
    webhooks/
      DotnetWebhookClient.ts
    utils/
      hmac.ts
      logger.ts
  package.json
  tsconfig.json
  Dockerfile
  .env.example
```

### Dependencias

```bash
pnpm add express cors helmet zod pino pino-pretty axios qrcode
pnpm add whatsapp-web.js
pnpm add -D typescript tsx @types/express @types/node vitest supertest
```

### Variables

```env
PORT=4001
NODE_ENV=development

INTERNAL_HMAC_SECRET=dev_secret_change_me
DOTNET_API_BASE_URL=http://localhost:5000
DOTNET_WEBHOOK_SECRET=dev_webhook_secret

WHATSAPP_PROVIDER=wwebjs
WWEBJS_SESSION_DIR=.sessions
```

### Criterio de aceptación

Ejecutar:

```bash
pnpm dev
```

Probar:

```http
GET http://localhost:4001/health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "whatsapp-service"
}
```

---

## 1.2. Middleware de autenticación interna HMAC

### Objetivo técnico

Evitar que cualquiera pueda llamar al microservicio para enviar mensajes.

### Contrato

Headers obligatorios:

```txt
X-Internal-Timestamp: 2026-06-17T20:00:00.000Z
X-Internal-Signature: sha256=<hash>
Idempotency-Key: <key>
```

Firma:

```txt
HMAC_SHA256(secret, timestamp + "." + rawBody)
```

### Archivo

```txt
src/middleware/internal-auth.middleware.ts
```

### Criterio de aceptación

Request sin firma:

```http
POST /internal/messages/send
```

Debe responder:

```json
{
  "error": "INVALID_INTERNAL_SIGNATURE"
}
```

Código:

```txt
401
```

Request con firma válida:

```txt
Pasa al controller
```

---

## 1.3. SessionRegistry multi-tenant

### Objetivo técnico

Mantener una sesión WhatsApp aislada por `tenantId`.

### Interfaz

Archivo:

```txt
src/providers/WhatsAppProvider.ts
```

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

export interface WhatsAppProvider {
  startSession(tenantId: string): Promise<StartSessionResult>;
  getQr(tenantId: string): Promise<string | null>;
  getStatus(tenantId: string): Promise<SessionStatus>;
  sendMessage(input: SendMessageInput): Promise<{ providerMessageId: string }>;
  logout(tenantId: string): Promise<void>;
}
```

### Implementación inicial

Archivo:

```txt
src/providers/WWebJsProvider.ts
```

Regla:

```txt
clientId = tenantId
session path = .sessions/<tenantId>
```

### Criterio de aceptación

Llamar:

```http
POST /internal/sessions/{tenantId}/start
```

Debe devolver:

```json
{
  "tenantId": "...",
  "status": "qr_pending",
  "qr": "data:image/png;base64,..."
}
```

Y en logs:

```txt
[whatsapp] session starting tenant=<uuid>
[whatsapp] qr generated tenant=<uuid>
```

---

## 1.4. API interna de sesiones

### Endpoints

```http
POST /internal/sessions/:tenantId/start
GET  /internal/sessions/:tenantId/qr
GET  /internal/sessions/:tenantId/status
POST /internal/sessions/:tenantId/logout
```

### Archivos

```txt
src/routes/session.routes.ts
src/controllers/session.controller.ts
```

### Criterios de aceptación

#### Start session

```http
POST /internal/sessions/<tenant-id>/start
```

Respuesta:

```json
{
  "tenantId": "<tenant-id>",
  "status": "qr_pending",
  "qr": "data:image/png;base64,..."
}
```

#### Status

```http
GET /internal/sessions/<tenant-id>/status
```

Respuesta antes de escanear:

```json
{
  "tenantId": "<tenant-id>",
  "status": "qr_pending"
}
```

Respuesta después de escanear:

```json
{
  "tenantId": "<tenant-id>",
  "status": "ready"
}
```

---

## 1.5. API interna de despacho

### Objetivo técnico

Exponer un endpoint idempotente para que .NET envíe mensajes.

### Endpoint

```http
POST /internal/messages/send
```

Payload:

```json
{
  "tenantId": "uuid",
  "to": "+51999999999",
  "body": "Hola Kevin, tu reporte está listo: https://app.com/r/abc123",
  "mediaUrl": null
}
```

Respuesta:

```json
{
  "status": "sent",
  "providerMessageId": "..."
}
```

### Validaciones

```txt
tenantId requerido
to requerido en formato E.164
body requerido
sesión del tenant debe estar ready
Idempotency-Key requerido
```

### Criterio de aceptación

Si la sesión no está conectada:

```json
{
  "error": "WHATSAPP_SESSION_NOT_READY"
}
```

Código:

```txt
409
```

---

## 1.6. Webhooks hacia .NET

### Objetivo técnico

Notificar cambios de sesión y estado de mensajes al backend principal.

### Endpoints llamados en .NET

```http
POST /api/webhooks/whatsapp/session-status
POST /api/webhooks/whatsapp/message-status
```

Payload sesión:

```json
{
  "tenantId": "uuid",
  "status": "ready",
  "phone": "+51999999999",
  "timestamp": "2026-06-17T20:00:00Z"
}
```

Payload mensaje:

```json
{
  "tenantId": "uuid",
  "providerMessageId": "...",
  "status": "sent",
  "timestamp": "2026-06-17T20:00:00Z"
}
```

### Criterio de aceptación

Al escanear QR:

```txt
Node log:
[webhook] sent session-status tenant=<uuid> status=ready

.NET log:
WhatsApp session ready for tenant <uuid>
```

---

## 1.7. Adapter Evolution API

### Objetivo técnico

Permitir cambiar de `whatsapp-web.js` a Evolution API sin romper .NET.

Evolution API se puede considerar para producción si se desea una API REST más completa; su repositorio oficial indica soporte de WhatsApp Web API basada en Baileys y también WhatsApp Cloud API. ([GitHub][2])

### Archivo

```txt
src/providers/EvolutionProvider.ts
```

Debe implementar la misma interfaz:

```ts
WhatsAppProvider
```

### Criterio de aceptación

Cambiar:

```env
WHATSAPP_PROVIDER=evolution
```

Y que los endpoints internos sigan respondiendo igual.

---

# Fase 2 — Infraestructura y endpoints base del backend .NET

## 2.1. Crear solución Clean Architecture

### Objetivo técnico

Separar dominio, aplicación, infraestructura y WebAPI.

### Comandos

```bash
dotnet new sln -n Carwash

dotnet new classlib -n Carwash.Domain -o apps/api/src/Carwash.Domain
dotnet new classlib -n Carwash.Application -o apps/api/src/Carwash.Application
dotnet new classlib -n Carwash.Infrastructure -o apps/api/src/Carwash.Infrastructure
dotnet new webapi -n Carwash.WebApi -o apps/api/src/Carwash.WebApi

dotnet sln add apps/api/src/*/*.csproj
```

### Referencias

```bash
dotnet add apps/api/src/Carwash.Application reference apps/api/src/Carwash.Domain

dotnet add apps/api/src/Carwash.Infrastructure reference apps/api/src/Carwash.Application

dotnet add apps/api/src/Carwash.WebApi reference apps/api/src/Carwash.Application
dotnet add apps/api/src/Carwash.WebApi reference apps/api/src/Carwash.Infrastructure
```

### Estructura

```txt
apps/api/src/
  Carwash.Domain/
    Tenants/
    Customers/
    Vehicles/
    ServiceOrders/
    Inspections/
    Reports/
    Warranties/
    Bays/
    Common/

  Carwash.Application/
    Abstractions/
    Common/
    Features/
      Tenants/
      Customers/
      Vehicles/
      ServiceOrders/
      Inspections/
      Reports/
      Warranties/
      Bays/
      WhatsApp/

  Carwash.Infrastructure/
    Persistence/
    Supabase/
    Storage/
    WhatsApp/
    BackgroundJobs/
    ImageProcessing/
    Security/

  Carwash.WebApi/
    Controllers/
    Middleware/
    Filters/
    Program.cs
    appsettings.json
```

### Criterio de aceptación

```bash
dotnet build
```

Resultado:

```txt
Build succeeded.
```

---

## 2.2. Paquetes backend

### Objetivo técnico

Instalar paquetes para CQRS, validación, acceso PostgreSQL/Supabase, jobs, HTTP y testing.

MediatR soporta requests/responses, commands, queries, notifications y events en .NET. ([GitHub][3])

### Paquetes sugeridos

```bash
dotnet add apps/api/src/Carwash.Application package MediatR
dotnet add apps/api/src/Carwash.Application package FluentValidation

dotnet add apps/api/src/Carwash.Infrastructure package Supabase
dotnet add apps/api/src/Carwash.Infrastructure package Npgsql
dotnet add apps/api/src/Carwash.Infrastructure package Dapper
dotnet add apps/api/src/Carwash.Infrastructure package Coravel
dotnet add apps/api/src/Carwash.Infrastructure package SkiaSharp

dotnet add apps/api/src/Carwash.WebApi package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add apps/api/src/Carwash.WebApi package Serilog.AspNetCore
dotnet add apps/api/src/Carwash.WebApi package Swashbuckle.AspNetCore
```

Para jobs persistentes con dashboard, Hangfire es alternativa; su documentación lo presenta como procesamiento background con almacenamiento persistente. Para MVP simple, Coravel es suficiente porque permite programar tareas recurrentes en código con sintaxis fluida. ([docs.hangfire.io][4])

### Criterio de aceptación

```bash
dotnet restore
dotnet build
```

---

## 2.3. Configuración de Supabase en .NET

### Objetivo técnico

Centralizar URL, anon key, service role key, JWT secret y conexión PostgreSQL.

### Archivo

```txt
apps/api/src/Carwash.WebApi/appsettings.json
```

```json
{
  "Supabase": {
    "Url": "",
    "AnonKey": "",
    "ServiceRoleKey": "",
    "JwtIssuer": "",
    "JwtAudience": "authenticated"
  },
  "Database": {
    "ConnectionString": ""
  },
  "WhatsApp": {
    "BaseUrl": "",
    "InternalHmacSecret": ""
  },
  "Frontend": {
    "PublicBaseUrl": ""
  }
}
```

### Archivo

```txt
apps/api/src/Carwash.Infrastructure/Supabase/SupabaseOptions.cs
```

```csharp
public sealed class SupabaseOptions
{
    public string Url { get; init; } = default!;
    public string AnonKey { get; init; } = default!;
    public string ServiceRoleKey { get; init; } = default!;
    public string JwtIssuer { get; init; } = default!;
    public string JwtAudience { get; init; } = "authenticated";
}
```

### Factory

```txt
Carwash.Infrastructure/Supabase/SupabaseClientFactory.cs
```

Debe crear:

```txt
ServiceRoleClient → solo para operaciones internas confiables.
UserScopedClient → si se pasa access_token del usuario.
```

### Nota importante

El SDK C# de Supabase usa la Data API para consultar/mutar tablas, y las tablas/funciones deben exponerse en la sección Data API del Dashboard o mediante permisos SQL. ([Supabase][5])

### Criterio de aceptación

Endpoint temporal:

```http
GET /api/system/supabase-ping
```

Debe devolver:

```json
{
  "supabase": "ok"
}
```

---

## 2.4. Autenticación JWT Supabase en .NET

### Objetivo técnico

Validar que toda llamada autenticada venga con un JWT emitido por Supabase.

### Archivos

```txt
WebApi/Program.cs
Infrastructure/Security/SupabaseJwtOptions.cs
Application/Abstractions/IUserContext.cs
Infrastructure/Security/HttpUserContext.cs
```

### `IUserContext`

```csharp
public interface IUserContext
{
    Guid UserId { get; }
    string Email { get; }
    bool IsAuthenticated { get; }
}
```

### Criterio de aceptación

Llamar sin token:

```http
GET /api/me
```

Respuesta:

```txt
401 Unauthorized
```

Llamar con token válido:

```json
{
  "userId": "...",
  "email": "..."
}
```

---

## 2.5. TenantContext

### Objetivo técnico

Resolver el tenant activo de forma segura.

### Estrategia

El frontend puede enviar:

```http
X-Tenant-Id: <uuid>
```

Pero .NET debe verificar:

```sql
select role
from app.tenant_memberships
where tenant_id = @TenantId
  and user_id = @UserId
  and status = 'active';
```

Si no existe:

```txt
403 Forbidden
```

### Archivos

```txt
Application/Abstractions/ITenantContext.cs
Infrastructure/Security/TenantContext.cs
WebApi/Middleware/TenantResolutionMiddleware.cs
```

### Interfaz

```csharp
public interface ITenantContext
{
    Guid TenantId { get; }
    string Role { get; }
}
```

### Criterio de aceptación

Token válido, pero `X-Tenant-Id` de otro taller:

```txt
403 Forbidden
```

Token válido y membresía activa:

```txt
200 OK
```

---

## 2.6. Convenciones CQRS

### Objetivo técnico

Cada feature debe implementarse como caso de uso aislado.

### Patrón de carpetas

```txt
Application/Features/Customers/
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

### Regla

```txt
Controller no contiene lógica de negocio.
Controller solo:
- recibe request
- llama MediatR
- devuelve response
```

### Criterio de aceptación

En PR review:

```txt
Controllers con más de 30-40 líneas deben rechazarse.
Handlers contienen caso de uso.
Repositorios encapsulan SQL.
```

---

## 2.7. Health checks

### Objetivo técnico

Validar estado de API, DB y WhatsApp service.

### Endpoints

```http
GET /health
GET /health/db
GET /health/whatsapp
```

### Criterio de aceptación

```http
GET /health
```

Respuesta:

```json
{
  "api": "ok",
  "version": "0.1.0"
}
```

```http
GET /health/db
```

Debe ejecutar:

```sql
select 1;
```

```http
GET /health/whatsapp
```

Debe llamar:

```http
GET {WhatsApp.BaseUrl}/health
```

---

# Fase 3 — Implementación incremental por feature

La regla será:

```txt
Una feature completa de extremo a extremo antes de pasar a la siguiente.
```

Orden recomendado:

```txt
3.1 Tenants/Auth base
3.2 Clientes + Vehículos
3.3 Órdenes de servicio
3.4 Pilar 4 Bahías realtime
3.5 Pilar 1 Ficha visual + micras
3.6 Pilar 2 Reporte viral WhatsApp
3.7 Pilar 3 Semáforo garantía
```

Aunque el usuario listó los pilares en otro orden, conviene implementar antes bahías porque da valor operativo temprano y valida Realtime.

---

# 3.1 Feature base: Tenants y selección de taller

## BD

Ya existe:

```txt
app.tenants
app.tenant_memberships
```

## .NET

### Archivos

```txt
Application/Features/Tenants/GetMyTenants/
Application/Features/Tenants/GetCurrentTenant/
WebApi/Controllers/TenantsController.cs
```

### Endpoints

```http
GET /api/tenants/my
GET /api/tenants/current
```

### Respuesta

```json
[
  {
    "id": "uuid",
    "name": "Elite Auto Spa",
    "slug": "elite-auto-spa",
    "role": "owner",
    "planCode": "starter"
  }
]
```

## Frontend

```txt
app/(dashboard)/select-tenant/page.tsx
components/tenant-switcher.tsx
lib/tenant-store.ts
```

## Criterio de aceptación

Usuario con dos talleres ve ambos.

Al seleccionar uno:

```txt
X-Tenant-Id se envía en requests posteriores.
```

---

# 3.2 Feature: Clientes y vehículos

## Objetivo técnico

Registrar clientes y sus vehículos como base operativa del CRM.

## BD

Tablas:

```txt
app.customers
app.vehicles
```

## .NET

### Commands

```txt
CreateCustomerCommand
UpdateCustomerCommand
CreateVehicleCommand
UpdateVehicleCommand
```

### Queries

```txt
SearchCustomersQuery
GetCustomerDetailQuery
GetVehicleDetailQuery
GetVehicleHistoryQuery
```

### Endpoints

```http
POST /api/customers
GET  /api/customers?search=
GET  /api/customers/{id}
PATCH /api/customers/{id}

POST /api/customers/{customerId}/vehicles
GET  /api/vehicles/{id}
PATCH /api/vehicles/{id}
GET  /api/vehicles/{id}/history
```

### Validaciones

```txt
fullName requerido
phone_e164 opcional pero si existe debe ser E.164
vehicle make requerido
vehicle model requerido
plate única por tenant si existe
```

## Frontend

```txt
app/(dashboard)/customers/page.tsx
app/(dashboard)/customers/new/page.tsx
app/(dashboard)/customers/[id]/page.tsx
app/(dashboard)/vehicles/[id]/page.tsx

features/customers/customer-form.tsx
features/customers/customer-table.tsx
features/vehicles/vehicle-form.tsx
```

## Criterio de aceptación

Prueba Postman:

```http
POST /api/customers
```

Payload:

```json
{
  "fullName": "Carlos Mendoza",
  "phoneE164": "+51999999999",
  "whatsappConsent": true
}
```

Respuesta:

```txt
201 Created
```

Luego:

```http
POST /api/customers/{id}/vehicles
```

Payload:

```json
{
  "make": "Porsche",
  "model": "911 Carrera",
  "year": 2023,
  "color": "Black",
  "plate": "ABC-123"
}
```

Debe crear vehículo asociado.

---

# 3.3 Feature: Órdenes de servicio

## Objetivo técnico

Crear la entidad central que conecta cliente, vehículo, inspección, fotos, bahía, reporte y garantía.

## BD

Tabla:

```txt
app.service_orders
```

## .NET

### Commands

```txt
CreateServiceOrderCommand
ScheduleServiceOrderCommand
CheckInServiceOrderCommand
ChangeServiceOrderStatusCommand
CancelServiceOrderCommand
DeliverServiceOrderCommand
```

### Queries

```txt
GetServiceOrderDetailQuery
ListServiceOrdersQuery
GetActiveServiceOrdersQuery
```

### Endpoints

```http
POST /api/service-orders
GET  /api/service-orders?status=&from=&to=
GET  /api/service-orders/{id}
PATCH /api/service-orders/{id}/schedule
PATCH /api/service-orders/{id}/check-in
PATCH /api/service-orders/{id}/status
PATCH /api/service-orders/{id}/deliver
```

## Reglas de dominio

```txt
draft → quoted
quoted → scheduled
scheduled → checked_in
checked_in → in_progress
in_progress → quality_check
quality_check → ready_for_delivery
ready_for_delivery → delivered
```

No permitir:

```txt
delivered → in_progress
cancelled → cualquier otro estado
```

## Criterio de aceptación

Intentar mover una orden de:

```txt
delivered → in_progress
```

Debe responder:

```json
{
  "error": "INVALID_SERVICE_ORDER_TRANSITION"
}
```

---

# 3.4 Pilar 4 — Gestión de cajones/bahías en tiempo real

## 3.4.1. BD para bahías y work items

Ya existe:

```txt
app.bays
app.work_items
```

### Agregar función transaccional para mover cards

Archivo:

```txt
infra/supabase/migrations/0008_move_work_item.sql
```

```sql
create or replace function app.move_work_item(
  p_tenant_id uuid,
  p_work_item_id uuid,
  p_target_bay_id uuid,
  p_new_position numeric,
  p_expected_version int
)
returns app.work_items
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_item app.work_items;
begin
  select *
  into v_item
  from app.work_items
  where id = p_work_item_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'WORK_ITEM_NOT_FOUND';
  end if;

  if v_item.version <> p_expected_version then
    raise exception 'WORK_ITEM_VERSION_CONFLICT';
  end if;

  update app.work_items
  set bay_id = p_target_bay_id,
      position = p_new_position,
      version = version + 1
  where id = p_work_item_id
  returning * into v_item;

  return v_item;
end;
$$;
```

## 3.4.2. .NET

### Commands

```txt
CreateBayCommand
UpdateBayCommand
CreateWorkItemCommand
MoveWorkItemCommand
AssignWorkItemCommand
UpdateWorkItemChecklistCommand
```

### Queries

```txt
GetBayBoardQuery
```

### Endpoints

```http
GET  /api/bays/board
POST /api/bays
PATCH /api/bays/{id}

POST /api/work-items
PATCH /api/work-items/{id}/move
PATCH /api/work-items/{id}/assign
PATCH /api/work-items/{id}/checklist
```

### Payload move

```json
{
  "targetBayId": "uuid",
  "newPosition": 2000,
  "expectedVersion": 3
}
```

### Respuesta conflicto

```json
{
  "error": "WORK_ITEM_VERSION_CONFLICT",
  "message": "El tablero cambió. Refresca la posición antes de mover."
}
```

## 3.4.3. Frontend

### Rutas

```txt
app/(dashboard)/bays/page.tsx
```

### Componentes

```txt
features/bays/bay-board.tsx
features/bays/bay-column.tsx
features/bays/work-item-card.tsx
features/bays/use-bay-realtime.ts
features/bays/use-drag-move.ts
```

### Realtime

Usar Supabase client browser para suscribirse a:

```txt
app.work_items
app.bays
```

Supabase Realtime permite escuchar cambios de Postgres desde el cliente, y para un MVP de Kanban esta opción es suficiente. Cuando haya mucha concurrencia, conviene migrar eventos efímeros a Broadcast por escalabilidad. ([Supabase][6])

## Criterio de aceptación E2E

1. Abrir `/bays` en navegador A.
2. Abrir `/bays` en navegador B.
3. Mover un vehículo de Bahía 1 a Bahía 2 en A.
4. B debe actualizarse sin refresh.
5. Si A y B mueven la misma card simultáneamente, uno debe recibir conflicto de versión.

---

# 3.5 Pilar 1 — Historial clínico visual y medición de micras

## 3.5.1. BD

Tablas:

```txt
app.visual_inspections
app.micron_readings
app.inspection_photos
```

## 3.5.2. Contrato JSONB de ficha SVG

### `visual_state`

```json
{
  "schemaVersion": 1,
  "template": "sedan-v1",
  "panels": {
    "hood": {
      "label": "Capó",
      "condition": "yellow",
      "damage": [
        {
          "id": "dmg_001",
          "type": "scratch",
          "severity": "medium",
          "x": 42.5,
          "y": 18.4,
          "note": "Micro rayón visible"
        }
      ]
    }
  }
}
```

### Tipos de daño

```txt
scratch
swirl
dent
chip
oxidation
stain
burn
repaint
clearcoat_failure
```

### Severidad

```txt
low
medium
high
critical
```

## 3.5.3. .NET

### Commands

```txt
CreateVisualInspectionCommand
UpdateVisualStateCommand
AddDamageMarkCommand
RemoveDamageMarkCommand
AddMicronReadingCommand
RecalculateMicronSummaryCommand
AttachInspectionPhotoCommand
```

### Queries

```txt
GetVisualInspectionQuery
GetVehicleAestheticHistoryQuery
GetServiceOrderInspectionQuery
```

### Endpoints

```http
POST /api/service-orders/{serviceOrderId}/inspections
GET  /api/inspections/{id}
PATCH /api/inspections/{id}/visual-state
POST /api/inspections/{id}/damage-marks
DELETE /api/inspections/{id}/damage-marks/{markId}
POST /api/inspections/{id}/micron-readings
GET  /api/vehicles/{vehicleId}/aesthetic-history
```

### Regla de micras

Ejemplo de clasificación inicial configurable:

```txt
< 80 µm      → thin
80-180 µm    → normal
> 180 µm     → repainted
sin dato     → unknown
```

No lo hardcodees para siempre. Debe estar en:

```txt
Application/Common/MicronRiskRules.cs
```

Luego puede moverse a tabla por tenant.

## 3.5.4. Frontend

### Ruta

```txt
app/(dashboard)/service-orders/[id]/inspection/page.tsx
```

### Componentes

```txt
features/inspections/vehicle-svg-editor.tsx
features/inspections/panel-popover.tsx
features/inspections/damage-mark-toolbar.tsx
features/inspections/micron-reading-table.tsx
features/inspections/inspection-photo-uploader.tsx
features/inspections/aesthetic-history-timeline.tsx
```

### Comportamiento

```txt
Click en panel SVG → abre popover
Seleccionar tipo de daño → click en coordenada → agrega mark
Guardar → PATCH visual_state completo o diff
Agregar lectura de micras → recalcula resumen
```

## Criterio de aceptación

Prueba manual:

1. Crear orden de servicio.
2. Crear inspección.
3. Marcar rayón en capó.
4. Agregar lectura de 72 µm en capó.
5. Guardar.
6. Refrescar página.
7. El SVG debe reconstruirse idéntico desde JSONB.
8. El capó debe aparecer con riesgo `thin`.

---

# 3.6 Pilar 2 — Reporte automatizado antes/después viral por WhatsApp

## 3.6.1. BD

Tablas:

```txt
app.reports
app.report_assets
internal.message_outbox
```

Storage bucket:

```txt
tenant-assets
```

Estructura recomendada:

```txt
tenant-assets/
  tenants/{tenantId}/orders/{serviceOrderId}/before/
  tenants/{tenantId}/orders/{serviceOrderId}/after/
  tenants/{tenantId}/reports/{reportId}/watermarked/
```

## 3.6.2. .NET image processing

### Objetivo técnico

Procesar fotos, generar marca de agua y preparar assets para landing pública.

### Archivos

```txt
Infrastructure/ImageProcessing/IImageWatermarkService.cs
Infrastructure/ImageProcessing/SkiaImageWatermarkService.cs
Application/Features/Reports/PublishReport/
Application/Features/Reports/GenerateReportAssets/
```

### Flujo

```txt
PublishReportCommand
  → validar service_order pertenece al tenant
  → obtener fotos before/after
  → crear report status=processing
  → generar token público
  → guardar hash del token
  → generar imágenes watermarked
  → subir a Supabase Storage
  → crear report_assets
  → status=published
  → crear message_outbox
```

### Token seguro

```txt
plain token = random 32 bytes base64url
hash = SHA256(token + REPORT_TOKEN_PEPPER)
DB guarda hash
Frontend recibe token plano solo en URL
```

### Endpoint público

```http
GET /public/reports/{token}
```

No requiere auth.

Debe devolver DTO sanitizado:

```json
{
  "title": "Transformación Porsche 911",
  "summary": "Corrección de pintura y coating cerámico premium.",
  "vehicle": {
    "make": "Porsche",
    "model": "911 Carrera",
    "year": 2023,
    "color": "Black"
  },
  "assets": [
    {
      "type": "before",
      "url": "signed-or-public-url",
      "sortOrder": 1
    },
    {
      "type": "after",
      "url": "signed-or-public-url",
      "sortOrder": 1
    }
  ],
  "workshop": {
    "name": "Elite Auto Spa"
  }
}
```

No devolver:

```txt
customer phone
customer email
internal notes
tenant_id
service_order internal data
```

## 3.6.3. WhatsApp outbox

### Mensaje

Template key:

```txt
report_published
```

Payload:

```json
{
  "customerName": "Carlos",
  "vehicleName": "Porsche 911",
  "reportUrl": "https://app.com/r/abc123",
  "workshopName": "Elite Auto Spa"
}
```

Body renderizado:

```txt
Hola Carlos 👋
Tu Porsche 911 ya tiene su reporte visual de antes y después.

Míralo aquí:
https://app.com/r/abc123

Gracias por confiar en Elite Auto Spa.
```

## 3.6.4. Node

Node no genera reportes. Solo envía.

Endpoint usado por .NET:

```http
POST /internal/messages/send
```

Payload:

```json
{
  "tenantId": "uuid",
  "to": "+51999999999",
  "body": "Hola Carlos...",
  "mediaUrl": null
}
```

## 3.6.5. Frontend público

### Ruta

```txt
app/(public)/r/[token]/page.tsx
```

### Componentes

```txt
features/public-report/report-hero.tsx
features/public-report/before-after-slider.tsx
features/public-report/process-timeline.tsx
features/public-report/gallery-grid.tsx
features/public-report/share-button.tsx
features/public-report/gsap-report-animations.tsx
```

### UI

```txt
Fondo oscuro premium
Textura sutil tipo fibra/carbono
Hero con vehículo
Slider before/after
Timeline del proceso
Galería final
CTA compartir WhatsApp
```

GSAP ScrollTrigger permite animaciones basadas en scroll con disparadores, pinning y scrub; úsalo solo en Client Components para evitar errores SSR. ([GSAP][7])

## Criterio de aceptación E2E

1. Orden tiene fotos before y after.
2. Ejecutar:

```http
POST /api/service-orders/{id}/reports/publish
```

3. .NET genera reporte.
4. DB:

```txt
app.reports.status = published
app.report_assets contiene watermarked assets
internal.message_outbox contiene mensaje pending
```

5. Worker .NET envía a Node.
6. Node log:

```txt
[whatsapp] message sent tenant=<uuid>
```

7. Abrir:

```txt
https://frontend.com/r/<token>
```

8. Landing carga sin login.

---

# 3.7 Pilar 3 — Semáforo de desgaste y alertas de garantía

## 3.7.1. BD

Tablas:

```txt
app.warranty_policies
app.warranties
app.warranty_alerts
internal.message_outbox
```

## 3.7.2. .NET dominio

### Entidad

```txt
Domain/Warranties/Warranty.cs
```

### Método de dominio

```csharp
public WarrantyStatus CalculateStatus(DateTimeOffset now)
{
    if (now > EndsAt) return WarrantyStatus.Expired;

    var daysLeft = (EndsAt - now).TotalDays;

    if (daysLeft <= RedBeforeDays) return WarrantyStatus.Red;
    if (daysLeft <= YellowBeforeDays) return WarrantyStatus.Yellow;

    return WarrantyStatus.Green;
}
```

## 3.7.3. Commands

```txt
CreateWarrantyPolicyCommand
CreateWarrantyFromDeliveredOrderCommand
RecalculateWarrantyStatusesCommand
CreateWarrantyAlertsCommand
```

## 3.7.4. Queries

```txt
ListWarrantiesQuery
GetWarrantyDetailQuery
GetWarrantyDashboardQuery
```

## 3.7.5. Endpoints

```http
POST /api/warranty-policies
GET  /api/warranty-policies

POST /api/service-orders/{id}/warranty
GET  /api/warranties?status=
GET  /api/warranties/dashboard
POST /api/warranties/recalculate
```

## 3.7.6. Background job

### Opción MVP: Coravel

Archivo:

```txt
Infrastructure/BackgroundJobs/WarrantyStatusJob.cs
```

Programación:

```csharp
scheduler
    .Schedule<WarrantyStatusJob>()
    .DailyAtHour(8)
    .Zoned(TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time"));
```

### Opción producción: Hangfire

Usar si necesitas:

```txt
Dashboard de jobs
Retries persistentes
Observabilidad más cómoda
```

## 3.7.7. Lógica del job

```txt
1. Obtener tenants activos.
2. Por cada tenant:
   2.1 Buscar warranties no expired/claimed/void.
   2.2 Recalcular status.
   2.3 Si cambia green→yellow, crear warranty_alert yellow.
   2.4 Si cambia yellow→red, crear warranty_alert red.
   2.5 Si expira, crear warranty_alert expired.
   2.6 Insertar message_outbox idempotente.
```

### Idempotency key

```txt
warranty:{warrantyId}:{alertLevel}:{yyyyMMdd}
```

## 3.7.8. Mensajes WhatsApp

### Yellow

```txt
Hola Carlos 👋
Tu protección cerámica está próxima a revisión.

Vehículo: Porsche 911
Recomendamos agendar una inspección preventiva para mantener la garantía activa.
```

### Red

```txt
Hola Carlos ⚠️
Tu garantía está por vencer muy pronto.

Vehículo: Porsche 911
Agenda una revisión para evitar perder cobertura.
```

### Expired

```txt
Hola Carlos,
tu garantía de detailing ha vencido.

Podemos ayudarte con una evaluación y renovación de protección.
```

## Criterio de aceptación

Crear garantía con `ends_at` a 5 días.

Ejecutar manual:

```http
POST /api/admin/jobs/warranties/run-once
```

Resultado:

```txt
warranties.status = red
warranty_alerts contiene red
message_outbox contiene mensaje pending
```

Worker envía a Node.

---

# Fase 4 — Frontend y capa de experiencia visual

## 4.1. Crear Next.js App Router

### Objetivo técnico

Crear frontend SSR con Supabase Auth, dashboard premium y vistas públicas.

### Comando

```bash
pnpm create next-app apps/web \
  --ts \
  --app \
  --eslint \
  --src-dir \
  --import-alias "@/*"
```

Next.js App Router es el router moderno que soporta Server Components y Client Components. ([Next.js][8])

### Instalar UI

```bash
cd apps/web
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add gsap
pnpm add zod react-hook-form @hookform/resolvers
pnpm dlx shadcn@latest init
```

shadcn/ui para Next.js requiere Tailwind e import alias correctamente configurados. ([Shadcn UI][9])

---

## 4.2. Estructura de rutas

```txt
src/app/
  layout.tsx
  globals.css

  (public)/
    page.tsx
    r/
      [token]/
        page.tsx

  (auth)/
    login/
      page.tsx
    callback/
      route.ts

  (dashboard)/
    layout.tsx
    select-tenant/
      page.tsx
    dashboard/
      page.tsx
    customers/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
    vehicles/
      [id]/
        page.tsx
    service-orders/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
        inspection/
          page.tsx
        report/
          page.tsx
    bays/
      page.tsx
    warranties/
      page.tsx
    settings/
      whatsapp/
        page.tsx
```

---

## 4.3. Supabase SSR Auth

### Archivos

```txt
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/middleware.ts
```

Supabase recomienda `@supabase/ssr` para manejar cookies en Server-Side Rendering. ([Supabase][10])

### `client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        }
      }
    }
  );
}
```

---

## 4.4. API client hacia .NET

### Archivo

```txt
src/lib/api/api-client.ts
```

### Responsabilidad

```txt
- Obtener access token Supabase
- Adjuntar Authorization Bearer
- Adjuntar X-Tenant-Id
- Manejar 401, 403, 409
```

### Pseudocódigo

```ts
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();

  const token = data.session?.access_token;
  const tenantId = localStorage.getItem("activeTenantId");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId ?? "",
      ...options.headers
    }
  });

  if (!res.ok) {
    throw await res.json();
  }

  return res.json();
}
```

### Criterio de aceptación

En DevTools Network, cualquier request dashboard debe incluir:

```txt
Authorization: Bearer ...
X-Tenant-Id: ...
```

---

## 4.5. Diseño premium

### Tokens visuales

```txt
Modo oscuro por defecto
Fondo: negro grafito / carbón
Cards: gris muy oscuro con borde sutil
Accent: dorado champagne o azul eléctrico premium
Estados:
  green  → éxito
  yellow → atención
  red    → crítico
```

### Componentes shadcn

```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu table badge tabs toast sheet input textarea select skeleton progress
```

### Layout dashboard

```txt
Sidebar izquierda
Topbar con tenant switcher
Cards KPI
Tablas densas
Kanban horizontal
Panel derecho para detalles rápidos
```

### Archivos

```txt
src/components/layout/dashboard-shell.tsx
src/components/layout/sidebar.tsx
src/components/layout/topbar.tsx
src/components/ui/status-badge.tsx
src/components/ui/premium-card.tsx
```

---

## 4.6. Dashboard principal

### Ruta

```txt
app/(dashboard)/dashboard/page.tsx
```

### KPIs

```txt
Órdenes activas
Vehículos en bahía
Reportes enviados este mes
Garantías en amarillo/rojo
Ingresos estimados
```

### Endpoint

```http
GET /api/dashboard/summary
```

### Criterio de aceptación

Al cargar dashboard:

```txt
Skeleton visible mientras carga
Cards muestran datos reales por tenant
Usuario tenant A no ve datos tenant B
```

---

## 4.7. Vista pública del reporte

### Ruta

```txt
app/(public)/r/[token]/page.tsx
```

### Server Component

Debe llamar:

```http
GET {API_BASE_URL}/public/reports/{token}
```

### Componentes client

```txt
before-after-slider.tsx
gsap-report-animations.tsx
share-whatsapp-button.tsx
```

### Animaciones

```txt
Hero fade-in
Slider reveal
Timeline con ScrollTrigger
Galería con stagger
CTA sticky mobile
```

### Criterio de aceptación

Reporte público debe:

```txt
Cargar sin login
No exponer datos privados
Funcionamiento mobile-first
Compartirse por WhatsApp con texto prellenado
```

---

# Fase 5 — Pruebas integradas y pipeline de despliegue

## 5.1. Estrategia de testing por capa

## Backend .NET

### Proyectos

```bash
dotnet new xunit -n Carwash.UnitTests -o apps/api/tests/Carwash.UnitTests
dotnet new xunit -n Carwash.IntegrationTests -o apps/api/tests/Carwash.IntegrationTests
```

### Unit tests

Probar:

```txt
Warranty.CalculateStatus
ServiceOrder status transitions
MicronRiskRules
Report token hashing
Tenant membership resolver
```

### Integration tests

Probar:

```txt
POST /api/customers
POST /api/service-orders
PATCH /api/work-items/{id}/move
POST /api/service-orders/{id}/reports/publish
POST /api/admin/jobs/warranties/run-once
```

## Node WhatsApp

### Tests

```txt
HMAC middleware
Session routes con fake provider
Message send con sesión not_ready
Message send con sesión ready
Webhook client retries
```

## Frontend

### Tests

```txt
Login page render
Tenant switcher
Customer creation form
Kanban drag optimistic update
Report public page
```

### Playwright E2E

```txt
auth.setup.ts
customer.spec.ts
service-order.spec.ts
bays-realtime.spec.ts
report-public.spec.ts
```

---

## 5.2. CI con GitHub Actions

GitHub Actions tiene guía oficial para build/test de .NET usando runners con SDK preinstalados o `setup-dotnet`. ([GitHub Docs][11])

### `.github/workflows/api.yml`

```yaml
name: api-ci

on:
  pull_request:
    paths:
      - "apps/api/**"
  push:
    branches:
      - main

jobs:
  build-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"

      - name: Restore
        run: dotnet restore apps/api/Carwash.sln

      - name: Build
        run: dotnet build apps/api/Carwash.sln --no-restore --configuration Release

      - name: Test
        run: dotnet test apps/api/Carwash.sln --no-build --configuration Release
```

### `.github/workflows/web.yml`

```yaml
name: web-ci

on:
  pull_request:
    paths:
      - "apps/web/**"
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: apps/web

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
          cache-dependency-path: apps/web/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

### `.github/workflows/whatsapp.yml`

```yaml
name: whatsapp-ci

on:
  pull_request:
    paths:
      - "apps/whatsapp-service/**"
  push:
    branches:
      - main

jobs:
  build-test:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: apps/whatsapp-service

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
          cache-dependency-path: apps/whatsapp-service/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
```

---

## 5.3. Despliegue

## Frontend — Vercel

Vercel permite configurar variables por entorno y diferencia entre valores server-side y variables expuestas al navegador con `NEXT_PUBLIC_`; Next.js solo expone al browser variables con ese prefijo. ([Vercel][12])

### Variables Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_APP_URL=

API_BASE_URL=
```

No poner:

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
INTERNAL_HMAC_SECRET
```

en variables públicas.

---

## Backend .NET — Render/Railway

Render y Railway permiten configurar environment variables por servicio; Render recomienda usarlas para evitar credenciales hardcodeadas y Railway permite definir variables por servicio. ([Render][13])

### Variables backend

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

---

## Microservicio WhatsApp — Render/Railway

### Variables

```env
NODE_ENV=production
PORT=4001

INTERNAL_HMAC_SECRET=
DOTNET_API_BASE_URL=
DOTNET_WEBHOOK_SECRET=

WHATSAPP_PROVIDER=wwebjs
WWEBJS_SESSION_DIR=/data/sessions
```

### Importante

Si usas `whatsapp-web.js`, necesitas persistencia de sesión. Si el filesystem del deploy es efímero, al reiniciar se puede perder sesión y pedirá QR de nuevo. Para producción seria, usa volumen persistente, RemoteAuth o Evolution API como provider.

---

# Roadmap incremental recomendado

## Sprint 0 — Base técnica

```txt
0.1 Monorepo
0.2 Supabase schemas
0.3 Tenants + memberships + RLS
0.4 .NET solution
0.5 Next.js app
0.6 Node health service
```

Aceptación:

```txt
Frontend corre
Backend corre
Node corre
Supabase tiene RLS base
```

---

## Sprint 1 — Auth + tenants

```txt
Login Supabase
Middleware Next.js
GET /api/tenants/my
Tenant switcher
TenantContext .NET
```

Aceptación:

```txt
Usuario inicia sesión y selecciona taller.
```

---

## Sprint 2 — CRM mínimo

```txt
Customers
Vehicles
Service orders
Dashboard básico
```

Aceptación:

```txt
Crear cliente → crear vehículo → crear orden.
```

---

## Sprint 3 — Bahías realtime

```txt
Bays
Work items
Kanban
Supabase Realtime
MoveWorkItem con version conflict
```

Aceptación:

```txt
Dos navegadores sincronizan tablero.
```

---

## Sprint 4 — Ficha clínica visual

```txt
Visual inspection
SVG editor
Damage marks
Micron readings
Vehicle aesthetic history
```

Aceptación:

```txt
Ficha se guarda como JSONB y reconstruye visualmente.
```

---

## Sprint 5 — WhatsApp service

```txt
Node session QR
Status
Send message
.NET webhook receiver
Outbox worker
```

Aceptación:

```txt
Taller escanea QR y recibe mensaje de prueba.
```

---

## Sprint 6 — Reporte viral

```txt
Upload fotos
Watermark
Report publish
Public landing /r/[token]
Send WhatsApp
```

Aceptación:

```txt
Cliente recibe link y abre reporte público.
```

---

## Sprint 7 — Garantías y semáforo

```txt
Warranty policies
Warranty instances
Scheduler
Alerts
WhatsApp automatic trigger
```

Aceptación:

```txt
Job genera alerta y mensaje idempotente.
```

---

# Prompts quirúrgicos para asistentes de código

Puedes usar este formato por cada subtarea:

```txt
Actúa como Senior Software Engineer especializado en [stack].
Contexto:
- Proyecto: SaaS CRM multi-tenant para car detailing.
- Stack: Next.js App Router TS, .NET 8/9 Clean Architecture CQRS, Supabase PostgreSQL RLS, Node Express WhatsApp service.
- Regla crítica: nunca confiar en tenant_id enviado por cliente; resolver por JWT + tenant_memberships.

Tarea:
Implementa [nombre exacto de feature].

Archivos a crear/modificar:
- [lista exacta]

Contrato:
- Endpoint:
- Payload:
- Response:
- Errores esperados:

Criterios de aceptación:
1. [test manual o automatizado]
2. [log esperado]
3. [respuesta esperada]
4. [caso negativo]

Restricciones:
- No mezclar lógica en controllers.
- No usar service role desde frontend.
- No romper RLS.
- No introducir dependencias no aprobadas.
- Mantener DTOs separados de entidades de dominio.
```

Ejemplo concreto:

```txt
Implementa MoveWorkItemCommand en .NET.

Archivos:
- Application/Features/Bays/MoveWorkItem/MoveWorkItemCommand.cs
- Application/Features/Bays/MoveWorkItem/MoveWorkItemCommandHandler.cs
- Application/Features/Bays/MoveWorkItem/MoveWorkItemValidator.cs
- Infrastructure/Persistence/Bays/WorkItemRepository.cs
- WebApi/Controllers/WorkItemsController.cs

Contrato:
PATCH /api/work-items/{id}/move

Payload:
{
  "targetBayId": "uuid",
  "newPosition": 2000,
  "expectedVersion": 3
}

Debe:
- Resolver tenant desde ITenantContext.
- Ejecutar función app.move_work_item.
- Manejar WORK_ITEM_VERSION_CONFLICT como HTTP 409.
- Devolver WorkItemDto actualizado.

Criterios:
- Mover card con expectedVersion correcto devuelve 200.
- Mover card con version antigua devuelve 409.
- Usuario de otro tenant devuelve 403.
```

---

# Regla final de calidad

No avances a la siguiente feature hasta que la actual cumpla:

```txt
DB migrada
RLS probado
Endpoint .NET probado con Postman
Caso negativo probado
Frontend conectado
Logs legibles
Test mínimo agregado
```

La arquitectura queda lista para crecer: primero como SaaS modular con un backend .NET principal, y después con microservicios adicionales solo cuando el volumen lo justifique.

[1]: https://nextjs.org/docs/app/getting-started/server-and-client-components?utm_source=chatgpt.com "Getting Started: Server and Client Components"
[2]: https://github.com/evolution-foundation/evolution-api?utm_source=chatgpt.com "Evolution API is an open-source WhatsApp integration API"
[3]: https://github.com/LuckyPennySoftware/MediatR?utm_source=chatgpt.com "LuckyPennySoftware/MediatR: Simple, unambitious ..."
[4]: https://docs.hangfire.io/?utm_source=chatgpt.com "Documentation — Hangfire Documentation"
[5]: https://supabase.com/docs/reference/csharp/installing?utm_source=chatgpt.com "C#: Installing | Supabase Docs"
[6]: https://supabase.com/docs/guides/realtime/postgres-changes?utm_source=chatgpt.com "Postgres Changes | Supabase Docs"
[7]: https://gsap.com/docs/v3/Plugins/ScrollTrigger/?utm_source=chatgpt.com "ScrollTrigger | GSAP | Docs & Learning"
[8]: https://nextjs.org/docs?utm_source=chatgpt.com "Next.js Docs | Next.js"
[9]: https://ui.shadcn.com/docs/installation/next?utm_source=chatgpt.com "Next.js - Shadcn UI"
[10]: https://supabase.com/docs/guides/auth/server-side/creating-a-client?utm_source=chatgpt.com "Creating a Supabase client for SSR"
[11]: https://docs.github.com/actions/guides/building-and-testing-net?utm_source=chatgpt.com "Building and testing .NET"
[12]: https://vercel.com/docs/environment-variables?utm_source=chatgpt.com "Environment variables"
[13]: https://render.com/docs/configure-environment-variables?utm_source=chatgpt.com "Environment Variables and Secrets"
