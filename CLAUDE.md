# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity
- Product: Myoozz Events · v0.50.0-beta
- Stack: React 18 + Vite 5 + Supabase 2.39 + Netlify
- Local path: ~/Documents/Myoozz-events/
- Production: myoozzevents.netlify.app
- Demo: demo.myoozz.events
- Supabase Project ID: rjscsnakkexunvsfhdut

## Commands
```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npx tsc --noEmit   # Type check (no test runner or linter configured)
```

## Environment Variables
Required in `.env` (gitignored — never commit):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Optional:
```
VITE_SUPABASE_SERVICE_ROLE_KEY=   # admin ops only
VITE_SUPABASE_SCHEMA=             # defaults to 'public'
```

## Architecture

### Auth & Routing
`App.jsx` captures invite/recovery hash tokens **synchronously on mount** before `onAuthStateChange` fires — this prevents a race condition where users get redirected before completing password setup. Don't move or delay this token capture.

Routes split into public (`/`, `/login`, `/task/:token`, `/privacy`, `/terms`) and protected (`/app/*`) via a `ProtectedRoute` wrapper. Session stored in React state, synced via `onAuthStateChange`.

### Shell → Page Hierarchy
```
AppShell          → layout, sidebar nav, role/session state owner
  Dashboard       → event list, DashboardWidgets (stat cards)
  EventPage       → tabs: elements / tasks / travel / production / cue sheet / export
    ElementBuilder  → core budget/element builder (1756 lines — most complex file)
    TaskBoard       → kanban task management
    TravelItinerary → travel planning
    RateCard        → rate management (admin/event_lead only)
```
`AppShell` owns `userRole`, `userName`, `userId`. It passes these down — never re-fetch role inside a child component.

### Supabase Usage Pattern
Client is in `src/supabase.js`. Always use `supabase.from('table')` directly. Never use `supabase.schema()` — causes silent infinite loading.

All reads/writes happen from components directly, with one exception: notifications always go through `src/utils/notificationService.js`. Components never query the `notifications` table directly.

### Silent-Failure Utilities
`src/utils/activityLogger.js` and `src/utils/notificationService.js` are designed to never throw. Failures are console-logged only. Never await them in a way that blocks the main flow or surfaces an error to the user.

### Vite Build
`vite.config.js` injects `__APP_VERSION__` from `package.json`. `AppShell.jsx` imports `version` from `package.json` directly for display in the sidebar.

## Key Files — Know Before Touching
- `ElementBuilder.jsx` → 1756 lines. SURGICAL EDITS ONLY. Never rewrite. Always confirm line numbers first.
- `excelExport.js` → ~1601 lines. Same rule.
- `RateCard.jsx` → ~1229 lines. Same rule.
- `TravelItinerary.jsx` → ~1276 lines. Same rule.
- `TaskBoard.jsx` → ~1151 lines. Same rule.
- `CategoryBlock → ElementRow` prop chain: always check `CategoryBlock` signature AND its call site in `ElementBuilder` (~line 1387) when adding props.

## DB Rules — Hard Rules
- NEVER use `supabase.schema()` — causes silent infinite loading. Always use `supabase.from()` directly.
- No hard deletes anywhere. Soft archive only via `archived_at`.
- Margins are never visible to non-admin roles. Never expose `internal_rate` to client-facing views.
- Rate card data: NO export, NO download, for ANY role. No button, no function, no workaround. Ever.
- `.env` is gitignored. NEVER commit it. NEVER log `VITE_SUPABASE_ANON_KEY` anywhere.

## Role System
DB values are FIXED: `admin` / `manager` / `event_lead` / `team` / `staff`

Display names only: Admin / Project Head / Manager / Project Team / Staff

Never change DB values. Display rename = find/replace in UI strings only.

## Rate Card Rules
- `rate_type` values: `ai_research` / `vendor_quoted` / `user_entered` / `system_captured`
- Pill: green = `vendor_quoted`, blue = `ai_research`
- City match priority, Pan-India fallback
- Seeding workflow: Gemini JSON → validate in chat → clean JSON → Vikram imports via UI

## Design Rules — Myoozz Brand v2.0 (April 2026)

### Color Tokens
- **Me accent (primary)**: `#F28F3B` (`--accent`, `--me`) — ALL primary interactive UI in Events: buttons, tab underlines, active states, focus rings, icons. This is the Me sub-brand color.
- **Accent deep**: `#D97A28` (`--accent-deep`) — hover/pressed on accent elements.
- **Myoozz Red**: `#C8102E` (`--red`) — master brand only: logo areas, error/danger states, Terms/Privacy/Landing pages. Never use as a UI accent inside the app.
- **Red Deep**: `#8E0A1F` (`--red-deep`) — hover/pressed on red (error/brand only).
- **Mn (Nexus)**: `#2D5BFF` (`--mn`) · **Ma (Assistant)**: `#00A877` (`--ma`) · **Mx (Experiments)**: `#7C3AED` (`--mx`)
- **Signal Live**: `#00C853` (`--signal-live`) · **Signal Warn**: `#FFB400` (`--signal-warn`)
- **Ink**: `#0A0A0A` (`--text`) · **Ink-2**: `#1A1A1A` (`--text-2`)
- **Background (page)**: `#F5F1E8` (`--bg`) · **Surface (cards)**: `#EDE8DD` (`--bg-secondary`) · **Surface-2 (table heads)**: `#DDD7C7` (`--bg-surface-2`)
- **Border**: `rgba(10,10,10,0.14)` (`--border`) · **Border strong**: `rgba(10,10,10,0.32)` (`--border-strong`)
- **Muted text**: `rgba(10,10,10,0.55)` (`--text-secondary`)

### Typography
- **Display/Headlines**: Bricolage Grotesque (`--font-display`) — 700–800 weight, tight tracking
- **UI/Body**: Inter (`--font-body`) — 400/500/600, 14–18px
- **System/Mono**: JetBrains Mono (`--font-mono`) — codes, IDs, labels, receipts
- Brand mark (M monogram, MYOOZZ wordmark): locked artwork — use PNGs from `public/brand/`, never re-typeset

### Other Rules
- CSS radius tokens: `--radius` 10px · `--radius-sm` 6px
- Warm cream theme throughout. No cold grays. Paper is warm, not white.
- FloatingHelp pattern only — never inline help text on page load.
- Avatar style: rounded squares everywhere. Not circles.
- Tab active: `#F28F3B` underline (Me accent). Not a filled pill.
- Framer Motion is installed (framer-motion@12). Use it for entrance/hover animations on new UI.
- Brand assets (logos, PNGs): `public/brand/` — wordmark, monogram, Me/Mn/Ma/Mx lockups, bubble glyphs.

## What Belongs Here vs Chat
- **HERE**: File edits, git commits, SQL migrations, JSON fixes, multi-file changes
- **CHAT** (claude.ai): Planning, brainstorming, MemPalace, JSON validation for rate cards, design decisions

## Guard — When to Stop and Push Back
If the user asks for something that requires a design decision, architecture choice, or scope expansion that wasn't in the original task spec — stop and say:
> "This needs a planning decision first. Take it to claude.ai chat, confirm the approach, then bring it back here as a clear spec."
