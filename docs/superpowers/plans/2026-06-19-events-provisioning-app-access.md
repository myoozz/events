# Events Provisioning → app_access Grants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make events provisioning write an `app_access(app='events', role=users.role)` grant for new users — at tenant approval and at teammate invite — so they pass the (forthcoming) app gate; and close the unauthenticated self-grant hole in `invite-user`.

**Architecture:** Two Supabase Edge Functions (Deno/TS) gain inline `app_access` upserts (no shared RPC). `invite-user` additionally gains caller-JWT authentication + a role-grant hierarchy check. The hierarchy logic is extracted to a pure, dependency-free JS module so it can be unit-tested with Node's built-in runner (matching the repo's existing `link.js` / `link.test.mjs` pattern). Supabase-dependent paths are verified by an integration checklist run on demo at deploy time.

**Tech Stack:** Supabase Edge Functions (Deno, `@supabase/supabase-js@2`), Postgres (`app_access`, `users`), Node `node:test` for pure-logic unit tests.

**Spec:** `docs/superpowers/specs/2026-06-19-events-provisioning-app-access-design.md`
**Branch:** `feat/events-provisioning-app-access` (off synced `main` @ `7f2bf38`)
**Ground truth:** Agent prepares code + PR. `supabase functions deploy …` and any live apply are Vikram's. Deploy these grants **before** the app gate goes live and **after** the #23 backfill lands.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/functions/_shared/invite-authz.js` | **Create** | Pure authorization logic: `EVENTS_ROLES`, `GRANTS` matrix, `authorizeInvite(caller, target)`. No Deno/Supabase imports. |
| `supabase/functions/_shared/invite-authz.test.mjs` | **Create** | `node --test` unit tests for the full authz matrix. |
| `supabase/functions/invite-user/index.ts` | **Modify** | Add caller-JWT auth + `authorizeInvite` + inline `app_access` grant (grant path only; `resend_only` unchanged). |
| `supabase/functions/approve-tenant/index.ts` | **Modify** | After tenant activation, inline-upsert `app_access` grants for the tenant's users. |

Why a separate `invite-authz.js`: the role-grant hierarchy is the security-critical decision and the one piece that is pure and unit-testable. Extracting it (a) lets `node --test` cover every branch, (b) keeps `invite-user/index.ts` readable. This is logic extraction for testing — **not** the shared grant RPC we explicitly declined; the `app_access` write stays inline in each function.

---

## Task 1: Pure invite-authorization module (TDD)

**Files:**
- Create: `supabase/functions/_shared/invite-authz.js`
- Test: `supabase/functions/_shared/invite-authz.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/invite-authz.test.mjs`:

```js
// Unit tests for invite authorization (who may grant which events role).
// Runtime-agnostic: runs under Node's built-in runner with `node --test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorizeInvite, GRANTS, EVENTS_ROLES } from './invite-authz.js'

const T1 = 'tenant-1', T2 = 'tenant-2'
const caller = (over = {}) => ({ id: 'u1', role: 'admin', tenantId: T1, platformRole: null, status: 'active', ...over })

test('null caller → 401', () => {
  assert.deepEqual(authorizeInvite(null, { tenantId: T1, role: 'team' }), { ok: false, status: 401, error: 'Not authenticated' })
})

test('suspended caller → 403', () => {
  assert.equal(authorizeInvite(caller({ status: 'suspended' }), { tenantId: T1, role: 'team' }).status, 403)
})

test('invalid/non-events target role → 400 (even for super_admin)', () => {
  assert.equal(authorizeInvite(caller(), { tenantId: T1, role: 'owner' }).status, 400)
  assert.equal(authorizeInvite(caller({ platformRole: 'super_admin' }), { tenantId: T1, role: 'finance' }).status, 400)
  assert.equal(authorizeInvite(caller(), { tenantId: T1, role: 'nonsense' }).status, 400)
})

test('super_admin may grant any events role in any tenant', () => {
  for (const role of EVENTS_ROLES) {
    assert.equal(authorizeInvite(caller({ role: 'team', platformRole: 'super_admin', tenantId: T2 }), { tenantId: T1, role }).ok, true)
  }
})

