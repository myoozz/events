# Myoozz Events — Product Flow Document v1
**Version:** v1.0 · 02 May 2026  
**Purpose:** Screen-by-screen product narrative. Every page in workflow order. Use for planning sessions, NotebookLM mind maps, and onboarding.  
**Companion doc:** V3_Myoozz_Events_Master_Reference.md (engineering reference)

---

## How to Read This Document
Each section covers one screen or component in the order a user encounters it.

Every section contains:
1. **File name + path + last updated**
2. **Core objective** — what the user does, what the system does
3. **Future plans** + where AI plugs in
4. **What's on screen** — functional description
5. **Role permissions** — who sees and does what
6. **Watch-outs + locked decisions**

### Role Definitions

| DB Value | Display Name | Colour |
|---|---|---|
| admin | Admin | Red |
| manager | Project Head | Blue |
| event_lead | Manager | Amber |
| team | Project Team | Green |
| staff | Staff | Gray |

---

# LAYER 1 — Entry Points

## 01 · Landing Page
**File:** `src/components/LandingPage.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Understand what ME is, feel its value, take one action — Request Access or Login.
- **System's job:** Present brand positioning clearly. Capture interest via Request Access modal. Direct existing users to login.

### Page Sections — In Order
1. **Hero Section** — Lottie animation. Headline: "Stop running your events. Start running your business." Two CTAs: Request Access (primary) + Login (secondary). Sticky header with both CTAs persists on scroll.
2. **Pain Point Section** — The 4 pain points ME solves: Vendor rate trap · Template ritual · Ops dependency · WhatsApp chaos. Emotional, not technical language.
3. **Product Feature Highlights** — Element Builder · Task Engine · Rate Card Library · Client Documents · Travel & MICE. Dark navy (#16203A) background section.
4. **The Shift Section** — "ME makes YOU look beautiful." — The differentiator. Every event tool is built for attendees. ME is built for you.
5. **Born in India Section** — "Born in India · Built for the world." India-first positioning. CAGR data. Events market context.
6. **Footer CTA** — Final Request Access prompt. "Got a brief? Try this first."

### Request Access Modal
- Radix Dialog component. Triggered by all "Request Access" CTAs.
- **Fields:** Name · Company · Role · City · Email · Phone (optional) · Brief message
- **On submit:** ⚠️ TBD — confirm where form data lands

### Role View — Landing Page
All roles see the same public page. No role distinction on the landing page.

### Future Plans
- Logo finalisation + placement pending.
- "Truth section" (real numbers, real proof) to be added.
- Demo video embed when product is stable.
- Public proposal preview link — deep link from a client share lands here with different hero.
- Pricing section after public launch.

### AI Plans
No AI planned for the landing page itself. Request Access form data may feed into an AI-assisted qualification layer — automatically scoring and routing leads before admin sees them.

### Watch-outs
- Logo not placed yet — leave space reserved.
- framer-motion animations are active — do not remove animation imports.
- Dark sections use #16203A (navy), not #1a1008 (ink) — these are different values, intentional.

---

## 02 · Login & Auth Flow
**File:** `src/components/LoginPage.jsx` · Last updated: 30 Apr 2026  
**Also:** `src/App.jsx` · Race condition fix lives here · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Authenticate. First-time users set their password. Returning users log in.
- **System's job:** Verify credentials via Supabase Auth. Detect invite flow. Redirect to Dashboard on success.

### Three Modes
1. **Login Mode (default)** — Email + password fields. Submit → Supabase Auth → success → Dashboard.
2. **Forgot Password Mode** — Email field only. Submit → Supabase sends reset email → confirmation message shown.
3. **Set Password Mode (Invite Flow)** — Triggered when a new user clicks their invite email link. URL hash contains Supabase auth token. isPasswordSetupFlow captures the URL hash synchronously on load. User sets new password → saved → auto-logged in → Dashboard.

### Role View — Login
- **Admin:** Standard login → Dashboard with full admin view.
- **Project Head:** Standard login → Dashboard scoped to their events.
- **Manager:** Likely arrives via invite email → Set Password mode first.
- **Project Team:** Invited by admin/manager → Set Password mode on first login.
- **Staff:** Invited → Set Password on first login → sees only assigned events and tasks.

### 🚫 Critical — Race Condition Fix
The URL hash from Supabase invite links must be captured synchronously before React hydration clears it. This fix is in App.jsx. **Never remove or refactor isPasswordSetupFlow without understanding this.** It caused a broken invite flow — already fixed, must stay fixed.

### Future Plans
- SSO / Google login consideration post-public launch.
- Magic link login as an option for team members who forget passwords frequently.

---

# LAYER 2 — App Shell

## 03 · AppShell — The Wrapper
**File:** `src/components/AppShell.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Navigate between screens. See their notifications. Know who they are and what role they have.
- **System's job:** Render the correct sidebar nav items per role. Maintain active screen state. Run the notification realtime subscription. Render the active component in the main area.

