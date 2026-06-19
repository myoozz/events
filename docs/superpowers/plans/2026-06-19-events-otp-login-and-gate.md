# Events OTP Login + AppShell Access Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the React password login with the themed OTP flow (faithful to `myoozz-events-login.html`) and add an `AccessGate` that enforces `app_roles.events` — so only provisioned, non-suspended users reach `/app`. Login + gate ship in one PR; Vikram deploys.

**Architecture:** A pure `evaluateAccess(claims)` decision (node-testable) backs a thin `AccessGate.jsx` composed between `ProtectedRoute` (is-authenticated) and `AppShell` (is-allowed). `LoginPage.jsx` is rewritten to the OTP email→code flow with Cloudflare Turnstile, themed in ME Design-System tokens, in-SPA (keeps `?callbackUrl`). The invite/recovery `setpassword` path is left untouched.

**Tech Stack:** React 18 + Vite, `@supabase/supabase-js@2` (`signInWithOtp`/`verifyOtp`), Cloudflare Turnstile, ME Design System tokens (`src/index.css`). Pure logic tested with `node --test`; UI verified by `npm run build` + a dev-server render check; full OTP/Turnstile E2E is the demo (Vikram).

**Spec:** `docs/superpowers/specs/2026-06-19-events-otp-login-and-gate-design.md`
**Branch:** `feat/events-otp-login-and-gate` (off `main` @ `af85873`, which already includes merged PR #25)
**Behavioral spec for the OTP port:** `~/Documents/Claude/Projects/Myoozz Billing/myoozz-events-login.html` (match its logic exactly).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/accessDecision.js` | **Create** | Pure `evaluateAccess(claims)` → `{allowed, suspended, reason}`. No React/Supabase. |
| `src/lib/accessDecision.test.mjs` | **Create** | `node --test` matrix for the decision. |
| `src/components/AccessGate.jsx` | **Create** | Decode JWT claims from the session → `evaluateAccess` → render children or the themed no-access screen. |
| `src/App.jsx` | **Modify** | Compose `AccessGate` between `ProtectedRoute` and `AppShell` on `/app` and `/app/*`. |
| `src/components/LoginPage.jsx` | **Rewrite** | OTP email→code flow + Turnstile, themed; remove password/forgot/register/pending; keep `setpassword` (invite/recovery) untouched; request-access → `/`. |

---

## Task 1: Pure access decision + tests (TDD)

**Files:** Create `src/lib/accessDecision.js`, `src/lib/accessDecision.test.mjs`

- [ ] **Step 1: Write the failing test** — `src/lib/accessDecision.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAccess } from './accessDecision.js'

test('super_admin is allowed even with no app_roles', () => {
  assert.deepEqual(evaluateAccess({ platform_role: 'super_admin' }), { allowed: true, suspended: false, reason: 'ok' })
})
test('app_roles.events grants access', () => {
  assert.equal(evaluateAccess({ app_roles: { events: 'manager' } }).allowed, true)
})
test('no events grant and not super_admin → denied (no-grant)', () => {
  assert.deepEqual(evaluateAccess({ app_roles: { books: 'owner' } }), { allowed: false, suspended: false, reason: 'no-grant' })
})
test('suspended is denied regardless of role/grant', () => {
  assert.deepEqual(
    evaluateAccess({ status: 'suspended', platform_role: 'super_admin', app_roles: { events: 'admin' } }),
    { allowed: false, suspended: true, reason: 'suspended' },
  )
})
test('empty / missing claims → denied, not a crash', () => {
  assert.equal(evaluateAccess(undefined).allowed, false)
  assert.equal(evaluateAccess({}).allowed, false)
  assert.equal(evaluateAccess(null).reason, 'no-grant')
})
```

- [ ] **Step 2: Run, verify FAIL** — `node --test src/lib/accessDecision.test.mjs` → fails (module missing).

- [ ] **Step 3: Implement** — `src/lib/accessDecision.js`:

```js
// Pure events access decision from decoded JWT claims (the hook injects these
// top-level: app_roles, platform_role, status). No React/Supabase imports so it
// runs under `node --test`. Mirrors the books gate rule (§4): suspended is denied
// regardless of role; else super_admin or an events grant is allowed.
export function evaluateAccess(claims) {
  const c = claims || {}
  if (c.status === 'suspended') return { allowed: false, suspended: true, reason: 'suspended' }
  const allowed = c.platform_role === 'super_admin' || Boolean(c.app_roles && c.app_roles.events)
  return { allowed, suspended: false, reason: allowed ? 'ok' : 'no-grant' }
}
```

- [ ] **Step 4: Run, verify PASS** — `node --test src/lib/accessDecision.test.mjs` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/accessDecision.js src/lib/accessDecision.test.mjs
git commit -m "feat: pure events access-decision + unit tests (gate core) · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `AccessGate.jsx` (decode claims → render app or themed deny)

**Files:** Create `src/components/AccessGate.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useMemo } from 'react'
import { supabase } from '../supabase'
import { evaluateAccess } from '../lib/accessDecision'

// Decode the access token's payload (the hook's claims are top-level). Same
// pattern AppShell/CategoryManager already use. Returns {} on any parse failure.
function readClaims(session) {
  try { return JSON.parse(atob(session.access_token.split('.')[1])) } catch { return {} }
}

// Gate: assumes ProtectedRoute already ensured a session. Renders children when the
// caller has events access; otherwise a finished-state no-access screen (§11).
export default function AccessGate({ session, children }) {
  const verdict = useMemo(() => evaluateAccess(readClaims(session)), [session])
  if (verdict.allowed) return children
  return <NoAccessScreen suspended={verdict.suspended} />
}

function NoAccessScreen({ suspended }) {
  const title = suspended ? 'Account suspended' : 'No access to Myoozz Events'
  const body = suspended
    ? 'Your account has been suspended. Please contact your workspace admin to restore access.'
    : "Your account isn't provisioned for Myoozz Events yet. Ask your admin for access, or request early access below."
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'var(--font-body)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 600,
          color: 'var(--text)', marginBottom: '12px' }}>{title}</div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>{body}</p>
        <button onClick={signOut} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 500,
          fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Sign out</button>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          <a href="/" style={{ color: 'var(--app-accent)', textDecoration: 'none' }}>Request access</a>
          <span style={{ margin: '0 8px' }}>·</span>
          <a href="mailto:hello@myoozz.events" style={{ color: 'var(--app-accent)', textDecoration: 'none' }}>hello@myoozz.events</a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles** — `npm run build` → succeeds (no import/JSX errors). (Full app build; expect success.)

- [ ] **Step 3: Commit**

```bash
git add src/components/AccessGate.jsx
git commit -m "feat: AccessGate — enforces app_roles.events with a books-symmetric deny screen · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire `AccessGate` into `App.jsx`

**Files:** Modify `src/App.jsx`

- [ ] **Step 1: Import** — add near the other component imports: `import AccessGate from './components/AccessGate'`

- [ ] **Step 2: Wrap AppShell on both protected routes.** Replace the two protected `<Route>` elements:

```jsx
          <Route path="/app" element={
            <ProtectedRoute session={session} loading={loading}>
              <AppShell session={session} />
            </ProtectedRoute>
          } />
          <Route path="/app/*" element={
            <ProtectedRoute session={session} loading={loading}>
              <AppShell session={session} />
            </ProtectedRoute>
          } />
```

with (AccessGate nested inside ProtectedRoute, wrapping AppShell):

```jsx
          <Route path="/app" element={
            <ProtectedRoute session={session} loading={loading}>
              <AccessGate session={session}>
                <AppShell session={session} />
              </AccessGate>
            </ProtectedRoute>
          } />
          <Route path="/app/*" element={
            <ProtectedRoute session={session} loading={loading}>
              <AccessGate session={session}>
                <AppShell session={session} />
              </AccessGate>
            </ProtectedRoute>
          } />
```

- [ ] **Step 3: Verify** — `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: gate /app behind AccessGate (authenticated -> has events access) · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `LoginPage.jsx` — OTP rewrite (themed) ⚠️ TURNSTILE = SILENT-FAIL RISK

**Files:** Rewrite `src/components/LoginPage.jsx`

**Behavioral spec:** match `myoozz-events-login.html` exactly for the auth logic. **Keep** the existing `setpassword` invite/recovery `useEffect` + mode verbatim (out of scope). **Remove** the password `handleLogin`, `forgot`, `register`, and `pending` modes/handlers. Theme with ME tokens; fix `var(--font-display)` → `var(--font-heading)`.

### 4a. Constants & Turnstile (port verbatim; the fragile part)

- [ ] **Step 1: Add the OTP/Turnstile logic.** Inside the component:

```jsx
const TURNSTILE_SITE_KEY = '0x4AAAAAADnhp7DQPweu84iy'  // matches Supabase Auth → Bot & Abuse
const APP_HOME = '/app'

// --- Turnstile (explicit render; tokens are single-use → reset after every send) ---
const turnstileRef = useRef(null)
const widgetIdRef = useRef(null)
const [cfToken, setCfToken] = useState(null)

useEffect(() => {
  if (!TURNSTILE_SITE_KEY || mode !== 'login') return
  window.__cfReady = () => {
    if (widgetIdRef.current != null) return
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (t) => setCfToken(t),
    })
  }
  if (window.turnstile) { window.__cfReady() }
  else if (!document.getElementById('cf-turnstile-script')) {
    const s = document.createElement('script')
    s.id = 'cf-turnstile-script'
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__cfReady'
    s.async = true; s.defer = true
    document.head.appendChild(s)
  }
}, [mode])

function resetCaptcha() {
  if (TURNSTILE_SITE_KEY && window.turnstile && widgetIdRef.current != null) {
    setCfToken(null); window.turnstile.reset(widgetIdRef.current)
  }
}
```

### 4b. Send code + verify (faithful to the HTML)

- [ ] **Step 2: Handlers.**

```jsx
async function handleSendCode(e) {
  e.preventDefault()
  setError('')
  if (TURNSTILE_SITE_KEY && !cfToken) { setError('Please complete the "I\'m human" check, then try again.'); return }
  setLoading(true)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken: cfToken || undefined },
  })
  resetCaptcha()
  setLoading(false)
  if (error) {
    setError(/signups? not allowed|not allowed for otp|user not found/i.test(error.message)
      ? "We couldn't find an account for that email. Ask your admin for an invite, or request access below."
      : error.message)
    return
  }
  setMode('otp')
}

async function handleVerify(e) {
  e.preventDefault()
  if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your email.'); return }
  setLoading(true); setError('')
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) { setLoading(false); setError('That code is invalid or expired. Try again or resend.'); return }

  // Post-verify greet read (RLS users_read_own = email = auth.email(); safe post-GAP-1).
  const { data: profile } = await supabase
    .from('users').select('full_name, status').eq('auth_id', data.user.id).maybeSingle()
  setLoading(false)
  if (!profile) setSuccess('Signed in, but your profile isn\'t set up yet. Please contact your admin.')
  else if (profile.status && profile.status !== 'active') setSuccess(`Your account status is "${profile.status}". Contact your admin.`)

  // Honor ?callbackUrl (same-origin) else APP_HOME — reuse App.jsx's convention.
  const params = new URLSearchParams(window.location.search)
  const cb = params.get('callbackUrl')
  const dest = (cb && cb.startsWith('/')) ? cb : APP_HOME
  setTimeout(() => { window.location.href = dest }, 1000)
}
```

- [ ] **Step 3: Email is lowercased on send.** The email input's value is stored `.trim().toLowerCase()` before `signInWithOtp` (the login-side half of the email-case guard).

### 4c. Structure, theming, removals

- [ ] **Step 4: Restructure render.** Modes: **`login`** (email + Turnstile container `<div ref={turnstileRef} id="cf-turnstile" />` + "Send code"), **`otp`** (6-digit input, numeric-only, "Verify & sign in", Resend with 30s cooldown, "Use a different email" → back to `login`), brief success via `SuccessBox`. **Keep** `setpassword` mode + its mount `useEffect` verbatim. **Remove** `handleLogin`/password inputs, the `forgot` + `register` + `pending` modes and `handleForgotPassword`/`handleRegister`. The "New to Myoozz Events? / Request access" footer link becomes a router link/`window.location.href = '/'` (GatePage). Reuse the existing `inputStyle`/`labelStyle`/`primaryBtn`/`ErrorBox`/`SuccessBox` helpers; **change `var(--font-display)` → `var(--font-heading)`** in the Header lockup.

- [ ] **Step 5: Verify** — `npm run build` → succeeds (no unused-import/JSX errors; confirm no remaining `signInWithPassword`/register references).

- [ ] **Step 6: Commit**

```bash
git add src/components/LoginPage.jsx
git commit -m "feat: OTP email-code login (themed ME), Turnstile, request-access -> /; drop password/forgot/register · $(TZ=Asia/Kolkata date '+%d %b %Y, %H:%M IST')" -m "Faithful port of myoozz-events-login.html logic (signInWithOtp shouldCreateUser:false / verifyOtp type:email / Turnstile explicit-render + reset). setpassword invite/recovery path untouched. Keeps ?callbackUrl. Fixes --font-display drift -> --font-heading." -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Build + render verification, then PR

- [ ] **Step 1: Full build** — `npm run build` → succeeds.
- [ ] **Step 2: Dev-server render check** (controller, via preview tools): start the dev server, load `/login` → confirm the themed OTP page renders (Cormorant heading, DM Sans body, #BC1723 button — no Inter, no unstyled `--font-display`), the Turnstile container mounts and the CF script loads, **no console errors**; screenshot. (The `/app` deny screen needs a crafted no-grant session — left to the demo; the decision is unit-tested.)
- [ ] **Step 3: Push + open ONE PR** (login + gate), base `main`:

```bash
git push -u origin feat/events-otp-login-and-gate
gh pr create --repo myoozz/events --base main --title "feat: events OTP login (themed) + AppShell access gate" --body "<see body below>"
```

PR body: summarize the OTP port (faithful logic, ME theme, Turnstile key wired), the AccessGate (§4 rule + §11 deny contract), removals (password/forgot/register self-serve → request-access to `/`), `setpassword` untouched, `?callbackUrl` kept. **Deploy = Vikram** (Netlify static build), **ship together** (login + gate), after PR #25 functions are live (done). Demo test plan: OTP sign-in → `/app`; Turnstile blocks until passed + resend works; unknown email → friendly msg; gate: super_admin in, events-grant in, no-grant → "No access to Myoozz Events", suspended → "Account suspended", sign-out/way-out work; themed (no Inter). 🤖 Generated with Claude Code.

---

## Self-Review

- **Spec coverage:** OTP login faithful logic (Task 4a/4b) ✓ · Turnstile exact wiring + reset (4a) ✓ · themed ME tokens + `--font-display` fix (4c) ✓ · request-access → `/`, register removed (4c) ✓ · `setpassword` untouched (4c) ✓ · `?callbackUrl` kept (4b) ✓ · AccessGate §4 rule + §11 deny titles (Task 1–2) ✓ · dedicated component between ProtectedRoute/AppShell (Task 3) ✓ · GAP-1 post-verify read + login-side lowercase (4b/4c) ✓ · ship-together one PR (Task 5) ✓.
- **Placeholder scan:** none — full code for the pure decision, AccessGate, App wiring, and all OTP/Turnstile logic; the styled-JSX assembly in 4c reuses existing, named helpers (not a placeholder).
- **Type/name consistency:** `evaluateAccess(claims)` → `{allowed, suspended, reason}` used identically in tests and `AccessGate`. `readClaims` decodes `session.access_token`. `TURNSTILE_SITE_KEY`/`cfToken`/`widgetIdRef` consistent across 4a/4b. `APP_HOME='/app'` matches the route.
- **Out of scope (unchanged):** email-lowercase write-side (spawned `task_2f2b12c0`); invite-OTP/`setpassword` migration; register-tenant; books gate.
