import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

// ── Inline helpers (kept inside this file per spec — 4 panel files only) ─────
const F  = "'DM Sans', sans-serif"
const FD = "'Cormorant Garamond', serif"
const C  = { surface: '#f2efe9', border: '#d8d2c8', accent: '#bc1723', dim: '#7a7060', bg: '#faf8f5' }

const STATUS_STYLE = {
  not_started: { bg: '#e5e3de', color: '#7a7060', label: 'Not Started' },
  pending:     { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed:   { bg: '#dcfce7', color: '#166534', label: 'Completed' },
}

function StatusPill({ task }) {
  const key = task?.completed_at ? 'completed' : (task?.status || 'not_started')
  const s = STATUS_STYLE[key] || STATUS_STYLE.not_started
  return <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: F, background: s.bg, color: s.color, padding: '3px 9px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{s.label}</span>
}
function DueDateChip({ deadline }) {
  if (!deadline) return <span style={{ fontSize: '12px', color: '#9C9488', fontFamily: F }}>—</span>
  const days = Math.ceil((new Date(deadline + 'T00:00:00') - Date.now()) / 86400000)
  let bg = C.surface, color = C.dim
  if (days < 0)       { bg = '#FEE2E2'; color = '#991B1B' }
  else if (days <= 3) { bg = '#FEF3C7'; color = '#92400E' }
  const label = new Date(deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return <span style={{ fontSize: '11px', fontWeight: 500, fontFamily: F, background: bg, color, padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{label}</span>
}
function StatCard({ label, value, hot }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px 15px', borderTop: `3px solid ${hot ? C.accent : C.border}`, flex: 1, minWidth: '140px' }}>
      <div style={{ fontFamily: F, fontSize: '12px', color: C.dim }}>{label}</div>
      <div style={{ fontFamily: FD, fontSize: '38px', fontWeight: 600, color: hot ? C.accent : '#1a1a1a', lineHeight: 1, margin: '6px 0 5px', letterSpacing: '-0.5px' }}>{value}</div>
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
  return <section style={{ marginBottom: '28px' }}><h2 style={{ fontFamily: FD, fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px', letterSpacing: '-0.2px' }}>{title}</h2>{children}</section>
}
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function initials(name='') { return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') }

// ── Panel ────────────────────────────────────────────────────────────────────
export default function ProjectHeadPanel({ userId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [dueSoon, setDueSoon] = useState([])
  const [workload, setWorkload] = useState([])

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
      const userEmail = userRow?.email
      if (!userEmail) { setLoading(false); return }

      // (a) My events — created_by = email OR assigned_to JSONB array contains email
      const { data: evRows } = await supabase
        .from('events')
        .select('id, event_name, status, cities, start_date, end_date, event_date, clients(group_name, brand_name)')
        .or(`created_by.eq.${userEmail},assigned_to.cs.["${userEmail}"]`)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      const evList = evRows || []
      const evIds = evList.map(e => e.id)

      let dueSoonRows = [], workloadRows = []
      if (evIds.length > 0) {
        const today  = new Date().toISOString().split('T')[0]
        const cutoff = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

        const [{ data: openTasks }, { data: dueTasks }] = await Promise.all([
          supabase
            .from('tasks')
            .select('assigned_to')
            .in('event_id', evIds)
            .is('completed_at', null),
          supabase
            .from('tasks')
            .select('id, title, status, deadline, completed_at, event_id, assigned_to')
            .in('event_id', evIds)
            .is('completed_at', null)
            .gte('deadline', today)
            .lte('deadline', cutoff)
            .order('deadline', { ascending: true })
            .limit(10),
        ])

        // (b) Aggregate open task count per assignee
        const counts = {}
        for (const t of openTasks || []) {
          if (!t.assigned_to) continue
          counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1
        }

        // Resolve user names for workload + due-soon rows
        const userIds = Array.from(new Set([
          ...Object.keys(counts),
          ...(dueTasks || []).map(t => t.assigned_to).filter(Boolean),
        ]))
        const usersById = {}
        if (userIds.length > 0) {
          const { data: us } = await supabase
            .from('users')
            .select('id, full_name, email, role')
            .in('id', userIds)
          for (const u of us || []) usersById[u.id] = u
        }

        const evById = Object.fromEntries(evList.map(e => [e.id, e]))
        dueSoonRows = (dueTasks || []).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          completed_at: t.completed_at,
          deadline: t.deadline,
          eventName: evById[t.event_id]?.event_name || '—',
          assigneeName: usersById[t.assigned_to]?.full_name || usersById[t.assigned_to]?.email || '—',
        }))
        workloadRows = Object.entries(counts)
          .map(([uid, count]) => ({
            id: uid,
            name: usersById[uid]?.full_name || usersById[uid]?.email || 'Unknown',
            role: usersById[uid]?.role || '—',
            count,
          }))
          .sort((a, b) => b.count - a.count)
      }

      setEvents(evList)
      setDueSoon(dueSoonRows)
      setWorkload(workloadRows)
    } catch (err) {
      console.error('ProjectHeadPanel load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalOpen = workload.reduce((s, w) => s + w.count, 0)

  return (
    <div style={{ fontFamily: F }}>
      <PanelStyle />
      <h1 style={{ fontFamily: FD, fontSize: '28px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px', letterSpacing: '-0.3px' }}>Project Head</h1>
      <p style={{ fontFamily: F, fontSize: '13px', color: C.dim, marginBottom: '24px' }}>Your events, your team's workload, and what's due this week.</p>

      <StatStrip
        cards={[
          { label: 'My Events',       value: events.length,  hot: false },
          { label: 'Team Tasks Open', value: totalOpen,      hot: false },
          { label: 'Due This Week',   value: dueSoon.length, hot: dueSoon.length > 0 },
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
                onClick={() => navigate(`/app/event/${ev.id}`)}
                style={{ textAlign: 'left', cursor: 'pointer', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', fontFamily: F }}
              >
                <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', marginBottom: '4px' }}>{ev.event_name}</div>
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

      {/* Due Soon */}
      <Section title="Due Soon (next 7 days)">
        {loading ? (
          <p style={{ fontSize: '13px', color: C.dim }}>Loading...</p>
        ) : dueSoon.length === 0 ? (
          <p style={{ fontSize: '13px', color: C.dim, padding: '16px', background: C.surface, borderRadius: '8px' }}>No tasks due soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dueSoon.map(t => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                  <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>{t.eventName} · {t.assigneeName}</div>
                </div>
                <DueDateChip deadline={t.deadline} />
                <StatusPill task={t} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Team Workload */}
      <Section title="Team Workload">
        {loading ? (
          <p style={{ fontSize: '13px', color: C.dim }}>Loading...</p>
        ) : workload.length === 0 ? (
          <p style={{ fontSize: '13px', color: C.dim, padding: '16px', background: C.surface, borderRadius: '8px' }}>No open tasks on your events.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {workload.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{initials(w.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>{w.name}</div>
                  <div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{w.role}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: w.count > 5 ? '#FEE2E2' : C.surface, color: w.count > 5 ? '#991B1B' : C.dim }}>{w.count} open</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
