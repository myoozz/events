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
const STATUS_ORDER = { pending: 0, in_progress: 1, not_started: 2, completed: 3 }
const FILTERS = ['all', 'not_started', 'pending', 'in_progress', 'completed']
const FILTER_LABEL = { all: 'All', not_started: 'Not Started', pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

function effectiveStatus(task) {
  return task?.completed_at ? 'completed' : (task?.status || 'not_started')
}
function StatusPill({ task }) {
  const s = STATUS_STYLE[effectiveStatus(task)] || STATUS_STYLE.not_started
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
    <div style={{ background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px 15px', borderTop: `3px solid ${hot ? C.accent : C.border}`, flex: 1, minWidth: '140px' }}>
      <div style={{ fontFamily: F, fontSize: '12px', color: C.dim }}>{label}</div>
      <div style={{ fontFamily: FD, fontSize: '38px', fontWeight: 600, color: hot ? C.accent : 'var(--app-ink)', lineHeight: 1, margin: '6px 0 5px', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}
function StatStrip({ cards, loading }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
      {loading
        ? Array.from({ length: cards.length }).map((_, i) => <div key={i} className="panel-skel" style={{ flex: 1, minWidth: '140px' }} />)
        : cards.map((c, i) => <StatCard key={i} {...c} />)}
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
export default function TeamPanel({ userId }) {
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

      // (a) My tasks — all statuses, sorted pending → in_progress → not_started → completed client-side
      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, status, deadline, completed_at, event_id, updated_at')
        .eq('assigned_to', myId)

      const rows = taskRows || []
      const eventIds = Array.from(new Set(rows.map(t => t.event_id).filter(Boolean)))

      // Resolve event names + first city
      let evById = {}
      if (eventIds.length > 0) {
        const { data: evs } = await supabase
          .from('events')
          .select('id, event_name, cities')
          .in('id', eventIds)
        evById = Object.fromEntries((evs || []).map(e => [e.id, e]))
      }

      const enriched = rows.map(t => ({
        ...t,
        eventName: evById[t.event_id]?.event_name || '—',
        eventCity: (evById[t.event_id]?.cities || [])[0] || '',
      }))
      enriched.sort((a, b) => {
        const sa = STATUS_ORDER[effectiveStatus(a)] ?? 99
        const sb = STATUS_ORDER[effectiveStatus(b)] ?? 99
        if (sa !== sb) return sa - sb
        return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31')
      })

      setTasks(enriched)
    } catch (err) {
      console.error('TeamPanel load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // Stats
  const { openCount, dueTodayCount, doneThisWeek } = useMemo(() => {
    const startOfWeek = (() => {
      const d = new Date()
      const day = d.getDay() // 0 = Sun
      const diff = (day + 6) % 7 // Monday = start
      d.setDate(d.getDate() - diff)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    })()
    return {
      openCount:     tasks.filter(t => t.completed_at == null).length,
      dueTodayCount: tasks.filter(t => t.deadline === today && t.completed_at == null).length,
      doneThisWeek:  tasks.filter(t => t.completed_at != null && t.completed_at >= startOfWeek).length,
    }
  }, [tasks, today])

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    if (filter === 'completed') return tasks.filter(t => t.completed_at != null)
    return tasks.filter(t => t.completed_at == null && t.status === filter)
  }, [tasks, filter])

  return (
    <div style={{ fontFamily: F }}>
      <PanelStyle />
      <h1 style={{ fontFamily: FD, fontSize: '28px', fontWeight: 600, color: 'var(--app-ink)', marginBottom: '4px', letterSpacing: '-0.3px' }}>Team</h1>
      <p style={{ fontFamily: F, fontSize: '13px', color: C.dim, marginBottom: '24px' }}>Everything assigned to you, in one place.</p>

      <StatStrip
        cards={[
          { label: 'My Open Tasks', value: openCount,     hot: false },
          { label: 'Due Today',     value: dueTodayCount, hot: dueTodayCount > 0 },
          { label: 'Done This Week',value: doneThisWeek,  hot: false },
        ]}
        loading={loading}
      />

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
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '12px', alignItems: 'center', background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
              <StatusPill task={t} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--app-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>
                  {t.eventName}{t.eventCity ? ` · ${t.eventCity}` : ''}
                </div>
              </div>
              {t.eventCity && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: C.surface, color: C.dim, whiteSpace: 'nowrap' }}>{t.eventCity}</span>
              )}
              <DueDateChip deadline={t.deadline} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
