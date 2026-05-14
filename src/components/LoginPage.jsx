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

// ── Detect invite / recovery token in URL query params (Supabase PKCE flow) ──
function getUrlTokenType() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const type = params.get('type')
  if (type === 'invite' || type === 'recovery') return type
  return null
}

function getUrlTokenHash() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('token_hash') || null
}

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'setpassword' | 'register' | 'pending'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // On mount — check if this is an invite or recovery link
  useEffect(() => {
    const tokenType = getUrlTokenType()
    const tokenHash = getUrlTokenHash()
    if ((tokenType === 'invite' || tokenType === 'recovery') && tokenHash) {
      setMode('setpassword')
      // Clear query params from URL so token isn't visible or accidentally reused
      window.history.replaceState(null, '', window.location.pathname)
      // Exchange the PKCE token for a session — required before updateUser can run
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
        .then(({ error }) => {
          if (error) setError('This invite link has expired or already been used. Ask an admin to resend it.')
        })
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

  // ── Register new tenant ────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/register-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          ...(designation.trim() && { designation: designation.trim() }),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(res.status === 409
          ? 'This email is already registered. Try signing in instead.'
          : (data.error || 'Registration failed. Please try again.'))
        setLoading(false)
        return
      }

      setLoading(false)
      setMode('pending')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
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
        {mode === 'register' && 'Create your organisation account'}
        {mode === 'pending' && 'Registration received'}
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

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Company / Organisation name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Events Pvt Ltd" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Your name</label>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Full name" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Designation (optional)</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Director, Production Head" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Work email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Same password again" required style={inputStyle} />
              </div>

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? 'Submitting...' : 'Request access'}
              </button>

              <button type="button" onClick={() => { setMode('login'); setError('') }}
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

          {/* ── PENDING STATE (post-registration) ── */}
          {mode === 'pending' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(242,143,59,0.12)', border: '1.5px solid rgba(242,143,59,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: '22px',
              }}>
                ⏳
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px' }}>
                Your request is under review
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                We've received your registration. Our team will review your details and send your login credentials to <strong>{email}</strong> within 1–2 business days.
              </p>
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                style={{
                  width: '100%', padding: '10px',
                  fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: 'none', border: '0.5px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
                }}>
                ← Back to sign in
              </button>
            </div>
          )}

        </div>

        {(mode === 'login' || mode === 'forgot') && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{
              fontSize: '12px', color: 'var(--text-tertiary)',
              lineHeight: 1.6, marginBottom: '16px',
            }}>
              New to Myoozz Events?
            </p>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'var(--font-body)',
                color: '#F28F3B',
                background: 'rgba(242,143,59,0.08)',
                border: '0.5px solid rgba(242,143,59,0.3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(242,143,59,0.14)'
                e.currentTarget.style.borderColor = 'rgba(242,143,59,0.5)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(242,143,59,0.08)'
                e.currentTarget.style.borderColor = 'rgba(242,143,59,0.3)'
              }}
            >
              Request access →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
