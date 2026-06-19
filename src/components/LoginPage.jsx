import { useState, useEffect, useRef } from 'react'
import { Icon } from '../icons'
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
      fontSize: '13px', color: 'var(--state-danger)', background: 'var(--state-danger-bg)',
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
      fontSize: '13px', color: 'var(--state-success)', background: 'var(--state-success-bg)',
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

const TURNSTILE_SITE_KEY = '0x4AAAAAADnhp7DQPweu84iy'  // matches Supabase Auth → Bot & Abuse
const APP_HOME = '/app'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'otp' | 'setpassword'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // --- Focus refs for persistent-form step switching ---
  const emailRef = useRef(null)
  const codeRef = useRef(null)

  // --- Turnstile (explicit render; tokens are single-use → reset after every send) ---
  const turnstileRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [cfToken, setCfToken] = useState(null)

  // --- Resend cooldown ---
  const [resendIn, setResendIn] = useState(0)
  const resendTimerRef = useRef(null)

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

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    const renderWidget = () => {
      if (!turnstileRef.current || widgetIdRef.current != null || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t) => setCfToken(t),
      })
    }
    window.__cfReady = renderWidget
    if (window.turnstile) renderWidget()
    else if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script')
      s.id = 'cf-turnstile-script'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__cfReady'
      s.async = true; s.defer = true
      document.head.appendChild(s)
    }
    return () => {
      if (window.turnstile && widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
      }
      widgetIdRef.current = null
      try { delete window.__cfReady } catch {}
    }
  }, [])

  function resetCaptcha() {
    if (TURNSTILE_SITE_KEY && window.turnstile && widgetIdRef.current != null) {
      setCfToken(null); window.turnstile.reset(widgetIdRef.current)
    }
  }

  function startResendCooldown() {
    setResendIn(30)
    clearInterval(resendTimerRef.current)
    resendTimerRef.current = setInterval(() => {
      setResendIn((s) => { if (s <= 1) { clearInterval(resendTimerRef.current); return 0 } return s - 1 })
    }, 1000)
  }

  // Clear resend timer on unmount
  useEffect(() => () => clearInterval(resendTimerRef.current), [])

  // Focus the active input whenever the step changes
  useEffect(() => {
    if (mode === 'login') emailRef.current?.focus()
    else if (mode === 'otp') codeRef.current?.focus()
  }, [mode])

  // ── Send OTP ────────────────────────────────────────────────
  async function handleSendCode(e) {
    e.preventDefault()
    setError('')
    if (TURNSTILE_SITE_KEY && !cfToken) { setError('Please complete the "I\'m human" check, then try again.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, captchaToken: cfToken || undefined },
    })
    resetCaptcha()
    setLoading(false)
    if (error) {
      setError(/signups? not allowed|not allowed for otp|user not found/i.test(error.message)
        ? "We couldn't find an account for that email. Ask your admin for an invite, or request access below."
        : error.message)
      return
    }
    startResendCooldown()
    setMode('otp')
  }

  // ── Verify OTP ──────────────────────────────────────────────
  async function handleVerify(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your email.'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) { setLoading(false); setError('That code is invalid or expired. Try again or resend.'); return }

    // Post-verify greet read (RLS users_read_own = email = auth.email(); safe post-GAP-1).
    const { data: profile } = await supabase
      .from('users').select('full_name, status').eq('auth_id', data.user.id).maybeSingle()
    setLoading(false)
    if (!profile) setSuccess("Signed in, but your profile isn't set up yet. Please contact your admin.")
    else if (profile.status && profile.status !== 'active') setSuccess(`Your account status is "${profile.status}". Contact your admin.`)

    const params = new URLSearchParams(window.location.search)
    const cb = params.get('callbackUrl')
    const dest = (cb && cb.startsWith('/')) ? cb : APP_HOME
    setTimeout(() => { window.location.href = dest }, 1000)
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
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = params.get('callbackUrl')
      window.location.href = (callbackUrl && callbackUrl.startsWith('/')) ? callbackUrl : '/app'
    }, 1500)
  }

  // ── Logo / header ───────────────────────────────────────────
  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: '24px',
        fontWeight: 500, color: 'var(--text)', marginBottom: '8px',
      }}>
        events <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>by myoozz</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
        {mode === 'login' && 'Sign in to your account'}
        {mode === 'otp' && 'Check your email'}
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

          {/* ── LOGIN FORM (email step) — always mounted; hidden via CSS when not active ── */}
          <div style={{ display: mode === 'login' ? 'block' : 'none' }}>
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value.trim().toLowerCase())}
                  placeholder="you@myoozz.com"
                  required
                  style={inputStyle}
                />
              </div>

              <div ref={turnstileRef} id="cf-turnstile" style={{ marginTop: 14 }} />

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} style={{ ...primaryBtn(loading), marginTop: 20 }}>
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </form>
          </div>

          {/* ── OTP VERIFY FORM — always mounted; hidden via CSS when not active ── */}
          <div style={{ display: mode === 'otp' ? 'block' : 'none' }}>
            <form onSubmit={handleVerify}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Enter the 6-digit code we sent to <strong>{email}</strong>.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Verification code</label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: '18px', textAlign: 'center' }}
                />
              </div>

              {error && <ErrorBox message={error} />}
              {success && <SuccessBox message={success} />}

              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? 'Verifying...' : 'Verify & sign in'}
              </button>

              {/* Resend control */}
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || resendIn > 0}
                style={{
                  width: '100%', marginTop: '10px', padding: '10px',
                  fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: 'none', border: '0.5px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', cursor: (loading || resendIn > 0) ? 'not-allowed' : 'pointer',
                  color: 'var(--text)',
                }}
              >
                {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
              </button>

              {/* Back to email step */}
              <button
                type="button"
                onClick={() => { setMode('login'); setCode(''); setError(''); setSuccess('') }}
                style={{
                  width: '100%', marginTop: '10px', padding: '10px',
                  fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-tertiary)',
                }}
              >
                <Icon name="back" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Use a different email
              </button>
            </form>
          </div>

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

        {(mode === 'login' || mode === 'otp') && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{
              fontSize: '12px', color: 'var(--text-tertiary)',
              lineHeight: 1.6, marginBottom: '16px',
            }}>
              New to Myoozz Events?
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'var(--font-body)',
                color: 'var(--app-accent)',
                background: 'rgba(188,23,35,0.08)',
                border: '0.5px solid rgba(188,23,35,0.3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(188,23,35,0.14)'
                e.currentTarget.style.borderColor = 'rgba(188,23,35,0.5)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(188,23,35,0.08)'
                e.currentTarget.style.borderColor = 'rgba(188,23,35,0.3)'
              }}
            >
              Request access <Icon name="next" size={13} style={{ verticalAlign: '-2px', marginLeft: 5 }} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
