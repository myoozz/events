// Recovery-link builder for the password-reset edge function.
//
// Returns the link in the EXACT form LoginPage/App already handle:
//   {origin}/login?token_hash=<hash>&type=recovery   (single literal &)
// Building it in code — not a hand-edited dashboard template — is the whole
// point of this change; the original bug was a double-encoded `&` (`&amp;`).
//
// `origin` is validated against an allowlist so a recovery link can never be
// pointed at an attacker domain. Pure + runtime-agnostic (no Deno/Node
// globals at module scope) so it runs under both the Supabase Deno runtime
// and `node --test`.

const DEFAULT_ORIGIN = 'https://myoozz.events'

export function buildRecoveryLink(origin, hashedToken, allowed) {
  const safeOrigin = (typeof origin === 'string' && allowed.includes(origin)) ? origin : DEFAULT_ORIGIN
  return `${safeOrigin}/login?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
}

// Allowlist of origins a reset may redirect to. Read lazily from the env and
// guarded so importing this module under Node (for tests) never touches Deno
// globals. Set RESET_ALLOWED_ORIGINS as a comma-separated list on the project.
export function getAllowedOrigins() {
  let raw = ''
  try {
    raw = (typeof Deno !== 'undefined' && Deno.env && Deno.env.get('RESET_ALLOWED_ORIGINS')) || ''
  } catch {
    raw = ''
  }
  if (!raw) raw = 'https://myoozz.events,https://demo.myoozz.events'
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}
