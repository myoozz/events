-- Phase 0 · Part A — unblock event creation (6 Oct 2026)
-- Budget tier is OPTIONAL. Allowed values match the app (lowercase): budget / standard / premium / luxury.
-- Blank = NULL. No default. Safe: all existing public.events rows have budget_tier = NULL; no data rewritten.
-- Applies to public only (demo.events has no budget_tier column).

ALTER TABLE public.events DROP CONSTRAINT events_budget_tier_check;
ALTER TABLE public.events ADD CONSTRAINT events_budget_tier_check
  CHECK (budget_tier IS NULL OR budget_tier IN ('budget','standard','premium','luxury'));

-- Rollback:
-- ALTER TABLE public.events DROP CONSTRAINT events_budget_tier_check;
-- ALTER TABLE public.events ADD CONSTRAINT events_budget_tier_check
--   CHECK (budget_tier IS NULL OR budget_tier = ANY (ARRAY['Standard','Premium','Ultra Premium']));
