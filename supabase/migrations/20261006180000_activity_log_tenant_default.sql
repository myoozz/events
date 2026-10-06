-- Phase 0C · C6 — activity log never records anything.
-- activity_log_insert_scoped requires (tenant_id = get_my_tenant_id() OR is_super_admin()),
-- but src/utils/activityLogger.js never sent tenant_id, so every insert was rejected by RLS.
-- The app now sends tenant_id (same PR); this default is the safety net so any caller that
-- omits it still lands in the caller's tenant. get_my_tenant_id() reads the JWT tenant_id claim.
-- public schema only. No data change.

ALTER TABLE public.activity_log ALTER COLUMN tenant_id SET DEFAULT public.get_my_tenant_id();

-- Rollback:
-- ALTER TABLE public.activity_log ALTER COLUMN tenant_id DROP DEFAULT;
