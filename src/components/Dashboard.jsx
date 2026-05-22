import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import NewEventForm from './NewEventForm'
import ScreenGuide from './ScreenGuide'
import ModeSelector from './ModeSelector'
import EventPage from './EventPage'
import AssignEvent from './AssignEvent'

import { logEventCreated, logEventArchived, logEventRestored, logEventAssigned, logActivity } from '../utils/activityLogger'
import { notifyApprovalRequired, notifyEventCreated } from '../utils/notificationService'
import DashboardWidgets from './DashboardWidgets'
import EventCard from './EventCard'
import ProjectHeadPanel from './panels/ProjectHeadPanel'
import ManagerPanel from './panels/ManagerPanel'
import TeamPanel from './panels/TeamPanel'
import StaffPanel from './panels/StaffPanel'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  hovered: { y: -2, boxShadow: '0 8px 24px rgba(26,16,8,0.10)', transition: { type: 'spring', stiffness: 300, damping: 24 } },
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

// Bug 10: Added userName and resetKey props
export default function Dashboard({ userRole, session, userName, userId, resetKey }) {
  // Role router — non-admin roles get specialised panels (Track B).
  // Admin (and any unmapped role) falls through to the existing Dashboard view.
  if (userRole === 'manager')    return <ProjectHeadPanel userId={userId} />
  if (userRole === 'event_lead') return <ManagerPanel    userId={userId} />
  if (userRole === 'team')       return <TeamPanel       userId={userId} />
  if (userRole === 'staff')      return <StaffPanel      userId={userId} />

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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('active')
  const [teamUsers, setTeamUsers] = useState([])
  const [filterCity, setFilterCity] = useState('')
  const [filterSort, setFilterSort] = useState('smart')
  const [showTestEvents, setShowTestEvents] = useState(false)

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
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (userRole !== 'admin') {
      activeQuery = activeQuery.or(`assigned_to.cs.{"${session.user.email}"},created_by.eq.${session.user.email}`)
    }

    const { data: active } = await activeQuery

    // Archived — role-filtered
    let archivedQuery = supabase
      .from('events')
      .select('*, clients(group_name, brand_name)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })

    if (userRole !== 'admin') {
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
    const archivedAt = new Date().toISOString()
    await supabase.from('events').update({
      archived: true,
      archived_at: archivedAt,
      archived_by: session.user.email,
    }).eq('id', ev.id)
    setEvents(prev => prev.filter(e => e.id !== ev.id))
    setArchivedEvents(prev => [{ ...ev, archived: true, archived_at: archivedAt, archived_by: session.user.email }, ...prev])
    await logEventArchived(ev)
  }

  async function handleRestore(ev) {
    await supabase.from('events').update({
      archived: false,
      archived_at: null,
      archived_by: null,
    }).eq('id', ev.id)
    setArchivedEvents(prev => prev.filter(e => e.id !== ev.id))
    setEvents(prev => [{ ...ev, archived: false, archived_at: null, archived_by: null }, ...prev])
    await logEventRestored(ev)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleDeleteEvent = (ev) => {
    setConfirmDelete(ev)
    setDeleteTyped('')
  }

  const executeDelete = async () => {
    const ev = confirmDelete
    setConfirmDelete(null)
    setDeleteTyped('')
    try {
      await logActivity({
        action: 'event_deleted',
        entity_type: 'event',
        entity_name: ev.event_name,
        event_id: ev.id,
        details: { full_event_snapshot: ev, deleted_by_role: userRole },
      })
      await supabase.from('elements').delete().eq('event_id', ev.id)
      await supabase.from('tasks').delete().eq('event_id', ev.id)
      await supabase.from('notifications').delete().eq('event_id', ev.id)
      await supabase.from('activity_log').delete().eq('event_id', ev.id)
      await supabase.from('rooming_list').delete().eq('event_id', ev.id)
      await supabase.from('travel_plan').delete().eq('event_id', ev.id)
      await supabase.from('itinerary').delete().eq('event_id', ev.id)
      await supabase.from('element_assignments').delete().eq('event_id', ev.id)
      await supabase.from('events').delete().eq('id', ev.id)
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      showToast(`"${ev.event_name}" permanently deleted.`)
    } catch (err) {
      console.error('Delete failed:', err)
      showToast('Delete failed — check console.')
    }
  }

  const handleMarkTest = async (ev) => {
    const newVal = !ev.is_test
    await supabase.from('events').update({ is_test: newVal }).eq('id', ev.id)
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_test: newVal } : e))
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

  const STATUS_ORDER = { active: 0, pitch: 1, won: 2, completed: 3, archived: 4 }

  const allClients = useMemo(() =>
    [...new Set(events.map(e => e.clients?.group_name).filter(Boolean))].sort(),
    [events])

  const allCities = useMemo(() =>
    [...new Set(events.flatMap(e => e.cities || []).filter(Boolean))].sort(),
    [events])

  const allTypes = useMemo(() =>
    [...new Set(events.map(e => e.event_type).filter(Boolean))].sort(),
    [events])

  const displayEvents = useMemo(() => {
    const pool = view === 'active' ? events : archivedEvents
    const filtered = pool.filter(ev => {
      if (!showTestEvents && ev.is_test) return false
      const q = search.toLowerCase()
      const matchSearch = !search ||
        ev.event_name?.toLowerCase().includes(q) ||
        ev.clients?.group_name?.toLowerCase().includes(q) ||
        ev.clients?.brand_name?.toLowerCase().includes(q)
      const matchStatus = !filterStatus || ev.status === filterStatus
      const matchType   = !filterType   || ev.event_type === filterType
      const matchClient = !filterClient || ev.clients?.group_name === filterClient
      const matchCity   = !filterCity   || (ev.cities || []).includes(filterCity)
      return matchSearch && matchStatus && matchType && matchClient && matchCity
    })

    if (filterSort === 'smart') {
      return [...filtered].sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99
        const sb = STATUS_ORDER[b.status] ?? 99
        if (sa !== sb) return sa - sb
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      })
    }
    if (filterSort === 'recent_opened') {
      return [...filtered].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    }
    if (filterSort === 'recent_created') {
      return [...filtered].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    }
    if (filterSort === 'date_asc') {
      return [...filtered].sort((a, b) => new Date(a.start_date || a.event_date || 0) - new Date(b.start_date || b.event_date || 0))
    }
    if (filterSort === 'date_desc') {
      return [...filtered].sort((a, b) => new Date(b.start_date || b.event_date || 0) - new Date(a.start_date || a.event_date || 0))
    }
    if (filterSort === 'az') {
      return [...filtered].sort((a, b) => (a.event_name || '').localeCompare(b.event_name || ''))
    }
    return filtered
  }, [events, archivedEvents, view, search, filterStatus, filterType, filterClient, filterCity, filterSort, showTestEvents])

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

  const { greeting, message, urgent } = getGreeting()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {confirmArchive && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: '24px',
        }}>
          <div style={{
            background: '#faf8f5', border: '1px solid #d8d2c8',
            borderRadius: '12px', padding: '28px 32px',
            maxWidth: '400px', width: '100%',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1008', marginBottom: '6px', fontFamily: 'var(--font-body)' }}>
              Archive "{confirmArchive.event_name}"?
            </p>
            <p style={{ fontSize: '13px', color: '#7a7060', marginBottom: '24px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
              This event will be moved to Archived. You can restore it at any time.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmArchive(null)} style={{
                padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
                background: 'none', border: '1px solid #c8c2b8',
                borderRadius: '8px', cursor: 'pointer', color: '#1a1008',
              }}>
                Cancel
              </button>
              <button
                onClick={confirmAndArchive}
                style={{
                  padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
                  fontWeight: 500, background: '#A32D2D', color: '#fff',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Archive Event
              </button>
            </div>
          </div>
        </div>
      )}

      {assignEvent && (
        <AssignEvent
          event={assignEvent}
          onClose={() => setAssignEvent(null)}
          onUpdated={handleUpdated}
        />
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: '24px',
        }}>
          <div style={{
            background: '#faf8f5', border: '1px solid #d8d2c8',
            borderRadius: '12px', padding: '28px 32px',
            maxWidth: '400px', width: '100%',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1008', marginBottom: '6px', fontFamily: 'var(--font-body)' }}>
              Delete "{confirmDelete.event_name}"?
            </p>
            <p style={{ fontSize: '13px', color: '#7a7060', marginBottom: '18px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
              This will permanently delete the event and cannot be undone.
            </p>
            <input
              value={deleteTyped}
              onChange={e => setDeleteTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && deleteTyped.trim().toLowerCase() === 'delete it') executeDelete() }}
              placeholder='Type "delete it" to confirm'
              style={{
                width: '100%', padding: '9px 12px', fontSize: '13px',
                border: '1px solid #c8c2b8', borderRadius: '8px',
                background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box', marginBottom: '16px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmDelete(null); setDeleteTyped('') }} style={{
                padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
                background: 'none', border: '1px solid #c8c2b8',
                borderRadius: '8px', cursor: 'pointer', color: '#1a1008',
              }}>
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleteTyped.trim().toLowerCase() !== 'delete it'}
                style={{
                  padding: '8px 18px', fontSize: '13px', fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  background: deleteTyped.trim().toLowerCase() === 'delete it' ? '#bc1723' : '#e0d8d0',
                  color: deleteTyped.trim().toLowerCase() === 'delete it' ? '#fff' : '#a09080',
                  border: 'none', borderRadius: '8px',
                  cursor: deleteTyped.trim().toLowerCase() === 'delete it' ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1008', color: '#faf8f5', padding: '10px 20px',
          borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-body)',
          zIndex: 400, pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
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
        userEmail={session?.user?.email}
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          fontSize: '13px', color: '#7a7060',
          fontFamily: 'var(--font-body)', marginBottom: '16px',
          ...(urgent ? { color: '#92400E', fontWeight: 500 } : {}),
        }}
      >
        {message}
      </motion.p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {events.length} active · {archivedEvents.length} archived
        </p>
        {(userRole === 'admin' || userRole === 'manager') && view === 'active' && (
          <motion.button
            onClick={() => setShowNewEvent(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'var(--text)',
              color: 'var(--bg)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            + New event
          </motion.button>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search events or clients..."
          style={{
            flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px',
            border: '1px solid #c8c2b8', borderRadius: '8px',
            background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #c8c2b8', borderRadius: '8px', background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All statuses</option>
          {['pitch','won','active','on hold','lost','completed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        {allClients.length > 0 && (
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #c8c2b8', borderRadius: '8px', background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All clients</option>
            {allClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {allCities.length > 0 && (
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #c8c2b8', borderRadius: '8px', background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All cities</option>
            {allCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #c8c2b8', borderRadius: '8px', background: '#fff', color: '#1a1008', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="smart">Default smart</option>
          <option value="recent_opened">Recently opened</option>
          <option value="recent_created">Recently created</option>
          <option value="date_asc">Date ↑</option>
          <option value="date_desc">Date ↓</option>
          <option value="az">A – Z</option>
        </select>
        {(search || filterStatus || filterClient || filterCity) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterClient(''); setFilterCity('') }}
            style={{ padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '1px solid #c8c2b8', borderRadius: '8px', cursor: 'pointer', color: '#7a7060' }}>
            Clear
          </button>
        )}
      </div>
      {userRole === 'admin' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setShowTestEvents(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '5px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
              background: showTestEvents ? '#1a1008' : 'none',
              color: showTestEvents ? '#faf8f5' : '#7a7060',
              border: '1px solid #c8c2b8', borderRadius: '20px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '10px', opacity: 0.7 }}>TEST</span>
            {showTestEvents ? 'Showing test events' : 'Show test events'}
          </button>
        </div>
      )}

      {/* Active / Archived tabs */}
      <div style={{
        display: 'flex', gap: '0',
        borderBottom: '1px solid var(--border)',
        width: 'fit-content', marginBottom: '24px',
      }}>
        {[
          { key: 'active', label: `Active${events.length > 0 ? ` (${events.length})` : ''}` },
          { key: 'archived', label: `Archived${archivedEvents.length > 0 ? ` (${archivedEvents.length})` : ''}` },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              padding: '8px 18px 10px', fontSize: '13px',
              fontWeight: view === v.key ? 500 : 400,
              fontFamily: 'var(--font-body)',
              background: 'none',
              color: view === v.key ? '#F28F3B' : 'var(--text-tertiary)',
              border: 'none', cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            {v.label}
            {view === v.key && (
              <motion.div
                layoutId="tab-indicator"
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '2px', background: '#F28F3B',
                  borderRadius: '2px 2px 0 0',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              />
            )}
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
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {displayEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '60px 40px', textAlign: 'center' }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '8px' }}>
                  {view === 'active' ? 'No events yet.' : 'No archived events.'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  {view === 'active'
                    ? (userRole === 'admin' || userRole === 'manager')
                      ? 'Create your first event to get started.'
                      : 'No events have been assigned to you yet.'
                    : 'Archived events will appear here. You can restore them anytime.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {view === 'active'
                  ? displayEvents.map(ev => {
                      const assignedUsers = (ev.assigned_to || [])
                        .map(email => teamUsers.find(u => u.email === email))
                        .filter(Boolean)
                      return (
                        <EventCard
                          key={`active-${ev.id}`}
                          event={ev}
                          userRole={userRole}
                          currentUserEmail={session?.user?.email}
                          assignedUsers={assignedUsers}
                          hasOverdueTasks={false}
                          isPendingApproval={ev.review_status === 'pending_review'}
                          onOpen={setOpenEvent}
                          onArchive={setConfirmArchive}
                          onUnarchive={handleRestore}
                          onDelete={handleDeleteEvent}
                          onMarkTest={handleMarkTest}
                        />
                      )
                    })
                  : displayEvents.map(ev => (
                      <motion.div key={`archived-${ev.id}`} variants={itemVariants} style={{
                        border: '1px solid #d8d2c8', borderRadius: '12px',
                        padding: '16px 20px', background: '#faf8f5',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        opacity: 0.75,
                      }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1008', marginBottom: '3px' }}>{ev.event_name}</div>
                          <div style={{ fontSize: '12px', color: '#7a7060' }}>
                            {ev.clients?.group_name}{ev.clients?.brand_name ? ` · ${ev.clients.brand_name}` : ''}
                            {ev.archived_at ? ` · archived ${new Date(ev.archived_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                          </div>
                        </div>
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <button
                            onClick={() => handleRestore(ev)}
                            style={{
                              padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                              fontFamily: 'var(--font-body)', background: 'none',
                              border: '1px solid #c8c2b8', flexShrink: 0,
                              borderRadius: '8px', cursor: 'pointer', color: '#1a1008',
                            }}
                          >
                            Restore
                          </button>
                        )}
                      </motion.div>
                    ))
                }
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
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
    </motion.div>
  )
}