### What's Inside AppShell
- **Left sidebar:** ME logo · Nav items filtered by role (NAV_ITEMS array with roles[]) · User avatar + name at bottom
- **Nav items (live):** Events · Team · Activity Log · Early Access · Feedback · Rate Cards · Categories
- **Top right:** NotificationBell.jsx — fixed position, badge with 99+ cap
- **Main area:** Renders active screen based on activeKey state
- **Mobile:** Sidebar collapses to icon-only. Bottom nav bar on mobile devices.

### Role View — Sidebar Nav Items
- **Admin:** Events · Team · Activity Log · Early Access · Feedback · Rate Cards · Categories (admin only)
- **Project Head:** Events · Team · Early Access · Feedback — No Rate Cards, No Categories, No Activity Log
- **Manager:** Events · Early Access · Feedback — No Team, No Rate Cards, No Categories, No Activity Log
- **Project Team:** Events · Early Access · Feedback — same as Manager
- **Staff:** Events (assigned only) · Feedback — most nav items hidden

### Future Plans
- Admin Settings section in sidebar — will house Categories, Rate Card config, Cities master list, Event types.
- Sidebar will gain a Settings group at the bottom.

### Watch-outs
- NAV_ITEMS array in AppShell controls what each role sees. Any new screen added to the app must be added to this array with correct roles[]. Forgetting roles[] means the item shows for all roles.

---

# LAYER 3 — Dashboard

## 04 · Dashboard
**File:** `src/components/Dashboard.jsx` · Last updated: 30 Apr 2026  
**Also:** `src/components/DashboardWidgets.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** See all their events at a glance. Create new events. Understand current workload through widgets.
- **System's job:** Filter events by role and assignment. Show real-time stat cards. Surface pending approvals for admin. Show archived events separately.

### Dashboard Widgets
Stat cards at the top of the dashboard. Different cards show per role. Shimmer skeleton while data loads.

| Widget | Visible To |
|---|---|
| Pending Approvals | Admin only |
| Active Events | Admin, Project Head |
| Team Members | Admin, Project Head |
| Overdue Tasks | Admin, Project Head, Manager |
| My Events | Manager, Team, Staff |
| My Tasks | Team, Staff |

### Event List
- **Active tab (default):** All live events. Admin/Project Head see ALL. Manager, Team, Staff see only assigned events.
- **Archived tab:** Soft-archived events. Visible to admin only by default.
- **Pending tab:** Events created by Manager (event_lead) waiting for admin approval.
- **Each event card shows:** Event name · Dates · Cities · Status badge · Assigned team · Quick action buttons.

### Role View — Dashboard
- **Admin:** Sees ALL events · Widgets: Pending Approvals + Active Events + Team Members + Overdue Tasks · Can create events (goes live immediately) · Can approve/reject pending events
- **Project Head:** Sees all events · Widgets: Active Events + Team Members + Overdue Tasks · Can create events (goes live immediately)
- **Manager:** Sees only assigned events · Can create events (goes into pending review) · Widgets: My Events + Overdue Tasks
- **Project Team:** Sees only assigned events · Widgets: My Events + My Tasks · Cannot create events
- **Staff:** Sees only assigned events · Minimal widgets · Cannot create events

### Future Plans
- Event brief (type, pax, tier, city) captured at creation — drives the New Event Flow Redesign (current focus).
- Smart element pre-population based on event type.
- Calendar view of events.
- Quick search across all events.

### AI Plans
Dashboard may surface AI-generated summaries: "3 events have tasks overdue by more than 7 days" or "Mumbai events are trending 18% over budget." Smart nudges rather than data tables.

---

## 05 · Create New Event
**File:** `src/components/NewEventForm.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Enter the event's basic information — name, dates, cities, client details.
- **System's job:** Create the event record with correct status based on who created it. Notify admin if pending review. Redirect to the new event page.

### Current Form Fields
Event name · Client name · Event dates (start + end) · Cities (multi-select) · City-specific dates (city_dates JSONB) · Event type · Status

