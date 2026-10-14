# ME — Dashboard role-routing fix · agent brief · 14 Oct 2026

Base: `origin/main` at `1324f16` (PR #42 merge, live on myoozz.events since 07:37 UTC 14 Oct).
Branch: `fix/dashboard-role-routing` (this file is its first commit). One PR. Vikram merges.

## Why (verified on main 1324f16, 14 Oct)
1. **Rules-of-hooks crash.** `src/components/Dashboard.jsx` declares 15 `useState` + 1 `useEffect`, then returns early for `manager` / `event_lead` / `team` / `staff` (lines ~111–114), then declares 10 more `useState`, more `useEffect`s and 4 `useMemo`s (lines ~116–410). When the role changes after first render the hook count changes → React error #300 for every non-admin.
2. **Non-admins can never open an event.** The panels receive `onOpenEvent={setOpenEvent}`, but the `if (openEvent) return <EventPage …/>` check sits at line ~455, *after* the role early-returns. Setting openEvent re-renders straight back into the panel. Same reason notification deep links only work for admins.
3. **AppShell fails open to admin.** `AppShell.jsx` lines ~78–112: a 4-second timeout, a missing `users` row, or any error all call `setUserRole('admin')` and `setUserId(session.user.id)` (an auth uid, not a users.id — wrong id type for notifications and everything keyed on users.id). A slow manager login therefore renders admin first, then flips to manager → crash #300. Lookup is by `email` with `.single()`.

## Fix — exact shape
### Dashboard.jsx → split into a router and the admin body
- New top-level `Dashboard` (the default export, same props as today: `userRole, session, userName, userId, resetKey, deepLink`) holds ONLY:
  - `openEvent`, `initialTab`, `forceTab` state;
  - the existing deep-link `useEffect` (fetch event by id → `setForceTab`, `setOpenEvent`);
  - the existing `resetKey` effect (clear openEvent, reset initialTab).
  - Render order: `if (!userRole) return <LoadingSkeleton …/>` → `if (openEvent) return <EventPage …/>` (moved up from the admin body, same props incl. `forceTab`; `onBack` clears all three) → role switch: manager → `ProjectHeadPanel`, event_lead → `ManagerPanel`, team → `TeamPanel`, staff → `StaffPanel`, otherwise `<AdminDashboard …/>`.
  - Panels keep `onOpenEvent`, now wired to a function that sets `openEvent` (and `initialTab` if given).
- Rename the current body to `function AdminDashboard({ userRole, session, userName, userId, onOpenEvent, onOpenEventWithTab, onEventUpdated })` in the same file. Move every remaining hook into it unchanged. Replace its direct `setOpenEvent(ev)` / `setInitialTab(tab)` calls (lines ~768, ~922–929) with the passed callbacks. `handleUpdated` keeps updating its own lists and calls `onEventUpdated(updatedEvent)` so the router can refresh `openEvent`.
- No behaviour change for admins. No visual change. Do not touch the panels' internals.

### AppShell.jsx → fail closed
- Look the user up by `auth_id = session.user.id` (`.maybeSingle()`), not by email.
- Remove every `setUserRole('admin')` fallback and the 4-second timeout that sets admin.
- States: loading → existing loading UI; found → as today; not found or error → render the existing `ErrorState` primitive from `src/components/ui` with "Couldn't load your profile." and Retry (re-runs fetchUser). Never set `userId` to an auth uid.
- Keep `setUserLoading(false)` in `finally`.

## Out of scope (note in PR, don't fix)
- "Delete permanently" in the event card menu contradicts the no-hard-delete rule — needs a decision.
- `StaffPanel` unreachable (DB CHECK forbids role `staff`).
- The 28 `window.confirm()/alert()` calls (e.g. Dashboard duplicate-event alerts at ~255/275) — UX phase.
- CLAUDE.md on main is stale (orange accent, Bricolage/Inter). Design truth is `src/index.css` V2 tokens. Don't apply CLAUDE.md colour/font rules to this PR.

## Verify before opening the PR
1. `npm ci && npm run build` passes.
2. Grep proof: in `Dashboard.jsx`, no `use[A-Z]` call appears after any `return` inside the same component. Paste the line numbers in the PR.
3. Local, with a placeholder `.env`: render `<Dashboard>` with userRole cycling `null → 'admin' → 'manager'` in one mount (small dev harness or a ui-preview section) — no React error #300 in console.
4. After merge (or deploy preview for the admin part), live check in Chrome (rules below):
   - Admin (Vikram, already signed in): dashboard unchanged; open an event; Back works.
   - Project Head: **Vikram signs in himself** as a manager test account (e.g. Test Gmail). Then the agent checks: no crash; clicking an event in the Project Head panel opens EventPage; clicking a notification opens its event.
   Screenshots of each in the PR.

## Claude in Chrome — standing rules for agents (Vikram, 14 Oct 2026)
Claude in Chrome is connected to Vikram's Chrome. Use it whenever a check needs the real deployed app; use headless Playwright for local preview pages.
- Start with `tabs_context_mcp`, open your **own** tab, close it when done. Never reuse Vikram's tabs.
- **Never sign in, never type passwords or OTP codes.** If a check needs another account, ask Vikram to sign in, then continue.
- Read-only by default: screenshots, console (`read_console_messages`, always with a pattern), page reads. Anything that creates or changes production data (create/edit/archive an event, assign, submit a form) needs Vikram's OK in chat first. Prefer a throwaway event marked "Mark as test event", archive it afterwards, and say so in the PR.
- Never click **Delete permanently**. Avoid actions that open native `confirm()`/`alert()` dialogs (they freeze the extension) — check the code first.
- The PR deploy preview runs the **demo** schema, which has no `notifications` table — test notifications only on myoozz.events.
- Put Chrome screenshots in the PR description; don't commit them unless asked.

## Live baseline recorded 14 Oct (for comparison)
On myoozz.events as admin: new bell renders, empty state correct, no notification/realtime console errors. Creating a test event sent 3 `event_created` notifications to the 3 managers, tenant stamped correctly by the trigger; simulated recipient (Test Gmail) sees exactly their own 4. Test event `cfc40b8e…` marked test + archived.
