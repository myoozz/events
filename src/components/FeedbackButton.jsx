import { useState } from 'react'
import { supabase } from '../supabase'

export default function FeedbackButton({ session }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setSaving(true)
    await supabase.from('feedback').insert({
      submitted_by: session?.user?.email || 'anonymous',
      screen: window.location.pathname,
      message: message.trim(),
      status: 'new',
    })
    setSaving(false)
    setSubmitted(true)
    setMessage('')
    setTimeout(() => { setSubmitted(false); setOpen(false) }, 3000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Share feedback or ideas"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--text)',
          color: 'var(--bg)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(26,25,21,0.2)',
          zIndex: 490,
          transition: 'transform 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        💬
      </button>

      {/* Feedback panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '24px',
          width: '320px',
          background: 'var(--bg)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 32px rgba(26,25,21,0.15)',
          zIndex: 490,
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease',
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {submitted ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🙏</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>
                Thank you!
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Your feedback is noted. When we build it, you'll be the first to know.
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding: '20px 20px 0', borderBottom: '0.5px solid var(--border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
                      What's on your mind?
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                      Something feel off? Got an idea? Tell us in your own words — we're listening.
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-tertiary)', padding: '0 0 0 8px', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px 20px 20px' }}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type anything — a bug, a missing feature, an idea, even a complaint. All of it helps us build better."
                  rows={5}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    background: 'var(--bg-secondary)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.65,
                  }}
                  onFocus={e => e.target.style.border = '0.5px solid var(--text)'}
                  onBlur={e => e.target.style.border = '0.5px solid var(--border)'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    When we ship it — you'll know first.
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || saving}
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 500,
                      fontFamily: 'var(--font-body)',
                      background: message.trim() ? 'var(--text)' : 'var(--bg-secondary)',
                      color: message.trim() ? 'var(--bg)' : 'var(--text-tertiary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: message.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >
                    {saving ? 'Sending...' : 'Send →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
