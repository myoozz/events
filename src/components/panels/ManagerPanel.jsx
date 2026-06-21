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
// "My Tasks" groups open tasks only (completed filtered out by query). Order: pending → in_progress → not_started.
const GROUP_ORDER = ['pending', 'in_progress', 'not_started']

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
function Section({ title, children }) {
  return <section style={{ marginBottom: '28px' }}><h2 style={{ fontFamily: FD, fontSize: '20px', fontWeight: 600, color: 'var(--app-ink)', marginBottom: '12px', letterSpacing: '-0.2px' }}>{title}</h2>{children}</section>
}
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }

// ── Panel ────────────────────────────────────────────────────────────────────
export default function ManagerPanel({ userId, onOpenEvent }) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])

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
      const userEmail = userRow?.email
      if (!myId || !userEmail) { setLoading(false); return }

      // (a) My events — created_by = email OR assigned_to JSONB array contains email
      const { data: evRows } = await supabase
        .from('events')
        .select('id, event_name, status, cities, start_date, end_date, event_date, clients(group_name, brand_name)')
        .or(`created_by.eq.${userEmail},assigned_to.cs.["${userEmail}"]`)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      const evList = evRows || []
      const evById = Object.fromEntries(evList.map(e => [e.id, e]))

      // (b) My own open tasks — completed_at IS NULL
      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, status, deadline, completed_at, event_id')
        .eq('assigned_to', myId)
        .is('completed_at', null)
        .order('deadline', { ascending: true, nullsFirst: false })

      const tasksWithEvent = (taskRows || []).map(t => ({
        ...t,
        eventName: evById[t.event_id]?.event_name || '—',
        eventCity: (evById[t.event_id]?.cities || [])[0] || '',
      }))

      setEvents(evList)
      setTasks(tasksWithEvent)
    } catch (err) {
      console.error('ManagerPanel load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const overdueCount = useMemo(
    () => tasks.filter(t => t.deadline && t.deadline < today).length,
    [tasks, today]
  )

  // Group open tasks by raw status: pending → in_progress → not_started
  const grouped = useMemo(() => {
    const out = { pending: [], in_progress: [], not_started: [] }
    for (const t of tasks) {
      const k = out[t.status] !== undefined ? t.status : 'not_started'
      out[k].push(t)
    }
    return out
  }, [tasks])

  return (
    <div style={{ fontFamily: F }}>
      <PanelStyle />
      <h1 style={{ fontFamily: FD, fontSize: '28px', fontWeight: 600, color: 'var(--app-ink)', marginBottom: '4px', letterSpacing: '-0.3px' }}>Event Lead</h1>
      <p style={{ fontFamily: F, fontSize: '13px', color: C.dim, marginBottom: '24px' }}>The events you're driving and the tasks on your plate.</p>

      <StatStrip
        cards={[
          { label: 'My Events',     value: events.length,  hot: false },
          { label: 'My Open Tasks', value: tasks.length,   hot: false },
          { label: 'Overdue',       value: overdueCount,   hot: overdueCount > 0 },
        ]}
        loading={loading}
      />

      {/* My Events */}
      <Section title="My Events">
        {loading ? (
          <p style={{ fontSize: '13px', color: C.dim }}>Loading...</p>
        ) : events.length === 0 ? (
          <p style={{ fontSize: '13px', color: C.dim, padding: '16px', background: C.surface, borderRadius: '8px' }}>No events assigned to you.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => onOpenEvent && onOpenEvent(ev)}
                style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', fontFamily: F }}
              >
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--app-ink)', marginBottom: '4px' }}>{ev.event_name}</div>
                {ev.clients?.group_name && (
                  <div style={{ fontSize: '12px', color: C.dim, marginBottom: '8px' }}>
                    {ev.clients.group_name}{ev.clients.brand_name ? ` · ${ev.clients.brand_name}` : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: C.surface, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{ev.status || '—'}</span>
                  {(ev.cities || []).slice(0, 3).map((c, i) => (
                    <span key={i} style={{ fontSize: '11px', color: C.dim }}>· {c}</span>
                  ))}
                </div>
                {(ev.start_date || ev.event_date) && (
                  <div style={{ fontSize: '11px', color: C.dim, marginTop: '6px' }}>
                    {fmtDate(ev.start_date || ev.event_date)}{ev.end_date ? ` → ${fmtDate(ev.end_date)}` : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* My Tasks */}
      <Section title="My Tasks">
        {loading ? (
          <p style={{ fontSize: '13px', color: C.dim }}>Loading...</p>
        ) : tasks.length === 0 ? (
          <p style={{ fontSize: '13px', color: C.dim, padding: '16px', background: C.surface, borderRadius: '8px' }}>All caught up.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {GROUP_ORDER.map(gk => grouped[gk].length === 0 ? null : (
              <div key={gk}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: F, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {STATUS_STYLE[gk].label}
                  </span>
                  <span style={{ fontSize: '11px', color: C.dim }}>· {grouped[gk].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {grouped[gk].map(t => (
                    <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', background: 'var(--app-surface)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--app-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                        <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>{t.eventName}{t.eventCity ? ` · ${t.eventCity}` : ''}</div>
                      </div>
                      <DueDateChip deadline={t.deadline} />
                      <StatusPill task={t} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
