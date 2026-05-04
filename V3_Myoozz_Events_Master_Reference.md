# Myoozz Events — Master Reference v2.1
**Document version:** v2.1 · 02 May 2026  
**App version:** v0.50.0-beta  
**Owner:** Vikram Parmar · Myoozz Consulting Pvt. Ltd. · Noida, India  
**Production URL:** myoozzevents.netlify.app  
**Status:** Beta — Internal Use

---

## 00 · How to Use This Document

### What This Document Is
Single source of truth for the Myoozz Events (ME) product. Covers what the product is, how it works, what is built, what is not built yet, and all rules for working on it. Updated after every major build session. If something in an older document conflicts with this one, this version wins.

### Two Companion Documents — Use Both

| Document | Purpose |
|---|---|
| **V3_Myoozz_Events_Master_Reference.md** (this file) | Engineering reference. Tech stack, DB schema, files map, rules, roadmap, brand language, market research, working rules. Read before coding. |
| **ME_Product_Flow_v1.md** | Screen-by-screen product narrative. Every page in workflow order. What each screen does, what's on it, role-by-role view, future plans, file paths, watch-outs. Use in planning sessions. Drop into NotebookLM for mind maps. |

Both documents live in the same repo folder. Both are updated after each session using the end-of-session prompt in Section 13.

### Reading Order for a New Developer
0. **Product Flow Document** — Walk every screen of the product first. Understand what the user sees before reading any code.
1. **Section 01 — Project Identity** — What ME is, who owns it, what problem it solves.
2. **Section 02 — Tech Stack** — How to set up locally and what every technology does.
3. **Section 04 — Roles** — The 5 roles and what each can see and do.
4. **Section 06 — Files** — Where every component lives and what it does.
5. **Section 07 — Database** — The full data model before writing any queries.
6. **Section 13 — How We Work** — All the rules before writing a single line of code.

---

## 01 · Project Identity & Infrastructure

### Identity

| Field | Value |
|---|---|
| Product name | Myoozz Events · Internal shorthand: **ME** |
| Positioning | My Events Operating System |
| Tagline | Stop running your events. Start running your business. |
| Sub-tagline | Born in India · Built for the world |
| Version | v0.50.0-beta |
| Owner | Vikram Parmar · Myoozz Consulting Pvt. Ltd. · Noida, India |
| Stage | Beta — in active use internally. Not yet public. |

### What the Product Does
ME is an internal operations platform for event management companies. It is NOT an attendee-facing event app. It is the back-office system the event company uses to manage their work.

- **Element Builder** — Structured cost sheets per event, per city, per category. With vendor rate benchmarks.
- **Task Engine** — Assign tasks to team members per event per city. Real accountability.
- **Team Access** — Multi-role team with scoped access. Admin sees everything. Staff sees their tasks.
- **Rate Card Library** — Pricing benchmark database across 22 categories and all major Indian cities. Powers cost suggestions in ElementBuilder.
- **Client Documents** — 8 export types from one data entry: estimates, invoices, show flows, timelines, and more.
- **Travel & MICE Itinerary** — Full travel planning and itinerary builder with AI paste modal.
- **Activity Log** — Full audit trail of everything that happens on every event.

### Domains & URLs

| | |
|---|---|
| Primary domain | myoozz.events — on Cloudflare |
| Alternate domain | myoozzevents.com — on Cloudflare |
| Production app | myoozzevents.netlify.app |
| Demo site | demo.myoozz.events — separate Netlify site, same GitHub repo |
| WhatsApp | Verified on Meta Business · connected via MSG91 |

### Hosting — Production

| | |
|---|---|
| Frontend | Netlify — auto-deploys from GitHub main branch |
| Backend / DB | Supabase · Project ID: rjscsnakkexunvsfhdut |
| Supabase URL | rjscsnakkexunvsfhdut.supabase.co |
| Env vars on Netlify | VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY only |
| Service role key | NEVER in frontend — auto-injected by Supabase into edge functions only |

### Demo Site Status

| | |
|---|---|
| URL | demo.myoozz.events |
| Supabase | Borrowed from CRM project (free tier = max 2 projects) |
| Status | **Schema out of sync** — missing several columns added post Phase A. Not ready to show externally. |
| Demo login | demo@myoozz.events · role: admin |
| Demo data names | Abhishek, Naveen, Joseph, Balwinder, Amir, Subhash — NOT Vikram/Rahul/Kuldeep |
| Demo margins | 10–13% only. Never show real margins. |

> ⚠️ **Security Note:** A .env file with old Supabase keys was accidentally committed to git history on April 9 (commit aa76c05c). Those keys are rotated and dead. New keys are in place. .env is now correctly gitignored. dist/ was also accidentally committed on 30 Apr — fixed and gitignored.

---

## 02 · Tech Stack & Setup

### Core Stack

| | |
|---|---|
| Frontend framework | React 18 + Vite |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| Hosting | Netlify (frontend) + Supabase (backend) |
| DNS / CDN | Cloudflare |
| Notifications | Supabase Realtime (in-app) · MSG91 (WhatsApp — schema ready, not yet wired) |
| AI | Anthropic API — used in TravelItinerary.jsx paste modal only |

### Key Installed Packages

