-- ════════════════════════════════════════════════════════════════════════
-- Early-access flow, end to end (landing "Request an invite" capture +
-- super-admin triage). Write path + read path land together — never one
-- without the other.
--
-- State at authoring (12 Jun 2026): early_access has RLS ENABLED with ZERO
-- policies (all access denied — every landing submit has failed since the
-- table was created; row count 0). This migration makes the capture real.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 · Schema ─────────────────────────────────────────────────────────────

-- The invite code becomes a real column ("skip the line" = triage priority,
-- a human decision in the super-admin queue — not automation).
alter table public.early_access
  add column if not exists invite_code text;

-- Retire the interim "[invite:…]"-in-company stash (defensive backfill —
-- zero rows exist at authoring, so this is expected to be a no-op).
update public.early_access
   set invite_code = substring(company from '^\[invite:(.*)\]$'),
       company     = null
 where company like '[invite:%';

-- status: enforce NOT NULL + the triage vocabulary. 'pending'/'accepted'/
-- 'declined' match what the triage UI already renders; 'contacted' is the
-- one new in-between state.
update public.early_access set status = 'pending' where status is null;
alter table public.early_access
  alter column status set default 'pending',
  alter column status set not null;

alter table public.early_access
  add constraint early_access_status_check
  check (status in ('pending', 'contacted', 'accepted', 'declined'));

-- Sanity caps — anon can write this table, so the DB is the spam wall.
-- Caps cover every text column an insert could carry, not just the form's.
alter table public.early_access
  add constraint early_access_name_len    check (char_length(full_name)        <= 120),
  add constraint early_access_email_len   check (char_length(email)            <= 254),
  add constraint early_access_code_len    check (char_length(invite_code)      <= 64),
  add constraint early_access_phone_len   check (char_length(phone)            <= 40),
  add constraint early_access_company_len check (char_length(company)          <= 160),
  add constraint early_access_msg_len     check (char_length(response_message) <= 2000),
  add constraint early_access_email_shape check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- Duplicates become a friendly UX state (23505), not junk rows.
create unique index if not exists early_access_email_unique
  on public.early_access (lower(email));

-- ── 2 · RLS — the pair (write path + read path together) ──────────────────
-- Super-admin check reuses the platform's existing mechanism verbatim:
-- is_super_admin() = (auth.jwt() ->> 'platform_role') = 'super_admin',
-- the same function every tenant-scope policy uses.

-- WRITE PATH: the public form. Insert-only; submitters can never read the
-- list back (no SELECT for anon).
drop policy if exists "anon submits early-access request" on public.early_access;
create policy "anon submits early-access request"
  on public.early_access for insert
  to anon, authenticated
  with check ( status = 'pending' );

-- READ/TRIAGE PATH: super admin ONLY. Platform-level, cross-tenant-adjacent
-- data — per the master data-isolation law nothing below super admin sees it.
drop policy if exists "super admin reads early access" on public.early_access;
create policy "super admin reads early access"
  on public.early_access for select
  to authenticated
  using ( is_super_admin() );

drop policy if exists "super admin updates early access" on public.early_access;
create policy "super admin updates early access"
  on public.early_access for update
  to authenticated
  using ( is_super_admin() )
  with check ( is_super_admin() );

-- No DELETE policy: declines are a status, not a deletion — audit trail stays.
