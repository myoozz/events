-- Widen public.app_access.role CHECK to admit the events role vocabulary.
--
-- WHY ────────────────────────────────────────────────────────────────────────
-- public.custom_access_token_hook (live since migration 20260617220150) builds the
-- app_roles JWT claim by passing app_access.role straight through, one role per app
-- (jsonb_object_agg -> e.g. {"books":"owner","events":"manager"}). The events
-- backfill (20260617_backfill_app_access_events.sql, PR #23) writes events vocab
-- (admin/manager/event_lead/team) from users.role into app_access for app='events'.
-- The existing constraint only permits the generic/books vocab
-- (owner/admin/finance/staff/viewer), so manager/event_lead/team are REJECTED and
-- the backfill INSERT...SELECT fails atomically (writes 0 rows). This migration is
-- the prerequisite that unblocks PR #23.
--
-- DECISION ───────────────────────────────────────────────────────────────────
-- Simple SHARED widen (one allow-list for all apps), NOT a per-app conditional
-- CHECK. Each app reads only its own app_roles key and interprets its own
-- vocabulary; the real isolation wall is tenant_id (RLS), not this CHECK; and
-- provisioning controls what is actually written per app. The CHECK is a
-- typo-guard, not a security boundary.
--
-- SCOPE / BLAST RADIUS ────────────────────────────────────────────────────────
-- Touches ONLY public.app_access (shared across events/books/crm). There is no
-- demo-schema copy (app_access is public-only). ADDITIVE / widening: strictly
-- permits MORE values and rejects nothing previously valid; existing rows
-- (2 books: owner, finance) revalidate cleanly; no data change. 'admin' was
-- already allowed and is shared by both vocabularies.
--
-- APPLY ORDER (manual, staged via the Supabase SQL editor — NOT `supabase db push`;
-- the two 20260617_* files share a version prefix and would mis-order under push):
--   1) 20260617_rls_gap1_scope_writes.sql        (PR #22)
--   2) THIS migration                            (widen CHECK)
--   3) 20260617_backfill_app_access_events.sql   (PR #23)  -> expect 15 events rows

alter table public.app_access drop constraint if exists app_access_role_check;

alter table public.app_access add constraint app_access_role_check
  check (role in (
    'owner', 'admin', 'finance', 'staff', 'viewer',  -- existing (generic / books)
    'manager', 'event_lead', 'team'                  -- added (events vocabulary)
  ));

-- Sanity (run after): the constraint should now list all 8 values
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.app_access'::regclass and conname = 'app_access_role_check';

-- ROLLBACK (manual — restores the original 5-value generic allow-list).
-- Safe only while no app_access row uses an events-vocab role (else the ADD fails):
--   alter table public.app_access drop constraint if exists app_access_role_check;
--   alter table public.app_access add constraint app_access_role_check
--     check (role in ('owner','admin','finance','staff','viewer'));
