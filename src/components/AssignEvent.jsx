import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function AssignEvent({ event, onClose, onUpdated }) {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(event.assigned_to || [])
  const [saving, setSaving] = useState(false)

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
    setSelected(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    )
  }

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase
      .from('events')
      .update({ assigned_to: selected })
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
        maxWidth: '420px', width: '100%',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px',
          fontWeight: 500, color: 'var(--text)',
          marginBottom: '6px', letterSpacing: '-0.3px',
        }}>
          Assign team members
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
          {event.event_name}
        </p>

        {users.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
            No team members yet. Add someone from the Team tab first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {users.map(u => {
              const isSelected = selected.includes(u.email)
              return (
                <div
                  key={u.id}
                  onClick={() => toggle(u.email)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1.5px solid var(--text)' : '0.5px solid var(--border)',
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
                    background: u.role === 'admin' ? 'var(--green-light)' : 'var(--bg-secondary)',
                    color: u.role === 'admin' ? 'var(--green)' : 'var(--text-tertiary)',
                  }}>
                    {u.role === 'admin' ? 'Admin' : 'Team'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
              background: 'none', border: '0.5px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'var(--text)',
              color: 'var(--bg)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}
