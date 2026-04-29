# Myoozz Events (ME) — Claude Code Project Rules

## Project Identity
- Product: Myoozz Events · v0.50.0-beta
- Stack: React + Vite + Supabase + Netlify
- Local path: ~/Documents/Myoozz-events/
- Production: myoozzevents.netlify.app
- Demo: demo.myoozz.events
- Supabase Project ID: rjscsnakkexunvsfhdut

## Key Files — Know Before Touching
- ElementBuilder.jsx → ~1682 lines. SURGICAL EDITS ONLY. Never rewrite. Always confirm line numbers first.
- excelExport.js → ~1601 lines. Same rule.
- RateCard.jsx → ~853 lines. Same rule.
- TravelItinerary.jsx → ~1238 lines. Same rule.
- CategoryBlock → ElementRow prop chain: always check CategoryBlock signature AND call site (~line 1387) when adding props.

## DB Rules — Hard Rules
- NEVER use supabase.schema() — causes silent infinite loading. Always use supabase.from() directly.
- No hard deletes anywhere. Soft archive only via archived_at.
- Margins are never visible to non-admin roles. Never expose internal_rate to client-facing views.
- Rate card data: NO export, NO download, for ANY role. No button, no function, no workaround. Ever.
- .env is gitignored. NEVER commit it. NEVER log VITE_SUPABASE_ANON_KEY anywhere.

## Role System
- DB values are FIXED: admin / manager / event_lead / team / staff
- Display names only: Admin / Project Head / Manager / Project Team / Staff
- Never change DB values. Display rename = find/replace in UI strings only.

## Rate Card Rules
- rate_type values: ai_research / vendor_quoted / user_entered / system_captured
- Pill: green = vendor_quoted, blue = ai_research
- City match priority, Pan-India fallback
- Seeding workflow: Gemini JSON → validate here → clean JSON → Vikram imports via UI

## Design Rules
- Brand red: #bc1723 — the only accent color. No exceptions.
- Warm light theme throughout. No cold grays.
- FloatingHelp pattern only — never inline help text on page load.
- Avatar style: rounded squares everywhere. Not circles.
- Tab active: #bc1723 underline. Not a filled pill.

## What Belongs Here vs Chat
- HERE: File edits, git commits, SQL migrations, JSON fixes, multi-file changes
- CHAT (claude.ai): Planning, brainstorming, MemPalace, JSON validation for rate cards, design decisions

## Guard — When to Stop and Push Back
If the user asks for something that requires a design decision, architecture choice, or scope expansion that wasn't in the original task spec — stop and say:
"This needs a planning decision first. Take it to claude.ai chat, confirm the approach, then bring it back here as a clear spec."
