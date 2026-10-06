-- Phase 0 · Part B — tenant-scope the INSERT policies on events / elements / tasks; block anon on clients.
--
-- Why: live on 6 Oct 2026 these four tables still carry INSERT policies WITH CHECK (true) for
-- role PUBLIC (includes anon). Permissive policies are OR-ed, so with the anon key that ships in
-- the app bundle anyone can insert a row into any tenant. 20260617_rls_gap1_scope_writes.sql
-- (PR #22) dropped these policies, but it is not recorded in supabase_migrations and the
-- policies are present live, so it never took effect on public.
--
-- After this migration:
--   * anon:                       INSERT rejected (policies are TO authenticated; *_tenant_scope
--                                  needs a tenant_id claim or super_admin, which anon lacks)
--   * authenticated, own tenant:  allowed (tenant_id = get_my_tenant_id())
--   * authenticated, other tenant: rejected
--   * super_admin:                allowed (is_super_admin())
-- App inserts set tenant_id from the parent event / users row (same PR).
-- public schema only. No data change. Other WITH CHECK (true) policies (feedback, notifications,
-- element_assignments, element_stage_log, access_requests) are deliberately NOT touched here.

BEGIN;

-- events
DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

-- elements
DROP POLICY IF EXISTS elements_insert ON public.elements;
CREATE POLICY elements_insert ON public.elements FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

-- tasks
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

-- clients (no tenant_id column yet; tracked separately) — interim: block anon only
DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (true);

COMMIT;

-- ============================================================================
-- ROLLBACK (recreates the original policies exactly as they were live on 6 Oct 2026):
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP POLICY IF EXISTS events_insert   ON public.events;
-- DROP POLICY IF EXISTS elements_insert ON public.elements;
-- DROP POLICY IF EXISTS tasks_insert    ON public.tasks;
-- DROP POLICY IF EXISTS clients_insert  ON public.clients;
-- CREATE POLICY events_insert   ON public.events   FOR INSERT WITH CHECK (true);
-- CREATE POLICY elements_insert ON public.elements FOR INSERT WITH CHECK (true);
-- CREATE POLICY tasks_insert    ON public.tasks    FOR INSERT WITH CHECK (true);
-- CREATE POLICY clients_insert  ON public.clients  FOR INSERT WITH CHECK (true);
-- COMMIT;
-- ============================================================================
