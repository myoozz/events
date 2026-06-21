import { useState, useEffect } from 'react'
import { Icon } from '../icons'
import { supabase } from '../supabase'

// Human-readable action labels; unknown actions fall back to Title Case.
const ACTION_LABELS = {
  event_deleted: 'Deleted event',
  profile_updated: 'Updated profile',
  invited: 'Invited user',
  restored: 'Restored event',
}
function humanizeAction(action) {
  if (!action) return ''
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Friendly labels for object-valued detail keys (prevents rendering [object Object]).
const DETAIL_LABELS = {
  full_event_snapshot: 'Event snapshot saved',
}
function renderDetails(details) {
  if (typeof details === 'string') return details
  if (!details || typeof details !== 'object') return ''
  const parts = []
  for (const [k, v] of Object.entries(details)) {
    if (DETAIL_LABELS[k]) { parts.push(DETAIL_LABELS[k]); continue }
    if (v == null) continue
    if (Array.isArray(v)) { parts.push(`${k}: ${v.join(', ')}`); continue }
    if (typeof v === 'object') {
      const sub = Object.entries(v)
        .filter(([, sv]) => sv != null && typeof sv !== 'object')
        .map(([sk, sv]) => `${sk}: ${sv}`)
      parts.push(sub.length ? sub.join(' · ') : `${k}: saved`)
      continue
    }
    parts.push(`${k}: ${v}`)
  }
  return parts.join(' · ')
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [filterType, setFilterType] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [platformRole, setPlatformRole] = useState(null)
  const [jwtReady, setJwtReady] = useState(false)

  useEffect(() => {
    async function decodeJwt() {
      try {
        const { data: s } = await supabase.auth.getSession()
        const token = s?.session?.access_token
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.platform_role) setPlatformRole(payload.platform_role)
          if (payload.tenant_id) setTenantId(payload.tenant_id)
        }
      } finally {
        setJwtReady(true)
      }
    }
    decodeJwt()
  }, [])

  useEffect(() => { if (jwtReady) loadLogs() }, [jwtReady])

  async function loadLogs() {
    setLoading(true)
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (platformRole !== 'super_admin' && tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    const matchUser = !filterUser || l.user_email === filterUser || l.user_name === filterUser
    const matchType = !filterType || l.entity_type === filterType
    return matchUser && matchType
  })

  // Group by date
  const grouped = {}
  filtered.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(log)
  })

  const allUsers = [...new Set(logs.map(l => l.user_name || l.user_email).filter(Boolean))].sort()
  const allTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))].sort()

  const ENTITY_COLORS = {
    event:    { bg: 'var(--app-surface)',      color: 'var(--app-text-dim)' },
    element:  { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
    task:     { bg: 'var(--state-warning-bg)', color: 'var(--state-warning)' },
    category: { bg: 'var(--app-surface)',      color: 'var(--app-text-dim)' },
    user:     { bg: 'var(--state-info-bg)',    color: 'var(--state-info)' },
    system:   { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '28px',
          fontWeight: 500, color: 'var(--text)', marginBottom: '6px',
        }}>
          Activity log
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          All actions across your workspace — newest first. Admin only.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-body)',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All team members</option>
          {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-body)',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All types</option>
          {allTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>

        {(filterUser || filterType) && (
          <button
            onClick={() => { setFilterUser(''); setFilterType('') }}
            style={{
              padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
              background: 'none', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)',
            }}
          >
            Clear
          </button>
        )}

        <button
          onClick={loadLogs}
          style={{
            marginLeft: 'auto', padding: '8px 14px', fontSize: '12px',
            fontFamily: 'var(--font-body)', background: 'none',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', color: 'var(--text)',
          }}
        >
          <Icon name="refresh" size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      {!loading && logs.length > 0 && (
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '24px', padding: '12px 16px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--border)', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> entries
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text)' }}>{allUsers.length}</strong> team members
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Last action: <strong style={{ color: 'var(--text)' }}>
              {logs[0] ? new Date(logs[0].created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </strong>
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '60px 40px', textAlign: 'center',
          border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '8px' }}>
            {logs.length === 0 ? 'No activity recorded yet.' : 'No results for this filter.'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {logs.length === 0
              ? 'Actions will appear here as your team uses the system.'
              : 'Try clearing the filters to see all entries.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, entries]) => (
          <div key={date} style={{ marginBottom: '32px' }}>
            {/* Date header */}
            <div style={{
              fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.6px',
              marginBottom: '0', padding: '6px 0',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{date}</span>
              <span style={{ fontWeight: 400 }}>{entries.length} action{entries.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Entries */}
            {entries.map((log, i) => {
              const ec = ENTITY_COLORS[log.entity_type] || { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }
              return (
                <div
                  key={log.id || i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr auto',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '0.5px solid var(--border)',
                    alignItems: 'start',
                  }}
                >
                  {/* Time */}
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', paddingTop: '1px', fontFamily: 'var(--font-body)' }}>
                    {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Action */}
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                      {log.user_name || log.user_email?.split('@')[0]}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}> {humanizeAction(log.action)}</span>
                    {log.entity_name && (
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}> — {log.entity_name}</span>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && renderDetails(log.details) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                        {renderDetails(log.details)}
                      </div>
                    )}
                  </div>

                  {/* Type badge */}
                  {log.entity_type && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '20px',
                      background: ec.bg, color: ec.color,
                      textTransform: 'capitalize', whiteSpace: 'nowrap',
                    }}>
                      {log.entity_type}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