| | |
|---|---|
| Animations | framer-motion@12.38.0 · @emotion/is-prop-valid |
| Scroll observer | react-intersection-observer@10.0.3 |
| Lottie | lottie-react@2.4.1 |
| UI primitives | @radix-ui/react-dialog@1.1.15 |
| Excel export | exceljs — used in excelExport.js |
| Excel import | xlsx (SheetJS) — used in RateCard.jsx |

### Local Setup

| | |
|---|---|
| Project folder | ~/Documents/Myoozz-events/ |
| Start dev server | cd ~/Documents/Myoozz-events && npm run dev |
| Local URL | http://localhost:5173/ (or 5174 if port taken) |
| .env file | In .gitignore — NEVER commit. Contains VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |
| Supabase import path | import { supabase } from '../supabase' — NOT supabaseClient |

### Deploy Flow
```
Edit file locally → save → download file
→ Drag-and-drop to GitHub repo (main branch)
→ Netlify auto-detects push → builds → deploys
→ Live in ~60 seconds
```
No CLI deploy. No npm run build locally. Netlify handles the build. Never commit the dist/ folder.

> 🚫 **Never do these:** Never commit .env · Never commit dist/ · Never use supabase.schema() (causes infinite loading) · Never use the service role key in frontend code · Never hard-delete any record (soft archive only)

---

## 03 · User Flow & Screens

### Entry Point — Login
**LoginPage.jsx — 3 modes**
- **Login:** email + password → Supabase Auth → redirect to Dashboard.
- **Forgot password:** sends reset email.
- **Set password:** handles invite flow — new users arrive via magic link from email invite, set their password here. Race condition fix in place — isPasswordSetupFlow captures the URL hash synchronously on load.

### Shell — AppShell.jsx
The persistent wrapper around the entire authenticated app. Contains the left sidebar nav, notification bell, and renders the active screen based on the selected nav item.

- **Nav items:** Events · Team · Activity Log · Early Access · Feedback · Rate Cards · Categories (admin only)
- **Role awareness:** NAV_ITEMS array has a roles[] filter. Items only show if userRole is in the array.
- **Collapsed state:** Sidebar collapses to initials + icons on mobile. Bottom nav on mobile.
- **Notification bell:** Fixed top-right. Badge with 99+ cap. Realtime subscription.

### Dashboard — Dashboard.jsx
1. **Event list** — Shows all events the user has access to. Admin/Manager see all. Event Lead and Team see only assigned events. Soft archived events hidden by default — Archived tab shows them.
2. **DashboardWidgets.jsx** — Role-aware stat cards at top. Admin sees: Pending Approvals, Active Events, Team Members, Overdue Tasks. Shimmer skeleton while loading.
3. **New Event** — + New Event button → NewEventForm.jsx. Manager events go live immediately. Event Lead events go into review_status = pending → admin notified.
4. **Assign Event** — Admin/Manager can assign events to team members via AssignEvent.jsx. Delegation scope set per user: Full / Operations / View Only.

### Event Page — EventPage.jsx (7 Tabs)
The core of the product. One event = one EventPage with 7 tabs. Tab visibility controlled by the user's delegation_scope for that event.

| Tab | Component | What it does | Scope needed |
|---|---|---|---|
| Elements & Costs | ElementBuilder.jsx | Full cost sheet. Per city, per category. Grid + Card modes. Rate suggestion pill. Options/Alternates. Bundle config. | All scopes |
| Tasks | TaskBoard.jsx | Task assignment per city per category. Status tracking. Notifications on assign and status change. | Full / Operations |
| Production | Production.jsx | Production schedule. City tabs. Collapse/expand per category. | Full / Operations |
| Show Flow | — | Run-of-show timeline. | Full / Operations |
| Travel | TravelItinerary.jsx | Event Travel + MICE Itinerary. AI paste modal (Anthropic API). All 6 DB tables wired. | Full / Operations |
| Delivered | DeliveredCenter.jsx | 8-document export system. Confidentiality disclaimer on download. | Full |
| Costs Summary | — | Cost breakdown. Margins visible to admin only. | View Only + |

### ElementBuilder Deep Dive (1682 lines)
The most complex component. Handles the entire cost sheet of an event.

- **Add Category:** Opens CategoryPicker.jsx modal → user selects from 22 live categories from event_categories table. Selected categories become blocks on the event.
- **Grid mode (default):** Excel-like table per category. Each row = one element with name, spec, unit, qty, days, client rate, internal rate.
- **Card mode:** Alternate view. Toggle stored in localStorage key `myoozz_element_view`.
- **Rate suggestion pill:** When internal rate is entered → system checks rate_cards for a matching element in that city → shows "Usually ₹X–₹Y in [city]". Green pill = vendor_quoted. Blue pill = ai_research.
- **Options/Alternates:** Elements can be marked as option_group alternatives. Only one from each group is active in the final cost.
- **Reorder:** ↑↓ buttons to reorder elements within a category.
- **CategoryBlock → ElementRow chain:** When adding props to ElementRow, ALWAYS check CategoryBlock signature AND its call site (~line 1387). Missing props here caused silent failures in the past.

### Rate Card — RateCard.jsx (853 lines)
Admin-only screen. The pricing benchmark library. Dark theme.
- 3-tab import modal: Upload Excel / JSON paste / Field mapping. Dupe check on import.
- Category tabs pull from event_categories (live). Category selector in import modal is dynamic.
- City filter: Ahmedabad, Bangalore, Chennai, Delhi, Hyderabad, Kolkata, Mumbai, Pune, Pan-India.
- **No export or download. Ever. For any role. This is a hard business rule — the benchmark data is proprietary.**

