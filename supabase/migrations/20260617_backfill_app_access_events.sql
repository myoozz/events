-- Backfill app_access for the 'events' app from users.role, so the app_roles JWT claim
-- (added to custom_access_token_hook by the auth agent) populates for existing events
-- users BEFORE the app-side gate flips to reading it. Without this, every events user
-- would get app_roles = {} and be locked out.
--
-- Decision (A): mirror ALL 15 users verbatim (events vocabulary: admin/manager/event_lead/team).
-- Role audit 18 Jun 2026 — no mislabels among real users; the high admin count is 8 test-tenant
-- accounts + 2 suspended (junk), left AS-IS here and swept separately in the parked cleanup
-- (intentionally NOT entangled with this backfill). Suspended users are denied app-side by a
-- status check, not by withholding the role.
--
-- app_access has UNIQUE (user_id, app) -> safe idempotent upsert.

insert into public.app_access (user_id, app, role)
select id, 'events', role
from public.users
where role is not null
on conflict (user_id, app) do update set role = excluded.role;

-- Sanity (run after): expect 15 events rows mirroring users.role
--   select role, count(*) from public.app_access where app='events' group by role;
--   -> admin 10, manager 3, event_lead 1, team 1

-- ROLLBACK (manual): delete from public.app_access where app = 'events';
