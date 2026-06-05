import { useState, useEffect, useRef } from 'react'
import ElementBuilder from './ElementBuilder'
import ExportPreview from './ExportPreview'
import TaskBoard from './TaskBoard'
import Production from './Production'
import DeliveredCenter from './DeliveredCenter'
import CueSheet from './CueSheet'
import EventMilestone from './EventMilestone'
import { supabase } from '../supabase'
import { createNotification } from '../utils/notificationService'
import AssignEvent from './AssignEvent'
import TravelItinerary from './TravelItinerary'
import { Icon } from '../icons'

// ── Tab definitions — single source of truth for bar + bottom nav ──
const TABS = [
  { key: 'elements',   label: 'Elements' },
  { key: 'export',     label: 'Export' },
  { key: 'tasks',      label: 'Execution' },
  { key: 'production', label: 'Production' },
  { key: 'travel',     label: 'Travel & Itinerary' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cuesheet',   label: 'Show Flow' },
]

// ── Help content — one entry per tab ──
const HELP_CONTENT = {
  elements: {
    icon: 'elements',
    title: 'Build your cost sheet',
    description: 'Add every element by category. Fill client cost and internal cost to see your margin. Use Import to bring in existing Excel sheets.',
    tip: 'Start with categories — each comes with suggested elements so you never start from zero.',
  },
  export: {
    icon: 'export',
    title: 'Preview and export your proposal',
    description: 'See exactly what your client will see. Toggle sections on or off, then download as a formatted Excel.',
    tip: 'Switch between Estimate and Invoice before downloading. Multi-city events get one sheet per city.',
  },
  tasks: {
    icon: 'execution',
    title: 'Project won — now execute',
    description: 'Generate a task for every element. Assign your team, set deadlines, and track to completion. Share a public link with any freelancer — no login needed.',
    tip: 'Set the Category Owner first — they are accountable for everything in that category. Then assign individual elements.',
  },
  production: {
    icon: 'production',
    title: 'Track creative, fabrication and print',
    description: 'Every branded element needs creative approval before it goes to print. Track each stream independently and catch gaps before they become problems.',
    tip: 'Nothing moves to print without client-approved artwork. The system will flag it if someone tries.',
  },
  travel: {
    icon: 'travel',
    title: 'Travel & Itinerary',
    description: 'Build your full MICE itinerary. Add flights, hotels, transfers and day programs city by city.',
    tip: 'Import your day program into the task board once the project is won — no re-entry needed.',
  },
  delivered: {
    icon: 'delivered',
    title: 'Event delivered. Well done.',
    description: 'All your documents are ready. Download individually or take everything at once.',
    tip: 'Share the proposal with your client, brief sheets with vendors, and keep the timeline for your records.',
  },
  cuesheet: {
    icon: 'showflow',
    title: 'Build your show flow',
    description: 'Build your minute-by-minute show flow with named screens for each technical department. Add Sound, Light, LED Wall, Main Screen — whatever your setup needs.',
    tip: "Set start time + duration on first row — end fills automatically. Each row inherits the previous row's end time.",
  },
}

// ── Tab icons — resolve through the shared icon module (src/icons.jsx). ──
const TAB_ICON = {
  elements: 'elements', export: 'export', tasks: 'execution', production: 'production',
  travel: 'travel', delivered: 'delivered', cuesheet: 'showflow',
}
function TabIcon({ tabKey, active }) {
  return (
    <Icon
      name={TAB_ICON[tabKey]}
      size={14}
      style={{ opacity: active ? 1 : 0.65, flexShrink: 0, display: 'block' }}
    />
  )
}

// ── Floating help button — collapsed by default, context-aware per tab ──
function FloatingHelp({ activeTab }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const help = HELP_CONTENT[activeTab]

  // Collapse when tab changes
  useEffect(() => { setOpen(false) }, [activeTab])

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!help) return null

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 400 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 46, right: 0,
          width: 284,
          background: 'var(--bg)',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          padding: '18px 20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={help.icon} size={16} color="var(--app-accent)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                {help.title}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-tertiary)', fontSize: 13, padding: 0,
                lineHeight: 1, flexShrink: 0, marginTop: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p style={{
            margin: 0, fontSize: 12, color: 'var(--text-secondary)',
            lineHeight: 1.65, fontFamily: 'var(--font-body)', marginBottom: 12,
          }}>
            {help.description}
          </p>

          {/* Tip */}
          <div style={{
            borderTop: '0.5px solid var(--border)',
            paddingTop: 10,
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>💡</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
              {help.tip}
            </span>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Help for this section"
        style={{
          width: 34, height: 34,
          borderRadius: '50%',
          background: open ? 'var(--app-accent)' : 'var(--bg)',
          border: '0.5px solid ' + (open ? 'var(--app-accent)' : 'var(--border-strong)'),
          color: open ? '#fff' : 'var(--text-tertiary)',
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!open) { e.currentTarget.style.borderColor = 'var(--app-accent)'; e.currentTarget.style.color = 'var(--app-accent)' } }}
        onMouseOut={e => { if (!open) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-tertiary)' } }}
      >
        ?
      </button>
    </div>
  )
}

// ── Tab button style ──
const tabStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: active ? 500 : 400,
  fontFamily: 'var(--font-body)',
  color: active ? 'var(--app-accent)' : 'var(--text-tertiary)',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid var(--app-accent)' : '2px solid transparent',
  cursor: 'pointer',
  letterSpacing: '0.2px',
  transition: 'color 0.15s',
  whiteSpace: 'nowrap',
  marginBottom: '-0.5px',
})

