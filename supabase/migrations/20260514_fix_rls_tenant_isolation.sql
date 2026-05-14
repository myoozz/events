-- Fix: drop old permissive policies that override tenant-scoped ones.
-- PostgreSQL combines permissive policies with OR, so any policy with
-- qual = true bypasses the tenant_scope policy entirely.
--
-- The _tenant_scope (ALL) policies on events/elements/tasks already
-- handle SELECT, INSERT, UPDATE, DELETE with correct tenant filtering.
-- The users_tenant_scope policy added here covers the users table.
-- element_assignments uses a subquery join to events for tenant scoping.

-- ── events ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_insert ON public.events;
DROP POLICY IF EXISTS events_update ON public.events;
DROP POLICY IF EXISTS events_delete ON public.events;
-- events_tenant_scope (ALL) remains — covers all operations

-- ── elements ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS elements_select ON public.elements;
DROP POLICY IF EXISTS elements_insert ON public.elements;
DROP POLICY IF EXISTS elements_update ON public.elements;
DROP POLICY IF EXISTS elements_delete ON public.elements;
-- elements_tenant_scope (ALL) remains

-- ── tasks ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
-- tasks_tenant_scope (ALL) remains

-- ── users ─────────────────────────────────────────────────────────────────
-- Drop all permissive policies; add a single tenant-scoped ALL policy.
-- User creation (register-tenant, invite-user) uses service role → bypasses RLS.
DROP POLICY IF EXISTS "Team can view all users" ON public.users;
DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_delete ON public.users;

CREATE POLICY users_tenant_scope ON public.users
  FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ── element_assignments ───────────────────────────────────────────────────
-- No tenant_id column — scope via event's tenant.
DROP POLICY IF EXISTS "Managers and admins can insert assignments"  ON public.element_assignments;
DROP POLICY IF EXISTS "Managers and admins can update assignments"  ON public.element_assignments;
DROP POLICY IF EXISTS "Users can read assignments for their events" ON public.element_assignments;
DROP POLICY IF EXISTS "authenticated users can delete"              ON public.element_assignments;
DROP POLICY IF EXISTS "authenticated users can insert"              ON public.element_assignments;
DROP POLICY IF EXISTS "authenticated users can select"              ON public.element_assignments;
DROP POLICY IF EXISTS "authenticated users can update"              ON public.element_assignments;

CREATE POLICY element_assignments_tenant_scope ON public.element_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = element_assignments.event_id
        AND (events.tenant_id = get_my_tenant_id() OR is_super_admin())
    )
  );
