import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const SCOPE_OPTIONS = [
  { value: 'full',  label: 'Full Access',      desc: 'All tabs' },
  { value: 'ops',   label: 'Operations',        desc: 'Tasks & Production' },
  { value: 'view',  label: 'View Only',         desc: 'Read only' },
]

const ROLE_BADGE = {
  admin:       { bg: 'var(--green-light)',  color: 'var(--green)',          label: 'Admin' },
  manager:     { bg: '#EAF0FD',            color: '#3B6FE0',               label: 'Manager' },
  event_lead:  { bg: '#FFF4E5',            color: '#C87800',               label: 'Event Lead' },
  team:        { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)', label: 'Team' },
}

export default function AssignEvent({ event, onClose, onUpdated }) {
  const [users, setUsers]               = useState([])
  const [selected, setSelected]         = useState(event.assigned_to || [])
  const [delegationScope, setScope]     = useState(event.delegation_scope || {})
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name')
      setUsers(data || [])
    }
    fetchUsers()
  }, [])

  function toggle(email) {
    setSelected(prev => {
      if (prev.includes(email)) {
        // remove from scope too
        setScope(s => { const n = { ...s }; delete n[email]; return n })
        return prev.filter(e => e !== email)
      } else {
        // default scope = full on first assign
        setScope(s => ({ ...s, [email]: 'full' }))
        return [...prev, email]
      }
    })
  }

  function setUserScope(email, scope) {
    setScope(prev => ({ ...prev, [email]: scope }))
  }

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase
      .from('events')
      .update({ assigned_to: selected, delegation_scope: delegationScope })
      .eq('id', event.id)
      .select('*, clients(group_name, brand_name)')
      .single()
    if (data) onUpdated(data)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '28px 32px',
        maxWidth: '460px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px',
          fontWeight: 500, color: 'var(--text)',
          marginBottom: '6px', letterSpacing: '-0.3px',
        }}>
          Assign team members
        </h3>
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {event.event_name}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px', lineHeight: 1.5 }}>
          Tick to give access · Set scope per member · Changes take effect on save.
        </p>

        {users.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
            No team members yet. Add someone from the Team tab first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {users.map(u => {
              const isSelected = selected.includes(u.email)
              const badge = ROLE_BADGE[u.role] || ROLE_BADGE.team
              return (
                <div key={u.id} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {/* User row */}
                  <div
                    onClick={() => toggle(u.email)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px',
                      border: isSelected ? '1.5px solid var(--text)' : '0.5px solid var(--border)',
                      borderBottom: isSelected ? '0' : undefined,
                      borderRadius: isSelected ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)',
                      cursor: 'pointer', background: isSelected ? 'var(--bg-secondary)' : 'var(--bg)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isSelected ? 'var(--text)' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 500,
                      color: isSelected ? 'var(--bg)' : 'var(--text-secondary)',
                      flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                        {u.full_name || u.email}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.email}</div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      padding: '2px 8px', borderRadius: '20px',
                      background: badge.bg, color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Scope selector — only when ticked */}
                  {isSelected && (
                    <div style={{
                      display: 'flex', gap: '6px', padding: '10px 14px',
                      border: '1.5px solid var(--text)', borderTop: '0.5px solid var(--border)',
                      borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                      background: 'var(--bg)',
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: '5px', whiteSpace: 'nowrap' }}>
                        Scope:
                      </span>
                      {SCOPE_OPTIONS.map(opt => {
                        const active = delegationScope[u.email] === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={e => { e.stopPropagation(); setUserScope(u.email, opt.value) }}
                            title={opt.desc}
                            style={{
                              padding: '4px 10px', fontSize: '11px', fontWeight: 500,
                              fontFamily: 'var(--font-body)',
                              borderRadius: '20px', cursor: 'pointer',
                              border: active ? '1.5px solid var(--text)' : '0.5px solid var(--border)',
                              background: active ? 'var(--text)' : 'var(--bg)',
                              color: active ? 'var(--bg)' : 'var(--text-tertiary)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
            background: 'none', border: '0.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 20px', fontSize: '13px', fontWeight: 500,
            fontFamily: 'var(--font-body)', background: 'var(--text)',
            color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}>
            {saving ? 'Saving...' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}
