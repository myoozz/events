import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import LandingPage    from './components/LandingPage'
import PublicTask     from './components/PublicTask'
import LoginPage      from './components/LoginPage'
import AppShell       from './components/AppShell'
import PrivacyPolicy  from './components/PrivacyPolicy'
import TermsOfUse     from './components/TermsOfUse'

// ─── Splash screen (hardcoded colors — no CSS vars) ──────
function Splash({ message = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAF8',
      gap: '14px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        width: '32px', height: '32px',
        background: '#bc1723', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: '#fff',
        letterSpacing: '-0.5px',
      }}>ME</div>
      <p style={{ fontSize: '13px', color: '#9C9488', margin: 0 }}>{message}</p>
    </div>
  )
}

// ─── Error boundary ───────────────────────────────────────
import { Component } from 'react'
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#FAFAF8', fontFamily: 'sans-serif', gap: '12px', padding: '24px',
      }}>
        <div style={{ width: '32px', height: '32px', background: '#bc1723', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>ME</div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1917' }}>Something went wrong</p>
        <p style={{ fontSize: '13px', color: '#9C9488', maxWidth: '400px', textAlign: 'center' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{ marginTop: '8px', padding: '10px 20px', background: '#bc1723', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          Go to home
        </button>
      </div>
    )
    return this.props.children
  }
}

// ─── Protected route ──────────────────────────────────────
function ProtectedRoute({ children, session, loading }) {
  if (loading) return <Splash message="Checking session..." />
  if (!session) return <Navigate to="/login" replace />
  return children
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)

  // CRITICAL: Do not refactor this block.
  // isPasswordSetupFlow captures the URL hash synchronously on load
  // to handle Supabase invite + password recovery token race condition.
  // Moving this inside useEffect will break the invite flow silently.
  // Capture invite/recovery token SYNCHRONOUSLY on first render —
  // before onAuthStateChange fires and before LoginPage clears the hash.
  // This prevents the race condition where session is set and /login redirects to /app
  // before the user has set their password.
  const [isPasswordSetupFlow] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.hash.replace('#', ''))
    const type = params.get('type')
    return type === 'invite' || type === 'recovery'
  })

  useEffect(() => {
    // Get existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch((err) => {
        console.error('getSession error:', err)
        setSession(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, !!session)
      setSession(session)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Still checking session — show splash
  if (loading || session === undefined) return <Splash message="Loading..." />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* ── Public pages ── */}
          <Route path="/"            element={<LandingPage />} />
          <Route path="/login"       element={
            (session && !isPasswordSetupFlow) ? <Navigate to="/app" replace /> : <LoginPage />
          } />
          <Route path="/task/:token" element={<PublicTask />} />

          {/* ── Legal pages — public, no auth required ── */}
          <Route path="/privacy"     element={<PrivacyPolicy />} />
          <Route path="/terms"       element={<TermsOfUse />} />

          {/* ── Protected app ── */}
          <Route path="/app" element={
            <ProtectedRoute session={session} loading={loading}>
              <AppShell session={session} />
            </ProtectedRoute>
          } />
          <Route path="/app/*" element={
            <ProtectedRoute session={session} loading={loading}>
              <AppShell session={session} />
            </ProtectedRoute>
          } />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
