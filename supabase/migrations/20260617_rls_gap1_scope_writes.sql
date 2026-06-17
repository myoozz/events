-- GAP-1: scope writes to the caller's tenant by removing permissive RLS policies
-- that OR-override tenant scoping on public tables.
--
-- Each affected table already has a scoped policy that governs the operation once
-- the permissive one is removed:
--   * events / tasks / elements / element_stage_log / notifications
--       -> *_tenant_scope (ALL) USING (tenant_id = get_my_tenant_id() OR is_super_admin())
--   * element_assignments
--       -> element_assignments_tenant_scope (ALL) USING (event_id IN (my-tenant events) OR is_super_admin())
--
-- Validated 17 Jun 2026 via a rolled-back transaction on public (committed nothing):
--   own-tenant access intact (6 events visible), cross-tenant reads = 0, cross-tenant
--   writes = 0 rows, permissive policies remaining = 0.
-- public schema only; demo and books schemas untouched. Tightening only — no data change.
-- Follows 20260514_fix_rls_tenant_isolation.sql.

-- ── Redundant permissive INSERTs (scoped ALL policy governs INSERT after removal) ──
drop policy if exists "events_insert"                                on public.events;
drop policy if exists "tasks_insert"                                 on public.tasks;
drop policy if exists "elements_insert"                              on public.elements;
drop policy if exists "Assigned users can insert stage updates"      on public.element_stage_log;
drop policy if exists "Authenticated users can insert notifications" on public.notifications;

-- ── element_assignments: drop ALL permissive policies, incl. the auth.role()='authenticated'
--    SELECT/UPDATE/DELETE read-leak; element_assignments_tenant_scope then governs everything ──
drop policy if exists "Authenticated users can insert element_assignments" on public.element_assignments;
drop policy if exists "Managers and admins can insert assignments"         on public.element_assignments;
drop policy if exists "authenticated users can insert"                     on public.element_assignments;
drop policy if exists "authenticated users can select"                     on public.element_assignments;
drop policy if exists "authenticated users can update"                     on public.element_assignments;
drop policy if exists "authenticated users can delete"                     on public.element_assignments;

-- ============================================================================
-- ROLLBACK (manual — recreates the dropped permissive policies exactly as they were):
-- ----------------------------------------------------------------------------
-- create policy "events_insert" on public.events for insert to public with check (true);
-- create policy "tasks_insert" on public.tasks for insert to public with check (true);
-- create policy "elements_insert" on public.elements for insert to public with check (true);
-- create policy "Assigned users can insert stage updates" on public.element_stage_log for insert to public with check (true);
-- create policy "Authenticated users can insert notifications" on public.notifications for insert to public with check (true);
-- create policy "Authenticated users can insert element_assignments" on public.element_assignments for insert to authenticated with check (true);
-- create policy "Managers and admins can insert assignments" on public.element_assignments for insert to public with check (true);
-- create policy "authenticated users can insert" on public.element_assignments for insert to public with check (auth.role() = 'authenticated');
-- create policy "authenticated users can select" on public.element_assignments for select to public using (auth.role() = 'authenticated');
-- create policy "authenticated users can update" on public.element_assignments for update to public using (auth.role() = 'authenticated');
-- create policy "authenticated users can delete" on public.element_assignments for delete to public using (auth.role() = 'authenticated');
-- ============================================================================
