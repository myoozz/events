import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const STATUS_STYLES = {
  pending: { bg: 'var(--amber-light)', color: 'var(--amber)' },
  accepted: { bg: 'var(--green-light)', color: 'var(--green)' },
  declined: { bg: '#FCEBEB', color: '#A32D2D' },
}

export default function EarlyAccess() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [responding, setResponding] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => { fetchRequests() }, [])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('early_access')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function handleRespond(id, status) {
    await supabase.from('early_access').update({ status, response_message: message }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, response_message: message } : r))
    setResponding(null)
    setMessage('')
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    declined: requests.filter(r => r.status === 'declined').length,
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '28px',
          fontWeight: 500, color: 'var(--text)',
          letterSpacing: '-0.3px', marginBottom: '6px',
        }}>
          Early access requests
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          {counts.pending} pending · {counts.accepted} accepted · {counts.declined} declined
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: '0', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        width: 'fit-content', marginBottom: '24px',
      }}>
        {[
          { key: 'pending', label: `Pending (${counts.pending})` },
          { key: 'accepted', label: `Accepted (${counts.accepted})` },
          { key: 'declined', label: `Declined (${counts.declined})` },
          { key: 'all', label: 'All' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 16px', fontSize: '12px',
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

      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{
          border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)',
          padding: '48px 40px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No {filter === 'all' ? '' : filter} requests yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(r => {
            const sc = STATUS_STYLES[r.status] || STATUS_STYLES.pending
            const isResponding = responding === r.id
            return (
              <div key={r.id} style={{
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '20px 24px', background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: isResponding ? '16px' : 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                        {r.full_name || '—'}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 500, textTransform: 'uppercase',
                        letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '20px',
                        background: sc.bg, color: sc.color,
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                      {r.company ? ` · ${r.company}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {r.response_message && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', fontStyle: 'italic' }}>
                        Response: {r.response_message}
                      </div>
                    )}
                  </div>

                  {r.status === 'pending' && !isResponding && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => { setResponding(r.id); setMessage('Thank you for your interest! We are excited to have you on board. Your access will be set up shortly.') }}
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
                        onClick={() => { setResponding(r.id + '-decline'); setMessage('Thank you for your interest in Events by Myoozz. We are currently onboarding in limited batches and will keep you updated as we expand access.') }}
                        style={{
                          padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                          fontFamily: 'var(--font-body)', background: '#FCEBEB',
                          color: '#A32D2D', border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {(isResponding || responding === r.id + '-decline') && (
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                      color: 'var(--text-tertiary)', marginBottom: '6px',
                    }}>
                      Message to send
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={3}
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
                        onClick={() => handleRespond(r.id, isResponding === true || responding === r.id ? 'accepted' : 'declined')}
                        style={{
                          padding: '7px 16px', fontSize: '12px', fontWeight: 500,
                          fontFamily: 'var(--font-body)',
                          background: responding === r.id + '-decline' ? '#A32D2D' : 'var(--green)',
                          color: 'white', border: 'none',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        {responding === r.id + '-decline' ? 'Send & decline' : 'Send & accept'}
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
