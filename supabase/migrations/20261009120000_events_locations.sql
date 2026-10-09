-- Phase 0D — city, area and venue search with addresses.
-- Adds events.locations: what the user picked in the event form's city box
-- (city / area / venue, with address, lat/lng and Google place id for areas & venues).
-- Additive only: cities, city_dates, primary_city, venue_name keep working as today.
-- Scope: public schema only — demo.events is intentionally untouched.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Rollback: ALTER TABLE public.events DROP COLUMN IF EXISTS locations;