### Category Manager — CategoryManager.jsx (Admin only)
Admin sidebar item. Manages the event_categories master table directly from the UI.
- Add new category — name input, slug auto-generated.
- Rename — cascades automatically to all rate_cards and elements rows. Double-click to edit inline.
- Reorder — ↑↓ buttons update sort_order.
- Deactivate / reactivate — inactive categories hidden from all dropdowns but existing data preserved.

### Other Screens

| Screen | Component | Notes |
|---|---|---|
| Team View | TeamView.jsx | Workload bars + last active per team member. Admin = all, Manager = scoped. |
| Analytics | AnalyticsDashboard.jsx | Admin only. Event Pipeline, Task Trends, Team Workload. Period selector. |
| Profile | ProfilePage.jsx | Bio, phone, city, social links, events tab. Admin can edit any profile. |
| User Management | UserManagement.jsx | Invite users. Role-scoped invite permissions. can_manage_rate_cards toggle for admin. |
| Activity Log | ActivityLog.jsx | Admin only. Grouped by date. Filter by team member + entity type. |
| Notifications | NotificationBell.jsx | Bell + badge. Realtime. Last 30. Mark read / mark all. |
| Landing Page | LandingPage.jsx | Public face. framer-motion. Dark #16203A sections. Not behind auth. |

---

## 04 · Roles & Permissions

### Role Map — DB Value → Display Name

| DB Value | Display Name |
|---|---|
| admin | Admin |
| manager | Project Head |
| event_lead | Manager |
| team | Project Team |
| staff | Staff |

> Role rename is parked. Display-only change required in 5 files: AppShell, UserManagement, AssignEvent, Dashboard, EventPage. No DB changes needed.

### What Each Role Can Do

| Capability | Admin | Project Head | Manager | Team | Staff |
|---|---|---|---|---|---|
| See all events | ✅ | ✅ | Assigned only | Assigned only | Assigned only |
| Create events | ✅ live | ✅ live | ✅ pending review | ❌ | ❌ |
| Assign events to team | ✅ | ✅ scoped | ❌ | ❌ | ❌ |
| See margins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rate card page | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rate pill in ElementBuilder | ✅ | ✅ | ✅ | ✅ | ✅ |
| Category Manager | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activity log | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite users | All roles | event_lead + team | team only | ❌ | ❌ |
| Download documents | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export rate cards | ❌ never | ❌ | ❌ | ❌ | ❌ |

### Delegation Scope — Per Event Assignment

| Scope | Access |
|---|---|
| Full | All 7 tabs visible |
| Operations | Elements, Tasks, Production, Show Flow, Travel |
| View Only | Elements, Costs Summary only |

Admin and Project Head always get Full scope regardless of assignment.

---

## 05 · Design System

### Core Palette

| | |
|---|---|
| Brand red | #bc1723 — primary accent, CTAs, active states, nav indicator |
| Ink / dark | #1a1008 — sidebar background, headings, dark sections |
| Background | #faf8f5 warm off-white — NOT pure white |
| Surface | #f2efe9 — cards, subtle backgrounds |
| Border | #d8d2c8 — card borders, dividers |
| Dim text | #7a7060 — labels, secondary text |
| Landing dark | #16203A navy — landing page dark sections only |
| Rate card dark | #141413 / #1e1e1c — rate card page dark theme |

### Typography

| | |
|---|---|
| Brand / headings | Cormorant Garamond (serif) — all page titles, hero text |
| UI font | DM Sans — all body text, buttons, labels |
| Code / mono | DM Mono — IDs, slugs, code blocks, version numbers |

### Design Rules — Locked. Do Not Change.
- **Warm light theme** throughout the app. No cold grays. No pure white backgrounds.
- **#bc1723** is the one accent color. Not orange, not purple, not teal. One red.
- **FloatingHelp pattern** — fixed bottom-right ? button. NEVER inline help text on page load. All contextual help goes into HELP_CONTENT map keyed by tab/screen.
- **Avatar style** — rounded squares everywhere, not circles.
- **Tab active state** — #bc1723 underline. Not a filled pill.
- **No hard deletes.** Soft archive only. Everything is recoverable.
- **Margins never visible** to non-admin. Client cost ≠ internal cost in the UI.
- **Rate card data stays in the product.** No export, no download, no API access. Any role. Ever.
- **Admin identity hidden** from non-admin users — assigned-by field not shown.
- **Never use supabase.schema()** — causes silent infinite loading. Always `supabase.from()` directly.

---

## 06 · Files & Codebase Map

### src/components/ — Screens & UI

