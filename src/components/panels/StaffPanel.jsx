import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'

// ── Inline helpers (kept inside this file per spec — 4 panel files only) ─────
const F  = "'DM Sans', sans-serif"
const FD = "'Cormorant Garamond', serif"
const C  = { surface: 'var(--app-surface)', border: 'var(--app-border)', accent: 'var(--app-accent)', dim: 'var(--app-text-dim-lg)', bg: 'var(--app-bg)' }

const STATUS_STYLE = {
  not_started: { bg: '#e5e3de', color: 'var(--app-text-dim-lg)', label: 'Not Started' },
  pending:     { bg: 'var(--state-warning-bg)', color: 'var(--state-warning)', label: 'Pending' },
  in_progress: { bg: 'var(--state-info-bg)', color: 'var(--state-info)', label: 'In Progress' },
  completed:   { bg: 'var(--state-success-bg)', color: 'var(--state-success)', label: 'Completed' },
}
const FILTERS = ['all', 'not_started', 'pending', 'in_progress', 'completed']
const FILTER_LABEL = { all: 'All', not_started: 'Not Started', pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

function StatusPill({ task }) {
  const key = task?.completed_at ? 'completed' : (task?.status || 'not_started')
  const s = STATUS_STYLE[key] || STATUS_STYLE.not_started
  return <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: F, background: s.bg, color: s.color, padding: '3px 9px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{s.label}</span>
}
function DueDateChip({ deadline }) {
  if (!deadline) return <span style={{ fontSize: '12px', color: '#9C9488', fontFamily: F }}>—</span>
  const days = Math.ceil((new Date(deadline + 'T00:00:00') - Date.now()) / 86400000)
  let bg = C.surface, color = C.dim
  if (days < 0)       { bg = 'var(--state-danger-bg)'; color = 'var(--state-danger)' }
  else if (days <= 3) { bg = 'var(--state-warning-bg)'; color = 'var(--state-warning)' }
  const label = new Date(deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return <span style={{ fontSize: '11px', fontWeight: 500, fontFamily: F, background: bg, color, padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{label}</span>
}
function StatCard({ label, value, hot }) {
  return (
    <div style={{ background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px 15px', borderTop: `3px solid ${hot ? C.accent : C.border}`, flex: 1, minWidth: '140px', maxWidth: '260px' }}>
      <div style={{ fontFamily: F, fontSize: '12px', color: C.dim }}>{label}</div>
      <div style={{ fontFamily: FD, fontSize: '38px', fontWeight: 600, color: hot ? C.accent : 'var(--app-ink)', lineHeight: 1, margin: '6px 0 5px', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}
function PanelStyle() {
  return <style>{`
    @keyframes panel-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    .panel-skel { height: 96px; border-radius: 10px; background: linear-gradient(90deg, #f4f1ee 25%, #eae6e2 50%, #f4f1ee 75%); background-size: 200% 100%; animation: panel-shimmer 1.4s infinite; }
  `}</style>
}

// ── Panel ────────────────────────────────────────────────────────────────────
export default function StaffPanel({ userId }) {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!userId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function load() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) { setLoading(false); return }
      const { data: userRow } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('auth_id', session.user.id)
        .single()
      const myId = userRow?.id
      if (!myId) { setLoading(false); return }

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, status, deadline, completed_at, event_id')
        .eq('assigned_to', myId)
        .order('deadline', { ascending: true, nullsFirst: false })

      const rows = taskRows || []
      const eventIds = Array.from(new Set(rows.map(t => t.event_id).filter(Boolean)))

      let evById = {}
      if (eventIds.length > 0) {
        const { data: evs } = await supabase
          .from('events')
          .select('id, event_name')
          .in('id', eventIds)
        evById = Object.fromEntries((evs || []).map(e => [e.id, e]))
      }

      setTasks(rows.map(t => ({ ...t, eventName: evById[t.event_id]?.event_name || '—' })))
    } catch (err) {
      console.error('StaffPanel load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCount = useMemo(
    () => tasks.filter(t => t.completed_at == null).length,
    [tasks]
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    if (filter === 'completed') return tasks.filter(t => t.completed_at != null)
    return tasks.filter(t => t.completed_at == null && t.status === filter)
  }, [tasks, filter])

  return (
    <div style={{ fontFamily: F }}>
      <PanelStyle />
      <h1 style={{ fontFamily: FD, fontSize: '28px', fontWeight: 600, color: 'var(--app-ink)', marginBottom: '4px', letterSpacing: '-0.3px' }}>Staff</h1>
      <p style={{ fontFamily: F, fontSize: '13px', color: C.dim, marginBottom: '24px' }}>Your assigned tasks.</p>

      {/* Single stat card */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {loading
          ? <div className="panel-skel" style={{ flex: '0 1 260px', minWidth: '180px' }} />
          : <StatCard label="My Tasks" value={openCount} hot={false} />}
      </div>

      {/* Filter strip */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: F, fontSize: '12px', fontWeight: filter === f ? 600 : 500,
              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
              background: filter === f ? 'var(--app-ink)' : 'transparent',
              color: filter === f ? '#fff' : C.dim,
              border: `1px solid ${filter === f ? 'var(--app-ink)' : C.border}`,
            }}
          >{FILTER_LABEL[f]}</button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <p style={{ fontSize: '13px', color: C.dim }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: '13px', color: C.dim, padding: '16px', background: C.surface, borderRadius: '8px' }}>
          {tasks.length === 0 ? 'No tasks assigned to you yet.' : 'No tasks match this filter.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(t => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--app-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>{t.eventName}</div>
              </div>
              <DueDateChip deadline={t.deadline} />
              <StatusPill task={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
