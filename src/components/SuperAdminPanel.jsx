import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const EF_BASE = 'https://rjscsnakkexunvsfhdut.supabase.co/functions/v1'

const STATUS_COLORS = {
  pending_review: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  waitlisted:     { bg: '#E0E7FF', color: '#3730A3', label: 'Waitlisted' },
  active:         { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  suspended:      { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
  expired:        { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
}

const PLAN_COLORS = {
  trial:     { bg: '#FEF3C7', color: '#92400E' },
  starter:   { bg: '#DBEAFE', color: '#1E40AF' },
  growth:    { bg: '#E0E7FF', color: '#3730A3' },
  unlimited: { bg: '#D1FAE5', color: '#065F46' },
}

const SECTIONS = [
  { key: 'overview',   label: 'Overview',   icon: '◈' },
  { key: 'approvals',  label: 'Approvals',  icon: '⏳', badge: true },
  { key: 'tenants',    label: 'Tenants',    icon: '🏢' },
  { key: 'users',      label: 'Users',      icon: '👥' },
  { key: 'credits',    label: 'Credits',    icon: '💳' },
  { key: 'ratecards',  label: 'Rate Cards', icon: '📋' },
  { key: 'categories', label: 'Categories', icon: '🏷' },
  { key: 'analytics',  label: 'Analytics',  icon: '📈' },
]

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Project Head',
  event_lead: 'Manager',
  team: 'Project Team',
  staff: 'Staff',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

// ── Shared style constants ────────────────────────────────────────────────────

const F = "'DM Sans', sans-serif"
const FD = "'Cormorant Garamond', serif"

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: '14px', fontFamily: F,
  outline: 'none', boxSizing: 'border-box',
  background: '#faf8f5', border: '0.5px solid #d8d2c8', borderRadius: '8px', color: '#1a1008',
}

const btnPrimary = {
  padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: F,
  background: '#bc1723', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
}

const btnSecondary = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 500, fontFamily: F,
  background: '#f2efe9', color: '#1a1008', border: 'none', borderRadius: '8px', cursor: 'pointer',
}

const btnDanger = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 600, fontFamily: F,
  background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '8px', cursor: 'pointer',
}

const thStyle = {
  padding: '10px 14px', fontSize: '11px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7060',
  background: '#f2efe9', fontFamily: F, borderBottom: '0.5px solid #d8d2c8',
  textAlign: 'left', whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '11px 14px', fontSize: '13px', color: '#1a1008',
  fontFamily: F, borderBottom: '0.5px solid #d8d2c8', verticalAlign: 'middle',
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#6B7280', label: status }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: F, background: s.bg, color: s.color, padding: '3px 9px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {s.label}
    </span>
  )
}

function PlanPill({ plan }) {
  const p = PLAN_COLORS[plan] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: F, background: p.bg, color: p.color, padding: '3px 9px', borderRadius: '6px', textTransform: 'capitalize' }}>
      {plan || '—'}
    </span>
  )
}

function FieldBlock({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a7060', marginBottom: '2px', fontFamily: F }}>{label}</div>
      <div style={{ fontSize: '13px', color: value ? '#1a1008' : '#7a7060', fontFamily: mono ? 'JetBrains Mono, monospace' : F }}>{value || '—'}</div>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontFamily: FD, fontSize: '28px', fontWeight: 700, color: '#1a1008', marginBottom: '6px', letterSpacing: '-0.3px' }}>{title}</h2>
      <p style={{ fontSize: '14px', color: '#7a7060', fontFamily: F }}>{subtitle}</p>
    </div>
  )
}

function ModalLabel({ children }) {
  return <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7060', marginBottom: '6px', fontFamily: F }}>{children}</label>
}

function SAModal({ open, onClose, title, subtitle, children }) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: '24px' }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '28px 32px', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontFamily: FD, fontSize: '22px', fontWeight: 700, color: '#1a1008', marginBottom: '4px' }}>{title}</h3>
              {subtitle && <p style={{ fontSize: '13px', color: '#7a7060', fontFamily: F }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7060', fontSize: '18px', padding: '2px', lineHeight: 1 }}>✕</button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ConfirmDeleteModal({ open, onClose, onConfirm, name, loading }) {
  const [typed, setTyped] = useState('')
  useEffect(() => { if (!open) setTyped('') }, [open])
  return (
    <SAModal open={open} onClose={onClose} title="Confirm deletion" subtitle={`Type "${name}" to confirm`}>
      <div style={{ marginBottom: '16px' }}>
        <ModalLabel>Type the name to confirm</ModalLabel>
        <input value={typed} onChange={e => setTyped(e.target.value)} style={inputStyle} placeholder={name} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onConfirm} disabled={typed !== name || loading} style={{ ...btnDanger, flex: 1, opacity: (typed !== name || loading) ? 0.5 : 1 }}>
          {loading ? 'Deleting...' : 'Delete permanently'}
        </button>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
      </div>
    </SAModal>
  )
}

function GlobalToast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: '#1a1008', color: '#fff', fontSize: '13px', fontFamily: F, padding: '12px 20px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      {message}
    </div>
  )
}

// ── Section 1: Overview ───────────────────────────────────────────────────────