| File | Description |
|---|---|
| AppShell.jsx | Main authenticated shell. NAV_ITEMS with roles[]. Notification bell. Sidebar. Mobile bottom nav. Renders active screen by activeKey. |
| Dashboard.jsx | Events list. DashboardWidgets. Role-aware event creation. Soft archive. Approval flow (manager → admin notify). |
| DashboardWidgets.jsx | Role-aware stat cards. Shimmer skeleton on load. Admin / Manager / Event Lead / Team views differ. |
| EventPage.jsx | 7 tabs. Tab access via delegation_scope. FloatingHelp. Proposal lifecycle banners. Travel tab. City bubbles. |
| NewEventForm.jsx | Created_by_role + review_status on insert. Manager events go live immediately. Event Lead events go to pending. |
| AssignEvent.jsx | Delegation scope selector per user (Full / Operations / View). Saves to assigned_to + delegation_scope on events table. |
| ElementBuilder.jsx | ~1682 lines. Grid + Cards mode. Rate suggestion pill. getRateSuggestion(). Bundle config. Options/Alternates. Reorder ↑↓. Category dropdown from event_categories. **SURGICAL EDITS ONLY.** |
| CategoryPicker.jsx | Modal for adding category blocks to an event. Fetches from event_categories (live). Custom free-text input removed. CATEGORY_SUGGESTIONS kept for item count badges. |
| CategoryManager.jsx | Admin-only. Manages event_categories table. Add, rename (cascades to rate_cards + elements), reorder, deactivate. Accessible from sidebar. |
| TaskBoard.jsx | City tabs. Task assignment to any login user. Status dropdown. notifyTaskAssigned + notifyTaskStatusChanged. |
| Production.jsx | City tabs. Collapse/expand per category. |
| RateCard.jsx | 853 lines. Dark theme. 3-tab import modal. Category selector dynamic from event_categories. Dupe check. Admin-only controls. **No export ever.** |
| TravelItinerary.jsx | 1238 lines. Event Travel + MICE Itinerary tabs. AI paste modal (Anthropic API). All 6 travel DB tables wired. |
| ProfilePage.jsx | Nudge UX. Social links JSONB. Bio/phone/city inline edit. Events tab. canEdit = isOwn || admin || manager. |
| TeamView.jsx | Team workload panel. Admin=all, Manager=scoped. Workload bars + last active. Role filter + search. |
| AnalyticsDashboard.jsx | Admin only. Event Pipeline / Task Trends / Team Workload. Period selector: Week/Month/Year/Custom. |
| NotificationBell.jsx | Bell + badge (99+ cap). Realtime subscription. Last 30. Mark read / mark all. |
| UserManagement.jsx | All roles. Scoped invite per inviter role. can_manage_rate_cards toggle (admin). Edge Function invite. |
| ActivityLog.jsx | Admin only. Grouped by date. Filter by team member + entity type. |
| DeliveredCenter.jsx | Confidentiality disclaimer on download. 8-document export system. |
| LoginPage.jsx | 3 modes: login / forgot / setpassword. Race condition fix for invite flow — isPasswordSetupFlow captures hash synchronously. |
| LandingPage.jsx | Public page. Dark #16203A navy sections. framer-motion animations. Sticky CTA. Request Access modal (Radix Dialog). Lottie hero. Logo placement pending. |

### src/utils/ — Utility Layer

| File | Description |
|---|---|
| activityLogger.js | logActivity() core + convenience wrappers for event, task, element, category, user entity types. |
| notificationService.js | createNotification(), fetchNotifications(), markRead, realtime. 6 trigger types. NOTIF_META map. |
| excelExport.js | ~1601 lines. 11 export functions. generateRateCardTemplate(). exportTravelPlan(). exportMICEItinerary(). generateAgentTemplate(). Uses ExcelJS. |

### Root Files

| File | Description |
|---|---|
| src/App.jsx | Router. Invite flow race condition fix. isPasswordSetupFlow captures hash synchronously on load. |
| src/supabase.js | Supabase client init. Import as: `import { supabase } from '../supabase'`. NOT supabaseClient. |
| .env | LOCAL ONLY — gitignored. Contains VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY. |
| .gitignore | Includes .env and dist/ — never commit either. |

### Critical Patterns — Read Before Touching Anything
- **ElementBuilder is 1682 lines.** Surgical edits only. Run grep to find exact line numbers before any change. Never rewrite the file. Never restructure.
- **CategoryBlock → ElementRow chain:** Adding props to ElementRow requires checking CategoryBlock signature AND its call site (~line 1387). Silent failures happen here.
- **supabase.from() only.** Never supabase.schema() — infinite loading bug if schema is not explicitly exposed in Supabase dashboard settings.
- **Supabase import path is ../supabase** — confirmed from RateCard.jsx and ElementBuilder.jsx. Not supabaseClient.

---

## 07 · Database

**Supabase · Project rjscsnakkexunvsfhdut · Postgres**

### Core Tables

| Table | Key Columns | Notes |
|---|---|---|
| events | id, name, dates, cities, city_dates (jsonb), status, proposal_status, created_by, created_by_role, assigned_to (jsonb), delegation_scope (jsonb), category_config (jsonb), bundle_config (jsonb), review_status, archived_at, archived_by | Soft delete via archived_at. Multi-city via city_dates jsonb. |
| users | id, email, full_name, role, base_city, base_state, phone, bio, social_links (jsonb), notification_preferences (jsonb), can_manage_rate_cards (bool) | Role CHECK: admin/manager/event_lead/team/staff |
| tasks | id, event_id, assigned_to, title, status, city, category, due_date | Linked to events. Multi-user assignment supported. |
| elements | id, event_id, category, element_name, specification, unit, qty, days, client_rate, internal_rate, is_lump, is_option, option_group, city | Per-city per-category. is_option for alternates. category must match event_categories.name for pill to work. |
| event_categories | id, name, slug, sort_order, is_active, created_at | Single source of truth for all category dropdowns. 22 rows. Admin-managed via CategoryManager. |
| rate_cards | id, category, element_name, specification, unit, city, country, location_scope, rate_min, rate_max, rate_type, source, source_url, venue_type, pax_min, pax_max, per_unit_type, mandatory, gst_applicable | rate_type: ai_research/vendor_quoted/user_entered/system_captured. Index on category+city+element_name. |
| notifications | id, user_id, triggered_by, type, title, body, entity_type, entity_id, event_id, action_url, is_read, channel, created_at | Realtime enabled. 6 trigger types. RLS: users read own. |
| activity_log | id, user_id, entity_type, entity_id, event_id, action, metadata (jsonb), created_at | Admin-only view. Never deleted. |

