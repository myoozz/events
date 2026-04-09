import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ROLES = ['admin', 'team']
const ROLE_LABELS = { admin: 'Admin', team: 'Team member' }
const ROLE_DESC = {
  admin: 'Full access — create events, see all costs and margins, manage team',
  team: 'Assigned events only — build element sheets, enter costs, submit for review',
}

export default function UserManagement({ session }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', role: 'team' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('status', 'inactive')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Step 1 — always save user record first
      const { error: dbError } = await supabase.from('users').upsert({
        email: form.email,
        full_name: form.fullName,
        role: form.role,
        status: 'active',
        created_by: session.user.id,
      }, { onConflict: 'email' })

      if (dbError) throw new Error(`Could not save user: ${dbError.message}`)

      // Step 2 — call Edge Function (service key stays server-side, never in browser)
      const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email: form.email }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        const msg = (json.error || '').toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setError(`${form.email} is already registered. They can log in directly.`)
        } else {
          setError(`Email invite failed — ${json.error || 'unknown error'}. Invite manually from Supabase dashboard → Auth → Users.`)
        }
      } else {
        setSuccess(`✓ Invite sent to ${form.email}.`)
      }

      setForm({ fullName: '', email: '', role: 'team' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setError(`Failed: ${err.message}`)
    }
    setSaving(false)
  }

  async function handleRoleChange(userId, newRole) {
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function handleRemove(userId, email) {
    if (!window.confirm(`Deactivate ${email}? They will no longer be able to access the system. You can restore them anytime from Supabase.`)) return
    await supabase.from('users').update({ status: 'inactive' }).eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: '6px' }}>
            Team
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', fontSize: '13px', fontWeight: 500,
            fontFamily: 'var(--font-body)', background: 'var(--text)',
            color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}
        >
          + Invite team member
        </button>
      </div>

      {success && (
        <div style={{
          fontSize: '13px', color: 'var(--green)',
          background: 'var(--green-light)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px',
        }}>
          {success}
        </div>
      )}

      {showForm && (
        <div style={{
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '24px', marginBottom: '24px', background: 'var(--bg-secondary)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '20px' }}>
            Invite a team member
          </h3>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Full name *
                </label>
                <input
                  required
                  placeholder="e.g. Akanksha Singh"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: '14px',
                    fontFamily: 'var(--font-body)', background: 'var(--bg)',
                    border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Email address *
                </label>
                <input
                  required type="email"
                  placeholder="e.g. akanksha@myoozz.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: '14px',
                    fontFamily: 'var(--font-body)', background: 'var(--bg)',
                    border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                Role *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {ROLES.map(role => (
                  <div
                    key={role}
                    onClick={() => setForm(f => ({ ...f, role }))}
                    style={{
                      flex: 1, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
                      border: form.role === role ? '1.5px solid var(--text)' : '0.5px solid var(--border)',
                      cursor: 'pointer', background: form.role === role ? 'var(--bg)' : 'var(--bg-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
                      {ROLE_LABELS[role]}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                      {ROLE_DESC[role]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
                border: '0.5px solid #F09595', borderRadius: 'var(--radius-sm)',
                padding: '10px 14px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                style={{
                  padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: 'none', border: '0.5px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'var(--font-body)', background: 'var(--text)',
                  color: 'var(--bg)', border: 'none',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >
                {saving ? 'Sending invite...' : 'Send invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading team...</p>
      ) : users.length === 0 ? (
        <div style={{
          border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)',
          padding: '48px 40px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No team members yet.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            Invite someone to start collaborating on events.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.map(u => (
            <div
              key={u.id}
              style={{
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '16px 24px', background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                    {u.full_name || '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  style={{
                    padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-body)',
                    background: u.role === 'admin' ? 'var(--green-light)' : 'var(--bg-secondary)',
                    color: u.role === 'admin' ? 'var(--green)' : 'var(--text-secondary)',
                    border: '0.5px solid var(--border)', borderRadius: '20px',
                    cursor: 'pointer', outline: 'none', fontWeight: 500,
                  }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button
                  onClick={() => handleRemove(u.id, u.email)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-body)', padding: '4px 8px',
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#A32D2D'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
