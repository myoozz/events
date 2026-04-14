import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Shared input style
const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  background: 'var(--bg)',
  border: '0.5px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--text-tertiary)',
  marginBottom: '8px',
}

const primaryBtn = (loading) => ({
  width: '100%',
  padding: '11px',
  fontSize: '14px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  background: loading ? 'var(--bg-secondary)' : 'var(--text)',
  color: loading ? 'var(--text-tertiary)' : 'var(--bg)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: loading ? 'not-allowed' : 'pointer',
  transition: 'opacity 0.2s',
  letterSpacing: '0.2px',
})

function ErrorBox({ message }) {
  return (
    <div style={{
      fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
      border: '0.5px solid #F09595', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', marginBottom: '20px', lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

function SuccessBox({ message }) {
  return (
    <div style={{
      fontSize: '13px', color: '#065F46', background: '#D1FAE5',
      border: '0.5px solid #6EE7B7', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', marginBottom: '20px', lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

// ── Detect invite / recovery token in URL hash ──────────────
function getUrlTokenType() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash) return null
  const params = new URLSearchParams(hash.replace('#', ''))
  const type = params.get('type')
  if (type === 'invite' || type === 'recovery') return type
  return null
}

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'setpassword'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // On mount — check if this is an invite or recovery link
  useEffect(() => {
    const tokenType = getUrlTokenType()
    if (tokenType === 'invite' || tokenType === 'recovery') {
      setMode('setpassword')
      // Clear the hash from URL so it's not visible
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // ── Normal login ────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password. Try again, or use Forgot password.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    }
    // App.jsx onAuthStateChange handles redirect to /app
  }

  // ── Forgot password — sends reset email ────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(`Password reset link sent to ${email}. Check your inbox and click the link to set a new password.`)
    }
  }

  // ── Set password (from invite or reset link) ───────────────
  async function handleSetPassword(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    const { data: userData, error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Send confirmation email via Edge Function
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const userEmail = userData?.user?.email

      await fetch(`${supabaseUrl}/functions/v1/password-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email: userEmail }),
      })
    } catch {
      // Confirmation email failure should not block login
    }

    setLoading(false)
    setSuccess('Password set successfully. Taking you to the app...')

    // Small delay so user sees the success message, then App.jsx handles redirect
    setTimeout(() => {
      window.location.href = '/app'
    }, 1500)
  }

  // ── Logo / header ───────────────────────────────────────────
  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '24px',
        fontWeight: 500, color: 'var(--text)', marginBottom: '8px',
      }}>
        events <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>by myoozz</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
        {mode === 'login' && 'Sign in to your account'}
        {mode === 'forgot' && 'Reset your password'}
        {mode === 'setpassword' && 'Set your password'}
      </p>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <Header />

        <div style={{
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '32px',
        }}>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@myoozz.com" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={inputStyle} />
              </div>

              {/* Forgot password link */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-body)', padding: 0,
                  }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  Forgot password?
                </button>
              </div>

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Enter your email and we'll send you a link to set a new password.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@myoozz.com" required style={inputStyle} />
              </div>

              {error && <ErrorBox message={error} />}
              {success && <SuccessBox message={success} />}

              {!success && (
                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              )}

              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                style={{
                  width: '100%', marginTop: '10px', padding: '10px',
                  fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: 'none', border: '0.5px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
                }}>
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── SET PASSWORD FORM (invite or reset) ── */}
          {mode === 'setpassword' && (
            <form onSubmit={handleSetPassword}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Choose a strong password. You'll use this every time you sign in.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Same password again" required style={inputStyle} />
              </div>

              {error && <ErrorBox message={error} />}
              {success && <SuccessBox message={success} />}

              {!success && (
                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? 'Setting password...' : 'Set password & sign in'}
                </button>
              )}
            </form>
          )}

        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{
            fontSize: '12px', color: 'var(--text-tertiary)',
            lineHeight: 1.6, marginBottom: '16px',
          }}>
            Access is by invitation only.<br />
            Contact your admin to get access.
          </p>
          <a
            href="https://myoozz.events/#earlyaccess"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px',
              fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)',
              color: '#bc1723',
              background: 'rgba(188,23,35,0.06)',
              border: '0.5px solid rgba(188,23,35,0.2)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              transition: 'all 0.18s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(188,23,35,0.1)'
              e.currentTarget.style.borderColor = 'rgba(188,23,35,0.35)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(188,23,35,0.06)'
              e.currentTarget.style.borderColor = 'rgba(188,23,35,0.2)'
            }}
          >
            Request credentials →
          </a>
        </div>

      </div>
    </div>
  )
}
