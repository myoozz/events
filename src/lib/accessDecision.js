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
