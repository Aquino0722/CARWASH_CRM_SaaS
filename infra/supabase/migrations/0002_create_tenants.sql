-- 0002_create_tenants.sql
-- Create tenant enums, tables, indexes, and enable RLS

-- Enum types
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

-- Tenants table
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

-- Tenant memberships table
create table app.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app.member_role not null,
  status app.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- Indexes for common queries
create index ix_tenant_memberships_user on app.tenant_memberships(user_id);
create index ix_tenant_memberships_tenant on app.tenant_memberships(tenant_id);

-- Enable Row Level Security
alter table app.tenants enable row level security;
alter table app.tenant_memberships enable row level security;