const STATUS_OPTIONS = ['pitch', 'submitted', 'won', 'lost', 'on hold']
const STATUS_LABELS = {
  pitch: 'Pitch',
  submitted: 'Submitted',
  won: 'Won',
  lost: 'Lost',
  'on hold': 'On Hold',
}
const LOSS_REASONS = [
  'Budget constraint',
  'Went to another agency',
  'Client cancelled the event',
  'No response from client',
  'Brief withdrawn',
  'Lost on pricing',
  'Timing did not work out',
  'Other',
]

const statusColor = {
  pitch:    { bg: 'var(--blue-light)',  color: 'var(--blue)' },
  submitted:{ bg: 'var(--amber-light)', color: 'var(--amber)' },
  won:      { bg: 'var(--green-light)', color: 'var(--green)' },
  lost:     { bg: 'var(--state-danger-bg)',            color: 'var(--state-danger)' },
  'on hold':{ bg: 'var(--bg-secondary)',color: 'var(--text-tertiary)' },
}

const CONFETTI_COLORS = ['var(--app-accent)', 'var(--state-warning)', '#10b981', 'var(--state-info)', '#8b5cf6', '#ec4899']
const CONFETTI_PIECES = Array.from({ length: 44 }, (_, i) => ({
  left:     ((i * 13.7 + 5) % 100).toFixed(1) + '%',
  color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  width:    i % 3 === 0 ? 8 : 6,
  height:   i % 3 === 0 ? 8 : 14,
  circle:   i % 4 === 0,
  duration: (1.4 + (i % 5) * 0.18).toFixed(2),
  delay:    ((i % 10) * 0.07).toFixed(2),
}))