⚠️ Event Brief fields (type, pax, tier) being designed as part of New Event Flow Redesign.

### Creation Logic
- **Admin or Project Head creates:** Event goes live immediately. review_status = approved.
- **Manager (event_lead) creates:** Event goes into pending. review_status = pending. Admin receives notification.
- **created_by_role** is captured on insert — determines the review path.

### Role View — Create Event
- **Admin:** Full form · Event goes live immediately · Can see and approve pending events
- **Project Head:** Full form · Event goes live immediately
- **Manager:** Full form · Event goes into pending review after submit
- **Project Team:** Cannot create events — no access to this form
- **Staff:** Cannot create events

### Future Plans — New Event Flow Redesign (Current Priority)
Event Brief form to be added: Event type (conference/wedding/MICE/concert) · Estimated PAX · Event tier (budget/standard/premium/luxury) · Primary city. This brief will drive smart element pre-population from element_templates table.

### AI Plans — Phase 7
Brief → Claude API → element suggestion. User fills the brief form, AI suggests a full element list based on event type, pax, tier, and city. Uses rate_cards + element_templates as ground truth.

---

## 06 · Assign Event to Team
**File:** `src/components/AssignEvent.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Select team members and define how much of the event they can see and do.
- **System's job:** Save assigned_to (JSONB array of user IDs) and delegation_scope (JSONB per user) on the events table. Trigger notification to assigned users.

### Delegation Scopes

| Scope | Access |
|---|---|
| Full | All 7 tabs of the Event Page |
| Operations | Elements, Tasks, Production, Show Flow, Travel — no Delivered, no financials |
| View Only | Elements & Costs tab + Costs Summary only |

### Role View — Assign Event
- **Admin:** Can assign any user to any event · Can set any delegation scope · Always has Full scope on all events
- **Project Head:** Can assign users (scoped to event_lead + team roles only) · Always has Full scope on all events
- **Manager:** Cannot assign events to others
- **Project Team:** Cannot assign events
- **Staff:** Cannot assign events

### Future Plans
- WhatsApp notification (MSG91) on assignment — schema ready, not yet wired.
- Bulk assignment — assign multiple team members across multiple events in one action.

---

# LAYER 4 — Inside an Event

## 07 · Event Page Overview
**File:** `src/components/EventPage.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Navigate between all aspects of the event — costs, tasks, production, travel, documents — from one place.
- **System's job:** Render tabs based on delegation_scope. Show proposal lifecycle banners. Maintain city context. Load FloatingHelp per tab.

### The 7 Tabs — In Workflow Order

| # | Tab Name | Component | Min Scope |
|---|---|---|---|
| 1 | Elements & Costs | ElementBuilder.jsx | All scopes |
| 2 | Costs Summary | — | View Only+ |
| 3 | Tasks | TaskBoard.jsx | Operations+ |
| 4 | Production | Production.jsx | Operations+ |
| 5 | Show Flow | — | Operations+ |
| 6 | Travel & Itinerary | TravelItinerary.jsx | Operations+ |
| 7 | Delivered | DeliveredCenter.jsx | Full only |

### City Bubbles
Events with multiple cities show city bubble tabs at the top. Clicking a city bubble switches context — Elements, Tasks, Production all filter to the selected city. City-dates stored in city_dates JSONB on the events table.

### Role View — Event Page Tab Access
- **Admin:** All 7 tabs always visible · Sees margins in Costs Summary · Sees all proposal lifecycle banners and approval controls
- **Project Head:** All 7 tabs visible (always Full scope) · Does not see margins in Costs Summary
- **Manager:** Tabs based on delegation_scope · Full scope → all 7 tabs · Operations → tabs 1,3,4,5,6 · View Only → tabs 1,2 only · Never sees margins
- **Project Team:** Same tab logic as Manager — based on delegation_scope · Never sees margins
- **Staff:** Very limited tab access · No Delivered tab · No margins

### Watch-outs
- FloatingHelp pattern — fixed bottom-right ? button. All contextual help goes into HELP_CONTENT map keyed by tab. Never add inline help text directly on the page.
- Tab active state = #bc1723 underline, not a filled pill — do not change this.

---