### Travel & Itinerary Tables

| Table | Purpose |
|---|---|
| travel_plan | Per-event travel header. Links to event. |
| itinerary | MICE itinerary header (trip title, destinations, inclusions). |
| itinerary_days | Day-level rows within an itinerary. |
| itinerary_sections | Sections within a day. |
| itinerary_items | Granular items per section. Has cost column. |
| rooming_list | Hotel room allocation. Admin gets Mobile + ID columns. |

### Supabase Views

| View | Used by |
|---|---|
| v_user_workload | AnalyticsDashboard — Team Workload panel |
| v_user_last_active | TeamView — last active display |
| v_event_health | AnalyticsDashboard — Event Pipeline chart |

### Migration History

| Phase | Changes |
|---|---|
| Phase A | archived_by, archived_at, delegation_scope on events. base_city, base_state on users. event_lead role constraint. |
| Phase B | phone, bio, social_links jsonb on users. |
| Phase C | notifications table + RLS + Realtime. notification_preferences jsonb on users. |
| Phase D | v_user_workload, v_user_last_active, v_event_health views. idx_activity_log_email_created index. |
| Rate Card v1 | city, rate_min, rate_max, rate_type, source, source_url, venue_type, pax_min, pax_max, per_unit_type, mandatory, gst_applicable on rate_cards. |
| Rate Card v2 | country, location_scope added. per_unit_type CHECK constraint expanded. |
| Phase F (Travel) | proposal_status on events. 6 travel tables: travel_plan, itinerary, itinerary_days, itinerary_sections, itinerary_items, rooming_list. |
| Rate Card v3 | can_manage_rate_cards boolean DEFAULT false on users. |
| Phase 6 (30 Apr 2026) | event_categories table with RLS. 22 rows seeded. Stage rows in elements + rate_cards updated to Stage & Structure. |

> ⚠️ **Category string matching:** The rate pill works by matching elements.category against rate_cards.category. Both must be identical strings. The event_categories table is now the enforced source. CategoryManager rename cascades to both tables automatically. Never manually insert a category string that differs from event_categories.name.

---

## 08 · Category Registry

**event_categories — Single Source of Truth**  
Built in Phase 6 · 30 Apr 2026. All category dropdowns across the app pull from this table.

### The 22 Standard Categories (in sort order)

| # | Name | Slug | Notes |
|---|---|---|---|
| 1 | Permissions & Legal | permissions-legal | 239 rate card rows total across all categories |
| 2 | Sound | sound | |
| 3 | Lighting | lighting | |
| 4 | Video & LED | video-led | |
| 5 | Stage & Structure | stage-structure | Canonical name. "Stage" rows in elements + rate_cards migrated to this. |
| 6 | Production & Fabrication | production-fabrication | |
| 7 | Branding & Signage | branding-signage | |
| 8 | Manpower | manpower | |
| 9 | Furniture | furniture | |
| 10 | Venue & Infrastructure | venue-infrastructure | |
| 11 | Power & Electrical | power-electrical | |
| 12 | Food & Beverage | food-beverage | |
| 13 | Travel Booking | travel-booking | Group Travel + Team Travel folded into this. |
| 14 | Logistics | logistics | |
| 15 | Insurance | insurance | |
| 16 | Photography & Videography | photography-videography | |
| 17 | Technology & IT | technology-it | |
| 18 | Venue Booking | venue-booking | The venue rental fee. Distinct from Venue & Infrastructure (physical setup). |
| 19 | Gifts & Merchandise | gifts-merchandise | |
| 20 | Miscellaneous | miscellaneous | Post-closure costs not fitting elsewhere. |
| 21 | Agency Cost | agency-cost | Agency fee line item. |
| 22 | Additional | additional | Elements added after PO closure. |

### What Uses event_categories
- **CategoryPicker.jsx** — Add Categories modal on ElementBuilder. Shows all active categories as tiles.
- **ElementBuilder.jsx** — CategoryBlock — category dropdown when adding/editing a block.
- **RateCard.jsx** — ImportModal — category selector dropdown for importing rate data.
- **CategoryManager.jsx** — Reads and writes event_categories directly. Admin sidebar.

### What Was Retired
- **MASTER_CATEGORIES** — hardcoded array in CategoryPicker. Gone.
- **RC_CATEGORIES** — hardcoded array in RateCard. Gone.
- **Custom category free-text input** — was at bottom of CategoryPicker modal. Removed permanently. Only admins add categories now via CategoryManager.

> 💡 **Zones vs Categories:** Zones like "Ballroom", "Pre Function Area", "Registration Zone" are NOT categories. They describe where an element is placed within a venue. A future "Location" or "Zone" field on elements is the correct home. Do not add them to event_categories.

### Future: Admin Settings Panel
CategoryManager is the first component in what will become an Admin Settings section in the sidebar. Future items here: Cities master list, Event types, Rate card config. All master data management from one admin panel — no code changes needed to add new values.

---

