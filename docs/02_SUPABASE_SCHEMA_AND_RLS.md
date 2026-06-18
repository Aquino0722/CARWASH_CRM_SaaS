# 02_SUPABASE_SCHEMA_AND_RLS.md — Supabase Schema and RLS Guide

## Purpose

This document defines the database architecture for CARWASH.

Supabase is responsible for:

* PostgreSQL database.
* Supabase Auth.
* Row Level Security.
* Storage.
* Realtime.
* JSONB structures.
* Tenant isolation.

The database must be designed as multi-tenant from the beginning.

## Database Philosophy

Use PostgreSQL as the source of truth.

Use relational tables for core business data.

Use JSONB only where flexibility is required.

Do not introduce NoSQL during the MVP.

Do not bypass RLS casually.

Do not expose the Supabase Service Role Key to frontend code.

## Schemas

Use two custom schemas:

```sql
create schema if not exists app;
create schema if not exists internal;
```

Schema responsibilities:

```txt
app       → business tables
internal  → technical tables, outbox, jobs, webhooks, processing state
public    → avoid business tables here unless explicitly justified
auth      → managed by Supabase
storage   → managed by Supabase
```

## Extensions

Required extensions:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

## Naming Rules

Use snake_case for tables and columns.

Use plural table names.

Examples:

```txt
app.tenants
app.tenant_memberships
app.customers
app.vehicles
app.service_orders
```

Primary keys:

```txt
id uuid primary key default gen_random_uuid()
```

Timestamp fields:

```txt
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Tenant-owned tables must include:

```txt
tenant_id uuid not null references app.tenants(id) on delete cascade
```

## Core Multi-Tenant Tables

### app.tenants

Represents a workshop/business account.

Required columns:

```sql
create type app.tenant_status as enum (
  'active',
  'suspended',
  'cancelled'
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
```

### app.tenant_memberships

Connects Supabase Auth users with tenants.

```sql
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

## RLS Helper Functions

Create helper functions to avoid repeating membership logic.

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
```

```sql
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

## RLS Base Policies

Enable RLS on tenant tables.

```sql
alter table app.tenants enable row level security;
alter table app.tenant_memberships enable row level security;
```

Tenant policy:

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
```

Membership policy:

```sql
create policy "members can view memberships of own tenant"
on app.tenant_memberships
for select
using (app.is_tenant_member(tenant_id));
```

## Tenant-Owned Table Policy Template

Every tenant-owned table should follow this structure.

Example table:

```sql
create table app.example_table (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Enable RLS:

```sql
alter table app.example_table enable row level security;
```

Policies:

```sql
create policy "tenant members can select example_table"
on app.example_table
for select
using (app.is_tenant_member(tenant_id));

create policy "tenant members can insert example_table"
on app.example_table
for insert
with check (app.is_tenant_member(tenant_id));

create policy "tenant members can update example_table"
on app.example_table
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

create policy "tenant members can delete example_table"
on app.example_table
for delete
using (app.is_tenant_member(tenant_id));
```

Delete policies should only be added when deletion is actually allowed.

Prefer soft delete for important business data.

## Business Tables

### app.customers

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

create index ix_customers_tenant
on app.customers(tenant_id);

create index ix_customers_phone
on app.customers(tenant_id, phone_e164);
```

### app.vehicles

```sql
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

create index ix_vehicles_tenant
on app.vehicles(tenant_id);

create index ix_vehicles_customer
on app.vehicles(customer_id);

create unique index ux_vehicles_plate_per_tenant
on app.vehicles(tenant_id, lower(plate))
where plate is not null;
```

### app.service_orders

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

## Visual Inspection Tables

### app.visual_inspections

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
  version int not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_visual_inspections_order
on app.visual_inspections(service_order_id);
```

### app.micron_readings

```sql
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

create index ix_micron_readings_inspection
on app.micron_readings(visual_inspection_id);
```

### app.inspection_photos

```sql
create type app.photo_stage as enum (
  'before',
  'progress',
  'after',
  'defect',
  'delivery'
);

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
```

## Report Tables

### app.reports

```sql
create type app.report_status as enum (
  'draft',
  'processing',
  'published',
  'sent',
  'expired',
  'failed'
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
```

### app.report_assets

```sql
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

## Warranty Tables

```sql
create type app.warranty_status as enum (
  'green',
  'yellow',
  'red',
  'expired',
  'claimed',
  'void'
);
```

### app.warranty_policies

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
```

### app.warranties

```sql
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
```

### app.warranty_alerts

```sql
create type internal.outbox_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
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

## Work Bay Tables

### app.bays

```sql
create type app.bay_status as enum (
  'available',
  'occupied',
  'blocked',
  'maintenance'
);

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
```

### app.work_items

```sql
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

## Outbox Table

External side effects must go through the outbox.

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

## Realtime Tables

Enable Supabase Realtime for operational board tables.

```sql
alter publication supabase_realtime add table app.bays;
alter publication supabase_realtime add table app.work_items;
alter publication supabase_realtime add table app.service_orders;
```

## Storage Buckets

Required bucket:

```txt
tenant-assets
```

Recommended paths:

```txt
tenant-assets/
  tenants/{tenantId}/customers/{customerId}/
  tenants/{tenantId}/vehicles/{vehicleId}/
  tenants/{tenantId}/orders/{serviceOrderId}/before/
  tenants/{tenantId}/orders/{serviceOrderId}/after/
  tenants/{tenantId}/reports/{reportId}/watermarked/
```

Storage rules:

* Do not expose private operational images directly unless intended.
* Public report images should use generated public-safe assets.
* Watermarked report assets can be public if they contain no sensitive data.
* Internal inspection photos should require authenticated access.

## Public Reports

Public reports must not rely on direct RLS access from the browser.

Correct flow:

```txt
/r/[token] in Next.js
→ calls .NET public endpoint
→ .NET validates token hash
→ .NET returns sanitized DTO
```

Never return:

* customer email,
* customer phone unless explicitly intended,
* internal notes,
* tenant internal ids,
* service order internal data,
* private inspection notes.

## Required Acceptance Tests

For every tenant-owned table:

1. Create tenant A.
2. Create tenant B.
3. Create user A.
4. Add user A to tenant A only.
5. Insert data for tenant A.
6. Insert data for tenant B.
7. Query as user A.
8. Confirm only tenant A data is returned.
9. Try to insert with tenant B id as user A.
10. Confirm insert is blocked.

## Migration File Naming

Use numeric prefixes:

```txt
0001_create_schemas.sql
0002_create_tenants.sql
0003_create_rls_helpers.sql
0004_create_business_core.sql
0005_create_visual_inspections.sql
0006_create_reports.sql
0007_create_warranties.sql
0008_create_bays.sql
0009_create_outbox.sql
0010_enable_realtime.sql
```

Do not put all migrations into a single giant file unless the project is still being initialized.

## Done Definition

Database work is done only when:

1. Migration exists.
2. RLS is enabled if table is tenant-owned.
3. Policies exist.
4. Indexes exist for common queries.
5. Foreign keys exist.
6. Cross-tenant access is tested.
7. No frontend code uses the Service Role Key.