## 08 · Elements & Costs — ElementBuilder
**File:** `src/components/ElementBuilder.jsx` · ~1682 lines · Last updated: 30 Apr 2026  
**Also:** `src/components/CategoryPicker.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Build the complete cost sheet for the event. Add categories, add elements per category, enter rates, manage options and alternates.
- **System's job:** Store all elements per city per category. Match internal rates against rate_cards to show benchmark pill. Calculate totals. Respect option groups in cost totals.

### Key Features
1. **Add Category** — Opens CategoryPicker.jsx modal. User selects from 22 live categories pulled from event_categories table.
2. **Grid Mode (default)** — Excel-like table per category. Each row = one element. Columns: Name · Specification · Unit · Qty · Days · Client Rate · Internal Rate · Total.
3. **Card Mode** — Alternate visual view. Toggle stored in localStorage key myoozz_element_view.
4. **Rate Suggestion Pill** — When internal rate is entered → system checks rate_cards → shows "Usually ₹X–₹Y in [city]". Green pill = vendor_quoted. Blue pill = ai_research. City-specific match first, Pan-India fallback.
5. **Options & Alternates** — Elements can be flagged as option_group alternatives. Only one from each group is active in the final cost total.
6. **Reorder Elements** — ↑↓ buttons reorder elements within a category.
7. **Bundle Config** — Bundle configuration stored in bundle_config JSONB on events table.

### Role View — ElementBuilder
- **Admin:** Full edit access · Sees both Client Rate and Internal Rate columns · Sees rate suggestion pill · Can configure option groups
- **Project Head:** Full edit access · Sees Client Rate · Internal Rate visibility TBD · Sees rate suggestion pill · No margin calculations
- **Manager:** Edit access based on delegation_scope · Sees rate suggestion pill · No Internal Rate visibility · No margin data
- **Project Team:** Edit access if scope allows · Sees rate suggestion pill · No Internal Rate · No margins
- **Staff:** View only in most cases · Rate pill visible · No edit access · No Internal Rate

### Future Plans
- In-field element autocomplete — as user types element name, system suggests from rate_cards library.
- Zone/Location field on each element (Ballroom, Pre Function Area etc).
- element_templates table for pre-populating elements based on event type.

### AI Plans — Phase 7
AI-suggested element list based on event brief. User accepts or modifies. Rate pill evolves into a full AI cost estimate.

### 🚫 Engineering Watch-out — SURGICAL EDITS ONLY
ElementBuilder.jsx is 1682 lines. **Never rewrite. Never restructure.** Always grep for exact line numbers before any change. CategoryBlock → ElementRow chain: adding props to ElementRow requires checking CategoryBlock signature AND its call site (~line 1387). Silent failures happen here if missed.

---

## 09 · Costs Summary
**File:** Costs Summary tab rendered within `src/components/EventPage.jsx`

### Core Objective
- **User's job:** Review the total cost picture of the event — by category, by city, overall.
- **System's job:** Aggregate element totals from ElementBuilder. Show client total vs internal total. Show margin % to admin only. Respect option group logic (only active options counted).

### What's Displayed
- **Category breakdown:** Total client cost per category. Total internal cost per category (admin only).
- **City breakdown:** For multi-city events — cost per city.
- **Grand total:** Overall client-facing total. Margin % shown to admin only.
- **Option groups:** Only the active option from each group is included in totals.

### Role View — Costs Summary
- **Admin:** Sees client total AND internal total · Sees margin % per category and overall
- **Project Head:** Sees client total only · No internal rates · No margin %
- **Manager:** Sees client total only (if View Only scope or higher) · No margins ever
- **Project Team:** View Only scope minimum required · No margins
- **Staff:** No access to Costs Summary

### 🚫 Locked Rule — Permanent
Margins are **NEVER** shown to non-admin. Client cost ≠ internal cost in the UI at all times. This is a permanent business and security rule. No exception for any role.

### Future Plans
- Cost variance tracking — compare estimate vs actual spend.
- Budget health indicator per category.
- Export cost summary to PDF (admin only, no internal rates in the export).

---

## 10 · Tasks & Execution — TaskBoard
**File:** `src/components/TaskBoard.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Create tasks, assign them to team members, set due dates, track status.
- **System's job:** Store tasks per event per city per category. Send notifications on assignment and status change. Surface overdue tasks in widgets.

### Task Structure
- **City tabs:** If multi-city event, tasks are organised per city.
- **Task fields:** Title · Assigned to (any login user) · Category · City · Due date · Status.
- **Status flow:** Pending → In Progress → Done · Blocked as a separate state.
- **Notifications:** notifyTaskAssigned() fires when task is assigned. notifyTaskStatusChanged() fires on status update.

