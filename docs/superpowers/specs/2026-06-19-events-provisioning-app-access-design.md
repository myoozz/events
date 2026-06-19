# Events Provisioning → `app_access` Grants — Design

- **Date:** 2026-06-19
- **Lane:** events (Myoozz unified passwordless-OTP auth)
- **Status:** design / pre-implementation (no code yet)
- **Project:** Supabase `rjscsnakkexunvsfhdut` (shared events + books)

## Problem

`public.custom_access_token_hook` (live) injects `app_roles.events` into the JWT from `app_access`. The symmetric events app-gate (to be built, ownership TBC) will require `app_roles.events` (or `platform_role='super_admin'`) and deny `status='suspended'`. The 15-row backfill (PR #23, pending apply) covers **existing** users only. **New** events users get no `app_access` row — nothing writes one (verified: no trigger on `users`/`app_access`, no DB function writes it, edge functions never reference `app_access`). So once the gate is live, the next approved tenant admin or invited teammate is locked out. This fix makes provisioning write the events grant.

## Goal

A new events user receives `app_access(app='events', role=users.role)` at the correct lifecycle point, so they pass the gate on first OTP login.

## Non-goals (tracked separately)

- The symmetric app-gate — **pending** auth-agent ownership confirmation; do not build yet.
- Deploying the events login page — blocked: `myoozz-events-login.html` not present in repo.
- OTP-migrating `register-tenant` (remove password) — spawned as its own task.
- Fixing TaskBoard's malformed invite calls — see Findings.

## Locked decisions

1. **Approval-gated** grants (not at registration) — preserves `pending_review → approve` as the access boundary.
2. **Inline upserts** in the edge functions (no shared `grant_app_access()` RPC) — YAGNI; matches "each app writes its own app rows."
3. **`invite-user` auth fix is in this PR** and is the security-critical change (below).

## Design

### A. `approve-tenant` — grant on activation

Immediately after the existing `tenants.status → 'active'` update (approve path only), upsert events grants for the tenant's users:

```sql
insert into public.app_access (user_id, app, role, granted_by)
select u.id, 'events', u.role, :approver_user_id
from public.users u
where u.tenant_id = :tenant_id and u.role is not null
on conflict (user_id, app) do update set role = excluded.role, granted_at = now();
```

- `:approver_user_id` = `select id from public.users where auth_id = <caller>` (the function already verifies `super_admin` via `getUser()`); audit only, nullable.
- `waitlist` path grants nothing. Idempotent (re-approve safe). `on conflict (user_id, app)` touches only the `events` row → books/crm rows untouched.

### B. `invite-user` — authenticate the caller, then grant ⚠️ SECURITY-CRITICAL

**This is the part to review with full attention.** `invite-user` is **currently unauthenticated** — it inserts a `users` row (any tenant, any role) using only the anon key, with no caller check (unlike `approve-tenant`, which verifies `super_admin`). Adding an `app_access` grant here *without* fixing that turns it into a self-grant access hole: anyone with the public anon key could mint themselves an events grant. The auth check and the grant must land together.

Grant path (when `tenant_id` + `role` are present):

1. Require the caller's **user JWT** (`supabase.functions.invoke` attaches the logged-in session token). `getUser()` → `401` if missing/invalid.
2. Load caller from `users` by `auth_id`: `role, tenant_id, status, platform_role`.
3. Deny if `caller.status === 'suspended'` → `403`.
4. Authorize against the **actual UI rule** (verified from code, not assumed):

   ```
   GRANTS = {
     admin:      ['admin','manager','event_lead','team'],
     manager:    ['event_lead','team'],
     event_lead: ['team'],   // not reachable in UI today; enforced anyway
     team:       []
   }
   allow = (caller.platform_role === 'super_admin')                      // platform escape hatch
        || (caller.tenant_id === body.tenant_id                          // own tenant only
            && (GRANTS[caller.role] ?? []).includes(body.role))          // may grant this role
   // else → 403
   ```

5. On allow: existing invite + `users` insert, then upsert `app_access(user_id, 'events', role, granted_by = caller.id)`.

**Rule provenance (ground truth):** Team page is gated to `['admin','manager']` (`AppShell.jsx:26`, render guard `:804`); `UserManagement` `inviteableRoles` encodes the hierarchy (`admin → all`, `manager → event_lead/team`); `super_admin` is steered *away* from tenant tabs and uses `approve-tenant`/SuperAdminPanel. The `super_admin` override above is **not** surfaced in the UI — included as a deliberate platform escape hatch (consistent with `approve-tenant` trusting `super_admin`). Flag for review: keep it, or strip to admin/manager-only.

`resend_only` path (re-sends invite email, **no grant**): left unchanged in this PR. Note it currently uses the anon key (no caller identity); re-authing it is a minor follow-up, not blocking, since it grants nothing.

### C. `register-tenant` — unchanged

Pending tenants get a `users` row but **no** grant → clean deny until you approve them. (Password/OTP cleanup tracked as a separate task.)

## Idempotency & error handling

- All writes are upserts on `(user_id, app)` → re-approve / re-invite are safe, no duplicates.
- `approve-tenant`: tenant is already `active` before the grant runs; if the grant insert errors, return the error — the tenant stays active and an idempotent re-run completes the grant.
- `invite-user`: order is authorize → invite → `users` insert → grant. **Decision:** if the grant insert fails, return the error but do **not** roll back the `users` insert — the row is harmless without a grant (user just can't pass the gate), and a re-invite upserts the grant. (Reversible; revisit if it causes confusion.)

## Test plan

- Approve a `pending_review` tenant → its admin gets `app_access(events,'admin')` → passes gate.
- admin invites manager / event_lead / team → grant written, each passes gate.
- manager invites event_lead / team → ok; manager invites admin or manager → `403`.
- Anon/unauthenticated call to the grant path → `401/403` (hole closed).
- Suspended caller → `403`.
- Unapproved tenant admin logs in → no grant → clean deny.
- Re-approve / re-invite → no duplicate rows.

## Findings surfaced (separate from this PR)

- ⚠️ **TaskBoard invite buttons** (`TaskBoard.jsx:560`, `:772`) POST `{ email }` only (no `tenant_id`/`role`) → already `400` under the current contract; pre-existing breakage, **not** regressed by this change. Needs its own fix (decide intended behavior: quick-invite-as-team? scoped to event?).
- Events app-gate ownership **pending** auth-agent confirmation — not building.
- `myoozz-events-login.html` not found in repo — deploy step blocked until provided.

## Rollout (ground-truth = Vikram)

Agent prepares code + PR. Deploy (`supabase functions deploy approve-tenant invite-user`) and any live apply are Vikram's. **Sequencing:** these grants must be deployed before the app-gate goes live, and after the #23 backfill lands, so existing + new users are both covered when the gate flips.
