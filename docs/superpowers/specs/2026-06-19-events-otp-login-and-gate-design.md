# Events OTP Login (themed) + AppShell Access Gate — Design

- **Date:** 2026-06-19
- **Lane:** events (Myoozz unified passwordless-OTP auth) — the in-app half of the gate-hold
- **Status:** design / pre-implementation (no code yet)
- **Branch (planned):** `feat/events-otp-login-and-gate` (off `main` @ `7f2bf38`)
- **Ships with:** provisioning grants (PR #25) must be deployed first; login + gate ship together in one PR/deploy.

## Problem / goal
The platform moved to passwordless email-OTP. Books built only the **login page** (handed over as a standalone HTML) and the shared Supabase config (SMTP, Turnstile, OTP template, URL allow-list). The **events side** owns: (1) replacing the React password login with the OTP flow, themed in the ME Design System and kept in-SPA; and (2) the **AppShell access gate** that enforces `app_roles.events` (symmetric with the books gate). Today `App.jsx` `ProtectedRoute` only checks *is there a session* — any authenticated user reaches `/app`. This build closes that.

> **Gate rule source:** the handover I received runs §1–§10; §11 was not provided. Building to the **§4** rule (which fully specifies a books-symmetric gate). If §11 adds detail, fold it in at review.

## Locked decisions (from Vikram)
- **Port the OTP logic into React `LoginPage.jsx`** (Option 2) — re-implement `signInWithOtp`/`verifyOtp`/Turnstile faithfully, themed in ME Design System, in-SPA so `?callbackUrl` + register/early-access keep working. Do **not** bolt on the standalone HTML.
- `myoozz-events-login.html` (at `~/Documents/Claude/Projects/Myoozz Billing/`) is the **behavioral spec** — match it exactly.
- Gate built in the same pass; login + gate ship together.

## Non-goals (tracked separately)
- Provisioning grants (PR #25 — deploy first).
- The invite/recovery-link (`setpassword`) flow → belongs to the invite-OTP migration (see Open decisions).
- `register-tenant` password removal (spawned `task_f308f16d`).
- Books gate (already built by books-auth).

---

## Part A — OTP login (rewrite `src/components/LoginPage.jsx`, themed)

### A1. Faithful logic (from the HTML — match exactly)
- **Send code:** `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, captchaToken } })`. Email is `.trim().toLowerCase()`. On the Supabase "signups not allowed / user not found" error, show the friendly *"We couldn't find an account for that email — ask your admin for an invite, or request access."* (provisioned-users-only is intentional).
- **Verify:** `supabase.auth.verifyOtp({ email, token, type: 'email' })`; token is 6 digits.
- **Post-verify read (the GAP-1 surface):** `supabase.from('users').select('id,full_name,status,tenant_id,role,platform_role').eq('auth_id', data.user.id).maybeSingle()`. On `!profile` → "profile isn't set up yet — contact your admin"; on `status !== 'active'` → status message. (Confirmed safe post-GAP-1: `users_read_own = (email = auth.email())` is JWT-email-based, `tenant_id`-independent — see GAP-1 note.)
- **Redirect:** honor `?callbackUrl` when same-origin (`startsWith('/')`), else `APP_HOME = '/app'` — reuse the existing `postLoginDestination()` convention from `App.jsx`, so deep-links survive (improves on the HTML, which always lands `/app`).

### A2. Turnstile (the fragile part — get it exactly right; CAPTCHA is live project-wide, wrong wiring fails login silently)
- Constant `TURNSTILE_SITE_KEY = '0x4AAAAAADnhp7DQPweu84iy'`.
- In a `useEffect` on the email step: inject `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__cfReady">` once; `window.__cfReady` calls `window.turnstile.render(ref, { sitekey, callback: t => setCfToken(t) })`; store the widget id. Clean up on unmount.
- Render a `<div ref={turnstileRef}>` in the email step.
- **Send-code guard:** if `TURNSTILE_SITE_KEY && !cfToken` → show "complete the human check" and abort (do NOT call signInWithOtp).
- Pass `captchaToken: cfToken` to `signInWithOtp`. **After every send (success or fail), reset** the widget (`window.turnstile.reset(widgetId)`) and clear `cfToken` — tokens are single-use (needed for resend).

### A3. Structure & theming
- Replace the password `mode='login'` with a two-step flow: **`email`** (email + Turnstile + "Send code") → **`otp`** (6-digit input + "Verify & sign in" + Resend (30s cooldown) + "Use a different email"). Keep a brief **success** state, then redirect.
- **Theme with real ME tokens** (reuse `LoginPage`'s existing style helpers; the handed-over Inter/red is NOT used): `--font-heading` (Cormorant Garamond) for the title, `--font-body` (DM Sans) for everything else, `--app-accent` (#BC1723) for the primary button, plus `--bg/--text/--text-tertiary/--border/--border-strong/--radius-sm/--state-danger(-bg)/--state-success(-bg)`. **Fix the `--font-display` → `--font-heading` drift** while here.
- Keep the existing card/Header shell and the "events by myoozz" lockup.
- **"Request access" → `/` (GatePage early-access funnel).** The full `register-tenant` **self-serve signup mode is REMOVED** from `LoginPage` (decision: no self-provisioning around the gate; single invitation funnel). Remove the `register` form/handler and the post-register `pending` mode. (`register-tenant` edge fn becomes unused-by-login — leave it in place, not this PR's concern.)
- **Remove** the "Forgot password?" link/mode (dead under OTP).

---

## Part B — AppShell access gate (symmetric with books, §4)

### B1. Where
A new focused component `src/components/AccessGate.jsx`, composed in `App.jsx` **inside** the protected routes, after `ProtectedRoute`'s session check and wrapping `<AppShell>`:
`ProtectedRoute (session?) → AccessGate (app access?) → AppShell`. Keeps `ProtectedRoute` single-purpose; `AccessGate` owns the access decision + deny screen.

### B2. Claims read (client-side, the established pattern)
Decode the JWT once from the session: `JSON.parse(atob(session.access_token.split('.')[1]))` → read top-level `app_roles`, `platform_role`, `status` (same decode `CategoryManager.jsx`/`AppShell.jsx` already use; the hook injects these as top-level claims per §4).

### B3. Rule (§4, exact)
```
const hasAccess = payload.platform_role === 'super_admin' || Boolean(payload.app_roles?.events)
const suspended = payload.status === 'suspended'
// suspended → deny regardless of role; else hasAccess → render AppShell; else → deny
```

### B4. No-access screen (themed, "finished state", symmetric with books)
A clean centered card (ME tokens), **finished/terminal state** with no app chrome behind it, matching the books deny-screen contract (§11). Two variants by exact title:
- not provisioned (no `app_roles.events`, not super_admin): title **"No access to Myoozz Events"**, body explaining the account isn't provisioned for Events.
- suspended (`status==='suspended'`): title **"Account suspended"**, body to contact admin.
Both: a **way out** — **Sign out** button (`supabase.auth.signOut()` → `/login`) and a secondary link to **`/`** (request access) / `mailto:hello@myoozz.events`.
(§11 was provided as a placeholder, not pasted — built to the inline contract above; reconcile exact copy/labels if the full §11 lands.)

---

## GAP-1 interaction (verified live 19 Jun)
GAP-1 did **not** touch `public.users` RLS. SELECT policies: `users_read_own = (email = auth.email())` (JWT-email, tenant_id-independent) + `users_read_tenant`. So a freshly-authenticated session's self-read (login A1 read, and `AccessGate`/`RoleGate` reads) **succeeds** — no false "profile not set up" from GAP-1.
⚠️ **Email-case guard (real, adjacent):** that policy matches on email, and Supabase lowercases `auth.email()` while provisioning stores `public.users.email` as typed. A mixed-case invite → `users.email != auth.email()` → null read → the same symptom.
- **In this PR (login side):** the port lowercases the email on send (`.trim().toLowerCase()`), as the HTML does. Covered.
- **Write side (separate follow-up, NOT this PR):** `invite-user`/`register-tenant` should store `.toLowerCase()` email so `public.users.email` matches. Those are PR #25's files (provisioning branch), so this is **spawned as a follow-up sequenced with #25** to keep the login+gate branch independent off `main`. The common case (already-lowercase invites) works without it.

## Ship-together
Login + gate land in one PR and deploy as one step. Deploying the login alone (so users can OTP-sign-in) without the gate would leave a window where `AppShell` renders for users lacking `app_roles.events`. Build order is irrelevant to risk as long as they merge/deploy together — after PR #25's functions are deployed and the #23 backfill is confirmed (done).

## Resolved decisions (Vikram, at review)
1. **"Request access" → `/` (GatePage early-access)** — single invitation funnel. The `register-tenant` self-serve mode is **removed** from `LoginPage` (no provisioning around the gate).
2. **Invite/recovery `setpassword` flow — left untouched** in this PR (the invite-OTP migration's concern, separate PR; existing invite links keep working).
3. **Dedicated `AccessGate.jsx`** between `ProtectedRoute` and `AppShell` — keeps "authenticated" and "has events access" as distinct checks.
4. **Deny-screen contract per §11** — finished state; titles "No access to Myoozz Events" / "Account suspended"; sign-out + way-out to `/`. (§11 block came through as a placeholder; built to the inline contract — paste full §11 to reconcile exact copy if needed.)
5. **Turnstile gets invite-user-level scrutiny** in the build (silent-fail risk).

## Test plan
- Provisioned active user → OTP sign-in → lands `/app` (or `?callbackUrl`).
- Turnstile: send blocked until the check passes; resend works (token reset); a screen without the key would fail — confirm the key is wired.
- Unknown email → friendly "ask your admin" (no account enumeration beyond Supabase's own response).
- Gate: super_admin → in; user with `app_roles.events` → in; user without → no-access screen; `status:'suspended'` → denied regardless of role; sign-out + way-out work.
- GAP-1: a normal user does NOT see "profile not set up"; a mixed-case-email user is handled (post email-lowercase guard).
- Theming: Cormorant heading + DM Sans body + #BC1723 accent render (no Inter, no undefined `--font-display`).

## Rollout (ground truth = Vikram)
Agent builds + opens one PR. Vikram reviews, deploys the static build (Netlify) — login + gate together — and runs the test plan. Green here = the **gate half** of the hold; combined with PR #25's green checklist (provisioning half), the hold lifts and we run the joint end-to-end test.
