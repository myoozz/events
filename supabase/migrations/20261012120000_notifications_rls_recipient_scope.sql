-- Notifications — make them visible to their recipient, and only to their recipient.
-- APPLIED 14 Oct 2026 by Vikram via Supabase SQL Editor (approved in chat). public schema.
-- DO NOT RUN AGAIN — kept in the repo as the record. Verified live 14 Oct 2026:
--   3 policies (insert_same_tenant / select_own / update_own, all to authenticated),
--   trigger notifications_set_tenant enabled, 19 rows · 0 tenant mismatches · 0 NULL,
--   simulated recipient (owns 3) sees exactly 3 of 19.
-- Written 12 Oct 2026.
--
-- Verified live on rjscsnakkexunvsfhdut, 12 Oct 2026, before writing this:
--   * notifications.user_id holds public.users.id; users.id never equals users.auth_id (0 of 15).
--   * "Users can read own notifications" / "...mark own..." compare auth.uid() = user_id,
--     so they can never match.
--   * notifications_tenant_scope (ALL, PERMISSIVE) is the only policy that grants reads, and it
--     grants them to EVERY member of the tenant — colleagues can read, update and DELETE each other's notifications.
--   * The client never sends tenant_id and the column has no default: 9 of 19 rows are NULL,
--     10 of 19 carry a tenant that is not the recipient's. Net effect: 0 of 19 notifications
--     are readable by their recipient. Realtime respects RLS, so live inserts never arrive either.
--   * "Authenticated users can insert notifications" is back with WITH CHECK (true) even though
--     20260617_rls_gap1_scope_writes.sql dropped it (drift).
--
-- This migration:
--   1. stamps tenant_id from the RECIPIENT on every insert (trigger), so callers cannot get it wrong;
--   2. backfills the 19 existing rows the same way;
--   3. replaces the four policies with: read/update own (via current_user_id()), insert only
--      to a recipient in your own tenant, super admin read-all. No DELETE policy (soft-archive rule).
-- Additive to data (only tenant_id corrected); destructive to policies (dropped and recreated —
-- full rollback below).

begin;

-- 1 · tenant_id always follows the recipient
create or replace function public.notifications_set_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select u.tenant_id into new.tenant_id from public.users u where u.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists notifications_set_tenant on public.notifications;
create trigger notifications_set_tenant
  before insert on public.notifications
  for each row execute function public.notifications_set_tenant();

-- 2 · backfill existing rows
update public.notifications n
   set tenant_id = u.tenant_id
  from public.users u
 where u.id = n.user_id
   and n.tenant_id is distinct from u.tenant_id;

-- 3 · policies
drop policy if exists "Authenticated users can insert notifications" on public.notifications;
drop policy if exists "Users can read own notifications"             on public.notifications;
drop policy if exists "Users can mark own notifications as read"     on public.notifications;
drop policy if exists notifications_tenant_scope                    on public.notifications;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_super_admin());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- RLS WITH CHECK runs on the row after BEFORE triggers, so tenant_id here is the recipient's.
create policy notifications_insert_same_tenant on public.notifications
  for insert to authenticated
  with check (tenant_id = public.get_my_tenant_id() or public.is_super_admin());

commit;

-- Verify after apply (expect 3 policies listed, and 0 rows with a tenant mismatch):
--   select policyname, cmd from pg_policies where schemaname='public' and tablename='notifications';
--   select count(*) from public.notifications n join public.users u on u.id=n.user_id
--    where n.tenant_id is distinct from u.tenant_id;

-- Rollback (restores the 12 Oct 2026 state exactly; the tenant_id backfill is left in place,
-- it only corrects data):
-- begin;
-- drop policy if exists notifications_select_own on public.notifications;
-- drop policy if exists notifications_update_own on public.notifications;
-- drop policy if exists notifications_insert_same_tenant on public.notifications;
-- drop trigger if exists notifications_set_tenant on public.notifications;
-- drop function if exists public.notifications_set_tenant();
-- create policy "Authenticated users can insert notifications" on public.notifications for insert to public with check (true);
-- create policy "Users can read own notifications" on public.notifications for select to public using ((auth.uid())::text = (user_id)::text);
-- create policy "Users can mark own notifications as read" on public.notifications for update to public using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);
-- create policy notifications_tenant_scope on public.notifications for all to public using ((tenant_id = get_my_tenant_id()) or is_super_admin());
-- commit;
