import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { logUserInvited } from '../utils/activityLogger'

const ROLES = ['admin', 'manager', 'event_lead', 'team']
const ROLE_LABELS = { admin: 'Admin', manager: 'Project Head', event_lead: 'Manager', team: 'Project Team' }
const ROLE_DESC = {
  admin: 'Full access — all events, costs, margins, team management',
  manager: 'Creates & manages events — elements, proposals, assigns Managers and Project Team',
  event_lead: 'Delegated authority per event — scope set by Project Head on assignment',
  team: 'Task execution only — assigned tasks, notes, no event-level access',
}

export default function UserManagement({ session, userRole = 'admin', tenantId, onViewProfile }) {
  // Roles this user is allowed to create
  const inviteableRoles = userRole === 'admin'
    ? ['admin', 'manager', 'event_lead', 'team']
    : userRole === 'manager'
    ? ['event_lead', 'team']
    : ['team'] // event_lead can only invite team

  const defaultInviteRole = userRole === 'admin' ? 'team' : userRole === 'manager' ? 'event_lead' : 'team'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', role: defaultInviteRole, base_city: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('active')
  const [suspendedUsers, setSuspendedUsers] = useState([])
  const [expiredUsers, setExpiredUsers] = useState([])

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const [{ data: active }, { data: suspended }, { data: expired }] = await Promise.all([
      supabase.from('users').select('*').eq('status', 'active').not('auth_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('status', 'suspended').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('status', 'active').is('auth_id', null).order('created_at', { ascending: false }),
    ])
    setUsers(active || [])
    setSuspendedUsers(suspended || [])
    setExpiredUsers(expired || [])
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: inviteError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: form.email,
          tenant_id: tenantId,
          role: form.role,
          full_name: form.fullName,
        }
      })
      if (inviteError) throw inviteError

      setSuccess(`✓ Invite sent to ${form.email}. They'll be guided to complete their profile when they first log in.`)
      await logUserInvited(form.email, form.role)

      setForm({ fullName: '', email: '', role: 'team', base_city: '', phone: '' })
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

  const handleRateCardToggle = async (userId, current) => {
    await supabase.from('users').update({ can_manage_rate_cards: !current }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, can_manage_rate_cards: !current } : u))
  }

  async function suspendUser(userId, email) {
    if (!window.confirm(`Suspend ${email}? They will lose access until reinstated.`)) return
    await supabase.from('users').update({ status: 'suspended' }).eq('id', userId)
    fetchUsers()
  }

  async function reinstateUser(userId, email) {
    if (!window.confirm(`Reinstate ${email}? They will regain full access.`)) return
    await supabase.from('users').update({ status: 'active' }).eq('id', userId)
    fetchUsers()
  }

  async function hardDeleteUser(userId, email) {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({ user_id: userId }),
    })
    const json = await res.json()
    if (!res.ok || json.error) { alert(`Delete failed: ${json.error || 'unknown error'}`); return }
    fetchUsers()
  }

  const [resending, setResending] = useState(null) // userId being resent
  const [resendMsg, setResendMsg] = useState({})   // { userId: message }

  async function handleResend(userId, email) {
    setResending(userId)
    setResendMsg(prev => ({ ...prev, [userId]: '' }))
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email, resend_only: true }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        const msg = (json.error || '').toLowerCase()
        if (msg.includes('already registered')) {
          setResendMsg(prev => ({ ...prev, [userId]: '✓ Already set up — they can log in' }))
        } else {
          setResendMsg(prev => ({ ...prev, [userId]: `Failed: ${json.error || 'unknown error'}` }))
        }
      } else {
        setResendMsg(prev => ({ ...prev, [userId]: '✓ Invite sent' }))
      }
    } catch (err) {
      setResendMsg(prev => ({ ...prev, [userId]: `Failed: ${err.message}` }))
    }
    setResending(null)
    // Clear message after 4 seconds
    setTimeout(() => setResendMsg(prev => ({ ...prev, [userId]: '' })), 4000)
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
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {inviteableRoles.map(role => (
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

            {/* Optional profile fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Base city <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-tertiary)', opacity: 0.7 }}>(optional)</span>
                </label>
                <input
                  placeholder="e.g. Mumbai"
                  value={form.base_city}
                  onChange={e => setForm(f => ({ ...f, base_city: e.target.value }))}
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
                  Phone <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-tertiary)', opacity: 0.7 }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: '14px',
                    fontFamily: 'var(--font-body)', background: 'var(--bg)',
                    border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Profile tip */}
            <div style={{
              background: '#FFF8F0', border: '0.5px solid #F5DFC0',
              borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--state-warning)', marginBottom: '4px' }}>
                  They'll complete the rest themselves
                </div>
                <div style={{ fontSize: '12px', color: 'var(--state-warning)', lineHeight: 1.6, opacity: 0.85 }}>
                  Once they log in, they'll be guided to add their bio, LinkedIn, Instagram and more — each with a reason why it helps them get the right assignments.
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: '13px', color: 'var(--state-danger)', background: 'var(--state-danger-bg)',
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

      {/* Tab strip — Active / Suspended / Expired Invites */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'active',    label: 'Active',          count: users.length },
          { key: 'suspended', label: 'Suspended',        count: suspendedUsers.length },
          { key: 'expired',   label: 'Expired Invites',  count: expiredUsers.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              borderBottom: activeTab === tab.key ? '2px solid var(--app-accent)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: '6px', fontSize: '11px', fontWeight: 500,
                background: activeTab === tab.key ? 'var(--app-accent)' : 'var(--bg-surface-2)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                padding: '1px 6px', borderRadius: '10px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading team...</p>
      ) : (
        <>
          {activeTab === 'active' && (
            users.length === 0 ? (
              <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '48px 40px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No active members yet.</p>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '6px' }}>Invite someone to start collaborating on events.</p>
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
                      <div
                        onClick={() => onViewProfile && onViewProfile(u.id)}
                        title="View profile"
                        style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: 'var(--app-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: '#fff',
                          flexShrink: 0,
                          cursor: onViewProfile ? 'pointer' : 'default',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => { if (onViewProfile) e.currentTarget.style.opacity = '0.8' }}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        {(u.full_name || u.email).trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0,2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                          {u.full_name || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                          {u.base_city && (
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M5 1C3.34 1 2 2.34 2 4c0 2.25 3 5.5 3 5.5S8 6.25 8 4c0-1.66-1.34-3-3-3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                <circle cx="5" cy="4" r="1" fill="currentColor"/>
                              </svg>
                              {u.base_city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {onViewProfile && (
                        <button
                          onClick={() => onViewProfile(u.id)}
                          style={{
                            padding: '5px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
                            background: 'none', border: '0.5px solid var(--border-strong)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            color: 'var(--text-secondary)', transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--app-accent)'; e.currentTarget.style.color = 'var(--app-accent)' }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                        >
                          View profile
                        </button>
                      )}
                      {resendMsg[u.id] && (
                        <span style={{ fontSize: '11px', color: resendMsg[u.id].startsWith('✓') ? 'var(--green)' : 'var(--state-danger)', fontFamily: 'var(--font-body)' }}>
                          {resendMsg[u.id]}
                        </span>
                      )}
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-body)',
                          background: u.role === 'admin' ? 'var(--green-light)' : u.role === 'manager' ? 'var(--state-info-bg)' : u.role === 'event_lead' ? 'var(--state-warning-bg)' : 'var(--bg-secondary)',
                          color: u.role === 'admin' ? 'var(--green)' : u.role === 'manager' ? 'var(--state-info)' : u.role === 'event_lead' ? 'var(--state-warning)' : 'var(--text-secondary)',
                          border: '0.5px solid var(--border)', borderRadius: '20px',
                          cursor: 'pointer', outline: 'none', fontWeight: 500,
                        }}
                      >
                        {inviteableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      {userRole === 'admin' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type='checkbox'
                            checked={!!u.can_manage_rate_cards}
                            onChange={() => handleRateCardToggle(u.id, !!u.can_manage_rate_cards)}
                            style={{ accentColor: 'var(--app-accent)', width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>Rate Cards Access</span>
                        </label>
                      )}
                      <button
                        onClick={() => handleResend(u.id, u.email)}
                        disabled={resending === u.id}
                        title="Resend invite email"
                        style={{
                          padding: '5px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
                          background: 'none', border: '0.5px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)', cursor: resending === u.id ? 'wait' : 'pointer',
                          color: 'var(--text-secondary)', opacity: resending === u.id ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                        onMouseOver={e => { if (resending !== u.id) e.currentTarget.style.borderColor = 'var(--text)' }}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                      >
                        {resending === u.id ? 'Sending...' : '↻ Resend invite'}
                      </button>
                      <button
                        onClick={() => suspendUser(u.id, u.email)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '13px', color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-body)', padding: '4px 8px',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--state-danger)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'suspended' && (
            suspendedUsers.length === 0 ? (
              <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '48px 40px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No suspended members.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {suspendedUsers.map(u => (
                  <div
                    key={u.id}
                    style={{
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
                      padding: '16px 24px', background: 'var(--bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                      opacity: 0.7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: 'var(--bg-surface-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0,
                      }}>
                        {(u.full_name || u.email).trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0,2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{u.full_name || '—'}</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', padding: '3px 8px', borderRadius: '10px' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                      <button
                        onClick={() => reinstateUser(u.id, u.email)}
                        style={{
                          padding: '5px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
                          background: 'none', border: '0.5px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--app-accent)'; e.currentTarget.style.color = 'var(--app-accent)' }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        Reinstate
                      </button>
                      <button
                        onClick={() => hardDeleteUser(u.id, u.email)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', padding: '4px 8px',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--state-danger)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'expired' && (
            expiredUsers.length === 0 ? (
              <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '48px 40px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No expired invites.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expiredUsers.map(u => (
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
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: '#F5DFC0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: 'var(--state-warning)', flexShrink: 0,
                      }}>
                        {(u.full_name || u.email).trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0,2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{u.full_name || '(no name yet)'}</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.email}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {resendMsg[u.id] && (
                        <span style={{ fontSize: '11px', color: resendMsg[u.id].startsWith('✓') ? 'var(--green)' : 'var(--state-danger)', fontFamily: 'var(--font-body)' }}>
                          {resendMsg[u.id]}
                        </span>
                      )}
                      <button
                        onClick={() => handleResend(u.id, u.email)}
                        disabled={resending === u.id}
                        style={{
                          padding: '5px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
                          background: 'none', border: '0.5px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)', cursor: resending === u.id ? 'wait' : 'pointer',
                          color: 'var(--text-secondary)', opacity: resending === u.id ? 0.5 : 1,
                        }}
                        onMouseOver={e => { if (resending !== u.id) e.currentTarget.style.borderColor = 'var(--text)' }}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                      >
                        {resending === u.id ? 'Sending...' : '↻ Resend invite'}
                      </button>
                      <button
                        onClick={() => hardDeleteUser(u.id, u.email)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', padding: '4px 8px',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--state-danger)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
