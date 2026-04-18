import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import NewEventForm from './NewEventForm'
import ScreenGuide from './ScreenGuide'
import ModeSelector from './ModeSelector'
import EventPage from './EventPage'
import AssignEvent from './AssignEvent'

import { logEventCreated, logEventArchived, logEventRestored, logEventAssigned } from '../utils/activityLogger'
import { notifyApprovalRequired, notifyEventCreated } from '../utils/notificationService'
import DashboardWidgets from './DashboardWidgets'
const statusColor = {
  pitch: { bg: 'var(--blue-light)', color: 'var(--blue)' },
  submitted: { bg: 'var(--amber-light)', color: 'var(--amber)' },
  won: { bg: 'var(--green-light)', color: 'var(--green)' },
  lost: { bg: '#FCEBEB', color: '#A32D2D' },
  'on hold': { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)' },
}

const STATUS_LABELS = {
  pitch: 'Pitch', submitted: 'Submitted',
  won: 'Won', lost: 'Lost', 'on hold': 'On Hold',
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '28px 32px',
        maxWidth: '380px', width: '100%',
      }}>
        <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '20px', lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
            background: 'none', border: '0.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
            fontWeight: 500, background: '#A32D2D', color: 'white',
            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}>
            Archive
          </button>
        </div>
      </div>
      <ScreenGuide screen='dashboard' />
    </div>
  )
}

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