## 09 · Rate Card System

### What It Is
A **pricing benchmark database** — not an element catalog. It tells the system "a P3.9 LED Wall usually costs ₹180–₹250/sqft/day in Mumbai." When a team member enters an internal rate in ElementBuilder, the system checks this library and shows a suggestion pill.

Rate card ≠ event elements. Seeding rate cards does NOT auto-populate events.

### How the Pill Works
- When internal_rate is entered on any element in ElementBuilder, getRateSuggestion() queries rate_cards WHERE category = element.category AND city = element.city AND element_name ILIKE '%search%'.
- Pill shows: "Usually ₹X–₹Y in [city] · [Source]" — city-specific match first, Pan-India fallback.
- Pill color: Green = vendor_quoted · Blue = ai_research

### Rate Card Seeding — Current Status

| Category | Status |
|---|---|
| All 15 original categories + Sound | Seeded — 239 total rows as of 30 Apr 2026 |
| Photography & Videography, Technology & IT, Venue Booking, Gifts & Merchandise, Miscellaneous, Agency Cost, Additional | Not yet seeded — will be added post new event flow |

### Seeding Workflow (for each new category)
1. Copy Gemini research prompt from MemPalace rate-card room → add category-specific notes.
2. Run in Gemini 2.0 Pro (primary) or Perplexity Pro (secondary). Get pure JSON array back.
3. Paste JSON into Claude Chat → Claude validates, fixes smart quotes, schema mismatches → returns clean JSON.
4. Paste clean JSON into RateCard.jsx JSON tab → select category → import. rate_type = ai_research.

### 4 Seeding Phases (long-term vision)

| Phase | Description |
|---|---|
| Phase 1 — now | AI-researched via Gemini/Perplexity → JSON paste → rate_type = ai_research |
| Phase 2 | Vendor rate cards collected by team → Excel upload → rate_type = vendor_quoted |
| Phase 3 | ElementBuilder internal rates optionally write back → rate_type = user_entered |
| Phase 4 | Autofill suggestion pill fully reliable once coverage is sufficient |

> 🚫 **Hard Rule — No Export Ever:** Rate card data is proprietary. No export button, no download function, no API endpoint, no workaround. Any role. Any situation. This is a permanent business rule.

---

## 10 · Roadmap — Done & Next

### ✅ Completed Phases

- **Phase A — Foundation:** Event Lead role · Delegation model · Tab-level access control · Task assignment
- **Phase B — Profiles:** Profile page per user · Social links, bio, phone · Admin can edit all profiles
- **Phase C — Notifications:** Notification bell (realtime) · 6 trigger types · Mark read / mark all
- **Phase D — Dashboards:** Role-aware stat cards · Team workload panel · DashboardWidgets
- **Phase E — Analytics:** Event pipeline chart · Task trends · Team workload stacked bar
- **Phase F — ElementBuilder + Travel:** Grid + Card modes · Options/Alternates · Rate card pill · Travel & Itinerary tab
- **Phase 6 — Category Registry:** event_categories table · CategoryManager admin screen · All dropdowns dynamic · 22 categories live
- **Rate Card Seeding:** 239 rows across all categories · All cities covered · Pill functional

### → Current Focus

- **New Event Flow Redesign (Now):** Event brief form (type, pax, tier, city) · This drives everything downstream · Smart element pre-population
- **Marketing Dept Skill (Parallel Track):** Claude-based Marketing Dept skill being built · Runs alongside product development · Marketing thinking shapes product decisions · Prevents rework — positioning set while building

### ⏸ Parked

- **Demo Site** — Schema out of sync. Will do after event flow set.
- **Landing Page** — Logo placement pending. Truth section pending. Will do after event flow set.
- **Role Renames** — Display-only, 5 files. No DB changes needed.

### Future Phases

- **Phase 5 — Smart Event Creation:** Brief form on NewEventForm · element_templates table · Pre-population engine · In-field element autocomplete
- **Phase 7 — AI Layer:** Brief → Claude API → element suggestion · Uses rate_cards + templates as ground truth · Not before data is populated
- **Phase 8 — External Features:** Public proposal view (no login) · WhatsApp via MSG91 (schema ready) · Myoozz Nexus CRM integration
- **Admin Settings Panel:** CategoryManager already there · Add: Cities, Event types · All master data from one place
- **Photo Upload:** Placeholder in ProfilePage · Supabase Storage + 1 function
- **Location / Zone Field:** Separate field on elements · Replaces zone workaround in category · Ballroom, Pre Function etc go here

### IP Protection — In Progress

| Item | Status |
|---|---|
| Copyright notice | Add to codebase + landing page: © 2025–2026 Myoozz Consulting Pvt. Ltd. |
| Copyright registration | Form XIV · Ministry of Education · ~₹500 · Before demo goes live |
| NDA template | Before showing to any external party. Lawyer to draft. |
| Trademark | Class 42 + Class 41 · After logo finalised · File together |
| IP assignment | All contributors must sign IP assignment to Myoozz Consulting Pvt. Ltd. |
| Trade secrets | Rate card data + Gemini workflow = proprietary. No export. Documented internally. |

---

## 11 · Brand Language & Copy Bank

Read before editing LandingPage.jsx or writing any external communication.

### Core Lines — Locked

