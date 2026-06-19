// Pure authorization for events invites: who may grant which events role.
// No Deno/Supabase imports, so it runs under `node --test` and imports cleanly
// into the Deno edge function. The app_access write stays inline in invite-user.

export const EVENTS_ROLES = ['admin', 'manager', 'event_lead', 'team']

// Roles each caller role may grant (the live UI rule: AppShell Team tab gated to
// admin/manager; UserManagement inviteableRoles hierarchy).
export const GRANTS = {
  admin:      ['admin', 'manager', 'event_lead', 'team'],
  manager:    ['event_lead', 'team'],
  event_lead: ['team'],
  team:       [],
}

// caller: { id, role, tenantId, platformRole, status } | null
// target: { tenantId, role }
// returns { ok: boolean, status: number, error?: string }
export function authorizeInvite(caller, target) {
  if (!caller) return { ok: false, status: 401, error: 'Not authenticated' }
  if (caller.status === 'suspended') return { ok: false, status: 403, error: 'Account suspended' }
  if (!target || !EVENTS_ROLES.includes(target.role)) {
    return { ok: false, status: 400, error: 'Invalid events role' }
  }
  // Platform escape hatch — deliberate, not surfaced in the UI.
  if (caller.platformRole === 'super_admin') return { ok: true, status: 200 }
  // Own tenant only.
  if (!caller.tenantId || caller.tenantId !== target.tenantId) {
    return { ok: false, status: 403, error: 'Cannot invite into another tenant' }
  }
  // Role-grant hierarchy.
  if (!(GRANTS[caller.role] ?? []).includes(target.role)) {
    return { ok: false, status: 403, error: `Role '${caller.role}' cannot grant '${target.role}'` }
  }
  return { ok: true, status: 200 }
}