function SectionOverview({ setActiveSection }) {
  const [stats, setStats] = useState({ tenants: 0, active: 0, pending: 0, users: 0, events: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tenants').select('*', { count: 'exact', head: true }).in('status', ['pending_review', 'waitlisted']),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('id,name,contact_name,contact_email,status,plan,created_at').order('created_at', { ascending: false }).limit(10),
      ])
      setStats({ tenants: r1.count || 0, active: r2.count || 0, pending: r3.count || 0, users: r4.count || 0, events: r5.count || 0 })
      setRecent(r6.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Tenants',     value: stats.tenants, accent: '#bc1723' },
    { label: 'Active Tenants',    value: stats.active,  accent: '#065F46' },
    { label: 'Pending Approvals', value: stats.pending, accent: '#92400E' },
    { label: 'Total Users',       value: stats.users,   accent: '#1E40AF' },
    { label: 'Total Events',      value: stats.events,  accent: '#3730A3' },
  ]

  return (
    <div>
      <SectionHeader title="Platform Overview" subtitle="Live platform health across all tenants." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px', minWidth: '160px', flex: 1, borderTop: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: FD, color: c.accent, letterSpacing: '-0.5px', marginBottom: '4px' }}>{loading ? '—' : c.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 500, fontFamily: F, color: '#7a7060', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {stats.pending > 0 && (
        <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#92400E', fontFamily: F }}>⚠️ {stats.pending} application(s) awaiting your review.</span>
          <button onClick={() => setActiveSection('approvals')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#bc1723', fontFamily: F, padding: 0 }}>Go to Approvals →</button>
        </div>
      )}

      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #d8d2c8' }}>
          <span style={{ fontFamily: F, fontSize: '13px', fontWeight: 600, color: '#1a1008' }}>Recent Tenants</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Company', 'Contact', 'Status', 'Plan', 'Registered'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
              : recent.length === 0
                ? <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No tenants yet</td></tr>
                : recent.map((t, i) => (
                  <tr key={t.id} onClick={() => setActiveSection('tenants')} style={{ cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f2efe9'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#faf8f5'}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{t.name}</td>
                    <td style={tdStyle}>{t.contact_name || '—'}</td>
                    <td style={tdStyle}><StatusPill status={t.status} /></td>
                    <td style={tdStyle}><PlanPill plan={t.plan} /></td>
                    <td style={{ ...tdStyle, color: '#7a7060' }}>{fmtDate(t.created_at)}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Section 2: Approvals ──────────────────────────────────────────────────────

function SectionApprovals({ refreshBadge }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [rowToasts, setRowToasts] = useState({})
  const [approveModal, setApproveModal] = useState(null)
  const [waitlistModal, setWaitlistModal] = useState(null)
  const [trialDays, setTrialDays] = useState(30)
  const [approvePlan, setApprovePlan] = useState('trial')
  const [waitlistReason, setWaitlistReason] = useState("We're being careful with onboarding — you're on our list.")
  const [mLoading, setMLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('tenants')
        .select('id,name,contact_name,contact_email,contact_phone,gst_number,state,designation,created_at,status')
        .in('status', ['pending_review', 'waitlisted'])
        .order('created_at', { ascending: true })
      setList(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function showRowToast(id, msg) {
    setRowToasts(p => ({ ...p, [id]: msg }))
    setTimeout(() => setRowToasts(p => { const n = { ...p }; delete n[id]; return n }), 3500)
  }

  async function handleApprove() {
    setMLoading(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(`${EF_BASE}/approve-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
        body: JSON.stringify({ tenant_id: approveModal.id, trial_days: Number(trialDays), plan: approvePlan, approved_by_email: user?.email, action: 'approve' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Approve failed')
      setList(p => p.filter(t => t.id !== approveModal.id))
      showRowToast(approveModal.id, 'Approved ✓')
      setApproveModal(null)
      refreshBadge()
    } catch (err) { alert(`Error: ${err.message}`) }
    setMLoading(false)
  }

  async function handleWaitlist() {
    setMLoading(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(`${EF_BASE}/approve-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
        body: JSON.stringify({ tenant_id: waitlistModal.id, action: 'waitlist', waitlist_reason: waitlistReason.trim() || "We're being careful with onboarding — you're on our list." }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Waitlist failed')
      setList(p => p.map(t => t.id === waitlistModal.id ? { ...t, status: 'waitlisted' } : t))
      setWaitlistModal(null)
      refreshBadge()
    } catch (err) { alert(`Error: ${err.message}`) }
    setMLoading(false)
  }

  return (
    <div>
      <SectionHeader title="Approvals Queue" subtitle="Review and act on incoming tenant applications." />
      {loading ? (
        <p style={{ textAlign: 'center', color: '#7a7060', padding: '40px 0', fontFamily: F }}>Loading...</p>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
          <p style={{ fontFamily: FD, fontSize: '20px', color: '#1a1008', marginBottom: '6px' }}>All caught up</p>
          <p style={{ fontSize: '14px', color: '#7a7060', fontFamily: F }}>No pending applications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {list.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FD, fontSize: '18px', fontWeight: 700, color: '#1a1008' }}>{t.name}</span>
                    <StatusPill status={t.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 24px' }}>
                    <FieldBlock label="Contact" value={t.contact_name} />
                    <FieldBlock label="Email" value={t.contact_email} />
                    <FieldBlock label="Phone" value={t.contact_phone} />
                    {t.gst_number && <FieldBlock label="GST" value={t.gst_number} mono />}
                    {t.state && <FieldBlock label="State" value={t.state} />}
                    {t.designation && <FieldBlock label="Designation" value={t.designation} />}
                    <FieldBlock label="Applied" value={fmtDate(t.created_at)} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                  <button onClick={() => { setApproveModal(t); setTrialDays(30); setApprovePlan('trial') }} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>Approve</button>
                  {t.status === 'pending_review' && (
                    <button onClick={() => { setWaitlistModal(t); setWaitlistReason("We're being careful with onboarding — you're on our list.") }} style={{ ...btnSecondary, whiteSpace: 'nowrap' }}>Waitlist</button>
                  )}
                  {rowToasts[t.id] && <span style={{ fontSize: '12px', color: '#065F46', fontFamily: F, fontWeight: 500 }}>{rowToasts[t.id]}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SAModal open={!!approveModal} onClose={() => setApproveModal(null)} title="Approve tenant" subtitle={approveModal?.name}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <ModalLabel>Trial period (days)</ModalLabel>
            <input type="number" min="1" max="365" value={trialDays} onChange={e => setTrialDays(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Plan</ModalLabel>
            <select value={approvePlan} onChange={e => setApprovePlan(e.target.value)} style={inputStyle}>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleApprove} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Approving...' : 'Approve & activate →'}</button>
          <button onClick={() => setApproveModal(null)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>

      <SAModal open={!!waitlistModal} onClose={() => setWaitlistModal(null)} title="Move to waitlist" subtitle={waitlistModal?.name}>
        <div style={{ marginBottom: '24px' }}>
          <ModalLabel>Reason (shown to applicant)</ModalLabel>
          <textarea rows={4} value={waitlistReason} onChange={e => setWaitlistReason(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleWaitlist} disabled={mLoading} style={{ ...btnSecondary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Moving...' : 'Move to waitlist'}</button>
          <button onClick={() => setWaitlistModal(null)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>
    </div>
  )
}

// ── Section 3: Tenants ────────────────────────────────────────────────────────

function TenantDetail({ tenant, onBack, showToast }) {
  const [subTab, setSubTab] = useState('overview')
  const [form, setForm] = useState({ name: tenant.name || '', contact_name: tenant.contact_name || '', contact_email: tenant.contact_email || '', contact_phone: tenant.contact_phone || '', gst_number: tenant.gst_number || '', state: tenant.state || '', address: tenant.address || '', designation: tenant.designation || '' })
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [sub, setSub] = useState(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [subLoading, setSubLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [topUpModal, setTopUpModal] = useState(false)
  const [changePlanModal, setChangePlanModal] = useState(false)
  const [extendModal, setExtendModal] = useState(false)
  const [topUpN, setTopUpN] = useState(10)
  const [newPlan, setNewPlan] = useState(tenant.plan || 'trial')
  const [extendDays, setExtendDays] = useState(30)
  const [mLoading, setMLoading] = useState(false)

  useEffect(() => {
    if (subTab === 'team' && users.length === 0) loadUsers()
    if (subTab === 'events' && events.length === 0) loadEvents()
    if (subTab === 'credits' && !sub) loadSub()
  }, [subTab])

  async function loadUsers() {
    setUsersLoading(true)
    const { data } = await supabase.from('users').select('id,full_name,email,role,status,created_at').eq('tenant_id', tenant.id).order('role')
    setUsers(data || [])
    setUsersLoading(false)
  }

  async function loadEvents() {
    setEventsLoading(true)
    const { data } = await supabase.from('events').select('id,name,status,cities,created_at').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50)
    setEvents(data || [])
    setEventsLoading(false)
  }

  async function loadSub() {
    setSubLoading(true)
    const { data } = await supabase.from('tenant_subscriptions').select('*').eq('tenant_id', tenant.id).single()
    setSub(data || null)
    setSubLoading(false)
  }

  async function handleSaveForm() {
    setSaving(true)
    const { error } = await supabase.from('tenants').update(form).eq('id', tenant.id)
    if (error) { alert(error.message) } else { showToast('Saved ✓') }
    setSaving(false)
  }

  async function handleStatusChange(newStatus) {
    const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', tenant.id)
    if (error) { alert(error.message) } else { showToast(`Status → ${newStatus} ✓`) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await supabase.from('elements').delete().eq('tenant_id', tenant.id)
      await supabase.from('tasks').delete().eq('tenant_id', tenant.id)
      await supabase.from('notifications').delete().eq('tenant_id', tenant.id)
      await supabase.from('activity_log').delete().eq('tenant_id', tenant.id)
      await supabase.from('rate_cards').delete().eq('tenant_id', tenant.id)
      await supabase.from('users').delete().eq('tenant_id', tenant.id)
      await supabase.from('tenant_subscriptions').delete().eq('tenant_id', tenant.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      showToast('Tenant deleted successfully')
      onBack()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleTopUp() {
    setMLoading(true)
    const { error } = await supabase.from('tenant_subscriptions').update({ event_credits_total: (sub.event_credits_total || 0) + Number(topUpN) }).eq('id', sub.id)
    if (error) { alert(error.message) } else { setSub(p => ({ ...p, event_credits_total: (p.event_credits_total || 0) + Number(topUpN) })); showToast(`+${topUpN} credits added ✓`); setTopUpModal(false) }
    setMLoading(false)
  }

  async function handleChangePlan() {
    setMLoading(true)
    const [r1, r2] = await Promise.all([
      supabase.from('tenant_subscriptions').update({ plan: newPlan }).eq('id', sub.id),
      supabase.from('tenants').update({ plan: newPlan }).eq('id', tenant.id),
    ])
    if (r1.error || r2.error) { alert((r1.error || r2.error).message) } else { setSub(p => ({ ...p, plan: newPlan })); showToast('Plan updated ✓'); setChangePlanModal(false) }
    setMLoading(false)
  }

  async function handleExtendTrial() {
    setMLoading(true)
    const base = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : new Date()
    const newEnd = new Date(base.getTime() + Number(extendDays) * 86400000).toISOString()
    const { error } = await supabase.from('tenants').update({ trial_ends_at: newEnd }).eq('id', tenant.id)
    if (error) { alert(error.message) } else { showToast(`Trial extended +${extendDays}d ✓`); setExtendModal(false) }
    setMLoading(false)
  }

  async function handleUserRoleChange(userId, role) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) { alert(error.message) } else { setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u)) }
  }

  async function handleUserStatusToggle(user) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id)
    if (error) { alert(error.message) } else { setUsers(p => p.map(u => u.id === user.id ? { ...u, status: newStatus } : u)); showToast(`User ${newStatus} ✓`) }
  }

  async function handleUserDelete(userId) {
    if (!window.confirm('Delete this user?')) return
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) { alert(error.message) } else { setUsers(p => p.filter(u => u.id !== userId)); showToast('User deleted') }
  }

  const subTabs = ['overview', 'team', 'events', 'credits']

  const remaining = sub ? ((sub.event_credits_total || 0) - (sub.event_credits_used || 0)) : null

  return (
    <div>
      <button onClick={onBack} style={{ ...btnSecondary, marginBottom: '20px', fontSize: '12px' }}>← Back to Tenants</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FD, fontSize: '26px', fontWeight: 700, color: '#1a1008' }}>{tenant.name}</span>
        <StatusPill status={tenant.status} />
        <PlanPill plan={tenant.plan} />
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid #d8d2c8', marginBottom: '24px' }}>
        {subTabs.map(st => (
          <button key={st} onClick={() => setSubTab(st)} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, fontFamily: F, background: 'none', border: 'none', borderBottom: subTab === st ? '2px solid #bc1723' : '2px solid transparent', color: subTab === st ? '#1a1008' : '#7a7060', cursor: 'pointer', marginBottom: '-0.5px', textTransform: 'capitalize' }}>
            {st}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { key: 'name', label: 'Company Name' },
              { key: 'contact_name', label: 'Contact Name' },
              { key: 'contact_email', label: 'Contact Email' },
              { key: 'contact_phone', label: 'Phone' },
              { key: 'gst_number', label: 'GST' },
              { key: 'state', label: 'State' },
              { key: 'address', label: 'Address' },
              { key: 'designation', label: 'Designation' },
            ].map(f => (
              <div key={f.key}>
                <ModalLabel>{f.label}</ModalLabel>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <button onClick={handleSaveForm} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, marginBottom: '32px' }}>{saving ? 'Saving...' : 'Save Changes'}</button>

          <div style={{ borderTop: '0.5px solid #d8d2c8', paddingTop: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7060', fontFamily: F, marginBottom: '12px' }}>Danger Zone</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => handleStatusChange('suspended')} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 500, fontFamily: F, background: '#FEF3C7', color: '#92400E', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Suspend Tenant</button>
              <button onClick={() => handleStatusChange('active')} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 500, fontFamily: F, background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Activate Tenant</button>
              <button onClick={() => setDeleteModal(true)} style={btnDanger}>Delete Tenant</button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'team' && (
        <div>
          {usersLoading ? <p style={{ color: '#7a7060', fontFamily: F }}>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No users</td></tr>
                  : users.map(u => (
                    <tr key={u.id}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{u.full_name || '—'}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <select value={u.role} onChange={e => handleUserRoleChange(u.id, e.target.value)} style={{ fontSize: '12px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5' }}>
                          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}><StatusPill status={u.status || 'active'} /></td>
                      <td style={{ ...tdStyle, color: '#7a7060' }}>{fmtDate(u.created_at)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleUserStatusToggle(u)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: u.status === 'suspended' ? '#D1FAE5' : '#FEF3C7', color: u.status === 'suspended' ? '#065F46' : '#92400E', fontFamily: F }}>
                            {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button onClick={() => handleUserDelete(u.id)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: F }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'events' && (
        <div>
          {eventsLoading ? <p style={{ color: '#7a7060', fontFamily: F }}>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Event Name', 'Status', 'Cities', 'Created'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {events.length === 0
                  ? <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No events</td></tr>
                  : events.map(ev => (
                    <tr key={ev.id}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{ev.name}</td>
                      <td style={tdStyle}><StatusPill status={ev.status} /></td>
                      <td style={tdStyle}>{Array.isArray(ev.cities) ? ev.cities.join(', ') : (ev.cities || '—')}</td>
                      <td style={{ ...tdStyle, color: '#7a7060' }}>{fmtDate(ev.created_at)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'credits' && (
        <div>
          {subLoading ? <p style={{ color: '#7a7060', fontFamily: F }}>Loading...</p> : !sub ? (
            <p style={{ color: '#7a7060', fontFamily: F }}>No subscription record found.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Plan', value: <PlanPill plan={sub.plan} /> },
                  { label: 'Status', value: <StatusPill status={sub.status} /> },
                  { label: 'Credits Total', value: sub.event_credits_total ?? '—' },
                  { label: 'Credits Used', value: sub.event_credits_used ?? 0 },
                  { label: 'Remaining', value: <span style={{ fontWeight: 700, color: remaining > 0 ? '#065F46' : '#991B1B' }}>{remaining}</span> },
                  { label: 'Starts At', value: fmtDate(sub.starts_at) },
                  { label: 'Ends At', value: fmtDate(sub.ends_at) },
                ].map(f => (
                  <div key={f.label} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '10px', padding: '14px 18px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a7060', marginBottom: '6px', fontFamily: F }}>{f.label}</div>
                    <div style={{ fontSize: '15px', fontFamily: F, color: '#1a1008' }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setTopUpModal(true)} style={btnPrimary}>Top Up Credits</button>
                <button onClick={() => { setNewPlan(sub.plan); setChangePlanModal(true) }} style={btnSecondary}>Change Plan</button>
                <button onClick={() => { setExtendDays(30); setExtendModal(true) }} style={btnSecondary}>Extend Trial</button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDeleteModal open={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDelete} name={tenant.name} loading={deleting} />

      <SAModal open={topUpModal} onClose={() => setTopUpModal(false)} title="Top Up Credits">
        <div style={{ marginBottom: '16px' }}><ModalLabel>Credits to add</ModalLabel><input type="number" min="1" value={topUpN} onChange={e => setTopUpN(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleTopUp} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Credits'}</button>
          <button onClick={() => setTopUpModal(false)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>

      <SAModal open={changePlanModal} onClose={() => setChangePlanModal(false)} title="Change Plan">
        <div style={{ marginBottom: '16px' }}><ModalLabel>New plan</ModalLabel><select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={inputStyle}>{['trial','starter','growth','unlimited'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleChangePlan} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Saving...' : 'Confirm Change'}</button>
          <button onClick={() => setChangePlanModal(false)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>

      <SAModal open={extendModal} onClose={() => setExtendModal(false)} title="Extend Trial">
        <div style={{ marginBottom: '16px' }}><ModalLabel>Add days</ModalLabel><input type="number" min="1" value={extendDays} onChange={e => setExtendDays(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExtendTrial} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Saving...' : 'Extend'}</button>
          <button onClick={() => setExtendModal(false)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>
    </div>
  )
}

function SectionTenants({ showToast }) {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [countMap, setCountMap] = useState({})
  const [tenantLastActive, setTenantLastActive] = useState({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('tenants').select('*, tenant_subscriptions(*)').order('created_at', { ascending: false })
      const list = data || []
      setTenants(list)
      const [counts, usersActivity] = await Promise.all([
        Promise.all(list.map(async t => {
          const [ev, us] = await Promise.all([
            supabase.from('events').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          ])
          return [t.id, { events: ev.count || 0, users: us.count || 0 }]
        })),
        supabase.from('users').select('tenant_id,created_at'),
      ])
      setCountMap(Object.fromEntries(counts))
      const lastActive = {}
      ;(usersActivity.data || []).forEach(u => {
        if (!lastActive[u.tenant_id] || u.created_at > lastActive[u.tenant_id]) {
          lastActive[u.tenant_id] = u.created_at
        }
      })
      setTenantLastActive(lastActive)
      setLoading(false)
    }
    load()
  }, [])

  if (selected) return <TenantDetail tenant={selected} onBack={() => setSelected(null)} showToast={showToast} />

  const filtered = tenants.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.contact_email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <SectionHeader title="Tenants" subtitle="All tenants on the platform. Click any row to manage." />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Company', 'Status', 'Plan', 'Trial Ends', 'Events', 'Users', 'Last User Added', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
              : filtered.length === 0
                ? <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No tenants match</td></tr>
                : filtered.map(t => {
                  const dl = daysLeft(t.trial_ends_at)
                  const c = countMap[t.id]
                  return (
                    <tr key={t.id}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{t.name}</td>
                      <td style={tdStyle}><StatusPill status={t.status} /></td>
                      <td style={tdStyle}><PlanPill plan={t.plan} /></td>
                      <td style={{ ...tdStyle, color: dl !== null && dl < 7 ? '#991B1B' : '#7a7060' }}>
                        {t.trial_ends_at ? (dl !== null ? `${dl}d left` : fmtDate(t.trial_ends_at)) : '—'}
                      </td>
                      <td style={tdStyle}>{c?.events ?? '—'}</td>
                      <td style={tdStyle}>{c?.users ?? '—'}</td>
                      <td style={{ ...tdStyle, color: '#7a7060' }}>
                        {tenantLastActive[t.id]
                          ? new Date(tenantLastActive[t.id]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                          : '—'}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => setSelected(t)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #d8d2c8', background: '#faf8f5', color: '#1a1008', cursor: 'pointer', fontFamily: F }}>View →</button>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Section 4: Users ──────────────────────────────────────────────────────────

function SectionUsers({ showToast }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tenantFilter, setTenantFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('users').select('id,full_name,email,role,status,invite_status,invited_at,created_at,tenant_id,tenants(name)').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const tenantNames = [...new Set(users.map(u => u.tenants?.name).filter(Boolean))]

  const filtered = users.filter(u => {
    if (tenantFilter !== 'all' && u.tenants?.name !== tenantFilter) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  async function handleRoleChange(userId, role) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) { alert(error.message) } else { setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u)) }
  }

  async function handleStatusToggle(user) {
    const newStatus = (user.status || 'active') === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id)
    if (error) { alert(error.message) } else { setUsers(p => p.map(u => u.id === user.id ? { ...u, status: newStatus } : u)); showToast(`User ${newStatus} ✓`) }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Delete this user permanently?')) return
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) { alert(error.message) } else { setUsers(p => p.filter(u => u.id !== userId)); showToast('User deleted') }
  }

  return (
    <div>
      <SectionHeader title="User Directory" subtitle="All users across all tenants." />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={tenantFilter} onChange={e => { setTenantFilter(e.target.value); setPage(0) }} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All Tenants</option>
          {tenantNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0) }} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search name or email…" style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name', 'Email', 'Role', 'Tenant', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
              : paged.length === 0
                ? <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No users match</td></tr>
                : paged.map(u => (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{u.full_name || '—'}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} style={{ fontSize: '12px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5' }}>
                        {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: '#7a7060' }}>{u.tenants?.name || '—'}</td>
                    <td style={tdStyle}>
                      {u.invite_status === 'invited' ? (() => {
                        const hoursLeft = (new Date(u.invited_at).getTime() + 86400000 - Date.now()) / 3600000
                        return hoursLeft > 0
                          ? <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:4,fontSize:12,fontFamily:'DM Sans'}}>
                              Invited · {Math.floor(hoursLeft)}h {Math.floor((hoursLeft % 1) * 60)}m left
                            </span>
                          : <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:4,fontSize:12,fontFamily:'DM Sans'}}>
                              Expired
                            </span>
                      })() : <StatusPill status={u.status || 'active'} />}
                    </td>
                    <td style={{ ...tdStyle, color: '#7a7060' }}>{fmtDate(u.created_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleStatusToggle(u)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: (u.status || 'active') === 'suspended' ? '#D1FAE5' : '#FEF3C7', color: (u.status || 'active') === 'suspended' ? '#065F46' : '#92400E', fontFamily: F }}>
                          {(u.status || 'active') === 'suspended' ? 'Reinstate' : 'Suspend'}
                        </button>
                        <button onClick={() => handleDelete(u.id)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: F }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontFamily: F, fontSize: '13px', color: '#7a7060' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...btnSecondary, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...btnSecondary, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  )
}

// ── Section 5: Credits ────────────────────────────────────────────────────────

function SectionCredits({ showToast }) {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [topUpModal, setTopUpModal] = useState(null)
  const [changePlanModal, setChangePlanModal] = useState(null)
  const [extendModal, setExtendModal] = useState(null)
  const [topUpN, setTopUpN] = useState(10)
  const [newPlan, setNewPlan] = useState('trial')
  const [extendDays, setExtendDays] = useState(30)
  const [mLoading, setMLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('tenant_subscriptions').select('*, tenants(name,status,contact_email)').order('created_at', { ascending: false })
      setSubs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const total = subs.length
  const onTrial = subs.filter(s => s.plan === 'trial').length
  const zeroCredits = subs.filter(s => ((s.event_credits_total || 0) - (s.event_credits_used || 0)) <= 0).length

  async function handleTopUp() {
    setMLoading(true)
    const s = topUpModal
    const { error } = await supabase.from('tenant_subscriptions').update({ event_credits_total: (s.event_credits_total || 0) + Number(topUpN) }).eq('id', s.id)
    if (error) { alert(error.message) } else {
      setSubs(p => p.map(x => x.id === s.id ? { ...x, event_credits_total: (x.event_credits_total || 0) + Number(topUpN) } : x))
      showToast(`+${topUpN} credits added ✓`)
      setTopUpModal(null)
    }
    setMLoading(false)
  }

  async function handleChangePlan() {
    setMLoading(true)
    const s = changePlanModal
    const [r1, r2] = await Promise.all([
      supabase.from('tenant_subscriptions').update({ plan: newPlan }).eq('id', s.id),
      supabase.from('tenants').update({ plan: newPlan }).eq('id', s.tenant_id),
    ])
    if (r1.error || r2.error) { alert((r1.error || r2.error).message) } else {
      setSubs(p => p.map(x => x.id === s.id ? { ...x, plan: newPlan } : x))
      showToast('Plan updated ✓')
      setChangePlanModal(null)
    }
    setMLoading(false)
  }

  async function handleExtend() {
    setMLoading(true)
    const s = extendModal
    const base = s.tenants?.trial_ends_at ? new Date(s.tenants.trial_ends_at) : new Date()
    const newEnd = new Date(base.getTime() + Number(extendDays) * 86400000).toISOString()
    const newSubEnd = s.ends_at ? new Date(new Date(s.ends_at).getTime() + Number(extendDays) * 86400000).toISOString() : null
    const ops = [supabase.from('tenants').update({ trial_ends_at: newEnd }).eq('id', s.tenant_id)]
    if (newSubEnd) ops.push(supabase.from('tenant_subscriptions').update({ ends_at: newSubEnd }).eq('id', s.id))
    const results = await Promise.all(ops)
    const err = results.find(r => r.error)
    if (err) { alert(err.error.message) } else { showToast(`Extended +${extendDays}d ✓`); setExtendModal(null) }
    setMLoading(false)
  }

  return (
    <div>
      <SectionHeader title="AI Credits & Billing" subtitle="Manage AI usage allowances per tenant. Credits are consumed when tenants use AI-powered features." />

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Active Subscriptions', value: total, accent: '#065F46' },
          { label: 'On Trial', value: onTrial, accent: '#92400E' },
          { label: '0 Credits Remaining', value: zeroCredits, accent: '#991B1B' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px', minWidth: '160px', flex: 1, borderTop: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: FD, color: c.accent }}>{loading ? '—' : c.value}</div>
            <div style={{ fontSize: '12px', fontFamily: F, color: '#7a7060', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FEF3C7', border: '0.5px solid #F59E0B', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#92400E', marginBottom: '16px', fontFamily: F }}>
        💡 Credits will power AI features — element suggestions, brief analysis, and smart imports. Assign allowances now and activate when AI goes live.
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Tenant', 'Plan', 'Total', 'Used', 'Remaining', 'Trial Ends', 'Sub Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
              : subs.map(s => {
                const rem = (s.event_credits_total || 0) - (s.event_credits_used || 0)
                const remColor = rem > 2 ? '#065F46' : rem > 0 ? '#92400E' : '#991B1B'
                const dl = daysLeft(s.tenants?.trial_ends_at)
                return (
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{s.tenants?.name || '—'}</td>
                    <td style={tdStyle}><PlanPill plan={s.plan} /></td>
                    <td style={tdStyle}>{s.event_credits_total ?? '—'}</td>
                    <td style={tdStyle}>{s.event_credits_used ?? 0}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: remColor }}>{rem}</td>
                    <td style={{ ...tdStyle, color: dl !== null && dl < 7 ? '#991B1B' : '#7a7060' }}>
                      {s.tenants?.trial_ends_at ? (dl !== null ? `${dl}d` : '—') : '—'}
                    </td>
                    <td style={tdStyle}><StatusPill status={s.status || 'active'} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setTopUpModal(s); setTopUpN(10) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#D1FAE5', color: '#065F46', fontFamily: F }}>Top Up</button>
                        <button onClick={() => { setChangePlanModal(s); setNewPlan(s.plan || 'trial') }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#DBEAFE', color: '#1E40AF', fontFamily: F }}>Plan</button>
                        <button onClick={() => { setExtendModal(s); setExtendDays(30) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEF3C7', color: '#92400E', fontFamily: F }}>Extend</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>

      <SAModal open={!!topUpModal} onClose={() => setTopUpModal(null)} title="Top Up Credits" subtitle={topUpModal?.tenants?.name}>
        <div style={{ marginBottom: '16px' }}><ModalLabel>Credits to add</ModalLabel><input type="number" min="1" value={topUpN} onChange={e => setTopUpN(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleTopUp} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Credits'}</button>
          <button onClick={() => setTopUpModal(null)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>

      <SAModal open={!!changePlanModal} onClose={() => setChangePlanModal(null)} title="Change Plan" subtitle={changePlanModal?.tenants?.name}>
        <div style={{ marginBottom: '16px' }}><ModalLabel>New plan</ModalLabel><select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={inputStyle}>{['trial','starter','growth','unlimited'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleChangePlan} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Saving...' : 'Confirm'}</button>
          <button onClick={() => setChangePlanModal(null)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>

      <SAModal open={!!extendModal} onClose={() => setExtendModal(null)} title="Extend Trial" subtitle={extendModal?.tenants?.name}>
        <div style={{ marginBottom: '16px' }}><ModalLabel>Add days</ModalLabel><input type="number" min="1" value={extendDays} onChange={e => setExtendDays(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExtend} disabled={mLoading} style={{ ...btnPrimary, flex: 1, opacity: mLoading ? 0.6 : 1 }}>{mLoading ? 'Saving...' : 'Extend'}</button>
          <button onClick={() => setExtendModal(null)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>
    </div>
  )
}

// ── Section 6: Rate Cards ─────────────────────────────────────────────────────

const SOURCE_TAGS = [
  { value: 'AI_RESEARCH',     label: 'AI Research',     color: '#7C3AED' },
  { value: 'VENDOR_QUOTE',    label: 'Vendor Quote',    color: '#065F46' },
  { value: 'INTERNAL',        label: 'Internal',        color: '#1E40AF' },
  { value: 'MARKET_SURVEY',   label: 'Market Survey',   color: '#92400E' },
  { value: 'CLIENT_PROVIDED', label: 'Client Provided', color: '#6B7280' },
]

function SectionRateCards({ showToast }) {
  const [rcTab, setRcTab] = useState('browse')
  const [rows, setRows] = useState([])
  const [filteredRows, setFilteredRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTenant, setFilterTenant] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [filterMaster, setFilterMaster] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editBuffer, setEditBuffer] = useState({})
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ category: '', element_name: '', city: '', rate_min: '', rate_max: '', rate_type: 'per_unit', unit: '', notes: '', source_tag: 'AI_RESEARCH', source_ref: '', is_platform_master: true, tenant_id: '' })
  const [tenants, setTenants] = useState([])
  const [categories, setCategories] = useState([])
  const [saTenantId, setSaTenantId] = useState(null)
  const [importTab, setImportTab] = useState('upload')
  const [importFile, setImportFile] = useState(null)
  const [importPaste, setImportPaste] = useState('')
  const [importRows, setImportRows] = useState([])
  const [importTenantId, setImportTenantId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [mLoading, setMLoading] = useState(false)
  const PAGE_SIZE = 50

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [r1, r2, r3, sess] = await Promise.all([
        supabase.from('rate_cards').select('*, tenants(name)').order('category').order('element_name'),
        supabase.from('tenants').select('id, name').eq('status', 'active').order('name'),
        supabase.from('event_categories').select('name').eq('is_active', true).order('sort_order'),
        supabase.auth.getSession(),
      ])
      setRows(r1.data || [])
      setTenants(r2.data || [])
      setCategories(r3.data || [])
      try {
        const token = sess.data.session?.access_token
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const tid = payload.tenant_id || null
          setSaTenantId(tid)
          setImportTenantId(tid)
          setAddForm(f => ({ ...f, tenant_id: tid || '' }))
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let f = rows
    if (filterMaster === 'master') f = f.filter(r => r.is_platform_master)
    else if (filterMaster === 'tenant') f = f.filter(r => !r.is_platform_master)
    if (filterTenant !== 'all') {
      if (filterTenant === '__master__') f = f.filter(r => r.is_platform_master)
      else f = f.filter(r => r.tenants?.name === filterTenant)
    }
    if (filterCategory !== 'all') f = f.filter(r => r.category === filterCategory)
    if (filterCity !== 'all') f = f.filter(r => r.city === filterCity)
    if (search) f = f.filter(r => r.element_name?.toLowerCase().includes(search.toLowerCase()))
    setFilteredRows(f)
    setPage(0)
  }, [rows, filterTenant, filterCategory, filterCity, filterMaster, search])

  const tenantNames = [...new Set(rows.filter(r => !r.is_platform_master).map(r => r.tenants?.name).filter(Boolean))]
  const allCats = [...new Set(rows.map(r => r.category).filter(Boolean))]
  const allCities = [...new Set(rows.map(r => r.city).filter(Boolean))]

  const paged = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE)

  async function refetch() {
    const { data } = await supabase.from('rate_cards').select('*, tenants(name)').order('category').order('element_name')
    setRows(data || [])
  }

  async function saveEdit(id) {
    const { error } = await supabase.from('rate_cards').update({
      element_name: editBuffer.element_name,
      rate_min: editBuffer.rate_min !== '' ? Number(editBuffer.rate_min) : null,
      rate_max: editBuffer.rate_max !== '' ? Number(editBuffer.rate_max) : null,
      city: editBuffer.city,
      rate_type: editBuffer.rate_type,
    }).eq('id', id)
    if (error) { showToast('Update failed: ' + error.message); return }
    setEditingId(null)
    refetch()
    showToast('Rate card updated ✓')
  }

  async function handleDeleteRow(id) {
    if (!window.confirm('Delete this rate card row?')) return
    const { error } = await supabase.from('rate_cards').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message) } else { refetch(); showToast('Deleted ✓') }
  }

  async function handleAdd() {
    setMLoading(true)
    const payload = {
      ...addForm,
      rate_min: addForm.rate_min ? Number(addForm.rate_min) : null,
      rate_max: addForm.rate_max ? Number(addForm.rate_max) : null,
      is_platform_master: addForm.is_platform_master,
      tenant_id: addForm.is_platform_master ? saTenantId : (addForm.tenant_id || null),
    }
    const { error } = await supabase.from('rate_cards').insert(payload)
    if (error) { showToast('Add failed: ' + error.message) } else {
      showToast('Rate card added ✓')
      setAddModal(false)
      setAddForm({ category: '', element_name: '', city: '', rate_min: '', rate_max: '', rate_type: 'per_unit', unit: '', notes: '', source_tag: 'AI_RESEARCH', source_ref: '', is_platform_master: true, tenant_id: saTenantId || '' })
      refetch()
    }
    setMLoading(false)
  }

  function parseRows(data2d) {
    const body = data2d.slice(1)
    return body.map(row => ({
      category: row[0] || '',
      element_name: row[1] || '',
      city: row[2] || '',
      rate_min: row[3] !== undefined && row[3] !== '' ? Number(row[3]) : null,
      rate_max: row[4] !== undefined && row[4] !== '' ? Number(row[4]) : null,
      rate_type: row[5] || 'per_unit',
      unit: row[6] || '',
      notes: row[7] || '',
      source_tag: row[8] || 'AI_RESEARCH',
    }))
  }

  function validateRow(r) {
    const missing = []
    if (!r.category) missing.push('Category')
    if (!r.element_name) missing.push('Element Name')
    if (r.rate_min === null || isNaN(r.rate_min)) missing.push('Rate Min')
    return missing
  }

  async function handleFileUpload(file) {
    if (!file) return
    setImportFile(file)
    const XLSX = await import('xlsx')
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
    setImportRows(parseRows(data))
  }

  function handlePasteParse() {
    const lines = importPaste.trim().split('\n')
    const data2d = lines.map(l => l.split('\t'))
    setImportRows(parseRows(data2d))
  }

  async function handleImport() {
    const valid = importRows.filter(r => validateRow(r).length === 0)
    if (valid.length === 0) return
    setImporting(true)
    const isMaster = importTenantId === saTenantId
    const payload = valid.map(r => ({
      ...r,
      is_platform_master: isMaster,
      tenant_id: importTenantId,
      source_tag: r.source_tag || 'AI_RESEARCH',
    }))
    const { error } = await supabase.from('rate_cards').insert(payload)
    if (error) { showToast('Import failed: ' + error.message) } else {
      showToast(`${valid.length} rows imported successfully`)
      setImportRows([])
      setImportFile(null)
      setImportPaste('')
      setRcTab('browse')
      refetch()
    }
    setImporting(false)
  }

  async function handleDownloadTemplate() {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['Category', 'Element Name', 'City', 'Rate Min', 'Rate Max', 'Rate Type', 'Unit', 'Notes', 'Source']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rate Card Template')
    XLSX.writeFile(wb, 'rate_card_template.xlsx')
  }

  const miniInput = { fontSize: '12px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5', color: '#1a1008', outline: 'none', width: '100%' }
  const tabStyle = (active) => ({ padding: '8px 16px', fontSize: '13px', fontFamily: F, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: active ? '2px solid #bc1723' : '2px solid transparent', color: active ? '#1a1008' : '#7a7060', marginBottom: '-0.5px' })

  const validCount = importRows.filter(r => validateRow(r).length === 0).length
  const errorCount = importRows.length - validCount

  return (
    <div>
      <SectionHeader title="Rate Cards" subtitle="Platform master rates and all tenant rate cards." />

      <div style={{ display: 'flex', borderBottom: '0.5px solid #d8d2c8', marginBottom: '24px' }}>
        {[['browse', 'Browse & Edit'], ['import', 'Bulk Import'], ['templates', 'Templates']].map(([key, label]) => (
          <button key={key} onClick={() => setRcTab(key)} style={tabStyle(rcTab === key)}>{label}</button>
        ))}
      </div>

      {rcTab === 'browse' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search elements..." style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
            <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All Tenants</option>
              <option value="__master__">Platform Master</option>
              {tenantNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All Categories</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All Cities</option>
              {allCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterMaster} onChange={e => setFilterMaster(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All</option>
              <option value="master">Master Only</option>
              <option value="tenant">Tenant Only</option>
            </select>
            <button onClick={() => setAddModal(true)} style={btnPrimary}>+ Add Row</button>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead><tr>{['Element Name', 'Category', 'City', 'Rate Min', 'Rate Max', 'Rate Type', 'Source', 'Tenant', '✦', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
                  : paged.length === 0
                    ? <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>No rows match</td></tr>
                    : paged.map(r => {
                      const isEditing = editingId === r.id
                      const srcTag = SOURCE_TAGS.find(s => s.value === r.source_tag)
                      return (
                        <tr key={r.id}>
                          <td style={tdStyle}>{isEditing ? <input value={editBuffer.element_name} onChange={e => setEditBuffer(p => ({ ...p, element_name: e.target.value }))} style={miniInput} autoFocus /> : r.element_name}</td>
                          <td style={tdStyle}>{r.category}</td>
                          <td style={tdStyle}>{isEditing ? <input value={editBuffer.city} onChange={e => setEditBuffer(p => ({ ...p, city: e.target.value }))} style={miniInput} /> : (r.city || '—')}</td>
                          <td style={tdStyle}>{isEditing ? <input type="number" value={editBuffer.rate_min} onChange={e => setEditBuffer(p => ({ ...p, rate_min: e.target.value }))} style={{ ...miniInput, width: '80px' }} /> : (r.rate_min != null ? `₹${r.rate_min.toLocaleString('en-IN')}` : '—')}</td>
                          <td style={tdStyle}>{isEditing ? <input type="number" value={editBuffer.rate_max} onChange={e => setEditBuffer(p => ({ ...p, rate_max: e.target.value }))} style={{ ...miniInput, width: '80px' }} /> : (r.rate_max != null ? `₹${r.rate_max.toLocaleString('en-IN')}` : '—')}</td>
                          <td style={tdStyle}>{isEditing ? <select value={editBuffer.rate_type} onChange={e => setEditBuffer(p => ({ ...p, rate_type: e.target.value }))} style={miniInput}>{['per_unit','per_day','lump_sum','per_person','per_sqft'].map(t => <option key={t} value={t}>{t}</option>)}</select> : <span style={{ fontSize: '11px', background: '#f2efe9', color: '#7a7060', padding: '2px 7px', borderRadius: '5px', fontFamily: F }}>{r.rate_type || '—'}</span>}</td>
                          <td style={tdStyle}>{srcTag ? <span style={{ fontSize: '11px', background: srcTag.color + '20', color: srcTag.color, padding: '2px 8px', borderRadius: '5px', fontWeight: 600, fontFamily: F }}>{srcTag.label}</span> : <span style={{ color: '#7a7060' }}>—</span>}</td>
                          <td style={{ ...tdStyle, fontSize: '12px', color: '#7a7060' }}>{r.is_platform_master ? 'Platform Master' : (r.tenants?.name || '—')}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{r.is_platform_master ? <span style={{ color: '#D97A28' }}>✦</span> : '—'}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(r.id)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#D1FAE5', color: '#065F46', fontFamily: F }}>Save</button>
                                  <button onClick={() => setEditingId(null)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f2efe9', color: '#7a7060', fontFamily: F }}>Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(r.id); setEditBuffer({ element_name: r.element_name, city: r.city || '', rate_min: r.rate_min ?? '', rate_max: r.rate_max ?? '', rate_type: r.rate_type || '' }) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f2efe9', color: '#1a1008', fontFamily: F }}>✏</button>
                                  <button onClick={() => handleDeleteRow(r.id)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: F }}>🗑</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontFamily: F, fontSize: '13px', color: '#7a7060' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...btnSecondary, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} rows</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...btnSecondary, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {rcTab === 'import' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, fontFamily: F, color: '#1a1008', whiteSpace: 'nowrap' }}>Import to:</label>
            <select value={importTenantId || ''} onChange={e => setImportTenantId(e.target.value || saTenantId)} style={{ ...inputStyle, width: 'auto', minWidth: '220px' }}>
              <option value={saTenantId || ''}>Platform Master (Benchmark)</option>
              {tenants.filter(t => t.id !== saTenantId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', borderBottom: '0.5px solid #d8d2c8', marginBottom: '20px' }}>
            {[['upload', 'Upload File'], ['paste', 'Paste Data']].map(([k, l]) => (
              <button key={k} onClick={() => setImportTab(k)} style={tabStyle(importTab === k)}>{l}</button>
            ))}
          </div>

          {importTab === 'upload' && (
            <div>
              <div
                onClick={() => document.getElementById('rc-file-input').click()}
                style={{ border: '1.5px dashed #d8d2c8', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: '#faf8f5', marginBottom: '16px' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
              >
                <div style={{ fontSize: '14px', fontFamily: F, color: '#1a1008', marginBottom: '6px' }}>Drop your Excel file here or click to browse</div>
                <div style={{ fontSize: '12px', fontFamily: F, color: '#7a7060' }}>Accepted format: .xlsx · Download the template from the Templates tab</div>
                {importFile && <div style={{ marginTop: '10px', fontSize: '12px', color: '#065F46', fontFamily: F }}>📄 {importFile.name}</div>}
              </div>
              <input id="rc-file-input" type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]) }} />
            </div>
          )}

          {importTab === 'paste' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, fontFamily: F, color: '#7a7060', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paste tab-separated data (copy from Excel):</label>
              <textarea
                rows={10}
                value={importPaste}
                onChange={e => setImportPaste(e.target.value)}
                style={{ width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', padding: '10px 12px', border: '0.5px solid #d8d2c8', borderRadius: '8px', background: '#faf8f5', color: '#1a1008', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                placeholder={'Category\tElement Name\tCity\tRate Min\tRate Max\tRate Type\tUnit\tNotes\tSource\n...'}
              />
              <button onClick={handlePasteParse} style={{ ...btnSecondary, marginTop: '10px' }}>Parse</button>
            </div>
          )}

          {importRows.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontFamily: F, color: '#1a1008' }}>
                  <strong>{validCount}</strong> rows ready to import
                  {errorCount > 0 && <> · <span style={{ color: '#991B1B' }}>{errorCount} have errors</span></>}
                </span>
                <button onClick={() => { setImportRows([]); setImportFile(null); setImportPaste('') }} style={{ ...btnSecondary, fontSize: '12px', padding: '6px 12px' }}>Clear</button>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'auto', maxHeight: '360px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead><tr>{['#', 'Category', 'Element Name', 'City', 'Rate Min', 'Rate Max', 'Rate Type', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {importRows.map((r, i) => {
                      const missing = validateRow(r)
                      const ok = missing.length === 0
                      return (
                        <tr key={i} style={{ background: ok ? undefined : '#FEE2E2' }}>
                          <td style={{ ...tdStyle, color: '#7a7060', fontSize: '12px' }}>{i + 1}</td>
                          <td style={tdStyle}>{r.category || '—'}</td>
                          <td style={tdStyle}>{r.element_name || '—'}</td>
                          <td style={tdStyle}>{r.city || '—'}</td>
                          <td style={tdStyle}>{r.rate_min ?? '—'}</td>
                          <td style={tdStyle}>{r.rate_max ?? '—'}</td>
                          <td style={tdStyle}>{r.rate_type || '—'}</td>
                          <td style={tdStyle}>
                            {ok
                              ? <span style={{ color: '#065F46', fontSize: '12px', fontWeight: 600 }}>✓ Valid</span>
                              : <span style={{ color: '#991B1B', fontSize: '12px', fontWeight: 600 }}>✗ Missing: {missing.join(', ')}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={importing || validCount === 0} style={{ ...btnPrimary, marginTop: '12px', opacity: (importing || validCount === 0) ? 0.5 : 1 }}>
                {importing ? 'Importing...' : `Import ${validCount} valid rows`}
              </button>
            </div>
          )}
        </div>
      )}

      {rcTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: F, color: '#1a1008', marginBottom: '8px' }}>Rate Card Excel Template</div>
            <p style={{ fontSize: '13px', fontFamily: F, color: '#7a7060', marginBottom: '16px' }}>Download this template, fill it in Excel or Google Sheets, then import it in the Bulk Import tab.</p>
            <div style={{ background: '#faf8f5', border: '0.5px solid #d8d2c8', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Column', 'Expected Values'].map(h => <th key={h} style={{ ...thStyle, fontSize: '11px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    ['Category', 'Must match an active category name exactly'],
                    ['Element Name', 'Any text'],
                    ['City', 'City name (e.g. Mumbai, Delhi)'],
                    ['Rate Min', 'Number only, no ₹ symbol'],
                    ['Rate Max', 'Number only'],
                    ['Rate Type', 'per_unit / per_day / lump_sum / per_person / per_sqft'],
                    ['Unit', 'e.g. per day, per piece, per sqft'],
                    ['Notes', 'Optional'],
                    ['Source', 'AI_RESEARCH / VENDOR_QUOTE / INTERNAL / MARKET_SURVEY / CLIENT_PROVIDED'],
                  ].map(([col, val]) => (
                    <tr key={col}>
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap', width: '180px' }}>{col}</td>
                      <td style={{ ...tdStyle, color: '#7a7060' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleDownloadTemplate} style={btnPrimary}>Download Template</button>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: F, color: '#1a1008', marginBottom: '16px' }}>Source Tags</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { ...SOURCE_TAGS[0], desc: 'Rates sourced from AI research or public data' },
                { ...SOURCE_TAGS[1], desc: 'Direct quote received from a vendor' },
                { ...SOURCE_TAGS[2], desc: "Based on Myoozz's own past experience" },
                { ...SOURCE_TAGS[3], desc: 'Collected through market research' },
                { ...SOURCE_TAGS[4], desc: 'Rate shared by the client' },
              ].map(st => (
                <div key={st.value} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', background: st.color + '20', color: st.color, padding: '3px 10px', borderRadius: '6px', fontWeight: 600, fontFamily: F, whiteSpace: 'nowrap' }}>{st.label}</span>
                  <span style={{ fontSize: '13px', fontFamily: F, color: '#7a7060' }}>{st.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SAModal open={addModal} onClose={() => setAddModal(false)} title="Add Rate Card Row">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <ModalLabel>Category</ModalLabel>
            <select value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <ModalLabel>Element Name</ModalLabel>
            <input value={addForm.element_name} onChange={e => setAddForm(p => ({ ...p, element_name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>City</ModalLabel>
            <input value={addForm.city} onChange={e => setAddForm(p => ({ ...p, city: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Rate Type</ModalLabel>
            <select value={addForm.rate_type} onChange={e => setAddForm(p => ({ ...p, rate_type: e.target.value }))} style={inputStyle}>
              {['per_unit','per_day','lump_sum','per_person','per_sqft'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <ModalLabel>Rate Min</ModalLabel>
            <input type="number" value={addForm.rate_min} onChange={e => setAddForm(p => ({ ...p, rate_min: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Rate Max</ModalLabel>
            <input type="number" value={addForm.rate_max} onChange={e => setAddForm(p => ({ ...p, rate_max: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Unit</ModalLabel>
            <input value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Notes</ModalLabel>
            <input value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <ModalLabel>Source Tag</ModalLabel>
            <select value={addForm.source_tag} onChange={e => setAddForm(p => ({ ...p, source_tag: e.target.value }))} style={inputStyle}>
              {SOURCE_TAGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <ModalLabel>Source Ref</ModalLabel>
            <input value={addForm.source_ref} onChange={e => setAddForm(p => ({ ...p, source_ref: e.target.value }))} style={inputStyle} placeholder="vendor name / URL" />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="add-is-master" checked={addForm.is_platform_master} onChange={e => setAddForm(p => ({ ...p, is_platform_master: e.target.checked }))} />
            <label htmlFor="add-is-master" style={{ fontSize: '13px', fontFamily: F, color: '#1a1008', cursor: 'pointer' }}>Platform Master row (✦)</label>
          </div>
          {!addForm.is_platform_master && (
            <div style={{ gridColumn: '1 / -1' }}>
              <ModalLabel>Tenant</ModalLabel>
              <select value={addForm.tenant_id} onChange={e => setAddForm(p => ({ ...p, tenant_id: e.target.value }))} style={inputStyle}>
                <option value="">Select tenant…</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAdd} disabled={mLoading || !addForm.element_name} style={{ ...btnPrimary, flex: 1, opacity: (mLoading || !addForm.element_name) ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Row'}</button>
          <button onClick={() => setAddModal(false)} style={btnSecondary}>Cancel</button>
        </div>
      </SAModal>
    </div>
  )
}

// ── Section 7: Categories ─────────────────────────────────────────────────────

function SectionCategories({ showToast }) {
  const [catTab, setCatTab] = useState('registry')
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [usageMap, setUsageMap] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [mLoading, setMLoading] = useState(false)
  const [stageData, setStageData] = useState({})
  const [stageTypes, setStageTypes] = useState([])
  const [expandedType, setExpandedType] = useState(null)
  const [editingStage, setEditingStage] = useState(null)
  const [stageEditBuffer, setStageEditBuffer] = useState({})
  const [addStageModal, setAddStageModal] = useState(false)
  const [addStageForm, setAddStageForm] = useState({ category_type: '', stage_name: '', days_before_event: 0, is_terminal: false })
  const [addTypeModal, setAddTypeModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [stageLoading, setStageLoading] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (catTab === 'stageconfig' && stageTypes.length === 0) loadStages()
  }, [catTab])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('event_categories').select('*').order('sort_order')
    const list = data || []
    setCats(list)
    const usages = await Promise.all(list.map(async c => {
      const { count } = await supabase.from('elements').select('*', { count: 'exact', head: true }).eq('category', c.name)
      return [c.name, count || 0]
    }))
    setUsageMap(Object.fromEntries(usages))
    setLoading(false)
  }

  async function loadStages() {
    setStageLoading(true)
    const { data } = await supabase.from('category_stage_config').select('*').order('category_type').order('sort_order')
    const rows = data || []
    const types = [...new Set(rows.map(r => r.category_type))]
    const grouped = {}
    types.forEach(t => { grouped[t] = rows.filter(r => r.category_type === t) })
    setStageTypes(types)
    setStageData(grouped)
    setStageLoading(false)
  }

  async function handleRename(cat) {
    if (editName === cat.name) { setEditingId(null); return }
    const oldName = cat.name
    const newName = editName.trim()
    if (!newName) return
    const newSlug = slugify(newName)
    const { error } = await supabase.from('event_categories').update({ name: newName, slug: newSlug }).eq('id', cat.id)
    if (error) { alert(error.message); return }
    await Promise.all([
      supabase.from('elements').update({ category: newName }).eq('category', oldName),
      supabase.from('rate_cards').update({ category: newName }).eq('category', oldName),
    ])
    setCats(p => p.map(c => c.id === cat.id ? { ...c, name: newName, slug: newSlug } : c))
    setUsageMap(p => { const n = { ...p }; n[newName] = n[oldName]; delete n[oldName]; return n })
    showToast('Category renamed ✓')
    setEditingId(null)
  }

  async function handleToggleActive(cat) {
    const { error } = await supabase.from('event_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    if (error) { alert(error.message) } else {
      setCats(p => p.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
      showToast(`Category ${cat.is_active ? 'deactivated' : 'activated'} ✓`)
    }
  }

  async function handleDelete(cat) {
    if ((usageMap[cat.name] || 0) > 0) return
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    const { error } = await supabase.from('event_categories').delete().eq('id', cat.id)
    if (error) { alert(error.message) } else { setCats(p => p.filter(c => c.id !== cat.id)); showToast('Category deleted') }
  }

  async function handleMove(idx, dir) {
    const newCats = [...cats]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= newCats.length) return
    const a = newCats[idx], b = newCats[swapIdx]
    const tmpOrder = a.sort_order
    newCats[idx] = { ...a, sort_order: b.sort_order }
    newCats[swapIdx] = { ...b, sort_order: tmpOrder }
    newCats.sort((x, y) => x.sort_order - y.sort_order)
    setCats(newCats)
    await Promise.all([
      supabase.from('event_categories').update({ sort_order: newCats[idx].sort_order }).eq('id', newCats[idx].id),
      supabase.from('event_categories').update({ sort_order: newCats[swapIdx].sort_order }).eq('id', newCats[swapIdx].id),
    ])
  }

  async function handleAdd() {
    if (!newCatName.trim()) return
    setMLoading(true)
    const maxOrder = cats.reduce((m, c) => Math.max(m, c.sort_order || 0), 0)
    const { error } = await supabase.from('event_categories').insert({ name: newCatName.trim(), slug: slugify(newCatName.trim()), sort_order: maxOrder + 1, is_active: true })
    if (error) { alert(error.message) } else { setNewCatName(''); setAddModal(false); showToast('Category added ✓'); load() }
    setMLoading(false)
  }

  const TYPE_DISPLAY = {
    rental: 'Rental', booking: 'Booking', creative_print: 'Creative & Print',
    design_digital: 'Design & Digital', permissions: 'Permissions',
    print_fabrication: 'Print & Fabrication', print_only: 'Print Only',
    purchase_procurement: 'Purchase & Procurement', service: 'Service',
  }
  function formatType(t) { return TYPE_DISPLAY[t] || t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

  async function handleSaveStage(stage) {
    const { error } = await supabase.from('category_stage_config').update({
      stage_name: stageEditBuffer.stage_name,
      days_before_event: Number(stageEditBuffer.days_before_event) || 0,
      is_terminal: stageEditBuffer.is_terminal,
    }).eq('id', stage.id)
    if (error) { showToast('Save failed: ' + error.message); return }
    setEditingStage(null)
    loadStages()
    showToast('Stage saved ✓')
  }

  async function handleDeleteStage(id) {
    if (!window.confirm('Delete this stage?')) return
    const { error } = await supabase.from('category_stage_config').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message) } else { loadStages(); showToast('Stage deleted') }
  }

  async function handleSwapStages(stages, idx, dir) {
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= stages.length) return
    const a = stages[idx], b = stages[swapIdx]
    await Promise.all([
      supabase.from('category_stage_config').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('category_stage_config').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    loadStages()
  }

  async function handleAddStage() {
    setMLoading(true)
    const typedStages = stageData[addStageForm.category_type] || []
    const maxOrder = typedStages.reduce((m, s) => Math.max(m, s.sort_order || 0), 0)
    const { error } = await supabase.from('category_stage_config').insert({
      category_type: addStageForm.category_type,
      stage_name: addStageForm.stage_name,
      days_before_event: Number(addStageForm.days_before_event) || 0,
      is_terminal: addStageForm.is_terminal,
      sort_order: maxOrder + 1,
    })
    if (error) { showToast('Failed: ' + error.message) } else {
      setAddStageModal(false)
      setAddStageForm({ category_type: '', stage_name: '', days_before_event: 0, is_terminal: false })
      loadStages()
      showToast('Stage added ✓')
    }
    setMLoading(false)
  }

  async function handleAddType() {
    if (!newTypeName.trim()) return
    setMLoading(true)
    const typeSlug = newTypeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const { error } = await supabase.from('category_stage_config').insert({
      category_type: typeSlug, stage_name: 'Stage 1', sort_order: 1, days_before_event: 0, is_terminal: false,
    })
    if (error) { showToast('Failed: ' + error.message) } else {
      setAddTypeModal(false)
      setNewTypeName('')
      loadStages()
      showToast('Category type added ✓')
    }
    setMLoading(false)
  }

  const totalCats = cats.length
  const activeCats = cats.filter(c => c.is_active).length
  const unusedCats = cats.filter(c => (usageMap[c.name] || 0) === 0).length

  const tabStyle = (active) => ({ padding: '8px 16px', fontSize: '13px', fontFamily: F, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: active ? '2px solid #bc1723' : '2px solid transparent', color: active ? '#1a1008' : '#7a7060', marginBottom: '-0.5px' })

  return (
    <div>
      <SectionHeader title="Categories" subtitle="Global category registry and production stage configuration." />

      <div style={{ display: 'flex', borderBottom: '0.5px solid #d8d2c8', marginBottom: '24px' }}>
        <button onClick={() => setCatTab('registry')} style={tabStyle(catTab === 'registry')}>Category Registry</button>
        <button onClick={() => setCatTab('stageconfig')} style={tabStyle(catTab === 'stageconfig')}>Stage Config</button>
      </div>

      {catTab === 'registry' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setAddModal(true)} style={btnPrimary}>+ Add Category</button>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {[
              { label: 'Total Categories', value: totalCats, accent: '#1E40AF' },
              { label: 'Active', value: activeCats, accent: '#065F46' },
              { label: 'Unused (cleanup)', value: unusedCats, accent: '#92400E' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '10px', padding: '16px 20px', minWidth: '130px', flex: 1 }}>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: FD, color: c.accent }}>{loading ? '—' : c.value}</div>
                <div style={{ fontSize: '11px', fontFamily: F, color: '#7a7060', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '3px' }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Sort', 'Name', 'Slug', 'Usage', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#7a7060' }}>Loading...</td></tr>
                  : cats.map((c, idx) => {
                    const usage = usageMap[c.name] || 0
                    const isEdit = editingId === c.id
                    return (
                      <tr key={c.id}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#d8d2c8' : '#7a7060', fontSize: '12px', padding: '2px 4px' }}>▲</button>
                            <button onClick={() => handleMove(idx, 1)} disabled={idx === cats.length - 1} style={{ background: 'none', border: 'none', cursor: idx === cats.length - 1 ? 'default' : 'pointer', color: idx === cats.length - 1 ? '#d8d2c8' : '#7a7060', fontSize: '12px', padding: '2px 4px' }}>▼</button>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {isEdit
                            ? <input value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => handleRename(c)} onKeyDown={e => e.key === 'Enter' && handleRename(c)} style={{ fontSize: '13px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5', color: '#1a1008', outline: 'none' }} autoFocus />
                            : <span onClick={() => { setEditingId(c.id); setEditName(c.name) }} style={{ cursor: 'pointer', color: '#1a1008', fontWeight: 500 }} title="Click to rename">{c.name}</span>
                          }
                          {isEdit && <div style={{ fontSize: '11px', color: '#92400E', fontFamily: F, marginTop: '3px' }}>⚠ Renaming cascades to elements and rate cards</div>}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#7a7060' }}>{c.slug}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '12px', fontWeight: 600, background: usage > 0 ? '#D1FAE5' : '#F3F4F6', color: usage > 0 ? '#065F46' : '#6B7280', padding: '2px 8px', borderRadius: '5px', fontFamily: F }}>{usage}</span>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => handleToggleActive(c)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: c.is_active ? '#D1FAE5' : '#F3F4F6', color: c.is_active ? '#065F46' : '#6B7280', fontFamily: F, fontWeight: 600 }}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => handleDelete(c)} disabled={usage > 0} title={usage > 0 ? `Cannot delete — ${usage} elements use this category` : 'Delete'}
                            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: usage > 0 ? 'not-allowed' : 'pointer', background: usage > 0 ? '#F3F4F6' : '#FEE2E2', color: usage > 0 ? '#d8d2c8' : '#991B1B', fontFamily: F }}
                          >Delete</button>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>

          <SAModal open={addModal} onClose={() => setAddModal(false)} title="Add Category">
            <div style={{ marginBottom: '16px' }}><ModalLabel>Category Name</ModalLabel><input value={newCatName} onChange={e => setNewCatName(e.target.value)} style={inputStyle} placeholder="e.g. Lighting" /></div>
            {newCatName && <p style={{ fontSize: '12px', color: '#7a7060', fontFamily: F, marginBottom: '16px' }}>Slug: {slugify(newCatName)}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleAdd} disabled={mLoading || !newCatName.trim()} style={{ ...btnPrimary, flex: 1, opacity: (mLoading || !newCatName.trim()) ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Category'}</button>
              <button onClick={() => setAddModal(false)} style={btnSecondary}>Cancel</button>
            </div>
          </SAModal>
        </div>
      )}

      {catTab === 'stageconfig' && (
        <div>
          <p style={{ fontSize: '14px', color: '#7a7060', fontFamily: F, marginBottom: '20px' }}>Define the production stage sequences for each category type. These stages drive the Production tab workflow for all tenants.</p>

          {stageLoading
            ? <p style={{ color: '#7a7060', fontFamily: F }}>Loading...</p>
            : stageTypes.length === 0
              ? <p style={{ color: '#7a7060', fontFamily: F }}>No stage types configured yet.</p>
              : stageTypes.map(type => {
                const stages = stageData[type] || []
                const isExpanded = expandedType === type
                return (
                  <div key={type} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedType(isExpanded ? null : type)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: F, color: '#1a1008' }}>{formatType(type)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', background: '#f2efe9', color: '#7a7060', padding: '2px 10px', borderRadius: '10px', fontFamily: F }}>{stages.length} stages</span>
                        <span style={{ color: '#7a7060', fontSize: '12px' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '0.5px solid #d8d2c8' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead><tr>{['Sort', 'Stage Name', 'Days Before Event', 'Terminal?', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                          <tbody>
                            {stages.map((s, idx) => {
                              const isEditingS = editingStage === s.id
                              return (
                                <tr key={s.id}>
                                  <td style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button onClick={() => handleSwapStages(stages, idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#d8d2c8' : '#7a7060', fontSize: '12px', padding: '2px 4px' }}>▲</button>
                                      <button onClick={() => handleSwapStages(stages, idx, 1)} disabled={idx === stages.length - 1} style={{ background: 'none', border: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', color: idx === stages.length - 1 ? '#d8d2c8' : '#7a7060', fontSize: '12px', padding: '2px 4px' }}>▼</button>
                                    </div>
                                  </td>
                                  <td style={tdStyle}>{isEditingS ? <input value={stageEditBuffer.stage_name} onChange={e => setStageEditBuffer(p => ({ ...p, stage_name: e.target.value }))} style={{ fontSize: '13px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5', outline: 'none', width: '100%' }} autoFocus /> : s.stage_name}</td>
                                  <td style={tdStyle}>{isEditingS ? <input type="number" value={stageEditBuffer.days_before_event} onChange={e => setStageEditBuffer(p => ({ ...p, days_before_event: e.target.value }))} style={{ fontSize: '13px', fontFamily: F, padding: '4px 8px', border: '0.5px solid #d8d2c8', borderRadius: '6px', background: '#faf8f5', outline: 'none', width: '80px' }} /> : `${s.days_before_event} days before`}</td>
                                  <td style={tdStyle}>
                                    {isEditingS
                                      ? <input type="checkbox" checked={stageEditBuffer.is_terminal} onChange={e => setStageEditBuffer(p => ({ ...p, is_terminal: e.target.checked }))} />
                                      : s.is_terminal
                                        ? <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '5px', fontWeight: 600, fontFamily: F }}>Terminal</span>
                                        : <span style={{ color: '#7a7060' }}>—</span>
                                    }
                                  </td>
                                  <td style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      {isEditingS ? (
                                        <>
                                          <button onClick={() => handleSaveStage(s)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#D1FAE5', color: '#065F46', fontFamily: F }}>Save</button>
                                          <button onClick={() => setEditingStage(null)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f2efe9', color: '#7a7060', fontFamily: F }}>Cancel</button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={() => { setEditingStage(s.id); setStageEditBuffer({ stage_name: s.stage_name, days_before_event: s.days_before_event, is_terminal: s.is_terminal }) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f2efe9', color: '#1a1008', fontFamily: F }}>✏</button>
                                          <button onClick={() => handleDeleteStage(s.id)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B', fontFamily: F }}>🗑</button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #d8d2c8' }}>
                          <button onClick={() => { setAddStageForm(f => ({ ...f, category_type: type })); setAddStageModal(true) }} style={{ ...btnSecondary, border: '0.5px solid #bc1723', color: '#bc1723', fontSize: '12px' }}>+ Add Stage</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          }

          <div style={{ marginTop: '16px' }}>
            <button onClick={() => setAddTypeModal(true)} style={{ ...btnSecondary, border: '0.5px solid #bc1723', color: '#bc1723' }}>+ Add New Category Type</button>
          </div>

          <SAModal open={addStageModal} onClose={() => setAddStageModal(false)} title="Add Stage" subtitle={addStageForm.category_type ? formatType(addStageForm.category_type) : ''}>
            <div style={{ marginBottom: '12px' }}>
              <ModalLabel>Category Type</ModalLabel>
              <div style={{ fontSize: '13px', fontFamily: F, color: '#7a7060', padding: '9px 0' }}>{formatType(addStageForm.category_type)}</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <ModalLabel>Stage Name</ModalLabel>
              <input value={addStageForm.stage_name} onChange={e => setAddStageForm(p => ({ ...p, stage_name: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <ModalLabel>Days Before Event</ModalLabel>
              <input type="number" value={addStageForm.days_before_event} onChange={e => setAddStageForm(p => ({ ...p, days_before_event: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="stage-terminal" checked={addStageForm.is_terminal} onChange={e => setAddStageForm(p => ({ ...p, is_terminal: e.target.checked }))} />
              <label htmlFor="stage-terminal" style={{ fontSize: '13px', fontFamily: F, color: '#1a1008', cursor: 'pointer' }}>Is Terminal</label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleAddStage} disabled={mLoading || !addStageForm.stage_name} style={{ ...btnPrimary, flex: 1, opacity: (mLoading || !addStageForm.stage_name) ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Stage'}</button>
              <button onClick={() => setAddStageModal(false)} style={btnSecondary}>Cancel</button>
            </div>
          </SAModal>

          <SAModal open={addTypeModal} onClose={() => setAddTypeModal(false)} title="Add New Category Type">
            <div style={{ marginBottom: '16px' }}>
              <ModalLabel>Type Name</ModalLabel>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} style={inputStyle} placeholder="e.g. Logistics" />
              {newTypeName && <p style={{ fontSize: '12px', color: '#7a7060', fontFamily: F, marginTop: '6px' }}>Slug: {newTypeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}</p>}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleAddType} disabled={mLoading || !newTypeName.trim()} style={{ ...btnPrimary, flex: 1, opacity: (mLoading || !newTypeName.trim()) ? 0.6 : 1 }}>{mLoading ? 'Adding...' : 'Add Type'}</button>
              <button onClick={() => setAddTypeModal(false)} style={btnSecondary}>Cancel</button>
            </div>
          </SAModal>
        </div>
      )}
    </div>
  )
}

// ── Section 8: Analytics ──────────────────────────────────────────────────────

function SectionAnalytics() {
  const [stats, setStats] = useState({ events: 0, tasks: 0, elements: 0, users: 0, rateCards: 0 })
  const [chartData, setChartData] = useState([])
  const [eventsChartData, setEventsChartData] = useState([])
  const [topCats, setTopCats] = useState([])
  const [statusDist, setStatusDist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [r1, r2, r3, r4, r5, r6, r7, r8, r9] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('elements').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('rate_cards').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('created_at').order('created_at'),
        supabase.from('elements').select('category'),
        supabase.from('tenants').select('status'),
        supabase.from('events').select('created_at').order('created_at', { ascending: true }),
      ])
      setStats({ events: r1.count || 0, tasks: r2.count || 0, elements: r3.count || 0, users: r4.count || 0, rateCards: r5.count || 0 })

      // Chart: tenants per month (last 12)
      const tenantDates = (r6.data || []).map(t => new Date(t.created_at))
      const monthCounts = {}
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        monthCounts[key] = 0
      }
      tenantDates.forEach(d => {
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        if (key in monthCounts) monthCounts[key]++
      })
      setChartData(Object.entries(monthCounts).map(([month, count]) => ({ month, count })))

      // Chart: events per month (last 12)
      const eventDates = (r9.data || []).map(e => new Date(e.created_at))
      const evMonthCounts = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        evMonthCounts[key] = 0
      }
      eventDates.forEach(d => {
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        if (key in evMonthCounts) evMonthCounts[key]++
      })
      setEventsChartData(Object.entries(evMonthCounts).map(([month, count]) => ({ month, count })))

      // Top categories
      const catCount = {}
      ;(r7.data || []).forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1 })
      const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
      setTopCats(sorted)

      // Status distribution
      const stCount = {}
      ;(r8.data || []).forEach(t => { stCount[t.status] = (stCount[t.status] || 0) + 1 })
      setStatusDist(Object.entries(STATUS_COLORS).map(([k, v]) => ({ key: k, label: v.label, bg: v.bg, color: v.color, count: stCount[k] || 0 })))

      setLoading(false)
    }
    load()
  }, [])

  const maxCat = topCats[0]?.[1] || 1

  return (
    <div>
      <SectionHeader title="Platform Analytics" subtitle="Volume and velocity across all tenants. No financials." />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Events', value: stats.events, accent: '#bc1723' },
          { label: 'Total Tasks', value: stats.tasks, accent: '#3730A3' },
          { label: 'Total Elements', value: stats.elements, accent: '#1E40AF' },
          { label: 'Total Users', value: stats.users, accent: '#065F46' },
          { label: 'Rate Card Rows', value: stats.rateCards, accent: '#92400E' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px', minWidth: '140px', flex: 1, borderTop: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: FD, color: c.accent }}>{loading ? '—' : c.value}</div>
            <div style={{ fontSize: '12px', fontFamily: F, color: '#7a7060', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Bar chart */}
        <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px' }}>
          <p style={{ fontFamily: F, fontSize: '13px', fontWeight: 600, color: '#1a1008', marginBottom: '16px' }}>New Tenants Per Month</p>
          {BarChart && !loading ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: F, fill: '#7a7060' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: F, fill: '#7a7060' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontFamily: F, fontSize: 12, borderRadius: 8, border: '0.5px solid #d8d2c8' }} />
                <Bar dataKey="count" fill="#bc1723" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#7a7060', fontFamily: F, fontSize: '13px' }}>{loading ? 'Loading...' : 'Install recharts to view chart'}</p>
            </div>
          )}
        </div>

        {/* Top categories */}
        <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px' }}>
          <p style={{ fontFamily: F, fontSize: '13px', fontWeight: 600, color: '#1a1008', marginBottom: '16px' }}>Top Categories by Element Usage</p>
          {loading ? <p style={{ color: '#7a7060', fontFamily: F, fontSize: '13px' }}>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topCats.map(([cat, count]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontFamily: F, color: '#1a1008' }}>{cat}</span>
                    <span style={{ fontSize: '12px', fontFamily: F, color: '#7a7060', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ background: '#f2efe9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${(count / maxCat) * 100}%`, background: 'rgba(188,23,35,0.25)', height: '100%', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Events per month chart */}
      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
        <p style={{ fontFamily: F, fontSize: '13px', fontWeight: 600, color: '#1a1008', marginBottom: '16px' }}>Events Created Per Month</p>
        {BarChart && !loading ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventsChartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: F, fill: '#7a7060' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: F, fill: '#7a7060' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: F, fontSize: 12, borderRadius: 8, border: '0.5px solid #d8d2c8' }} />
              <Bar dataKey="count" fill="#bc1723" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#7a7060', fontFamily: F, fontSize: '13px' }}>{loading ? 'Loading...' : 'Install recharts to view chart'}</p>
          </div>
        )}
      </div>

      {/* Tenant status distribution */}
      <div style={{ background: '#fff', border: '0.5px solid #d8d2c8', borderRadius: '12px', padding: '20px 24px' }}>
        <p style={{ fontFamily: F, fontSize: '13px', fontWeight: 600, color: '#1a1008', marginBottom: '16px' }}>Tenant Status Distribution</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {statusDist.map(s => (
            <div key={s.key} style={{ background: s.bg, borderRadius: '10px', padding: '14px 20px', minWidth: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: FD, color: s.color }}>{loading ? '—' : s.count}</div>
              <div style={{ fontSize: '11px', fontFamily: F, color: s.color, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main SuperAdminPanel ──────────────────────────────────────────────────────

export default function SuperAdminPanel({ onClose }) {
  const [roleChecked, setRoleChecked] = useState(false)
  const [platformRole, setPlatformRole] = useState(null)
  const [activeSection, setActiveSection] = useState('analytics')
  const [pendingCount, setPendingCount] = useState(0)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.platform_role) setPlatformRole(payload.platform_role)
        }
      } catch { /* silent */ }
      setRoleChecked(true)
    }
    init()
    fetchBadge()
  }, [])

  async function fetchBadge() {
    const { count } = await supabase.from('tenants').select('*', { count: 'exact', head: true }).in('status', ['pending_review', 'waitlisted'])
    setPendingCount(count || 0)
  }

  const showToast = useCallback((msg) => setToast(msg), [])

  if (!roleChecked) return null

  if (platformRole !== 'super_admin') {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <p style={{ fontFamily: F, fontSize: '14px', color: '#7a7060' }}>Access restricted.</p>
      </div>
    )
  }

  const sectionProps = { showToast, setActiveSection, refreshBadge: fetchBadge }

  const sectionMap = {
    overview:   <SectionOverview setActiveSection={setActiveSection} />,
    approvals:  <SectionApprovals refreshBadge={fetchBadge} />,
    tenants:    <SectionTenants showToast={showToast} />,
    users:      <SectionUsers showToast={showToast} />,
    credits:    <SectionCredits showToast={showToast} />,
    ratecards:  <SectionRateCards showToast={showToast} />,
    categories: <SectionCategories showToast={showToast} />,
    analytics:  <SectionAnalytics />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#faf8f5', fontFamily: F }}>
      {/* Sidebar */}
      <div style={{ width: '220px', flexShrink: 0, height: '100vh', overflowY: 'auto', background: '#fff', borderRight: '0.5px solid #d8d2c8', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontFamily: FD, fontSize: '18px', fontWeight: 700, color: '#1a1008', lineHeight: 1.2 }}>Platform Admin</div>
          <div style={{ fontFamily: F, fontSize: '11px', color: '#7a7060', marginTop: '3px' }}>Myoozz Events</div>
        </div>
        <div style={{ height: '0.5px', background: '#d8d2c8', marginBottom: '12px' }} />

        <nav style={{ flex: 1, padding: '0 12px' }}>
          {SECTIONS.map(s => {
            const isActive = activeSection === s.key
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: isActive ? '#bc1723' : 'none',
                  color: isActive ? '#fff' : '#7a7060',
                  fontFamily: F, fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  marginBottom: '2px', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f2efe9' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{s.label}</span>
                {s.badge && pendingCount > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, background: isActive ? 'rgba(255,255,255,0.3)' : '#bc1723', color: '#fff', padding: '1px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '12px' }}>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none', color: '#7a7060', fontFamily: F, fontSize: '13px', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f2efe9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ← Exit Admin
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {sectionMap[activeSection]}
      </div>

      <GlobalToast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
