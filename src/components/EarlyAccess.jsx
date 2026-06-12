import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/* Early-access triage — super-admin only (RLS: "super admin reads/updates
   early access"; the nav gate in SuperAdminPanel is courtesy, RLS is the wall).
   "Skip the line" semantics: an invite code = triage PRIORITY for a human
   decision — never automation. Statuses per the DB check constraint. */

const STATUS_STYLES = {
  pending:   { bg: 'var(--amber-light)',      color: 'var(--amber)' },
  contacted: { bg: 'var(--state-info-bg)',    color: 'var(--state-info)' },
  accepted:  { bg: 'var(--green-light)',      color: 'var(--green)' },
  declined:  { bg: 'var(--state-danger-bg)',  color: 'var(--state-danger)' },
}

const ACCEPT_MSG = 'Thank you for your interest! We are excited to have you on board. Your access will be set up shortly.'
const DECLINE_MSG = 'Thank you for your interest in Myoozz Events. We are onboarding in limited batches and will keep you updated as we expand access.'

export default function EarlyAccess() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [codeFirst, setCodeFirst] = useState(false)
  const [responding, setResponding] = useState(null) // { id, action: 'accepted'|'declined' }
  const [message, setMessage] = useState('')

  useEffect(() => { fetchRequests() }, [])

  async function fetchRequests() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('early_access')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setLoadError(error.message)
    setRequests(data || [])
    setLoading(false)
  }

  async function setStatus(id, status, response_message = null) {
    const patch = response_message === null ? { status } : { status, response_message }
    const { error } = await supabase.from('early_access').update(patch).eq('id', id)
    if (error) { setLoadError(`Update failed: ${error.message}`); return }
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setResponding(null)
    setMessage('')
  }

  const counts = {
    pending:   requests.filter(r => r.status === 'pending').length,
    contacted: requests.filter(r => r.status === 'contacted').length,
    accepted:  requests.filter(r => r.status === 'accepted').length,
    declined:  requests.filter(r => r.status === 'declined').length,
  }

  let filtered = requests.filter(r => filter === 'all' || r.status === filter)
  if (codeFirst) {
    filtered = [...filtered].sort((a, b) => {
      const ac = a.invite_code ? 0 : 1
      const bc = b.invite_code ? 0 : 1
      if (ac !== bc) return ac - bc
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: '28px',
          fontWeight: 600, color: 'var(--text)',
          letterSpacing: '-0.3px', marginBottom: '6px',
        }}>
          Early access requests
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          {counts.pending} pending · {counts.contacted} contacted · {counts.accepted} accepted · {counts.declined} declined
        </p>
      </div>

      {/* Filter tabs + code-first toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex', gap: 0, border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content',
        }}>
          {[
            { key: 'pending', label: `Pending (${counts.pending})` },
            { key: 'contacted', label: `Contacted (${counts.contacted})` },
            { key: 'accepted', label: `Accepted (${counts.accepted})` },
            { key: 'declined', label: `Declined (${counts.declined})` },
            { key: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', fontSize: '12px',
                fontWeight: filter === f.key ? 500 : 400,
                fontFamily: 'var(--font-body)',
                background: filter === f.key ? 'var(--text)' : 'var(--bg)',
                color: filter === f.key ? 'var(--bg)' : 'var(--text-tertiary)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCodeFirst(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '7px 14px', fontSize: '12px', fontWeight: 500,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: codeFirst ? 'var(--brand-teal-dim)' : 'var(--bg)',
            color: codeFirst ? 'var(--brand-teal)' : 'var(--text-tertiary)',
          }}
        >
          <span style={{
            width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
            border: codeFirst ? 'none' : '1px solid var(--border-strong)',
            background: codeFirst ? 'var(--brand-teal)' : 'transparent',
            color: '#fff', fontSize: '10px', lineHeight: '14px', textAlign: 'center',
          }}>{codeFirst ? '✓' : ''}</span>
          Has code first
        </button>
      </div>

      {loadError && (
        <p style={{
          fontSize: '13px', color: 'var(--state-danger)', background: 'var(--state-danger-bg)',
          padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px',
        }}>{loadError}</p>
      )}

      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{
          border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)',
          padding: '48px 40px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No {filter === 'all' ? '' : filter} requests yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(r => {
            const sc = STATUS_STYLES[r.status] || STATUS_STYLES.pending
            const isResponding = responding?.id === r.id
            return (
              <div key={r.id} style={{
                border: r.invite_code ? '1px solid var(--brand-aqua)' : '0.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px 24px', background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: isResponding ? '16px' : 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                        {r.full_name || '—'}
                      </span>
                      {r.invite_code && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
                          letterSpacing: '0.04em', padding: '2px 9px', borderRadius: '20px',
                          background: 'var(--brand-teal-dim)', color: 'var(--brand-teal)',
                          border: '0.5px solid var(--brand-aqua)',
                        }}>
                          CODE · {r.invite_code}
                        </span>
                      )}
                      <span style={{
                        fontSize: '10px', fontWeight: 500, textTransform: 'uppercase',
                        letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '20px',
                        background: sc.bg, color: sc.color,
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', overflowWrap: 'anywhere' }}>
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                      {r.company ? ` · ${r.company}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                    {r.response_message && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', fontStyle: 'italic' }}>
                        Response: {r.response_message}
                      </div>
                    )}
                  </div>

                  {(r.status === 'pending' || r.status === 'contacted') && !isResponding && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {r.status === 'pending' && (
                        <button
                          onClick={() => setStatus(r.id, 'contacted')}
                          style={{
                            padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                            fontFamily: 'var(--font-body)', background: 'var(--state-info-bg)',
                            color: 'var(--state-info)', border: '0.5px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          }}
                        >
                          Mark contacted
                        </button>
                      )}
                      <button
                        onClick={() => { setResponding({ id: r.id, action: 'accepted' }); setMessage(ACCEPT_MSG) }}
                        style={{
                          padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                          fontFamily: 'var(--font-body)', background: 'var(--green-light)',
                          color: 'var(--green)', border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => { setResponding({ id: r.id, action: 'declined' }); setMessage(DECLINE_MSG) }}
                        style={{
                          padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                          fontFamily: 'var(--font-body)', background: 'var(--state-danger-bg)',
                          color: 'var(--state-danger)', border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {isResponding && (
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                      color: 'var(--text-tertiary)', marginBottom: '6px',
                    }}>
                      Message to send · marking {responding.action}
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      style={{
                        width: '100%', padding: '10px 12px', fontSize: '13px',
                        fontFamily: 'var(--font-body)', background: 'var(--bg)',
                        border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)', outline: 'none', resize: 'vertical',
                        boxSizing: 'border-box', lineHeight: 1.6,
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setResponding(null); setMessage('') }}
                        style={{
                          padding: '7px 14px', fontSize: '12px', fontFamily: 'var(--font-body)',
                          background: 'none', border: '0.5px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setStatus(r.id, responding.action, message)}
                        style={{
                          padding: '7px 16px', fontSize: '12px', fontWeight: 500,
                          fontFamily: 'var(--font-body)',
                          background: responding.action === 'declined' ? 'var(--state-danger)' : 'var(--green)',
                          color: 'white', border: 'none',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        {responding.action === 'declined' ? 'Send & decline' : 'Send & accept'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