function EventCard({ ev, onOpen, onEdit, onArchive, onAssign, onDuplicate, userRole, getNames }) {
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const sc = statusColor[ev.status] || statusColor.pitch

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={{
      border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
      padding: '20px 24px', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', transition: 'border-color 0.15s',
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ flex: 1, cursor: 'pointer', width: '100%' }} onClick={() => onOpen(ev)}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
          {ev.event_name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
          {ev.clients?.group_name}
          {ev.clients?.brand_name ? ` · ${ev.clients.brand_name}` : ''}
          {(() => {
            if (ev.city_dates && Object.keys(ev.city_dates).length > 0) {
              const dates = Object.values(ev.city_dates).filter(d => d?.start)
              if (dates.length > 0) {
                const earliest = new Date(Math.min(...dates.map(d => new Date(d.start))))
                return ` · from ${earliest.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              }
            }
            return ev.event_date ? ` · ${new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''
          })()}
        </div>
        {ev.cities?.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
            {ev.cities.join(' · ')}
          </div>
        )}
        {(userRole === 'admin' || userRole === 'manager') && (
          <div style={{ fontSize: '11px', color: ev.assigned_to?.length > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
            {ev.assigned_to?.length > 0
              ? `Assigned to: ${getNames(ev.assigned_to)}`
              : 'Not yet assigned'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '0.5px', padding: '4px 12px', borderRadius: '20px',
          background: sc.bg, color: sc.color, flexShrink: 0,
        }}>
          {STATUS_LABELS[ev.status] || ev.status}
        </span>

        {(userRole === 'admin' || userRole === 'manager') && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: 'var(--text-tertiary)', padding: '0 4px', lineHeight: 1,
              }}
            >
              ···
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                background: 'var(--bg)', border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)', zIndex: 10, minWidth: '160px', overflow: 'hidden',
              }}>
                {[
                  { label: 'Open event',   action: () => { onOpen(ev); setMenuOpen(false) },   color: 'var(--text)' },
                  { label: 'Edit details', action: () => { onEdit(ev); setMenuOpen(false) },   color: 'var(--text)' },
                  ...(userRole === 'admin' ? [{ label: 'Assign team', action: () => { onAssign(ev); setMenuOpen(false) }, color: 'var(--text)' }] : []),
                  ...(userRole === 'manager' ? [{ label: 'Assign team', action: () => { onAssign(ev); setMenuOpen(false) }, color: 'var(--text)' }] : []),
                  null,
                  { label: 'Archive event', action: () => { onArchive(ev); setMenuOpen(false) }, color: '#A32D2D', hoverBg: '#FCEBEB' },
                ].map((item, i) => item === null ? (
                  <div key={i} style={{ height: '0.5px', background: 'var(--border)' }} />
                ) : (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px',
                      fontSize: '13px', textAlign: 'left', background: 'none',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', color: item.color,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = item.hoverBg || 'var(--bg-secondary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <ScreenGuide screen='dashboard' />
    </div>
  )
}

// Bug 10: Added userName and resetKey props
export default function Dashboard({ userRole, session, userName, resetKey }) {
  const [events, setEvents] = useState([])
  const [archivedEvents, setArchivedEvents] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [modeSelectorEvent, setModeSelectorEvent] = useState(null)
  const [initialTab, setInitialTab] = useState('elements')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [openEvent, setOpenEvent] = useState(null)
  const [assignEvent, setAssignEvent] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [view, setView] = useState('active')
  const [teamUsers, setTeamUsers] = useState([])

  useEffect(() => { if (userRole) { fetchEvents(); fetchTeam() } }, [userRole])

  // Bug 10: When AppShell increments resetKey, go back to events list
  useEffect(() => {
    if (resetKey > 0) {
      setOpenEvent(null)
      setInitialTab('elements')
    }
  }, [resetKey])

  async function fetchTeam() {
    const { data } = await supabase.from('users').select('email, full_name')
      .neq('status', 'inactive')
    setTeamUsers(data || [])
  }

  function getNames(emails) {
    if (!emails || emails.length === 0) return null
    return emails.map(email => {
      const user = teamUsers.find(u => u.email === email)
      return user?.full_name || email.split('@')[0]
    }).join(', ')
  }

  async function fetchEvents() {
    setLoading(true)
    let activeQuery = supabase
      .from('events')
      .select('*, clients(group_name, brand_name, contact_person, contact_info)')
      .eq('archived', false)
      .order('created_at', { ascending: false })

    if (userRole === 'team' || userRole === 'event_lead') {
      activeQuery = activeQuery.or(`assigned_to.cs.{"${session.user.email}"},created_by.eq.${session.user.email}`)
    }

    const { data: active } = await activeQuery

    // Archived — role-filtered
    let archivedQuery = supabase
      .from('events')
      .select('*, clients(group_name, brand_name)')
      .eq('archived', true)
      .order('created_at', { ascending: false })

    if (userRole === 'team' || userRole === 'event_lead') {
      archivedQuery = archivedQuery.or(`assigned_to.cs.{"${session.user.email}"},created_by.eq.${session.user.email}`)
    } else if (userRole === 'manager') {
      archivedQuery = archivedQuery.eq('created_by', session.user.email)
    }

    const { data: archived } = await archivedQuery

    const approved = (active || []).filter(e => e.review_status !== 'pending_review')
    const pending  = (active || []).filter(e => e.review_status === 'pending_review')

    setEvents(approved)
    setPendingEvents(pending)
    setArchivedEvents(archived || [])
    setLoading(false)
  }

  async function handleCreated(newEvent) {
    setEvents(prev => [newEvent, ...prev])
    setModeSelectorEvent(newEvent)
    logEventCreated(newEvent, session)

    // Phase C — notify relevant users based on who created the event
    try {
      const { data: { user: actor } } = await supabase.auth.getUser()
      const actorId = actor?.id

      // Fetch all admin + manager IDs (excluding the actor)
      const { data: staffUsers } = await supabase
        .from('users')
        .select('id, role')
        .in('role', ['admin', 'manager'])

      const adminIds   = (staffUsers || []).filter(u => u.role === 'admin'   && u.id !== actorId).map(u => u.id)
      const managerIds = (staffUsers || []).filter(u => u.role === 'manager' && u.id !== actorId).map(u => u.id)

      if (userRole === 'manager') {
        // Manager created → admins need to approve it
        await notifyApprovalRequired({
          adminIds,
          actorId,
          eventName: newEvent.event_name,
          eventId:   newEvent.id,
        })
      } else if (userRole === 'admin') {
        // Admin created → notify managers so they know a new job is in the system
        await notifyEventCreated({
          adminIds:  managerIds,   // reusing adminIds param to notify managers
          actorId,
          eventName: newEvent.event_name,
          eventId:   newEvent.id,
        })
      }
    } catch (err) {
      // Notification failure should never break event creation
      console.error('[Dashboard] handleCreated notification error:', err)
    }
  }

  async function handleDuplicate(ev) {
    const newName = prompt(`Duplicate "${ev.event_name}"?\n\nEnter new event name:`, ev.event_name + ' — Copy')
    if (!newName) return

    const { data: newEv, error } = await supabase.from('events').insert({
      event_name: newName,
      client_id: ev.client_id,
      event_type: ev.event_type,
      event_subtype: ev.event_subtype,
      cities: ev.cities,
      city_dates: {},
      agency_fee_percent: ev.agency_fee_percent,
      gst_percent: ev.gst_percent,
      status: 'pitch',
      assigned_to: ev.assigned_to,
      created_by: session.user.email,
      created_by_role: userRole,
      review_status: userRole === 'admin' ? 'approved' : 'pending_review',
      field_visibility: ev.field_visibility,
      tnc_selected: ev.tnc_selected,
      tnc_custom: ev.tnc_custom,
    }).select('*, clients(group_name, brand_name, contact_person, contact_info)').single()

    if (error || !newEv) { alert('Could not duplicate event. Try again.'); return }

    const { data: elements } = await supabase.from('elements').select('*').eq('event_id', ev.id)
    if (elements && elements.length > 0) {
      await supabase.from('elements').insert(
        elements.map(el => ({
          event_id: newEv.id,
          city: el.city, category: el.category,
          element_name: el.element_name, size: el.size, size_unit: el.size_unit,
          finish: el.finish, qty: el.qty, days: el.days,
          rate: el.rate, lump_sum: el.lump_sum, amount: el.amount,
          internal_rate: el.internal_rate, internal_lump: el.internal_lump,
          internal_amount: el.internal_amount, source: el.source,
          cost_status: 'Estimated', bundled: el.bundled, sort_order: el.sort_order,
        }))
      )
    }

    setEvents(prev => [newEv, ...prev])
    alert(`"${newName}" created with all elements copied. Dates have been reset — update them before sharing.`)
  }

  function handleUpdated(updatedEvent) {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
    if (openEvent?.id === updatedEvent.id) setOpenEvent(updatedEvent)
  }

  async function confirmAndArchive() {
    const ev = confirmArchive
    setConfirmArchive(null)
    await supabase.from('events').update({ archived: true }).eq('id', ev.id)
    setEvents(prev => prev.filter(e => e.id !== ev.id))
    setArchivedEvents(prev => [ev, ...prev])
    await logEventArchived(ev)
  }

  async function handleRestore(ev) {
    await supabase.from('events').update({ archived: false }).eq('id', ev.id)
    setArchivedEvents(prev => prev.filter(e => e.id !== ev.id))
    setEvents(prev => [{ ...ev, archived: false }, ...prev])
    await logEventRestored(ev)
  }

  if (openEvent) {
    return (
      <EventPage
        event={openEvent}
        userRole={userRole}
        session={session}
        onBack={() => { setOpenEvent(null); setInitialTab('elements') }}
        onUpdated={handleUpdated}
        initialTab={initialTab}
      />
    )
  }

  function getGreeting() {
    const hour = new Date().getHours()
    const name = userName?.split(' ')[0] || 'there'
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    const dueSoon = events.filter(e => {
      if (!e.proposal_due_date) return false
      const days = Math.ceil((new Date(e.proposal_due_date) - new Date()) / (1000 * 60 * 60 * 24))
      return days >= 0 && days <= 3
    })
    const active  = events.filter(e => e.status === 'won' || e.status === 'active')
    const pitches = events.filter(e => e.status === 'pitch')

    if (dueSoon.length > 0) return {
      greeting: `${timeGreeting}, ${name}`,
      message: `⏰ ${dueSoon[0].event_name} proposal is due ${dueSoon[0].proposal_due_date === new Date().toISOString().split('T')[0] ? 'today' : 'in ' + Math.ceil((new Date(dueSoon[0].proposal_due_date) - new Date()) / (1000*60*60*24)) + ' days'}. Let's get it done.`,
      urgent: true,
    }
    if (active.length > 0) return {
      greeting: `${timeGreeting}, ${name}`,
      message: `${active.length} event${active.length > 1 ? 's' : ''} in execution — your stage is set.`,
      urgent: false,
    }
    if (pitches.length > 0) return {
      greeting: `${timeGreeting}, ${name}`,
      message: `${pitches.length} pitch${pitches.length > 1 ? 'es' : ''} in pipeline — ready when you are.`,
      urgent: false,
    }
    return {
      greeting: `${timeGreeting}, ${name}`,
      message: events.length === 0
        ? 'Your workspace is ready. Create your first event to get started.'
        : 'Everything looks good. What are we building today?',
      urgent: false,
    }
  }

  const filteredEvents = (view === 'active' ? events : archivedEvents).filter(ev => {
    const matchSearch = !search ||
      ev.event_name?.toLowerCase().includes(search.toLowerCase()) ||
      ev.clients?.group_name?.toLowerCase().includes(search.toLowerCase()) ||
      ev.clients?.brand_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || ev.status === filterStatus
    const matchType   = !filterType   || ev.event_type === filterType
    const matchClient = !filterClient || ev.clients?.group_name === filterClient
    return matchSearch && matchStatus && matchType && matchClient
  })

  const displayEvents = filteredEvents
  const allClients = [...new Set(events.map(e => e.clients?.group_name).filter(Boolean))].sort()
  const allTypes   = [...new Set(events.map(e => e.event_type).filter(Boolean))].sort()

  const { greeting, message, urgent } = getGreeting()

  return (
    <div>
      {confirmArchive && (
        <ConfirmDialog
          message={`Archive "${confirmArchive.event_name}"? It will move to your archive and can be restored anytime.`}
          onConfirm={confirmAndArchive}
          onCancel={() => setConfirmArchive(null)}
        />
      )}

      {assignEvent && (
        <AssignEvent
          event={assignEvent}
          onClose={() => setAssignEvent(null)}
          onUpdated={handleUpdated}
        />
      )}

      {(showNewEvent || editEvent) && (
        <NewEventForm
          onClose={() => { setShowNewEvent(false); setEditEvent(null) }}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          session={session}
          event={editEvent}
		userRole={userRole}
        />
      )}

      <DashboardWidgets
        userId={session?.user?.id}
        userRole={userRole}
        userName={userName}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {events.length} active · {archivedEvents.length} archived
        </p>
        {(userRole === 'admin' || userRole === 'manager') && view === 'active' && (
          <button
            onClick={() => setShowNewEvent(true)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'var(--text)',
              color: 'var(--bg)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            + New event
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search events or clients..."
          style={{
            flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All statuses</option>
          {['pitch','won','active','on hold','lost'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        {allClients.length > 0 && (
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All clients</option>
            {allClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(search || filterStatus || filterClient) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterClient('') }}
            style={{ padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Active / Archived toggle */}
      <div style={{
        display: 'flex', gap: '0', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content', marginBottom: '24px',
      }}>
        {[{ key: 'active', label: 'Active' }, { key: 'archived', label: 'Archived' }].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              padding: '7px 18px', fontSize: '13px',
              fontWeight: view === v.key ? 500 : 400,
              fontFamily: 'var(--font-body)',
              background: view === v.key ? 'var(--text)' : 'var(--bg)',
              color: view === v.key ? 'var(--bg)' : 'var(--text-tertiary)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Pending review — admin only */}
      {userRole === 'admin' && pendingEvents.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
              Pending review
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E' }}>
              {pendingEvents.length} {pendingEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          {pendingEvents.map(ev => (
            <div key={ev.id} style={{
              border: '0.5px solid #F59E0B', borderRadius: 'var(--radius-sm)',
              padding: '14px 16px', marginBottom: '8px', background: '#FFFBEB',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
            }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setOpenEvent(ev)}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>
                  {ev.event_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  {ev.clients?.group_name}{ev.clients?.brand_name ? ` · ${ev.clients.brand_name}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#92400E' }}>
                  Created by {ev.created_by || 'team member'} · awaiting your review
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={async () => {
                    await supabase.from('events').update({ review_status: 'approved' }).eq('id', ev.id)
                    fetchEvents()
                  }}
                  style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('events').update({ archived: true }).eq('id', ev.id)
                    fetchEvents()
                  }}
                  style={{ padding: '6px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid #F59E0B', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: '#92400E' }}
                >
                  Archive
                </button>
                <button
                  onClick={() => { setEditEvent(ev); setShowNewEvent(true) }}
                  style={{ padding: '6px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
          <div style={{ borderBottom: '0.5px solid var(--border)', marginBottom: '20px' }} />
        </div>
      )}

      {/* Team pending notice */}
      {userRole !== 'admin' && events.some(e => e.review_status === 'pending_review') && (
        <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '0.5px solid #F59E0B', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', color: '#92400E' }}>
          {events.filter(e => e.review_status === 'pending_review').length} event(s) pending admin review — you can still work on them.
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading...</p>
      ) : displayEvents.length === 0 ? (
        <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '8px' }}>
            {view === 'active' ? 'No active events.' : 'No archived events.'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {view === 'active'
              ? (userRole === 'admin' || userRole === 'manager')
                ? 'Create your first event to get started.'
                : 'No events have been assigned to you yet.'
              : 'Archived events will appear here. You can restore them anytime.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayEvents.map(ev => (
            view === 'active' ? (
              <EventCard
                key={ev.id} ev={ev} userRole={userRole}
                onOpen={setOpenEvent} onEdit={setEditEvent}
                onArchive={setConfirmArchive} onAssign={setAssignEvent}
                getNames={getNames}
              />
            ) : (
              <div key={ev.id} style={{
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '16px 24px', background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: 0.7,
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>{ev.event_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    {ev.clients?.group_name}{ev.clients?.brand_name ? ` · ${ev.clients.brand_name}` : ''}
                  </div>
                </div>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <button
                    onClick={() => handleRestore(ev)}
                    style={{
                      padding: '7px 16px', fontSize: '12px', fontWeight: 500,
                      fontFamily: 'var(--font-body)', background: 'none',
                      border: '0.5px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
                    }}
                  >
                    Restore
                  </button>
                )}
              </div>
            )
          ))}
        </div>
      )}
      <ScreenGuide screen='dashboard' />

      {modeSelectorEvent && (
        <ModeSelector
          event={modeSelectorEvent}
          onSelect={(tab) => {
            setInitialTab(tab)
            setOpenEvent(modeSelectorEvent)
            setModeSelectorEvent(null)
          }}
          onDismiss={() => {
            setInitialTab('elements')
            setOpenEvent(modeSelectorEvent)
            setModeSelectorEvent(null)
          }}
        />
      )}
    </div>
  )
}
