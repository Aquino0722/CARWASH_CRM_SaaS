-- 0004_create_business_core.sql
-- Create business core tables: customers, vehicles, service_orders, bays, work_items, message_outbox

-- =====================================================
-- Enums (idempotent creation via DO blocks)
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'service_order_status' AND n.nspname = 'app'
  ) THEN
    CREATE TYPE app.service_order_status AS ENUM (
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
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'bay_status' AND n.nspname = 'app'
  ) THEN
    CREATE TYPE app.bay_status AS ENUM (
      'available',
      'occupied',
      'blocked',
      'maintenance'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'outbox_status' AND n.nspname = 'internal'
  ) THEN
    CREATE TYPE internal.outbox_status AS ENUM (
      'pending',
      'processing',
      'sent',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

-- =====================================================
-- Tables
-- =====================================================

-- app.customers
CREATE TABLE IF NOT EXISTS app.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_e164 text,
  email text,
  notes text,
  tags jsonb NOT NULL DEFAULT '[]',
  whatsapp_consent boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- app.vehicles
CREATE TABLE IF NOT EXISTS app.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  plate text,
  vin text,
  make text NOT NULL,
  model text NOT NULL,
  year int,
  color text,
  trim text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- app.service_orders
CREATE TABLE IF NOT EXISTS app.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES app.customers(id),
  vehicle_id uuid NOT NULL REFERENCES app.vehicles(id),
  status app.service_order_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  package_name text,
  estimated_price numeric(12,2),
  final_price numeric(12,2),
  check_in_at timestamptz,
  scheduled_at timestamptz,
  due_at timestamptz,
  delivered_at timestamptz,
  internal_notes text,
  customer_notes text,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- app.bays
CREATE TABLE IF NOT EXISTS app.bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status app.bay_status NOT NULL DEFAULT 'available',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- app.work_items
CREATE TABLE IF NOT EXISTS app.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  bay_id uuid REFERENCES app.bays(id) ON DELETE SET NULL,
  service_order_id uuid NOT NULL REFERENCES app.service_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  position numeric(12,4) NOT NULL DEFAULT 1000,
  assigned_to uuid REFERENCES auth.users(id),
  checklist jsonb NOT NULL DEFAULT '[]',
  version int NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- internal.message_outbox
CREATE TABLE IF NOT EXISTS internal.message_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp')),
  recipient_phone_e164 text NOT NULL,
  template_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status internal.outbox_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  idempotency_key text NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS ix_customers_tenant ON app.customers(tenant_id);
CREATE INDEX IF NOT EXISTS ix_customers_phone ON app.customers(tenant_id, phone_e164);

CREATE INDEX IF NOT EXISTS ix_vehicles_tenant ON app.vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS ix_vehicles_customer ON app.vehicles(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicles_plate_per_tenant
  ON app.vehicles(tenant_id, lower(plate))
  WHERE plate IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_service_orders_tenant_status ON app.service_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_service_orders_vehicle ON app.service_orders(vehicle_id);

CREATE INDEX IF NOT EXISTS ix_work_items_tenant_bay_position ON app.work_items(tenant_id, bay_id, position);

CREATE INDEX IF NOT EXISTS ix_outbox_pending ON internal.message_outbox(status, scheduled_at)
  WHERE status = 'pending';

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE app.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.work_items ENABLE ROW LEVEL SECURITY;

-- app.customers policies
CREATE POLICY "tenant members select customers"
  ON app.customers FOR SELECT
  USING (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members insert customers"
  ON app.customers FOR INSERT
  WITH CHECK (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members update customers"
  ON app.customers FOR UPDATE
  USING (app.is_tenant_member(tenant_id))
  WITH CHECK (app.is_tenant_member(tenant_id));

-- app.vehicles policies
CREATE POLICY "tenant members select vehicles"
  ON app.vehicles FOR SELECT
  USING (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members insert vehicles"
  ON app.vehicles FOR INSERT
  WITH CHECK (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members update vehicles"
  ON app.vehicles FOR UPDATE
  USING (app.is_tenant_member(tenant_id))
  WITH CHECK (app.is_tenant_member(tenant_id));

-- app.service_orders policies
CREATE POLICY "tenant members select service orders"
  ON app.service_orders FOR SELECT
  USING (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members insert service orders"
  ON app.service_orders FOR INSERT
  WITH CHECK (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members update service orders"
  ON app.service_orders FOR UPDATE
  USING (app.is_tenant_member(tenant_id))
  WITH CHECK (app.is_tenant_member(tenant_id));

-- app.bays policies
CREATE POLICY "tenant members select bays"
  ON app.bays FOR SELECT
  USING (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members manage bays"
  ON app.bays FOR ALL
  USING (app.is_tenant_member(tenant_id))
  WITH CHECK (app.is_tenant_member(tenant_id));

-- app.work_items policies
CREATE POLICY "tenant members select work items"
  ON app.work_items FOR SELECT
  USING (app.is_tenant_member(tenant_id));

CREATE POLICY "tenant members manage work items"
  ON app.work_items FOR ALL
  USING (app.is_tenant_member(tenant_id))
  WITH CHECK (app.is_tenant_member(tenant_id));