### Role View — Tasks
- **Admin:** Can create, assign, edit, delete any task on any event · Can reassign tasks · Sees all tasks · Overdue tasks in Dashboard widget
- **Project Head:** Can create and assign tasks · Sees all tasks on events they manage
- **Manager:** Can create tasks and assign to team (if Operations+ scope) · Sees tasks on their assigned events
- **Project Team:** Can see tasks assigned to them · Can update status of their own tasks · Cannot assign tasks to others
- **Staff:** Can see their own tasks · Can update status · View is very limited

### Future Plans
- WhatsApp task notifications via MSG91 — schema ready, not yet wired.
- Task templates per event type — pre-populate standard tasks when event is created.
- Bulk task creation.
- Task dependency chains (Task B can't start until Task A is done).

### AI Plans
AI-generated task checklist based on event type and timeline — "For a 500-pax conference in Delhi, here are 47 standard tasks with suggested owners and deadlines."

---

## 11 · Production Schedule
**File:** `src/components/Production.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Build the production schedule — who is doing what, when, at which location during the event days.
- **System's job:** Organise schedule by city and category. Allow collapse/expand per category block.

### Structure
- **City tabs:** Each city has its own production schedule.
- **Category blocks:** Each category (Sound, Lighting, etc.) collapses and expands. Items = production line items with time, activity, responsible party.

### Role View — Production
- **Admin:** Full access — create, edit, delete production items
- **Project Head:** Full access
- **Manager:** Access if Operations+ scope · Can edit if write permission
- **Project Team:** View and edit if Operations scope
- **Staff:** No access to Production tab

### Future Plans
- Production schedule auto-generated from event brief and element list.
- Timeline export as PDF for ground team.
- Integration with Show Flow tab for seamless Day-of document.

---

## 12 · Show Flow — Run of Show
**File:** `src/components/EventPage.jsx` · Show Flow tab — component TBD · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Build the programme — every act, segment, speaker slot, break, with exact times and responsible team member.
- **System's job:** Store the show flow timeline. Export it as a formatted document via DeliveredCenter.

### Role View — Show Flow
- **Admin:** Full create and edit access
- **Project Head:** Full access
- **Manager:** Operations+ scope required
- **Project Team:** Operations+ scope required
- **Staff:** No access

### Future Plans
- AI-generated show flow draft from event type and brief.
- Auto-calculate total programme duration and flag gaps or overruns.
- Real-time show flow view for ground team on event day — read-only mobile view.

---

## 13 · Travel & MICE Itinerary
**File:** `src/components/TravelItinerary.jsx` · ~1238 lines · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Build the travel plan for the event team + the full MICE itinerary for attendees/delegates.
- **System's job:** Store across 6 travel DB tables. Process AI-pasted itinerary text via Anthropic API. Export to formatted Excel.

### Two Sub-Tabs
- **Event Travel:** Team travel bookings — flights, hotels, ground transport. Rooming list with hotel room allocation. Admin gets Mobile + ID columns in rooming list.
- **MICE Itinerary:** Full delegate itinerary — days, sections, items with costs. Trip title, destinations, inclusions. Day-by-day structure.

### AI Paste Modal
The only place in the current app where the Anthropic API is used.
- User pastes raw itinerary text (from a hotel proposal, tour operator email, etc.)
- Anthropic API parses it → structured itinerary days/sections/items created automatically.
- Saves hours of manual data entry for MICE itineraries that arrive as unformatted text.

### 6 Database Tables
- travel_plan — Per-event travel header
- itinerary — MICE itinerary header
- itinerary_days — Day-level rows
- itinerary_sections — Sections within a day
- itinerary_items — Items per section with cost
- rooming_list — Hotel room allocation

### Role View — Travel & Itinerary
- **Admin:** Full access — all sub-tabs · Rooming list shows Mobile + ID columns · Can use AI paste modal
- **Project Head:** Full access · Rooming list — Mobile + ID visibility TBD
- **Manager:** Operations+ scope required · Can use AI paste modal
- **Project Team:** Operations+ scope required · Limited edit access
- **Staff:** No access

### Future Plans
- Travel cost integration into Costs Summary.
- Rooming list export as branded PDF.
- AI-generated MICE itinerary from destination + duration + budget input — not just paste parsing.

### 🚫 Engineering Watch-out
TravelItinerary.jsx is 1238 lines. **Surgical edits only. Never rewrite.** Anthropic API key is managed securely — never expose in frontend code.

---

## 14 · Delivered Center — Document Exports
**File:** `src/components/DeliveredCenter.jsx` · Last updated: 30 Apr 2026  
**Also:** `src/utils/excelExport.js` · ~1601 lines · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Download any of the 8 document formats — estimate, invoice, show flow, timeline, and more — to send to clients or use on ground.
- **System's job:** Generate formatted documents from the event data already entered. Apply confidentiality disclaimer. Produce Excel or PDF output.

### The 8 Export Documents

| # | Document | Notes |
|---|---|---|
| 1 | Client Estimate | Client-facing cost sheet. No internal rates. No margins. |
| 2 | Detailed Estimate | Expanded line items per category |
| 3 | Invoice | With billing details and GST |
| 4 | Show Flow | Run of show formatted document |
| 5 | Production Schedule | Ground operations timeline |
| 6 | Travel Plan | Team travel + rooming list |
| 7 | MICE Itinerary | Full delegate itinerary |
| 8 | Agent Template | For travel agent or vendor briefing |

### Role View — Delivered
- **Admin:** Full access to all 8 documents · Confidentiality disclaimer shown on download
- **Project Head:** Full access to all 8 documents · Requires Full delegation scope
- **Manager:** Requires Full delegation scope to see Delivered tab · Can download if scope allows
- **Project Team:** Requires Full delegation scope · Can download non-financial documents
- **Staff:** No access to Delivered tab

### Future Plans
- Public proposal link — shareable URL (no login needed) for the client to view their estimate online.
- PDF export in addition to Excel for all documents.
- Branded document templates per client.
- Version history of sent documents.

### AI Plans
AI-written cover letter auto-generated per document type — personalised per client.

### 🚫 Locked Rule — Permanent
Client documents **NEVER** include internal rates or margin data. Confidentiality disclaimer is mandatory on every download. This is non-negotiable.

---

# LAYER 5 — Admin Settings

## 15 · User Management
**File:** `src/components/UserManagement.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Invite new team members, assign roles, manage existing users.
- **System's job:** Send invite email via Supabase Edge Function. Create user record with correct role. Trigger set-password invite flow.

### Invite Flow
- Admin invites → any role. Invite email sent → user clicks link → Set Password mode in LoginPage.jsx → user enters password → auto-logged in.
- **can_manage_rate_cards toggle:** Special permission (boolean on users table) that allows non-admin users to access Rate Card management. Set by admin only.

### Role View — Who Can Invite Whom
- **Admin:** Can invite any role · Can set can_manage_rate_cards toggle · Can deactivate users · Full user management
- **Project Head:** Can invite event_lead and team roles only · Cannot invite admin or another Project Head · Cannot set rate card permissions
- **Manager:** Can invite team role only · Cannot invite any other role
- **Project Team:** Cannot invite anyone
- **Staff:** No access

### Future Plans — Admin Settings Panel
User Management will move into a dedicated Settings section in the sidebar. All admin-only master data management (Users · Categories · Cities · Event types · Rate card config) from one panel.

---

## 16 · Category Manager
**File:** `src/components/CategoryManager.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Add new categories, rename existing ones, reorder, deactivate unused ones.
- **System's job:** Update event_categories table. Cascade renames to elements + rate_cards tables automatically. Reflect changes across all dropdowns instantly.

### What Admin Can Do
- **Add:** Type name → slug auto-generated → category goes live in all dropdowns immediately.
- **Rename:** Double-click to edit inline → saves → cascades automatically to all rate_cards rows AND all elements rows with that category name.
- **Reorder:** ↑↓ buttons update sort_order. Order reflected in CategoryPicker modal.
- **Deactivate:** Inactive categories hidden from all dropdowns but existing event data preserved. Can reactivate.

### Current 22 Categories
Permissions & Legal · Sound · Lighting · Video & LED · Stage & Structure · Production & Fabrication · Branding & Signage · Manpower · Furniture · Venue & Infrastructure · Power & Electrical · Food & Beverage · Travel Booking · Logistics · Insurance · Photography & Videography · Technology & IT · Venue Booking · Gifts & Merchandise · Miscellaneous · Agency Cost · Additional

### Role View — Category Manager
- **Admin:** Full access — add, rename, reorder, deactivate · Sidebar nav item visible
- **All other roles:** No access — not in sidebar

### Watch-outs
Rate suggestion pill works by matching elements.category against rate_cards.category. Both must be identical strings. Rename cascades automatically via CategoryManager. **Never manually insert a category string that differs from event_categories.name.**

### Future Plans
CategoryManager is the first component of the future Admin Settings Panel. Cities master list, Event types, and Rate card config will join here.

---

## 17 · Rate Card Library
**File:** `src/components/RateCard.jsx` · ~853 lines · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Import and manage pricing benchmarks for all event categories across Indian cities.
- **System's job:** Store rates in rate_cards table. When internal rate is entered in ElementBuilder, match against this library and surface the suggestion pill.

### Rate Card Screen Features
- **Dark theme:** Rate Card page uses a dark (#141413 / #1e1e1c) theme — intentional. Different from the rest of the app.
- **3-tab import modal:** Upload Excel file · JSON paste · Field mapping. Duplicate check on import.
- **Category filter:** Dynamic from event_categories table — same 22 categories.
- **City filter:** Ahmedabad · Bangalore · Chennai · Delhi · Hyderabad · Kolkata · Mumbai · Pune · Pan-India.
- **Current data:** 239 rows seeded across 15 categories as of 30 Apr 2026. rate_type = ai_research.

### Role View — Rate Cards
- **Admin:** Full access — view, import, manage all rate card data · Can grant can_manage_rate_cards to other users
- **All other roles:** No access to Rate Card page · Rate suggestion pill in ElementBuilder is visible to all roles

### 🚫 Hard Rule — Permanent
No export button. No download function. No API access. No workaround. **Any role. Any situation. Rate card data is proprietary. This rule never changes.**

### Future Plans — 4 Seeding Phases
- **Phase 1 (now):** AI-researched via Gemini/Perplexity → JSON paste → ai_research
- **Phase 2:** Vendor rate cards collected by team → Excel upload → vendor_quoted
- **Phase 3:** ElementBuilder internal rates write back optionally → user_entered
- **Phase 4:** Pill becomes fully reliable, drives AI cost estimation

---

# LAYER 6 — Other Screens

## 18 · Team View
**File:** `src/components/TeamView.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** See who is overloaded, who is free, who has been active recently.
- **System's job:** Aggregate task and event counts per user. Show workload bar. Show last active timestamp from v_user_last_active view.

### Role View — Team View
- **Admin:** Sees all team members · Workload bars + last active for everyone · Role filter + search
- **Project Head:** Sees team members scoped to their events · Workload of their team only
- **Manager / Project Team / Staff:** No access to Team View

---

## 19 · Analytics Dashboard
**File:** `src/components/AnalyticsDashboard.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Understand patterns across all events and the team.
- **System's job:** Aggregate data from DB views (v_event_health, v_user_workload). Render charts. Filter by period.

### Three Panels
- **Event Pipeline:** Events by status — active, pending, completed, archived. Uses v_event_health view.
- **Task Trends:** Task completion rate over time. Overdue task patterns.
- **Team Workload:** Stacked bar chart per team member. Uses v_user_workload view.
- **Period selector:** Week / Month / Year / Custom date range.

### Role View — Analytics
- **Admin:** Full access — all three panels
- **All other roles:** No access

### Future Plans
- Revenue tracking across events — total billed, total collected.
- City-wise event volume.
- Category cost trends — which categories are consistently over budget.
- Client-wise analytics.
- Export analytics as PDF report.

---

## 20 · Activity Log
**File:** `src/components/ActivityLog.jsx` · Last updated: 30 Apr 2026  
**Also:** `src/utils/activityLogger.js` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Know who did what, when, on which event. Full accountability.
- **System's job:** Log every significant action to activity_log table. Never delete logs. Group by date. Allow filter by team member and entity type.

### What Gets Logged
Event created/updated/archived · Task created/assigned/status changed · Element added/edited/deleted · Category added/renamed · User invited · Document downloaded

### Role View — Activity Log
- **Admin:** Full access — complete audit trail for all users and all events · Filter by team member + entity type · Grouped by date
- **All other roles:** No access

### 🚫 Locked Rule
Activity logs are **NEVER** deleted. The activity_log table has no soft delete, no archive, no expiry. It is a permanent audit trail.

---

## 21 · Profile Page
**File:** `src/components/ProfilePage.jsx` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** View and update their professional profile. See their event history.
- **System's job:** Store bio, phone, city, social_links (JSONB) on users table. Inline editing with save. Nudge UX for incomplete profiles.

### Profile Fields
Full name · Bio · Phone · Base city · Base state · Social links (LinkedIn, Instagram, etc. stored as JSONB) · Avatar (placeholder — Supabase Storage pending)

### canEdit Logic
canEdit = isOwn profile OR admin OR manager. Admins can edit any team member's profile. Managers can edit profiles in their team.

### Role View — Profile
- **Admin:** Can view and edit any team member's profile
- **Project Head:** Can edit their own profile + team members' profiles
- **Manager / Project Team / Staff:** Own profile only

### Future Plans
- Photo upload via Supabase Storage — placeholder exists in ProfilePage. One function needed.
- Skills/specialisation tags per team member.
- Availability calendar.

---

## 22 · Notifications
**File:** `src/components/NotificationBell.jsx` · Last updated: 30 Apr 2026  
**Also:** `src/utils/notificationService.js` · Last updated: 30 Apr 2026

### Core Objective
- **User's job:** Stay informed about actions that need their attention.
- **System's job:** Push notifications in real-time via Supabase Realtime. Badge count. Mark read. Store last 30 per user.

### 6 Trigger Types
Task assigned · Task status changed · Event assigned · Event status changed · Event pending approval · Event approved/rejected

### Role View — Notifications
- **Admin:** Receives pending event approval requests · All critical status changes · Bell visible, badge with 99+ cap
- **Project Head:** Receives task and event notifications for their scope
- **Manager:** Receives event approval result · task assignments on their events
- **Project Team:** Receives task assigned to them · task status updates
- **Staff:** Receives their task assignments only

### Future Plans
- WhatsApp notifications via MSG91 — schema already has channel column. Not yet wired.
- Notification preferences per user (in-app only vs WhatsApp vs both).
- Email digest option.

---

# LAYER 7 — Reference

## 23 · Full Role Matrix

### Role Names

| DB Value | Display Name |
|---|---|
| admin | Admin |
| manager | Project Head |
| event_lead | Manager |
| team | Project Team |
| staff | Staff |

### Capability Matrix

| Capability | Admin | Proj Head | Manager | Team | Staff |
|---|---|---|---|---|---|
| See all events | ✅ | ✅ | Assigned | Assigned | Assigned |
| Create events (live) | ✅ | ✅ | Pending | ❌ | ❌ |
| Assign events | ✅ | Scoped | ❌ | ❌ | ❌ |
| See margins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rate card page | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rate pill (ElementBuilder) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Category Manager | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activity log | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite users | All roles | Lead+Team | Team only | ❌ | ❌ |
| Download documents | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export rate cards | ❌ NEVER | ❌ | ❌ | ❌ | ❌ |
| Edit any profile | ✅ | Team only | Own only | Own only | Own only |
| Team View | All | Scoped | ❌ | ❌ | ❌ |

### Watch-outs
Role rename (display names only) is parked. Display-only change required in 5 files: AppShell, UserManagement, AssignEvent, Dashboard, EventPage. No DB changes needed. Will be done as a single focused session.

---

## 24 · Future Features Map

### Current Priority — New Event Flow Redesign
- **Event Brief form:** Type · PAX · Tier (budget/standard/premium/luxury) · Primary city → drives everything downstream
- **element_templates table:** Pre-population engine based on event type + tier + city
- **Smart element pre-population:** ElementBuilder pre-fills from templates when event is created

### Phase 7 — AI Layer
- **Brief → Claude API → element suggestion.** Full element list suggested from event brief. rate_cards + templates as ground truth. One-click accept or modify.
- **In-field autocomplete** in ElementBuilder — as user types, rate_cards library surfaces matching elements.
- **Not before data is populated.** Rate card seeding must be substantially complete first.

### Phase 8 — External Features
- **Public proposal view:** Shareable URL (no login needed) for client to view their estimate.
- **WhatsApp via MSG91:** Schema ready, not yet wired.
- **Myoozz Nexus CRM integration:** Leads from CRM flow directly into ME as events.

### Admin Settings Panel
- **CategoryManager already built.** Next to add: Cities master list · Event types · Rate card config.
- **All master data from one panel.** No code changes to add new values. UI-driven.

### Parked Items

| Item | Status |
|---|---|
| Demo site sync | Schema out of sync. After new event flow is set. |
| Landing page completion | Logo placement + Truth section pending. After event flow. |
| Role renames | Display-only, 5 files. Parked. |
| Photo upload | Placeholder in ProfilePage. Supabase Storage + 1 function when ready. |
| Location/Zone field on elements | Separate field for Ballroom/Pre Function etc. Future. |

### IP Protection Checklist

| Item | Status |
|---|---|
| Copyright notice in codebase + landing | Pending |
| Copyright registration — Form XIV | Before demo goes live |
| NDA template | Before any external demo |
| Trademark — Class 42 + 41 | After logo finalised |
| IP assignment for contributors | All contributors must sign |
