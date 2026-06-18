-- 0003_create_rls_helpers.sql
-- Create RLS helper functions and SELECT policies

-- Helper: check if current user is an active member of the given tenant
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

-- Helper: get current user's role in the given tenant (returns null if not a member)
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

-- SELECT policy: members can view tenants they belong to
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

-- SELECT policy: members can view memberships of their own tenant
create policy "members can view memberships of own tenant"
on app.tenant_memberships
for select
using (app.is_tenant_member(tenant_id));