export default function EventPage({ event, userRole, session, onBack, onUpdated, initialTab }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const getDefaultTab = (ps) => ps === 'won' ? 'execution' : 'elements';
  const [activeTab,    setActiveTab]    = useState(() => {
    const stored = localStorage.getItem(`myoozz_tab_${event?.id}`)
    return stored || initialTab || getDefaultTab(event?.proposal_status)
  })
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [showWonModal, setShowWonModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(event)
  const [teamUsers,    setTeamUsers]    = useState([])
  const [assignedTo,   setAssignedTo]   = useState(event.assigned_to || [])
  const [revokeConfirm, setRevokeConfirm] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase.from('users').select('id, email, full_name, role').neq('status','inactive')
      setTeamUsers(data || [])
    }
    fetchTeam()
  }, [])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setRefreshKey(k => k + 1)
    localStorage.setItem(`myoozz_tab_${event?.id}`, tab)
  }

  const [status,       setStatus]       = useState(event.status || 'pitch')
  const [lossReason,   setLossReason]   = useState(event.loss_reason || '')
  const [customReason, setCustomReason] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const sc        = statusColor[status] || statusColor.pitch
  const isAdmin   = userRole === 'admin'
  const isManager = userRole === 'manager'
  const canAssign = isAdmin || isManager

  const [proposalStatus,     setProposalStatus]     = useState(event.proposal_status || 'draft')
  const [savingProposal,     setSavingProposal]      = useState(false)
  const [showItineraryPrompt, setShowItineraryPrompt] = useState(false)
  const [taskCount,    setTaskCount]    = useState(null)
  const [doneCount,    setDoneCount]    = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showProdModal, setShowProdModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderTargets, setReminderTargets] = useState('all')
  const [reminderSelected, setReminderSelected] = useState([])
  const [elementAssignees, setElementAssignees] = useState([])
  const [editingField,      setEditingField]      = useState(null)
  const [editValue,         setEditValue]         = useState('')
  const [savingField,       setSavingField]       = useState(false)
  const [pendingEdits,      setPendingEdits]      = useState(currentEvent.pending_edits || null)
  const [showCitiesPopover, setShowCitiesPopover] = useState(false)
  const [showTeamPopover,   setShowTeamPopover]   = useState(false)

  useEffect(() => {
    if (proposalStatus !== 'won') return
    supabase.from('tasks').select('id, status').eq('event_id', event.id).then(({ data }) => {
      const all = data || []
      setTaskCount(all.length)
      setDoneCount(all.filter(t => t.status === 'done' || t.status === 'completed').length)
    })
  }, [proposalStatus])

  const [delegationScope, setDelegationScope] = useState(event.delegation_scope || {})
  const SCOPE_TABS = {
    full: ['elements','export','tasks','production','travel','delivered','cuesheet'],
    ops:  ['elements','tasks','production','travel','cuesheet'],
    view: ['elements','export'],
  }
  const myScope    = canAssign ? 'full' : (delegationScope[session?.user?.email] || 'full')
  const visibleTabs = TABS.filter(t => (SCOPE_TABS[myScope] || SCOPE_TABS.full).includes(t.key))

  async function handleStatusChange(newStatus) {
    if (newStatus === 'won') setShowWonModal(true)
    setStatus(newStatus)
    if (newStatus !== 'lost') {
      setSavingStatus(true)
      await supabase.from('events').update({ status: newStatus, loss_reason: null }).eq('id', event.id)
      setSavingStatus(false)
    }
  }

  async function saveLossReason() {
    const reason = lossReason === 'Other' ? customReason : lossReason
    setSavingStatus(true)
    await supabase.from('events').update({ status: 'lost', loss_reason: reason }).eq('id', event.id)
    setSavingStatus(false)
  }

  const FIELD_LABELS = {
    event_name: 'Event name', sub_category: 'Sub-category', pax_count: 'PAX',
    budget_tier: 'Budget tier', seating_format: 'Seating format',
    proposal_due_date: 'Proposal due', agency_fee_percent: 'Agency fee', gst_percent: 'GST',
  }
  const ROLE_LABELS_MAP = { admin: 'Admin', manager: 'Project Head', event_lead: 'Manager', team: 'Project Team', staff: 'Staff' }

  function startEdit(field, value) { setEditingField(field); setEditValue(value ?? '') }

  async function saveField(field) {
    setSavingField(true)
    const val = editValue
    if (isAdmin) {
      await supabase.from('events').update({ [field]: val }).eq('id', currentEvent.id)
      setCurrentEvent(prev => ({ ...prev, [field]: val }))
    } else if (isManager) {
      const newPending = { ...(pendingEdits || {}), [field]: val }
      await supabase.from('events').update({ pending_edits: newPending }).eq('id', currentEvent.id)
      setCurrentEvent(prev => ({ ...prev, pending_edits: newPending }))
      setPendingEdits(newPending)
    }
    setEditingField(null)
    setSavingField(false)
  }

  async function approvePendingEdits() {
    await supabase.from('events').update({ ...pendingEdits, pending_edits: null }).eq('id', currentEvent.id)
    setCurrentEvent(prev => ({ ...prev, ...pendingEdits, pending_edits: null }))
    setPendingEdits(null)
  }

  async function rejectPendingEdits() {
    await supabase.from('events').update({ pending_edits: null }).eq('id', currentEvent.id)
    setCurrentEvent(prev => ({ ...prev, pending_edits: null }))
    setPendingEdits(null)
  }

  async function handleSubmitProposal() {
    setSavingProposal(true)
    await supabase.from('events').update({ proposal_status: 'submitted' }).eq('id', event.id)
    setProposalStatus('submitted')
    setSavingProposal(false)
  }

  async function handleIWon() {
    setSavingProposal(true)
    await supabase.from('events').update({ proposal_status: 'won', status: 'won' }).eq('id', event.id)
    setProposalStatus('won')
    setStatus('won')
    setSavingProposal(false)
    const { data: itin } = await supabase
      .from('itinerary').select('id').eq('event_id', event.id).maybeSingle()
    if (itin) setShowItineraryPrompt(true)
    else { setShowWonModal(true) }
  }

  async function handleMarkLostProposal() {
    setSavingProposal(true)
    await supabase.from('events').update({ proposal_status: 'lost', status: 'lost' }).eq('id', event.id)
    setProposalStatus('lost')
    setStatus('lost')
    setSavingProposal(false)
  }

  async function handleMarkAsWon() {
    setSavingProposal(true)
    await supabase.from('events').update({ proposal_status: 'won', status: 'won' }).eq('id', event.id)
    setProposalStatus('won')
    setStatus('won')
    setSavingProposal(false)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2500)
    const { data: itin } = await supabase.from('itinerary').select('id').eq('event_id', event.id).maybeSingle()
    if (itin) setTimeout(() => setShowItineraryPrompt(true), 2600)
  }

  async function handleSendReminder() {
    setReminderTargets('all')
    setReminderSelected([])
    // Fetch unique assigned_to user IDs from element_assignments for this event
    const { data: eaRows } = await supabase
      .from('element_assignments')
      .select('assigned_to')
      .eq('event_id', event.id)
      .not('assigned_to', 'is', null);
    const uniqueIds = [...new Set((eaRows || []).map(r => r.assigned_to))];
    // Resolve full user objects from teamUsers (already loaded)
    const resolved = uniqueIds
      .map(uid => teamUsers.find(u => u.id === uid))
      .filter(Boolean);
    setElementAssignees(resolved);
    setShowReminderModal(true)
  }

  async function handleRevoke(email) {
    const updated = assignedTo.filter(e => e !== email)
    await supabase.from('events').update({ assigned_to: updated }).eq('id', event.id)
    setAssignedTo(updated)
    setRevokeConfirm(null)
    if (onUpdated) onUpdated({ ...event, assigned_to: updated })
  }

  function getName(email) {
    const u = teamUsers.find(u => u.email === email)
    return u?.full_name || email.split('@')[0]
  }

  function FieldCell({ label, field, value, display, type, cellStyle }) {
    const isEditing = editingField === field
    const canEdit = isAdmin || isManager
    const empty = value === null || value === undefined || value === ''
    return (
      <div style={cellStyle}>
        <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', fontWeight: 500 }}>{label}</div>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type={type || 'text'}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveField(field); if (e.key === 'Escape') setEditingField(null) }}
              style={{ fontSize: '13px', padding: '3px 8px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', outline: 'none', fontFamily: 'var(--font-body)', width: 110 }}
            />
            <button onClick={() => saveField(field)} disabled={savingField} style={{ padding: '3px 8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px' }}>
              {savingField ? '…' : '✓'}
            </button>
            <button onClick={() => setEditingField(null)} style={{ padding: '3px 8px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', color: 'var(--text-tertiary)' }}>✕</button>
          </div>
        ) : (
          <div
            onClick={canEdit ? () => startEdit(field, String(value ?? '')) : undefined}
            title={canEdit ? 'Click to edit' : undefined}
            style={{ fontSize: '13px', color: empty ? 'var(--text-tertiary)' : 'var(--text)', cursor: canEdit ? 'pointer' : 'default', minHeight: 20 }}
          >
            {display || (!empty ? String(value) : '—')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ← Back */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', fontSize: '13px',
          color: 'var(--text-tertiary)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', padding: '0',
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        ← All events
      </button>

      {/* ── Pending edits banner — admin sees + approves/rejects manager changes ── */}
      {isAdmin && pendingEdits && Object.keys(pendingEdits).length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFF8EC', border: '0.5px solid #F5A623', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>Pending changes:</span>
            {Object.entries(pendingEdits).map(([field, val], i) => (
              <span key={field}>
                {i > 0 && <span style={{ color: 'var(--text-tertiary)', margin: '0 5px' }}>·</span>}
                <span style={{ fontWeight: 500 }}>{FIELD_LABELS[field] || field}</span>
                {': '}
                <span style={{ color: 'var(--text-tertiary)' }}>{String(currentEvent[field] ?? '—')}</span>
                {' → '}
                <span style={{ color: 'var(--state-warning)' }}>{String(val)}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={approvePendingEdits} style={{ padding: '6px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 500, background: 'var(--state-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Approve</button>
            <button onClick={rejectPendingEdits} style={{ padding: '6px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 500, background: 'none', color: 'var(--state-danger)', border: '0.5px solid var(--state-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Reject</button>
          </div>
        </div>
      )}

      {/* ── Event header v2 ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>

          {/* Event logo */}
          <div style={{ width: 88, height: 88, borderRadius: 10, border: '0.5px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <span style={{ fontSize: '22px', opacity: 0.3 }}>🏢</span>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.4 }}>Event<br/>logo</span>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Chips */}
            {(currentEvent.event_type || currentEvent.event_subtype) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                {currentEvent.event_type && (
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 9px', borderRadius: 99, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
                    {currentEvent.event_type}
                  </span>
                )}
                {currentEvent.event_subtype && (
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 9px', borderRadius: 99, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
                    {currentEvent.event_subtype}
                  </span>
                )}
              </div>
            )}

            {/* Name + status row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              {editingField === 'event_name' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveField('event_name'); if (e.key === 'Escape') setEditingField(null) }}
                    style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.3px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', background: 'var(--bg)', outline: 'none', flex: 1, maxWidth: 400 }}
                  />
                  <button onClick={() => saveField('event_name')} disabled={savingField} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    {savingField ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingField(null)} style={{ padding: '5px 9px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-tertiary)' }}>✕</button>
                </div>
              ) : (
                <h1
                  onClick={(isAdmin || isManager) ? () => startEdit('event_name', currentEvent.event_name) : undefined}
                  title={(isAdmin || isManager) ? 'Click to edit' : undefined}
                  style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2, cursor: (isAdmin || isManager) ? 'pointer' : 'default' }}
                >
                  {currentEvent.event_name}
                </h1>
              )}

              {/* Status pill */}
              {isAdmin ? (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    value={status}
                    onChange={e => handleStatusChange(e.target.value)}
                    style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', padding: '3px 20px 3px 10px', borderRadius: 99, border: '0.5px solid var(--border)', background: sc.bg, color: sc.color, cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 8, color: sc.color }}>▾</span>
                  {savingStatus && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: 6 }}>Saving...</span>}
                </div>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color, border: '0.5px solid var(--border)' }}>
                  {STATUS_LABELS[status]}
                </span>
              )}
            </div>

            {/* Loss reason row — admin, status=lost only */}
            {isAdmin && status === 'lost' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Reason:</span>
                <select value={lossReason} onChange={e => setLossReason(e.target.value)} style={{ fontSize: '12px', fontFamily: 'var(--font-body)', padding: '3px 10px', border: '0.5px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                  <option value="">Select reason</option>
                  {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {lossReason === 'Other' && (
                  <input placeholder="Describe..." value={customReason} onChange={e => setCustomReason(e.target.value)} style={{ fontSize: '12px', fontFamily: 'var(--font-body)', padding: '3px 10px', border: '0.5px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                )}
                {lossReason && (
                  <button onClick={saveLossReason} style={{ padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
                )}
              </div>
            )}

            {/* Field grid — bordered cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', border: '0.5px solid var(--border)', borderRadius: 8 }}>

              {/* Cities */}
              <div style={{ padding: '9px 12px', borderRadius: '8px 0 0 8px', position: 'relative', background: 'var(--bg)' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontWeight: 500 }}>Cities</div>
                <div style={{ position: 'relative' }}>
                  {currentEvent.cities?.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentEvent.cities[0]}</span>
                      {currentEvent.cities.length > 1 && (
                        <button onClick={() => setShowCitiesPopover(p => !p)} style={{ fontSize: '10px', color: 'var(--accent)', background: 'none', border: '0.5px solid var(--accent)', borderRadius: 99, padding: '1px 6px', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          +{currentEvent.cities.length - 1}
                        </button>
                      )}
                      {showCitiesPopover && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 12, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 200 }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>All cities</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {currentEvent.cities.map(city => {
                              const cd = currentEvent.city_dates?.[city]
                              const dateStr = cd?.start ? ' · ' + (cd.end && cd.end !== cd.start
                                ? `${new Date(cd.start).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${new Date(cd.end).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`
                                : new Date(cd.start).toLocaleDateString('en-IN',{day:'numeric',month:'short'})) : ''
                              return (
                                <span key={city} style={{ fontSize: '12px', color: 'var(--text)', padding: '3px 10px', borderRadius: 99, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>
                                  {city}{dateStr}
                                </span>
                              )
                            })}
                          </div>
                          <button onClick={() => setShowCitiesPopover(false)} style={{ marginTop: 8, fontSize: '11px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Close</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                  )}
                </div>
              </div>

              {FieldCell({ label: 'Sub-category', field: 'sub_category', value: currentEvent.sub_category, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'PAX', field: 'pax_count', value: currentEvent.pax_count, type: 'number', cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'Budget tier', field: 'budget_tier', value: currentEvent.budget_tier, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'Seating', field: 'seating_format', value: currentEvent.seating_format, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'Proposal due', field: 'proposal_due_date', value: currentEvent.proposal_due_date, type: 'date', display: currentEvent.proposal_due_date ? new Date(currentEvent.proposal_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'Fee', field: 'agency_fee_percent', value: currentEvent.agency_fee_percent, type: 'number', display: currentEvent.agency_fee_percent != null ? `${currentEvent.agency_fee_percent}%` : null, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}
              {FieldCell({ label: 'GST', field: 'gst_percent', value: currentEvent.gst_percent, type: 'number', display: currentEvent.gst_percent != null ? `${currentEvent.gst_percent}%` : null, cellStyle: { padding: '9px 12px', borderLeft: '0.5px solid var(--border)', background: 'var(--bg)' } })}

              {/* Team */}
              {(assignedTo.length > 0 || canAssign) && (
                <div style={{ padding: '9px 12px', borderRadius: '0 8px 8px 0', borderLeft: '0.5px solid var(--border)', position: 'relative', background: 'var(--bg)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontWeight: 500 }}>Team</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {assignedTo.length > 0 && (
                      <div style={{ display: 'flex' }}>
                        {assignedTo.slice(0, 3).map((email, i) => {
                          const u = teamUsers.find(u => u.email === email)
                          const initials = (u?.full_name || email).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                          return (
                            <div key={email} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-surface-2)', border: '1.5px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)', marginLeft: i > 0 ? -5 : 0, position: 'relative', zIndex: 3 - i }}>
                              {initials}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <button onClick={() => setShowTeamPopover(p => !p)} style={{ fontSize: '11px', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, whiteSpace: 'nowrap' }}>
                      {assignedTo.length === 0 ? '—' : `${assignedTo.length}`}
                    </button>
                    {canAssign && (
                      <button onClick={() => setShowAssignModal(true)} style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'none', border: '0.5px dashed var(--border-strong)', borderRadius: 99, padding: '1px 6px', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {assignedTo.length === 0 ? '+' : '+ Manage'}
                      </button>
                    )}
                  </div>
                  {showTeamPopover && assignedTo.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 0', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 220 }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 14px 8px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>Assigned team</div>
                      {assignedTo.map(email => {
                        const u = teamUsers.find(u => u.email === email)
                        return (
                          <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 14px' }}>
                            <div>
                              <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{getName(email)}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>{ROLE_LABELS_MAP[u?.role] || u?.role || ''}</div>
                            </div>
                            {canAssign && (
                              <button onClick={() => { setShowTeamPopover(false); setRevokeConfirm(email) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'var(--font-body)' }}>Remove</button>
                            )}
                          </div>
                        )
                      })}
                      <button onClick={() => setShowTeamPopover(false)} style={{ margin: '6px 14px 2px', fontSize: '11px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}>Close</button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Milestone stepper */}
      <EventMilestone event={event} />

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        borderBottom: '0.5px solid var(--border)',
        marginBottom: isMobile ? '20px' : '32px',
        gap: '2px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {visibleTabs.map(tab => {
          const locked = ['tasks', 'production', 'delivered'].includes(tab.key) && proposalStatus !== 'won'
          return (
            <button
              key={tab.key}
              style={{
                ...tabStyle(activeTab === tab.key),
                ...(locked ? { opacity: 0.38, cursor: 'default' } : {}),
              }}
              onClick={() => !locked && handleTabChange(tab.key)}
              title={locked ? 'Available after this event is Won' : undefined}
            >
              <TabIcon tabKey={tab.key} active={activeTab === tab.key} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {isAdmin && (() => {
        const s =
          status === 'delivered'       ? 'delivered'  :
          status === 'production'      ? 'production' :
          proposalStatus === 'won'     ? (taskCount === null || taskCount === 0 ? 'won' : 'execution') :
          proposalStatus === 'submitted' ? 'submitted' :
          'proposal'

        const cfg = {
          proposal: {
            bc: '#b7e4c7', tc: '#2d6a4f',
            h: 'Proposal stage.',
            sub: 'Fill your elements and costs, then submit when ready. Every element you remember today can be billed to the client.',
            btn: 'Submit Proposal',
            fn: handleSubmitProposal,
          },
          submitted: {
            bc: '#bdd7f5', tc: 'var(--state-info)',
            h: 'Proposal submitted.',
            sub: 'Waiting for client confirmation. Mark as Won when they confirm.',
            btn: 'Mark as Won',
            fn: handleMarkAsWon,
          },
          won: {
            bc: 'var(--state-warning-bg)', tc: 'var(--state-warning)',
            h: 'You won this one.',
            sub: 'Export your approved elements to Execution and assign your team. Real work begins now — let\'s plan it together and delegate.',
            btn: 'Import to Execution →',
            fn: () => { setActiveTab('tasks'); setRefreshKey(k => k + 1) },
          },
          execution: {
            bc: 'var(--state-warning-bg)', tc: 'var(--state-warning)',
            h: 'Execution in progress.',
            sub: 'Track what\'s happening on your project, city by city. Production begins when all tasks are done.',
            btn: 'Send Reminder',
            fn: handleSendReminder,
          },
          production: {
            bc: '#fbbcbd', tc: 'var(--state-danger)',
            h: 'Production is live.',
            sub: 'Your team is on ground. Things are getting done — keep a close eye on timelines.',
            btn: 'Mark Production Complete',
            fn: () => setShowProdModal(true),
          },
          delivered: {
            bc: '#b7e4c7', tc: '#2d6a4f',
            h: 'Delivered.',
            sub: 'Download your complete document set for records and client handover. You were prepared — go deliver a great event.',
            btn: 'Download All Documents',
            fn: () => { setActiveTab('delivered'); setRefreshKey(k => k + 1) },
          },
        }[s]

        if (!cfg) return null

        return (
          <div style={{
            borderLeft: `3px solid ${cfg.bc}`,
            background: 'var(--bg)',
            padding: '8px 16px 8px 14px',
            marginBottom: 16,
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: cfg.tc }}>
              {cfg.h}
            </p>
            <button
              onClick={cfg.fn}
              disabled={savingProposal}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 500,
                fontFamily: 'var(--font-body)',
                background: cfg.tc, color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                opacity: savingProposal ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              {savingProposal ? 'Saving…' : cfg.btn}
            </button>
          </div>
        )
      })()}

      {/* ── Tab content ── */}
      {activeTab === 'elements' && (
        <ElementBuilder key={'elements-'+refreshKey} event={event} userRole={userRole} session={session} teamUsers={teamUsers} />
      )}
      {activeTab === 'export' && (
        <ExportPreview key={'export-'+refreshKey} event={event} userRole={userRole} session={session} />
      )}
      {activeTab === 'tasks' && (
        <TaskBoard key={'tasks-'+refreshKey} event={event} eventId={event.id} delegationScope={delegationScope} eventCities={event.cities || []} userRole={userRole} session={session} />
      )}
      {activeTab === 'production' && (
        <Production key={'production-'+refreshKey} event={event} teamUsers={teamUsers} />
      )}
      {activeTab === 'travel' && (
        <TravelItinerary key={'travel-'+refreshKey} event={event} userRole={userRole} session={session} />
      )}
      {activeTab === 'cuesheet' && (
        <CueSheet key={'cuesheet-'+refreshKey} event={event} />
      )}
      {activeTab === 'delivered' && (
        <DeliveredCenter key={'delivered-'+refreshKey} event={event} session={session} />
      )}

      {/* ── Section navigation — prev / next ── */}
      {(() => {
        const currentIdx = visibleTabs.findIndex(t => t.key === activeTab)
        const prev = currentIdx > 0 ? visibleTabs[currentIdx - 1] : null
        const next = currentIdx < visibleTabs.length - 1 ? visibleTabs[currentIdx + 1] : null
        const btnStyle = {
          padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)',
          background: 'none', border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
          transition: 'background 0.15s',
        }
        return (
          <div style={{
            marginTop: '48px', paddingTop: '20px',
            borderTop: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {prev ? (
              <button onClick={() => handleTabChange(prev.key)} style={btnStyle}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                ← {prev.label}
              </button>
            ) : <div />}
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--state-success)' }}>✓</span> Auto-saved
            </span>
            {next ? (
              <button onClick={() => handleTabChange(next.key)} style={btnStyle}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                {next.label} →
              </button>
            ) : <div />}
          </div>
        )
      })()}

      {/* ── Footer disclaimer ── */}
      <div style={{
        marginTop: '24px',
        paddingTop: '14px',
        borderTop: '0.5px solid var(--border)',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-body)',
        }}>
          Confidential · Prepared for {currentEvent.clients?.group_name || 'your client'} ·&nbsp;
          Myoozz Events · Myoozz Consulting Pvt. Ltd.
        </p>
      </div>

      {/* ── Revoke confirmation dialog ── */}
      {revokeConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'28px 32px', maxWidth:'380px', width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>
              Remove access?
            </h3>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.6, marginBottom:'24px' }}>
              Remove <strong>{getName(revokeConfirm)}</strong> from <strong>{event.event_name}</strong>?
              They will no longer see this event in their workspace.
            </p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setRevokeConfirm(null)}
                style={{ padding:'8px 18px', fontSize:'13px', fontFamily:'var(--font-body)', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
                Cancel
              </button>
              <button onClick={() => handleRevoke(revokeConfirm)}
                style={{ padding:'8px 18px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-body)', background:'var(--state-danger)', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
                Yes, remove access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign modal ── */}
      {showAssignModal && (
        <AssignEvent
          event={{ ...event, assigned_to: assignedTo }}
          onClose={() => setShowAssignModal(false)}
          onUpdated={(updated) => {
            setAssignedTo(updated.assigned_to || [])
            setDelegationScope(updated.delegation_scope || {})
            setShowAssignModal(false)
            if (onUpdated) onUpdated(updated)
          }}
        />
      )}

      {/* ── Itinerary → Tasks import prompt ── */}
      {showItineraryPrompt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'36px', maxWidth:'420px', width:'100%' }}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>🏆</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:500, color:'var(--text)', marginBottom:'8px', textAlign:'center' }}>
              Project won. Congratulations.
            </h2>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:'8px', textAlign:'center' }}>
              You have a MICE itinerary built for this event.
            </p>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:'24px', textAlign:'center' }}>
              Import the day program into your task board now, or do it later from the Travel & Itinerary tab.
            </p>
            <div style={{ display:'flex', gap:'10px' }}>
              <button
                onClick={() => {
                  setShowItineraryPrompt(false)
                  setActiveTab('travel')
                  setRefreshKey(k => k + 1)
                }}
                style={{ flex:2, padding:'11px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-body)', background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
                Go to Travel & Itinerary
              </button>
              <button
                onClick={() => { setShowItineraryPrompt(false); setActiveTab('tasks'); setRefreshKey(k=>k+1) }}
                style={{ flex:1, padding:'11px', fontSize:'13px', fontFamily:'var(--font-body)', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Won celebration modal ── */}
      {showWonModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'40px 36px', maxWidth:'440px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🏆</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>
              Congratulations.
            </h2>
            <p style={{ fontSize:'15px', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:'8px' }}>
              Now the real work begins.
            </p>
            <p style={{ fontSize:'13px', color:'var(--text-tertiary)', lineHeight:1.7, marginBottom:'28px' }}>
              Jump into execution — assign every element to your team, set deadlines, and track to done. Nothing falls through the cracks.
            </p>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setShowWonModal(false); setActiveTab('tasks'); setRefreshKey(k=>k+1) }}
                style={{ flex:2, padding:'12px', fontSize:'14px', fontWeight:500, fontFamily:'var(--font-body)', background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
                Let's go ⚡
              </button>
              <button onClick={() => setShowWonModal(false)}
                style={{ flex:1, padding:'12px', fontSize:'13px', fontFamily:'var(--font-body)', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none' }}>
          <style>{`@keyframes cfFall{0%{transform:translateY(-30px) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}`}</style>
          {CONFETTI_PIECES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: p.left, top: 0,
              width: p.width, height: p.height,
              borderRadius: p.circle ? '50%' : 2,
              background: p.color,
              animation: `cfFall ${p.duration}s ease-out ${p.delay}s forwards`,
            }} />
          ))}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '40px 44px',
            textAlign: 'center', maxWidth: 360, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
              Congratulations.
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              You won this one. Real work begins now.
            </p>
          </div>
        </div>
      )}

      {showProdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 24 }}>
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 36px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>👍</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
              Great work.
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
              Now get into action on ground. Do keep a copy for ready reference.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={async () => {
                  await supabase.from('events').update({ status: 'delivered' }).eq('id', event.id)
                  setStatus('delivered')
                  setShowProdModal(false)
                }}
                style={{ padding: '11px 28px', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowProdModal(false)}
                style={{ padding: '11px 20px', fontSize: 13, fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && (() => {
        const assignedPool = elementAssignees.length > 0
          ? elementAssignees
          : teamUsers.filter(u => assignedTo.includes(u.email) && u.id)
        const senderName = teamUsers.find(u => u.id === session?.user?.id)?.full_name || 'Team'
        const targets = reminderTargets === 'all' ? assignedPool : assignedPool.filter(u => reminderSelected.includes(u.id))
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 24 }}
            onClick={() => setShowReminderModal(false)}
          >
            <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 28px 24px', maxWidth: 400, width: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px' }}>
                Send Reminder
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 18px' }}>
                Notify your team about pending tasks on {event.event_name}.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="radio" name="reminderTargets" value="all" checked={reminderTargets === 'all'} onChange={() => setReminderTargets('all')} />
                  All assigned team ({assignedPool.length})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="radio" name="reminderTargets" value="select" checked={reminderTargets === 'select'} onChange={() => setReminderTargets('select')} />
                  Select members
                </label>
              </div>
              {reminderTargets === 'select' && (
                <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {assignedPool.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={reminderSelected.includes(u.id)}
                        onChange={e => setReminderSelected(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                      />
                      {u.full_name || u.email}
                    </label>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={() => setShowReminderModal(false)}
                  style={{ padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}
                >
                  Cancel
                </button>
                <button
                  disabled={reminderTargets === 'select' && reminderSelected.length === 0}
                  onClick={async () => {
                    const actorId = session?.user?.id
                    if (!targets.length) { setShowReminderModal(false); return }
                    await createNotification(targets.map(u => ({
                      user_id:      u.id,
                      triggered_by: actorId,
                      type:         'task_assigned',
                      title:        `Reminder from ${senderName}`,
                      body:         `Reminder: You have elements assigned on ${event.event_name}.`,
                      entity_type:  'event',
                      entity_id:    event.id,
                      event_id:     event.id,
                      action_url:   '?tab=tasks',
                    })))
                    setShowReminderModal(false)
                  }}
                  style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: (reminderTargets === 'select' && reminderSelected.length === 0) ? 0.5 : 1 }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <FloatingHelp activeTab={activeTab} />
    </div>
  )
}