| | |
|---|---|
| Hero line | "Run your event before you run your EVENT." |
| Positioning | My Events Operating System |
| Supporting line | "Sorted here. Fearless on ground." |
| Landing hero (live) | "Stop running your events. Start running your business." |
| Tagline | My Events. My System. |
| Global sub-line | Born in India · Built for the world |
| Shift section | "ME makes YOU look beautiful." |
| Pricing line | "You're not buying software. You're upgrading your team." |
| Differentiator | "Every event tool is built for your attendees. ME is built for you." |
| Peer close | "Got a brief? Try this first." |

### Rules — Do Not Break
- **Never call ME a "template"** — anchors price expectations wrong.
- **Never call ME "software"** in peer conversations — use "system" or "operating system."
- **"Fearless" is ours.** Nobody in the events industry is using it. Own it.
- **Fearlessness = process, not personality.** ME is the process that creates the confidence.

### Peer Pitch — 6 Beats

| Beat | Content |
|---|---|
| Beat 1 — Opener | "Tera event ka full picture kahan hai right now?" Let them answer. Nod. |
| Beat 2 — Probe | Four questions with silence after each: ops dependency · rate sheet readiness · cost surprise · team clarity |
| Beat 3 — Story | The multi-city Excel rate disaster. Personal. Real. One story, then stop. |
| Beat 4 — Turn | "What if I told you — ek jagah hai. Sab kuch." Pause. |
| Beat 5 — Hook | Paint the feeling. No tech words. "Sorted here. Fearless on ground." Stop. |
| Beat 6 — Close | "Main zyada nahi bolunga. Got a brief? Try this first." Never fill the silence. |

> Win signal: If they ask "how does it work?" before Beat 6 — you've won.

---

## 12 · Market Research

**India Events Market — Research completed April 17 2026**

| | |
|---|---|
| Market size (2025) | ~$15.4 Billion |
| Projected (2035) | ~$32 Billion |
| India event software | ~$319M (2025) → $1.5B by 2033 |
| India CAGR | ~17.9% — highest globally |
| Competition | Zero direct competitors in the internal ops / back-office category |

### 4 Pain Points ME Directly Addresses
- **Vendor rate trap** — No benchmark. Users overpay or underpay without knowing.
- **Template ritual** — Every event starts from a blank Excel or a copy-paste nightmare.
- **Ops dependency** — Everything lives in one person's head or WhatsApp.
- **WhatsApp chaos** — Tasks, assignments, changes — all lost in chat threads.

---

## 13 · How We Work — Vikram + Claude

### Who Does What

| | |
|---|---|
| Vikram does | Product decisions · Gemini research runs · pasting JSON into the app · GitHub drag-and-drop · Supabase SQL runs · reviewing UI on live site · testing on device |
| Claude Chat does | All planning · All code writing · SQL migrations · JSON validation + fixing · product decisions when asked · MemPalace documentation · handoff prompts · this reference document |
| Claude Code does | Surgical file edits when directed · git commits · npm run dev · reading file line numbers |

### Claude Chat — Session Rules
- **No code without a confirmed plan.** Planning and building are separate phases. Claude Chat presents the plan first. Vikram confirms. Then code is written. Never start coding during a planning discussion.
- **Plain text for planning sessions.** No HTML widgets or formatted tables during brainstorming.
- **One task per chat.** Open a new chat for each distinct task.
- **Start every session with the handoff prompt.** It loads MemPalace context.
- **Session end: Claude writes the MemPalace summary.** Always. Vikram pastes it in. Never end a session without this step.

### Claude Code — Rules
- **Always start with: `cd ~/Documents/Myoozz-events`** — anchors Claude Code to the main project folder.
- **Never use worktrees.** If Claude Code creates a worktree branch, merge it to main immediately.
- **Never commit dist/.** If accidentally committed, run: git rm -r --cached dist/ and recommit.
- **Always use actual timestamp in commits.** Use $(date '+%H:%M') in the commit message.
- **Surgical edits only on large files.** ElementBuilder.jsx (1682 lines), RateCard.jsx (853 lines), TravelItinerary.jsx (1238 lines) are never rewritten — only specific lines changed. Always grep for line numbers first.
- **Read before writing.** Always read the relevant files first before making changes.

### What Vikram Is Not Comfortable With (technical)
- **Terminal commands** — Every command must be complete and correct the first time. Explain what it does in plain language before giving it.
- **Technical jargon in planning sessions** — Terms like "grep output", "worktree", "merge conflict", "rebase" need a plain English explanation before use.
- **File paths and line numbers** — Always give context: "open this file, search for this exact phrase, the change is on the line that contains..."
- **Debugging** — Vikram reports what he sees on screen. Claude diagnoses. Never ask Vikram to read error stack traces — ask him to copy-paste them.

### MemPalace — Project Memory

| | |
|---|---|
| Wing | myoozz-events |
| Rooms to read at session start | sessions + decisions + rate-card |
| Also read for copy/brand work | brand-language |
| Session end | Claude writes summary to sessions room. Vikram pastes it in. Use the End of Session Prompt below. |
| Timeout handling | If MemPalace times out mid-session, content is NOT lost — it's in the chat. Restart MCP server, refile from chat history. |

### End of Session Prompt — Paste at End of Every Session

