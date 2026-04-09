import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// ─── Color system ─────────────────────────────────────────
const C = {
  red:    { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
  orange: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  yellow: { bg: '#FEFCE8', color: '#CA8A04', border: '#FDE68A' },
  lime:   { bg: '#F7FEE7', color: '#65A30D', border: '#D9F99D' },
  green:  { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' },
  grey:   { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: 'var(--border)' },
  blue:   { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
}

// ─── Status definitions per stream ───────────────────────
const CREATIVE_STATUSES = [
  { key: 'not_started',    label: 'Not started',       c: C.grey },
  { key: 'briefed',        label: 'Briefed',            c: C.orange },
  { key: 'draft_ready',    label: 'Draft ready',        c: C.yellow },
  { key: 'client_approved',label: 'Client approved ✓', c: C.lime },
  { key: 'file_sent',      label: 'File sent ✓',        c: C.green },
]

const FABRICATION_STATUSES = [
  { key: 'not_started',    label: 'Not started',    c: C.grey },
  { key: 'in_production',  label: 'In production',  c: C.orange },
  { key: 'qc_pending',     label: 'QC check',       c: C.lime },
  { key: 'done',           label: 'Done ✓',          c: C.green },
]

const PRINT_STATUSES = [
  { key: 'not_started',    label: 'Not started',    c: C.grey },
  { key: 'printing',       label: 'Printing',       c: C.orange },
  { key: 'qc_pending',     label: 'QC check',       c: C.lime },
  { key: 'done',           label: 'Done ✓',          c: C.green },
]

const PROCUREMENT_STATUSES = [
  { key: 'not_started',    label: 'Not started',    c: C.grey },
  { key: 'quoted',         label: 'Quoted',         c: C.yellow },
  { key: 'confirmed',      label: 'Confirmed',      c: C.orange },
  { key: 'done',           label: 'Done ✓',          c: C.green },
]

const ELEMENT_TYPES = [
  { key: 'fab_print',    label: 'Fabrication & Print' },
  { key: 'print',        label: 'Print only' },
  { key: 'creative',     label: 'Creative only' },
  { key: 'procurement',  label: 'Procurement' },
]

// Auto-suggest type from category
const CATEGORY_TYPE_MAP = {
  'Production & Fabrication': 'fab_print',
  'Branding & Signage':       'fab_print',
  'AV & Technical':           'procurement',
  'Sound & Music':            'procurement',
  'Lighting':                 'procurement',
  'LED & Video Walls':        'fab_print',
  'Furniture & Fixtures':     'procurement',
  'Giveaways & Collaterals':  'print',
  'Gifting & Consumables':    'procurement',
  'Creatives & Content':      'creative',
  'Manpower & Staffing':      'procurement',
  'Venue & Permissions':      'procurement',
  'F&B & Hospitality':        'procurement',
  'Travel & Logistics':       'procurement',
  'Artist & Entertainment':   'procurement',
}

function getCreativeLabel(status) { return CREATIVE_STATUSES.find(s => s.key === status) || CREATIVE_STATUSES[0] }
function getFabLabel(status) { return FABRICATION_STATUSES.find(s => s.key === status) || FABRICATION_STATUSES[0] }
function getPrintLabel(status) { return PRINT_STATUSES.find(s => s.key === status) || PRINT_STATUSES[0] }
function getProcLabel(status) { return PROCUREMENT_STATUSES.find(s => s.key === status) || PROCUREMENT_STATUSES[0] }

// ─── Status pill ──────────────────────────────────────────
function StatusPill({ statuses, current, onSelect, blocked, blockMsg, isQC }) {
  const [open, setOpen] = useState(false)
  const current_s = statuses.find(s => s.key === current) || statuses[0]

  function handleSelect(key) {
    if (isQC && key === 'done') {
      if (!window.confirm('Quality check done? Once marked Done it counts toward your completion.')) return
    }
    if (blocked && key !== 'not_started') {
      alert(blockMsg)
      setOpen(false)
      return
    }
    onSelect(key)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '3px 10px', fontSize: '11px', fontWeight: 500,
          fontFamily: 'var(--font-body)',
          background: current_s.c.bg, color: current_s.c.color,
          border: `1px solid ${current_s.c.border}`,
          borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap',
          outline: 'none',
        }}
      >
        {current_s.label} ▾
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 99, minWidth: '160px', overflow: 'hidden',
          }}>
            {statuses.map(s => (
              <button key={s.key} onClick={() => handleSelect(s.key)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-body)',
                  background: s.key === current ? s.c.bg : 'none',
                  color: s.key === current ? s.c.color : 'var(--text)',
                  border: 'none', cursor: 'pointer',
                  borderBottom: '0.5px solid var(--border)',
                }}
                onMouseOver={e => { if (s.key !== current) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseOut={e => { if (s.key !== current) e.currentTarget.style.background = 'none' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Production row ───────────────────────────────────────
function ProductionRow({ task, teamUsers, onUpdate }) {
  const [editType, setEditType] = useState(false)
  const [editCreativeNote, setEditCreativeNote] = useState(false)
  const [note, setNote] = useState(task.creative_note || '')

  const creativeApproved = ['client_approved', 'file_sent'].includes(task.creative_status)
  const printBlocked = !creativeApproved && ['fab_print', 'print'].includes(task.element_type)
  const showCreative = ['fab_print', 'print', 'creative'].includes(task.element_type)
  const showFab = task.element_type === 'fab_print'
  const showPrint = ['fab_print', 'print'].includes(task.element_type)
  const showProc = task.element_type === 'procurement'

  async function update(field, value) {
    await supabase.from('tasks').update({ [field]: value }).eq('id', task.id)
    onUpdate({ ...task, [field]: value })
  }

  async function saveNote() {
    await update('creative_note', note)
    setEditCreativeNote(false)
  }

  // Overall row alert
  const printAlert = printBlocked && task.print_status === 'printing'
  const hasCreativeNote = task.element_type === 'procurement' && task.creative_note

  return (
    <tr style={{
      borderBottom: '0.5px solid var(--border)',
      background: printAlert ? '#FFF5F5' : hasCreativeNote ? '#FFFBEB' : 'var(--bg)',
    }}>
      {/* Element */}
      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>
          {task.element_name}
          {printAlert && (
            <span style={{ marginLeft: '8px', fontSize: '10px', background: C.red.bg, color: C.red.color, padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
              ⚠ Print blocked
            </span>
          )}
          {hasCreativeNote && (
            <span style={{ marginLeft: '8px', fontSize: '10px', background: C.yellow.bg, color: C.yellow.color, padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
              📝 Needs branding
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {task.size && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.size}{task.size_unit ? ' '+task.size_unit : ''}</span>}
          {task.qty && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>× {task.qty}</span>}
          {task.city && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>· {task.city}</span>}
        </div>
      </td>

      {/* Type */}
      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
        {editType ? (
          <select value={task.element_type}
            onChange={e => { update('element_type', e.target.value); setEditType(false) }}
            onBlur={() => setEditType(false)}
            autoFocus
            style={{ fontSize: '11px', padding: '3px 6px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
            {ELEMENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        ) : (
          <button onClick={() => setEditType(true)}
            style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'none', border: '0.5px dashed var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {ELEMENT_TYPES.find(t => t.key === task.element_type)?.label || 'Set type'}
          </button>
        )}
      </td>

      {/* Creative */}
      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
        {showCreative ? (
          <div>
            <StatusPill statuses={CREATIVE_STATUSES} current={task.creative_status}
              onSelect={v => update('creative_status', v)} />
            {task.creative_assignee && (
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{task.creative_assignee}</div>
            )}
          </div>
        ) : showProc ? (
          <div>
            <button onClick={() => setEditCreativeNote(!editCreativeNote)}
              style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
              {task.creative_note ? 'Edit note' : '+ Add branding note'}
            </button>
            {editCreativeNote && (
              <div style={{ marginTop: '4px' }}>
                <input value={note} onChange={e => setNote(e.target.value)}
                  onBlur={saveNote}
                  placeholder="Branding requirement..."
                  autoFocus
                  style={{ width: '120px', padding: '3px 6px', fontSize: '11px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>
            )}
            {task.creative_note && !editCreativeNote && (
              <div style={{ fontSize: '10px', color: C.yellow.color, marginTop: '2px' }}>{task.creative_note}</div>
            )}
          </div>
        ) : <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Fabrication */}
      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
        {showFab ? (
          <StatusPill statuses={FABRICATION_STATUSES} current={task.fabrication_status}
            isQC={task.fabrication_status === 'qc_pending'}
            onSelect={v => update('fabrication_status', v)} />
        ) : <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Print */}
      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
        {showPrint ? (
          <div>
            <StatusPill statuses={PRINT_STATUSES} current={task.print_status}
              isQC={task.print_status === 'qc_pending'}
              blocked={printBlocked}
              blockMsg={`Creative not yet approved. Check with ${task.creative_assignee || 'the creative team'} before marking as printing.`}
              onSelect={v => update('print_status', v)} />
            {printBlocked && task.print_status !== 'not_started' && (
              <div style={{ fontSize: '10px', color: C.red.color, marginTop: '3px' }}>
                ⚠ Awaiting creative approval
              </div>
            )}
          </div>
        ) : showProc ? (
          <StatusPill statuses={PROCUREMENT_STATUSES} current={task.print_status}
            onSelect={v => update('print_status', v)} />
        ) : <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>}
      </td>

      {/* Assignees */}
      <td style={{ padding: '10px 8px', verticalAlign: 'top', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        {task.assigned_name || task.assigned_to || <span style={{ color: C.red.color }}>Unassigned</span>}
      </td>
    </tr>
  )
}

// ─── Main Production component ────────────────────────────
export default function Production({ event, teamUsers = [] }) {
  async function handleDownload() {
    const { exportProductionList } = await import('../utils/excelExport')
    const { data: tasks } = await supabase.from('tasks')
      .select('*, elements(element_name, size, size_unit, qty, days, finish, source, city)')
      .eq('event_id', event.id)
    const { data: client } = await supabase.from('clients').select('*').eq('id', event.client_id).single()
    const flat = (tasks||[]).map(t => ({...t, element_name: t.elements?.element_name||''}))
    await exportProductionList(event, flat, client)
  }
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [collapsedCats, setCollapsedCats] = useState(new Set())
  const [activeCity, setActiveCity] = useState('__all__')

  function toggleCat(key) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  useEffect(() => { load() }, [event.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, elements(element_name, size, size_unit, qty, days, finish, source, city)')
      .eq('event_id', event.id)
      .order('category')
    if (data) {
      const enriched = data.map(t => ({
        ...t,
        element_name: t.elements?.element_name || t.element_name || '',
        size: t.elements?.size || '',
        size_unit: t.elements?.size_unit || '',
        qty: t.elements?.qty || '',
        city: t.elements?.city || '',
        // Auto-suggest type if not set
        element_type: t.element_type || CATEGORY_TYPE_MAP[t.category] || 'procurement',
      }))
      setTasks(enriched)
    }
    setLoading(false)
  }

  function updateTask(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  // Stats
  const total = tasks.length
  const creativeBlocked = tasks.filter(t =>
    ['fab_print', 'print'].includes(t.element_type) &&
    !['client_approved', 'file_sent'].includes(t.creative_status) &&
    t.print_status === 'printing'
  ).length
  const needsAttention = tasks.filter(t =>
    (t.element_type === 'procurement' && t.creative_note) ||
    creativeBlocked > 0
  ).length

  // Filter
  const filtered = tasks.filter(t => {
    const matchType = !filterType || t.element_type === filterType
    const matchStatus = !filterStatus || t.creative_status === filterStatus || t.fabrication_status === filterStatus || t.print_status === filterStatus
    return matchType && matchStatus
  })

  // Cities
  const cities = event.cities?.length > 0 ? event.cities : [...new Set(tasks.map(t => t.city).filter(Boolean))]
  const isMultiCity = cities.length > 1

  const cityFiltered = filtered.filter(t =>
    activeCity === '__all__' || !isMultiCity || t.city === activeCity || (!t.city && activeCity === cities[0])
  )

  // Group by category within city
  const grouped = {}
  cityFiltered.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })

  const thStyle = {
    padding: '7px 8px', fontSize: '10px', fontWeight: 500,
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    letterSpacing: '0.4px', textAlign: 'left',
    background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap',
  }

  if (!loading && tasks.length === 0) return (
    <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>
        No tasks yet
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Generate tasks from the Execution tab first. Then come here to track creative approvals, fabrication, and print.
      </p>
    </div>
  )

  return (
    <div>
      {/* Alerts */}
      {creativeBlocked > 0 && (
        <div style={{ padding: '10px 14px', background: C.red.bg, border: `0.5px solid ${C.red.border}`, borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', color: C.red.color, fontWeight: 500 }}>
          ⚠ {creativeBlocked} element{creativeBlocked > 1 ? 's' : ''} marked as printing without creative approval. Please review.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 10px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All types</option>
          {ELEMENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {(filterType || filterStatus) && (
          <button onClick={() => { setFilterType(''); setFilterStatus('') }}
            style={{ padding: '7px 12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-tertiary)', alignItems: 'center' }}>
          <span>{total} elements</span>
          {needsAttention > 0 && <span style={{ color: C.red.color, fontWeight: 500 }}>· {needsAttention} need attention</span>}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { label: 'Not started', c: C.grey },
          { label: 'In progress', c: C.orange },
          { label: 'QC check', c: C.lime },
          { label: 'Done', c: C.green },
          { label: 'Blocked', c: C.red },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.c.dot || l.c.color }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* City tabs */}
      {isMultiCity && (
        <div style={{ display: 'flex', gap: '0', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content', marginBottom: '20px' }}>
          {cities.map(city => (
            <button key={city} onClick={() => setActiveCity(city)}
              style={{
                padding: '7px 18px', fontSize: '13px',
                fontWeight: activeCity === city ? 500 : 400,
                fontFamily: 'var(--font-body)',
                background: activeCity === city ? 'var(--text)' : 'var(--bg)',
                color: activeCity === city ? 'var(--bg)' : 'var(--text-tertiary)',
                border: 'none', borderRight: '0.5px solid var(--border)', cursor: 'pointer',
              }}>
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Table grouped by category */}
      {Object.entries(grouped).map(([category, catTasks]) => {
        const catKey = `${activeCity}__${category}`
        const isCollapsed = collapsedCats.has(catKey)
        const catDone = catTasks.filter(t => t.fabrication_status === 'done' || (t.element_type === 'procurement' && t.print_status === 'done') || (t.element_type === 'creative' && t.creative_status === 'file_sent')).length

        return (
          <div key={catKey} style={{ marginBottom: '16px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div
              onClick={() => toggleCat(catKey)}
              style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: isCollapsed ? 'none' : '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{isCollapsed ? '▶' : '▼'}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{category}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{catDone}/{catTasks.length} done</span>
            </div>
            {!isCollapsed && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, minWidth: '180px' }}>Element</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Creative</th>
                    <th style={thStyle}>Fabrication</th>
                    <th style={thStyle}>Print / Procurement</th>
                    <th style={thStyle}>Assigned to</th>
                  </tr>
                </thead>
                <tbody>
                  {catTasks.map(task => (
                    <ProductionRow key={task.id} task={task} teamUsers={teamUsers} onUpdate={updateTask} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}