test('admin may grant every events role within own tenant', () => {
  for (const role of EVENTS_ROLES) {
    assert.equal(authorizeInvite(caller({ role: 'admin' }), { tenantId: T1, role }).ok, true)
  }
})

test('manager may grant event_lead/team only', () => {
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'event_lead' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'team' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'manager' }).status, 403)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'admin' }).status, 403)
})

test('event_lead may grant team only; team may grant nothing', () => {
  assert.equal(authorizeInvite(caller({ role: 'event_lead' }), { tenantId: T1, role: 'team' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'event_lead' }), { tenantId: T1, role: 'event_lead' }).status, 403)
  assert.equal(authorizeInvite(caller({ role: 'team' }), { tenantId: T1, role: 'team' }).status, 403)
})

test('cross-tenant grant denied for non-super_admin', () => {
  assert.equal(authorizeInvite(caller({ role: 'admin', tenantId: T1 }), { tenantId: T2, role: 'team' }).status, 403)
})

test('GRANTS/EVENTS_ROLES shape guards', () => {
  assert.deepEqual(EVENTS_ROLES, ['admin', 'manager', 'event_lead', 'team'])
  assert.deepEqual(GRANTS.manager, ['event_lead', 'team'])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/functions/_shared/invite-authz.test.mjs`
Expected: FAIL — `Cannot find module './invite-authz.js'` (module not created yet).

- [ ] **Step 3: Write the minimal implementation**

Create `supabase/functions/_shared/invite-authz.js`:

```js
// Pure authorization for events invites: who may grant which events role.
// No Deno/Supabase imports, so it runs under `node --test` and imports cleanly
// into the Deno edge function. The app_access write stays inline in invite-user.

export const EVENTS_ROLES = ['admin', 'manager', 'event_lead', 'team']

// Roles each caller role may grant (the live UI rule: AppShell Team tab gated to
// admin/manager; UserManagement inviteableRoles hierarchy).
export const GRANTS = {
  admin:      ['admin', 'manager', 'event_lead', 'team'],
  manager:    ['event_lead', 'team'],
  event_lead: ['team'],
  team:       [],
}

// caller: { id, role, tenantId, platformRole, status } | null
// target: { tenantId, role }
// returns { ok: boolean, status: number, error?: string }
export function authorizeInvite(caller, target) {
  if (!caller) return { ok: false, status: 401, error: 'Not authenticated' }
  if (caller.status === 'suspended') return { ok: false, status: 403, error: 'Account suspended' }
  if (!target || !EVENTS_ROLES.includes(target.role)) {
    return { ok: false, status: 400, error: 'Invalid events role' }
  }
  // Platform escape hatch — deliberate, not surfaced in the UI.
  if (caller.platformRole === 'super_admin') return { ok: true, status: 200 }
  // Own tenant only.
  if (!caller.tenantId || caller.tenantId !== target.tenantId) {
    return { ok: false, status: 403, error: 'Cannot invite into another tenant' }
  }
  // Role-grant hierarchy.
  if (!(GRANTS[caller.role] ?? []).includes(target.role)) {
    return { ok: false, status: 403, error: `Role '${caller.role}' cannot grant '${target.role}'` }
  }
  return { ok: true, status: 200 }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test supabase/functions/_shared/invite-authz.test.mjs`
Expected: PASS — all tests green (`# pass <N>`, `# fail 0`).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/invite-authz.js supabase/functions/_shared/invite-authz.test.mjs
git commit -m "feat: pure invite-authorization module + unit tests (events role hierarchy) · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `invite-user` — caller auth + authz + grant ⚠️ SECURITY-CRITICAL

**Files:**
- Modify: `supabase/functions/invite-user/index.ts` (full replacement below)

The grant path now: authenticate the caller's JWT → load caller → `authorizeInvite` → invite → insert user → **inline `app_access` grant**. The `resend_only` path is unchanged (re-emails only, no grant; still anon-key callable — out of scope per spec).

- [ ] **Step 1: Replace `invite-user/index.ts` with the authenticated version**

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authorizeInvite } from '../_shared/invite-authz.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, tenant_id, role, full_name, resend_only } = await req.json()
    if (!email) return json({ error: 'email is required' }, 400)
    if (!resend_only && (!tenant_id || !role)) return json({ error: 'tenant_id and role are required' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── resend_only: re-fire the invite email only. No user/grant change, no new auth. ──
    if (resend_only) {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      if (inviteError) throw inviteError
      return json({ success: true })
    }

    // ── grant path: authenticate + authorize the caller BEFORE creating anything ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid or expired token' }, 401)

    const { data: caller, error: callerErr } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, status, platform_role')
      .eq('auth_id', user.id)
      .single()
    if (callerErr || !caller) return json({ error: 'Caller not provisioned' }, 403)

    const verdict = authorizeInvite(
      { id: caller.id, role: caller.role, tenantId: caller.tenant_id, platformRole: caller.platform_role, status: caller.status },
      { tenantId: tenant_id, role },
    )
    if (!verdict.ok) return json({ error: verdict.error }, verdict.status)

    // ── authorized: invite + create user row + grant events access ──
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (inviteError) throw inviteError
    const authUserId = inviteData?.user?.id
    if (!authUserId) throw new Error('No auth user ID returned from invite')

    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUserId,
        email,
        full_name: full_name ?? '',
        role,
        tenant_id,
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (insertErr) throw insertErr

    // Inline app_access grant (mirrors users.role). user row exists even if this
    // fails — a re-invite upserts it; we surface the error rather than rolling back.
    const { error: grantErr } = await supabaseAdmin
      .from('app_access')
      .upsert(
        { user_id: newUser.id, app: 'events', role, granted_by: caller.id },
        { onConflict: 'user_id,app' },
      )
    if (grantErr) return json({ error: `User created but access grant failed; re-invite to retry: ${grantErr.message}` }, 500)

    // MSG91 — team invite branded companion email (best-effort)
    try {
      const { sendEmail } = await import('../_shared/msg91.ts')
      await sendEmail(email, 'me_team_invite_email', {
        inviter_name: 'Your team admin',
        company_name: 'your workspace',
        role,
        invite_link: 'https://myoozz.events',
      })
    } catch (err) {
      console.error('MSG91 invite error:', err)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
```

- [ ] **Step 2: Re-run the authz unit tests (the imported logic is unchanged — confirm still green)**

Run: `node --test supabase/functions/_shared/invite-authz.test.mjs`
Expected: PASS (unchanged). Confirms the module `invite-user` imports is intact.

- [ ] **Step 3: (Optional) Type-check the function if Deno is installed locally**

Run: `deno check supabase/functions/invite-user/index.ts` (skip if `deno` is not installed — full verification is the deploy-time checklist in Task 4).
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/invite-user/index.ts
git commit -m "feat: invite-user requires caller auth + role-grant hierarchy, grants events app_access (closes anon self-grant hole) · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "SECURITY-CRITICAL: invite-user was anon-callable; grant path now verifies the caller JWT, enforces authorizeInvite, then upserts app_access(events). resend_only path unchanged." -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `approve-tenant` — grant on activation

**Files:**
- Modify: `supabase/functions/approve-tenant/index.ts` (insert one block in the `action === 'approve'` branch, after the successful `tenants` update at lines ~100-116, before the MSG91 block at ~118)

- [ ] **Step 1: Insert the grant block after activation succeeds**

Immediately after the existing `if (updateError) { … }` guard (i.e. once the tenant is confirmed `active`) and before the `// MSG91 — workspace approved` comment, insert:

```ts
    // ── Grant events app_access to the tenant's users (inline upsert; mirrors users.role).
    //    Approval is the access boundary, so this is where new tenants get in. ──
    const { data: approver } = await supabase
      .from('users').select('id').eq('auth_id', user.id).single()

    const { data: tenantUsers } = await supabase
      .from('users').select('id, role').eq('tenant_id', tenant_id).not('role', 'is', null)

    if (tenantUsers && tenantUsers.length) {
      const grants = tenantUsers.map((u) => ({
        user_id: u.id, app: 'events', role: u.role, granted_by: approver?.id ?? null,
      }))
      const { error: grantError } = await supabase
        .from('app_access').upsert(grants, { onConflict: 'user_id,app' })
      if (grantError) {
        // Tenant is already active; a re-approve is idempotent and re-applies grants.
        return new Response(
          JSON.stringify({ success: false, error: 'Tenant activated but access grant failed; re-approve to retry: ' + grantError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }
```

(`user` is already in scope — it's the `getUser()` result the function uses for the `super_admin` check. `supabase` is the existing service-role client.)

- [ ] **Step 2: (Optional) Type-check if Deno is installed**

Run: `deno check supabase/functions/approve-tenant/index.ts` (skip if no `deno`).
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/approve-tenant/index.ts
git commit -m "feat: approve-tenant grants events app_access on activation (inline upsert) · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Integration verification + PR

The Supabase-dependent paths (getUser, DB upserts, the auth invite) can't be unit-tested in this repo. Verify against **demo** (`demo.myoozz.events` / the shared project) at deploy time — **Vikram deploys and runs this**; do not deploy from the agent.

- [ ] **Step 1: Open the PR (agent)**

```bash
git push -u origin feat/events-provisioning-app-access
gh pr create --repo myoozz/events --base main \
  --title "feat: events provisioning grants app_access (+ invite-user auth fix)" \
  --body "Implements docs/superpowers/specs/2026-06-19-events-provisioning-app-access-design.md. SECURITY-CRITICAL: invite-user now authenticates the caller and enforces the role-grant hierarchy before granting. approve-tenant grants on activation. register-tenant untouched. Deploy AFTER #23 backfill lands and BEFORE the app gate goes live. 🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Deploy to the shared project (Vikram)**

```bash
supabase functions deploy invite-user approve-tenant --project-ref rjscsnakkexunvsfhdut
```

- [ ] **Step 3: Verify on demo (checklist — each must hold)**

1. **Approve flow:** approve a `pending_review` test tenant → `select role,count(*) from app_access where app='events'` includes the tenant admin (`admin`). Admin can log in and is not denied.
2. **Invite (admin):** as a tenant admin, invite a `team`/`manager`/`event_lead` → new `app_access(events, <role>)` row appears; invitee passes the gate on first OTP login.
3. **Hierarchy enforced:** as a `manager`, invite `event_lead`/`team` → OK; attempt `admin`/`manager` → `403`.
4. **Self-grant hole closed:** `curl` the function with the anon key only (no user JWT) on the grant path → `401`; with a non-admin user's JWT inviting into another tenant → `403`.
5. **Suspended caller:** a suspended user's JWT → `403`.
6. **Idempotency:** re-approve / re-invite → no duplicate `app_access` rows (unique `(user_id, app)` holds), role updated.
7. **Books untouched:** `select app,role,count(*) from app_access group by 1,2` → the 2 `books` rows unchanged.

- [ ] **Step 4: Record result** in the PR thread; on green, signal the gate hold can lift (after the #23 backfill is confirmed at 15 rows).

---

## Self-Review

- **Spec coverage:** approve-tenant grant (Task 3) ✓ · invite-user auth+hierarchy+grant (Tasks 1–2) ✓ · register-tenant untouched (no task — correct) ✓ · super_admin override (GRANTS bypass, tested) ✓ · idempotent upserts (tested via checklist) ✓ · suspended denial (unit + checklist) ✓.
- **Placeholder scan:** none — full code in every code step; the only "optional" steps are `deno check` (explicitly optional, with a stated fallback).
- **Type/name consistency:** `authorizeInvite(caller, target)` signature and the `{id, role, tenantId, platformRole, status}` caller shape match between `invite-authz.js`, the tests, and `invite-user/index.ts`. `onConflict: 'user_id,app'` matches the live `UNIQUE (user_id, app)`. `app='events'` and events-vocab roles match the (post-#24) CHECK.
- **Out of scope (unchanged):** app gate (pending ownership), login-page deploy (missing file), TaskBoard quick-invite (spawned task), register-tenant password/OTP (spawned task), `resend_only` anon path (flagged).