```
END OF SESSION SUMMARY — SAVE TO MEMPALACE

Date: [DD Mon YYYY]
Time: [HH:MM IST]
Session conducted by: Vikram Parmar

---

Claude — do the following:

1. Write a session summary for MemPalace (wing: myoozz-events, room: sessions) covering:
   - What was planned or decided today
   - What was built or changed (file names, DB changes, new components)
   - What was tested and the result
   - Anything parked or deferred — and why
   - Any open questions or blockers

2. Update the decisions room if any product, design, or architecture decision was made today.
   One line per decision, present tense.

3. Rebuild the current context snapshot — write it as if a new developer or a new Claude
   session is reading it cold:
   - Current app version and status
   - Last 3 things completed
   - What is actively being built right now
   - What comes next
   - Any known issues or watch-outs

4. Check if any section of the Product Flow Document was affected by today's session.
   For each section that changed, write a surgical update in this format:

   SECTION UPDATE
   Section: [screen or component name]
   File: [filename + path]
   Last updated: [DD Mon YYYY]
   What changed: [one clear paragraph — what was built, decided, modified, or locked]

Format each of the above as a separate MemPalace drawer entry.
Give me the text to paste — I will file it.
```

### Handoff Prompt — Session Start

```
Myoozz Events — Session Handoff
Read MemPalace: wing `myoozz-events`, rooms `sessions` + `decisions` + `rate-card` before starting.
(For copy/landing/brand work: also read `brand-language`)

Last session [date]: [what was done]. Committed to main.
Next priority: [specific task]
Parked: [anything not completed]

Companion docs in project:
- V3_Myoozz_Events_Master_Reference.md (engineering reference)
- ME_Product_Flow_v1.md (screen-by-screen product flow, role views, file paths)

Rules: No code without confirmed plan · Plain text in planning · cd ~/Documents/Myoozz-events first in Claude Code · No export/download on rate cards ever · Surgical edits only on large files
```

### Two Documents — When to Use Which

| Situation | Use |
|---|---|
| Planning a new screen or feature | Product Flow Doc first. Find the section. Read core objective + role view + future plans. |
| Writing code | Master Reference. Section 06 (files) + Section 07 (DB). |
| Writing SQL migration | Master Reference Section 07 — full schema and migration history. |
| Discussing roles / permissions | Product Flow Doc — role view per screen. Master Reference Section 04 for the matrix. |
| Writing copy or landing page content | Master Reference Section 11 (Brand Language). Always read before editing LandingPage.jsx. |
| Session end | End of Session Prompt above — updates MemPalace and Product Flow Doc in one step. |

---

## 14 · Git & Deploy

### Full Deploy Chain
```
1. Edit file locally in ~/Documents/Myoozz-events/src/
2. Save the file
3. In Claude Code: git add + git commit with proper message
4. In GitHub: drag-and-drop the changed file to the repo (main branch)
   OR: git push from terminal if Claude Code has already committed
5. Netlify detects the push → runs npm run build → deploys
6. Live in ~60 seconds at myoozzevents.netlify.app
```

### Git Commit Format — Mandatory
```
feat: [description] · DD Mon YYYY, HH:MM IST
fix: [description] · DD Mon YYYY, HH:MM IST
chore: [description] · DD Mon YYYY, HH:MM IST

Examples:
feat: add event_categories table with RLS and seed · 30 Apr 2026, 11:00 IST
fix: CategoryPicker free-text input removed · 30 Apr 2026, 15:45 IST
chore: remove dist from tracking, add to gitignore · 30 Apr 2026, 16:00 IST
```
Always use actual timestamp. Never leave HH:MM as a placeholder. In Claude Code: use $(date '+%H:%M') to auto-fill.

### Gitignore — Must Always Contain
```
.env
dist/
node_modules/
.DS_Store
```

### Branch Rules
- **Always work on main.** No feature branches for this workflow.
- **Claude Code worktrees:** If Claude Code creates a branch (claude/some-name), merge it to main immediately: `git checkout main && git merge [branch-name] && git push`
- **Commit after each distinct change.** Not at the end of a session. One fix = one commit.

---

## 15 · Token Efficiency

> 💡 **Golden Rule:** One task per chat. New task = new chat. Don't carry unrelated problems into a long conversation.

### Do These — Save Tokens
- Start every session with the handoff prompt. MemPalace loads context. You don't re-explain everything.
- During planning: plain text only. Explicitly tell Claude: "plain text, planning session."
- When reporting a bug: file name + what you see + what you expect.
- When pasting code: paste only the section Claude asked for — not the entire file.
- For SQL errors: paste the error message only. Not the migration file.
- For Claude Code tasks: give the full context in one prompt including file names, expected behavior, and the exact command to run after.

### Don't Do These — Waste Tokens
- Pasting full files without being asked first.
- Mixing 3 different problems in one message.
- Starting with "can you help me with X" with no context.
- Asking Claude to rewrite large files — always ask for surgical edits with specific line targets.
- Continuing a chat session after a task is complete — close it. Start fresh for the next task.

### When to Open a New Chat

| Task | Rule |
|---|---|
| New bug fix | New chat |
| New component build | New chat |
| New SQL migration | New chat |
| New planning session | New chat |
| Rate card JSON validation | Same chat is fine |
| Design discussion only | Same chat is fine |

### Claude Code vs Claude Chat

| | Use for |
|---|---|
| Claude Chat | Planning · Architecture decisions · Writing new component code · SQL migration writing · JSON validation · Documentation |
| Claude Code | Making surgical edits to existing files · Committing to git · Running npm commands · Finding exact line numbers in large files · Merging branches |
| Don't use Claude Code for | Planning · Deciding what to build · Writing code from scratch |
