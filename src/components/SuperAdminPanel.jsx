import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const EF_URL = 'https://rjscsnakkexunvsfhdut.supabase.co/functions/v1/approve-tenant'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }) {
  const map = {
    pending_review: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    waitlisted:     { bg: '#E0E7FF', color: '#3730A3', label: 'Waitlisted' },
    active:         { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
    suspended:      { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
    expired:        { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280', label: status }
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-body)',
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>
      {s.label}
    </span>
  )
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px', color: value ? 'var(--text)' : 'var(--text-tertiary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function SuperAdminPanel({ session }) {
  const platformRole = (() => {
    try {
      const token = session?.access_token
      if (!token) return null
      return JSON.parse(atob(token.split('.')[1])).platform_role || null
    } catch { return null }
  })()

  const [activeTab,    setActiveTab]    = useState('pending')
  const [loading,      setLoading]      = useState(true)
  const [stats,        setStats]        = useState({ pending: 0, active: 0, inTrial: 0 })
  const [pendingList,  setPendingList]  = useState([])
  const [activeList,   setActiveList]   = useState([])

  const [approveModal,  setApproveModal]  = useState(null)
  const [waitlistModal, setWaitlistModal] = useState(null)
  const [extendModal,   setExtendModal]   = useState(null)
  const [trialDays,     setTrialDays]     = useState(14)
  const [waitlistReason, setWaitlistReason] = useState("We're being careful with onboarding — you're on our list.")
  const [extendDays,    setExtendDays]    = useState(7)
  const [modalLoading,  setModalLoading]  = useState(false)
  const [rowToasts,     setRowToasts]     = useState({})

  useEffect(() => {
    if (platformRole === 'super_admin') fetchAll()
  }, [platformRole])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchStats(), fetchPending(), fetchActive()])
    setLoading(false)
  }

  async function fetchStats() {
    const now = new Date().toISOString()
    const [r1, r2, r3] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('trial_ends_at', now),
    ])
    setStats({ pending: r1.count || 0, active: r2.count || 0, inTrial: r3.count || 0 })
  }

  async function fetchPending() {
    const { data } = await supabase
      .from('tenants')
      .select('id, name, contact_name, contact_email, contact_phone, gst_number, state, created_at, status')
      .in('status', ['pending_review', 'waitlisted'])
      .order('created_at', { ascending: false })
    setPendingList(data || [])
  }

  async function fetchActive() {
    const { data } = await supabase
      .from('tenants')
      .select('id, name, plan, trial_ends_at, contact_email, approved_at, status')
      .eq('status', 'active')
      .order('approved_at', { ascending: false })
    setActiveList(data || [])
  }

  function showRowToast(tenantId, msg) {
    setRowToasts(prev => ({ ...prev, [tenantId]: msg }))
    setTimeout(() => setRowToasts(prev => { const n = { ...prev }; delete n[tenantId]; return n }), 3500)
  }

  async function handleApprove() {
    if (!approveModal) return
    setModalLoading(true)
    try {
      const res = await fetch(EF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          tenant_id: approveModal.id,
          trial_days: Number(trialDays),
          approved_by_email: session?.user?.email,
          action: 'approve',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Approve failed')
      setPendingList(prev => prev.filter(t => t.id !== approveModal.id))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), active: prev.active + 1 }))
      showRowToast(approveModal.id, 'Approved ✓')
      setApproveModal(null)
      setTrialDays(14)
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setModalLoading(false)
  }

  async function handleWaitlist() {
    if (!waitlistModal) return
    setModalLoading(true)
    try {
      const res = await fetch(EF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          tenant_id: waitlistModal.id,
          action: 'waitlist',
          waitlist_reason: waitlistReason.trim() || "We're being careful with onboarding — you're on our list.",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Waitlist failed')
      setPendingList(prev => prev.map(t => t.id === waitlistModal.id ? { ...t, status: 'waitlisted' } : t))
      setWaitlistModal(null)
      setWaitlistReason("We're being careful with onboarding — you're on our list.")
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setModalLoading(false)
  }

  async function handleExtendTrial() {
    if (!extendModal) return
    setModalLoading(true)
    try {
      const base = extendModal.trial_ends_at ? new Date(extendModal.trial_ends_at) : new Date()
      const newEnd = new Date(base.getTime() + Number(extendDays) * 86400000)
      const { error } = await supabase
        .from('tenants')
        .update({ trial_ends_at: newEnd.toISOString() })
        .eq('id', extendModal.id)
      if (error) throw new Error(error.message)
      setActiveList(prev => prev.map(t => t.id === extendModal.id ? { ...t, trial_ends_at: newEnd.toISOString() } : t))
      showRowToast(extendModal.id, `Extended +${extendDays}d ✓`)
      setExtendModal(null)
      setExtendDays(7)
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setModalLoading(false)
  }

  if (platformRole !== 'super_admin') {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-tertiary)' }}>Access restricted.</p>
      </div>
    )
  }

  const inputBase = {
    width: '100%', padding: '9px 12px', fontSize: '14px',
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  }
  const lightInput = { ...inputBase, background: 'var(--bg)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }
  const darkInput  = { ...inputBase, background: '#1e1e1c', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', color: '#e8e6e0' }

  return (
    <div style={{ maxWidth: '960px' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: '6px' }}>
          Platform Admin
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tenant approvals and account management</p>
      </div>

      {/* STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Pending review', value: stats.pending,  accent: '#bc1723' },
          { label: 'Active tenants', value: stats.active,   accent: '#065F46' },
          { label: 'In trial',       value: stats.inTrial,  accent: '#F28F3B' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-display)', color: card.accent, letterSpacing: '-1px', marginBottom: '4px' }}>
              {loading ? '—' : card.value}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: '24px' }}>
        {[{ key: 'pending', label: 'Pending' }, { key: 'active', label: 'Active tenants' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #F28F3B' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-tertiary)',
              cursor: 'pointer', marginBottom: '-0.5px', transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <div>
          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', padding: '40px 0', textAlign: 'center' }}>Loading...</p>
          ) : pendingList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>All clear</p>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No pending applications</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingList.map(tenant => (
                <div key={tenant.id} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                          {tenant.name}
                        </span>
                        <StatusBadge status={tenant.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 24px' }}>
                        <Field label="Contact"  value={tenant.contact_name} />
                        <Field label="Email"    value={tenant.contact_email} />
                        <Field label="Phone"    value={tenant.contact_phone} />
                        {tenant.gst_number && <Field label="GST" value={tenant.gst_number} mono />}
                        {tenant.state      && <Field label="State" value={tenant.state} />}
                        <Field label="Applied" value={fmtDate(tenant.created_at)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                      <button
                        onClick={() => { setApproveModal(tenant); setTrialDays(14) }}
                        style={{
                          padding: '8px 18px', fontSize: '13px', fontWeight: 600,
                          fontFamily: 'var(--font-body)', background: '#bc1723', color: '#fff',
                          border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Approve →
                      </button>
                      {tenant.status === 'pending_review' && (
                        <button
                          onClick={() => { setWaitlistModal(tenant); setWaitlistReason("We're being careful with onboarding — you're on our list.") }}
                          style={{
                            padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                            fontFamily: 'var(--font-body)', background: 'none', color: 'var(--text)',
                            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          Waitlist
                        </button>
                      )}
                      {rowToasts[tenant.id] && (
                        <span style={{ fontSize: '12px', color: '#065F46', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                          {rowToasts[tenant.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE TENANTS TAB */}
      {activeTab === 'active' && (
        <div>
          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', padding: '40px 0', textAlign: 'center' }}>Loading...</p>
          ) : activeList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)' }}>No active tenants yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeList.map(tenant => (
                <div key={tenant.id} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                        {tenant.name}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 24px' }}>
                        <Field label="Plan"          value={tenant.plan} />
                        <Field label="Trial ends"    value={fmtDate(tenant.trial_ends_at)} />
                        <Field label="Contact email" value={tenant.contact_email} />
                        <Field label="Approved"      value={fmtDate(tenant.approved_at)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                      <button
                        onClick={() => { setExtendModal(tenant); setExtendDays(7) }}
                        style={{
                          padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                          fontFamily: 'var(--font-body)', background: 'none', color: 'var(--text)',
                          border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        Extend trial
                      </button>
                      {rowToasts[tenant.id] && (
                        <span style={{ fontSize: '12px', color: '#065F46', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                          {rowToasts[tenant.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPROVE MODAL */}
      {approveModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}
          onClick={() => setApproveModal(null)}
        >
          <div
            style={{ background: '#141413', border: '0.5px solid #2e2e2c', borderRadius: 'var(--radius)', width: '100%', maxWidth: '440px', padding: '28px 32px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: '#e8e6e0', marginBottom: '4px' }}>Approve tenant</h3>
                <p style={{ fontSize: '13px', color: '#6b6760' }}>{approveModal.name}</p>
              </div>
              <button onClick={() => setApproveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6760', fontSize: '18px', padding: '2px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b6760', marginBottom: '8px' }}>
                Trial period (days)
              </label>
              <input
                type="number" min="1" max="365"
                value={trialDays}
                onChange={e => setTrialDays(e.target.value)}
                style={darkInput}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleApprove}
                disabled={modalLoading}
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', background: '#bc1723', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: modalLoading ? 0.6 : 1 }}
              >
                {modalLoading ? 'Approving...' : 'Approve & activate →'}
              </button>
              <button
                onClick={() => setApproveModal(null)}
                style={{ padding: '11px 16px', fontSize: '13px', background: 'none', color: '#a8a49e', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITLIST MODAL */}
      {waitlistModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}
          onClick={() => setWaitlistModal(null)}
        >
          <div
            style={{ background: '#141413', border: '0.5px solid #2e2e2c', borderRadius: 'var(--radius)', width: '100%', maxWidth: '440px', padding: '28px 32px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: '#e8e6e0', marginBottom: '4px' }}>Move to waitlist</h3>
                <p style={{ fontSize: '13px', color: '#6b6760' }}>{waitlistModal.name}</p>
              </div>
              <button onClick={() => setWaitlistModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6760', fontSize: '18px', padding: '2px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b6760', marginBottom: '8px' }}>
                Reason (shown to applicant)
              </label>
              <textarea
                rows={4}
                value={waitlistReason}
                onChange={e => setWaitlistReason(e.target.value)}
                style={{ ...darkInput, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleWaitlist}
                disabled={modalLoading}
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', background: '#1e1e1c', color: '#e8e6e0', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: modalLoading ? 0.6 : 1 }}
              >
                {modalLoading ? 'Moving...' : 'Move to waitlist'}
              </button>
              <button
                onClick={() => setWaitlistModal(null)}
                style={{ padding: '11px 16px', fontSize: '13px', background: 'none', color: '#a8a49e', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND TRIAL MODAL */}
      {extendModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}
          onClick={() => setExtendModal(null)}
        >
          <div
            style={{ background: '#141413', border: '0.5px solid #2e2e2c', borderRadius: 'var(--radius)', width: '100%', maxWidth: '400px', padding: '28px 32px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: '#e8e6e0', marginBottom: '4px' }}>Extend trial</h3>
                <p style={{ fontSize: '13px', color: '#6b6760' }}>{extendModal.name}</p>
                {extendModal.trial_ends_at && (
                  <p style={{ fontSize: '12px', color: '#6b6760', marginTop: '2px' }}>
                    Current end: {fmtDate(extendModal.trial_ends_at)}
                  </p>
                )}
              </div>
              <button onClick={() => setExtendModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6760', fontSize: '18px', padding: '2px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b6760', marginBottom: '8px' }}>
                Add days
              </label>
              <input
                type="number" min="1" max="365"
                value={extendDays}
                onChange={e => setExtendDays(e.target.value)}
                style={darkInput}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExtendTrial}
                disabled={modalLoading}
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', background: '#1e1e1c', color: '#e8e6e0', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: modalLoading ? 0.6 : 1 }}
              >
                {modalLoading ? 'Saving...' : 'Extend trial'}
              </button>
              <button
                onClick={() => setExtendModal(null)}
                style={{ padding: '11px 16px', fontSize: '13px', background: 'none', color: '#a8a49e', border: '0.5px solid #3e3e3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
