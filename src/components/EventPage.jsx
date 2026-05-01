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
    icon: '📋',
    title: 'Build your cost sheet',
    description: 'Add every element by category. Fill client cost and internal cost to see your margin. Use Import to bring in existing Excel sheets.',
    tip: 'Start with categories — each comes with suggested elements so you never start from zero.',
  },
  export: {
    icon: '📤',
    title: 'Preview and export your proposal',
    description: 'See exactly what your client will see. Toggle sections on or off, then download as a formatted Excel.',
    tip: 'Switch between Estimate and Invoice before downloading. Multi-city events get one sheet per city.',
  },
  tasks: {
    icon: '⚡',
    title: 'Project won — now execute',
    description: 'Generate a task for every element. Assign your team, set deadlines, and track to completion. Share a public link with any freelancer — no login needed.',
    tip: 'Set the Category Owner first — they are accountable for everything in that category. Then assign individual elements.',
  },
  production: {
    icon: '🎨',
    title: 'Track creative, fabrication and print',
    description: 'Every branded element needs creative approval before it goes to print. Track each stream independently and catch gaps before they become problems.',
    tip: 'Nothing moves to print without client-approved artwork. The system will flag it if someone tries.',
  },
  travel: {
    icon: '✈️',
    title: 'Travel & Itinerary',
    description: 'Build your full MICE itinerary. Add flights, hotels, transfers and day programs city by city.',
    tip: 'Import your day program into the task board once the project is won — no re-entry needed.',
  },
  delivered: {
    icon: '✅',
    title: 'Event delivered. Well done.',
    description: 'All your documents are ready. Download individually or take everything at once.',
    tip: 'Share the proposal with your client, brief sheets with vendors, and keep the timeline for your records.',
  },
  cuesheet: {
    icon: '🎬',
    title: 'Build your show flow',
    description: 'Build your minute-by-minute show flow with named screens for each technical department. Add Sound, Light, LED Wall, Main Screen — whatever your setup needs.',
    tip: "Set start time + duration on first row — end fills automatically. Each row inherits the previous row's end time.",
  },
}

// ── Tab icons — 14×14 SVG, stroke-based, matches mock design system ──
function TabIcon({ tabKey, active }) {
  const s = {
    width: 14, height: 14,
    opacity: active ? 1 : 0.65,
    flexShrink: 0,
    display: 'block',
  }
  switch (tabKey) {
    case 'elements':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="4" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="4" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
      )
    case 'export':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <path d="M7 8.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M4.5 4.5L7 2l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 10v1.5c0 .3.2.5.5.5h9c.3 0 .5-.2.5-.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )
    case 'tasks':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <path d="M8.5 1.5L3.5 7.5H7l-1.5 5 6-7H8L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      )
    case 'production':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <path d="M2 5.5l5-3 5 3-5 3-5-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M2 8.5l5 3 5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )
    case 'travel':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <path d="M7 1C4.8 1 3 2.8 3 5.5c0 3.5 4 7.5 4 7.5s4-4 4-7.5C11 2.8 9.2 1 7 1z" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
      )
    case 'delivered':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4.5 7l2 2 3-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'cuesheet':
      return (
        <svg style={s} viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="1.5" y1="6" x2="12.5" y2="6" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="4.5" y1="3.5" x2="3.5" y2="6" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="8" y1="3.5" x2="7" y2="6" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
      )
    default:
      return null
  }
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
              <span style={{ fontSize: 15 }}>{help.icon}</span>
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
          background: open ? '#bc1723' : 'var(--bg)',
          border: '0.5px solid ' + (open ? '#bc1723' : 'var(--border-strong)'),
          color: open ? '#fff' : 'var(--text-tertiary)',
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!open) { e.currentTarget.style.borderColor = '#bc1723'; e.currentTarget.style.color = '#bc1723' } }}
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
  color: active ? '#bc1723' : 'var(--text-tertiary)',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #bc1723' : '2px solid transparent',
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
  lost:     { bg: '#FCEBEB',            color: '#A32D2D' },
  'on hold':{ bg: 'var(--bg-secondary)',color: 'var(--text-tertiary)' },
}

