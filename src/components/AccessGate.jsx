import { useMemo } from 'react'
import { supabase } from '../supabase'
import { evaluateAccess } from '../lib/accessDecision'

// Decode the access token's payload (the hook's claims are top-level). Same
// pattern AppShell/CategoryManager already use. Returns {} on any parse failure.
function readClaims(session) {
  try { return JSON.parse(atob(session.access_token.split('.')[1])) } catch { return {} }
}

// Gate: assumes ProtectedRoute already ensured a session. Renders children when the
// caller has events access; otherwise a finished-state no-access screen (§11).
export default function AccessGate({ session, children }) {
  const verdict = useMemo(() => evaluateAccess(readClaims(session)), [session])
  if (verdict.allowed) return children
  return <NoAccessScreen suspended={verdict.suspended} />
}

function NoAccessScreen({ suspended }) {
  const title = suspended ? 'Account suspended' : 'No access to Myoozz Events'
  const body = suspended
    ? 'Your account has been suspended. Please contact your workspace admin to restore access.'
    : "Your account isn't provisioned for Myoozz Events yet. Ask your admin for access, or request early access below."
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'var(--font-body)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 600,
          color: 'var(--text)', marginBottom: '12px' }}>{title}</div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>{body}</p>
        <button onClick={signOut} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 500,
          fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Sign out</button>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          <a href="/" style={{ color: 'var(--app-accent)', textDecoration: 'none' }}>Request access</a>
          <span style={{ margin: '0 8px' }}>·</span>
          <a href="mailto:hello@myoozz.events" style={{ color: 'var(--app-accent)', textDecoration: 'none' }}>hello@myoozz.events</a>
        </div>
      </div>
    </div>
  )
}