const CONFETTI_COLORS = ['#bc1723', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
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
  const [activeTab,    setActiveTab]    = useState(initialTab || getDefaultTab(event?.proposal_status))
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [showWonModal, setShowWonModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(event)
  const [teamUsers,    setTeamUsers]    = useState([])
  const [assignedTo,   setAssignedTo]   = useState(event.assigned_to || [])
  const [revokeConfirm, setRevokeConfirm] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase.from('users').select('id, email, full_name').neq('status','inactive')
      setTeamUsers(data || [])
    }
    fetchTeam()
  }, [])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setRefreshKey(k => k + 1)
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
    const actorId = session?.user?.id
    const assignedUsers = teamUsers.filter(u => assignedTo.includes(u.email) && u.id)
    if (!assignedUsers.length) return
    await createNotification(
      assignedUsers.map(u => ({
        user_id:      u.id,
        triggered_by: actorId,
        type:         'task_status_changed',
        title:        `${event.event_name} — What's the update?`,
        body:         'Share your progress with the team.',
        entity_type:  'event',
        entity_id:    event.id,
        event_id:     event.id,
        action_url:   '?tab=tasks',
      }))
    )
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

      {/* ── Event header ── */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {event.event_subtype && (
                <span style={{
                  fontSize: '11px', color: 'var(--text-tertiary)',
                  padding: '3px 10px', borderRadius: '20px',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                }}>
                  {event.event_subtype}
                </span>
              )}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '32px',
              fontWeight: 500, color: 'var(--text)',
              letterSpacing: '-0.5px', marginBottom: '6px', lineHeight: 1.2,
            }}>
              {event.event_name}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {event.clients?.group_name}
              {event.clients?.brand_name ? ` · ${event.clients.brand_name}` : ''}
            </p>
          </div>

          {/* Status control — Admin only */}
          {isAdmin && (
            <div style={{ minWidth: '200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Pitch status
              </div>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '13px',
                  fontFamily: 'var(--font-body)', fontWeight: 500,
                  background: sc.bg, color: sc.color,
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {savingStatus && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Saving...</div>}

              {status === 'lost' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                    Reason for loss
                  </div>
                  <select
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '13px',
                      fontFamily: 'var(--font-body)', background: 'var(--bg)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', outline: 'none', color: 'var(--text)',
                    }}
                  >
                    <option value="">Select reason</option>
                    {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {lossReason === 'Other' && (
                    <input
                      placeholder="Describe the reason..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      style={{
                        width: '100%', marginTop: '6px', padding: '8px 12px',
                        fontSize: '13px', fontFamily: 'var(--font-body)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  {lossReason && (
                    <button
                      onClick={saveLossReason}
                      style={{
                        marginTop: '8px', padding: '7px 14px', fontSize: '12px',
                        fontFamily: 'var(--font-body)', fontWeight: 500,
                        background: 'var(--text)', color: 'var(--bg)',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}
                    >
                      Save reason
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Non-admin badge */}
          {!isAdmin && (
            <span style={{
              fontSize: '11px', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              padding: '4px 12px', borderRadius: '20px',
              background: sc.bg, color: sc.color,
            }}>
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '20px', gap: '0' }}>

          {event.cities?.length > 0 && (() => {
            const hasDates = event.city_dates && Object.keys(event.city_dates).length > 0
            return (
              <>
                <div style={{ paddingRight: 20 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                    {hasDates ? 'Cities · Dates' : 'Cities'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {event.cities.map(city => {
                      const cd = event.city_dates?.[city]
                      const dateStr = cd?.start
                        ? (cd.end && cd.end !== cd.start
                            ? `${new Date(cd.start).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${new Date(cd.end).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`
                            : new Date(cd.start).toLocaleDateString('en-IN',{day:'numeric',month:'short'}))
                        : null
                      return (
                        <span key={city} style={{
                          fontSize: '12px', color: 'var(--text)',
                          padding: '3px 10px', borderRadius: '20px',
                          background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                          fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                        }}>
                          {city}{dateStr ? ` · ${dateStr}` : ''}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 16px', flexShrink: 0 }} />
              </>
            )
          })()}

          {!event.cities?.length && event.event_date && (
            <>
              <div style={{ paddingRight: 20 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Event date</div>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {new Date(event.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 16px', flexShrink: 0 }} />
            </>
          )}

          {event.proposal_due_date && (
            <>
              <div style={{ paddingRight: 20 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Proposal due</div>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {new Date(event.proposal_due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 16px', flexShrink: 0 }} />
            </>
          )}

          <div style={{ display: 'flex', gap: 20, paddingRight: 20 }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Agency fee</div>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{event.agency_fee_percent}%</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>GST</div>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{event.gst_percent}%</div>
            </div>
          </div>

          {(assignedTo.length > 0 || canAssign) && (
            <>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 16px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Assigned</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {assignedTo.map(email => (
                    <span key={email} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '12px', color: 'var(--text)',
                      padding: '3px 8px 3px 10px', borderRadius: '20px',
                      background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {getName(email)}
                      {canAssign && (
                        <button
                          onClick={() => setRevokeConfirm(email)}
                          title={`Remove ${getName(email)} from this event`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, lineHeight: 1, fontSize: '11px', display: 'flex', alignItems: 'center' }}
                          onMouseOver={e => e.currentTarget.style.color = '#A32D2D'}
                          onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >✕</button>
                      )}
                    </span>
                  ))}
                  {canAssign && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: '0.5px dashed var(--border-strong)', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)' }}
                      onMouseOut={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                    >
                      {assignedTo.length === 0 ? '+ Assign team' : '+ Manage'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

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
            bc: '#bdd7f5', tc: '#1d4ed8',
            h: 'Proposal submitted.',
            sub: 'Waiting for client confirmation. Mark as Won when they confirm.',
            btn: 'Mark as Won',
            fn: handleMarkAsWon,
          },
          won: {
            bc: '#fde68a', tc: '#92400e',
            h: 'You won this one.',
            sub: 'Export your approved elements to Execution and assign your team. Real work begins now — let\'s plan it together and delegate.',
            btn: 'Import to Execution →',
            fn: () => { setActiveTab('tasks'); setRefreshKey(k => k + 1) },
          },
          execution: {
            bc: '#fde68a', tc: '#92400e',
            h: 'Execution in progress.',
            sub: 'Track what\'s happening on your project, city by city. Production begins when all tasks are done.',
            btn: 'Send Reminder',
            fn: handleSendReminder,
          },
          production: {
            bc: '#fbbcbd', tc: '#991b1b',
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
            padding: '14px 20px 14px 18px',
            marginBottom: 24,
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: cfg.tc }}>
                {cfg.h}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 500 }}>
                {cfg.sub}
              </p>
            </div>
            <button
              onClick={cfg.fn}
              disabled={savingProposal}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--font-body)',
                background: cfg.tc, color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                opacity: savingProposal ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap',
                marginTop: 2,
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
              <span style={{ color: '#16A34A' }}>✓</span> Auto-saved
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
                style={{ padding:'8px 18px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-body)', background:'#A32D2D', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
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

      <FloatingHelp activeTab={activeTab} />
    </div>
  )
}
