import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MASTER_CATEGORIES } from './CategoryLibrary'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'arranged', 'on_site', 'done']
const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  arranged:    'Arranged',
  on_site:     'On site',
  done:        'Done ✓',
}
const STATUS_COLORS = {
  not_started: { bg: '#F3F4F6', color: '#6B7280' },
  in_progress: { bg: '#DBEAFE', color: '#1E40AF' },
  arranged:    { bg: '#FEF3C7', color: '#92400E' },
  on_site:     { bg: '#EDE9FE', color: '#5B21B6' },
  done:        { bg: '#D1FAE5', color: '#065F46' },
}

// Bug fix: central responsive hook
function useWindowSize() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

function generateToken() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
}
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── TaskRow — desktop table row + mobile card ─────────────
function TaskRow({ task, teamUsers, freelancers, onUpdate, onDelete, isMobile }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...task })
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.not_started

  async function save() {
    await supabase.from('tasks').update({
      category_owner: form.category_owner,
      assigned_to:    form.assigned_to,
      assigned_name:  form.assigned_name,
      assigned_phone: form.assigned_phone,
      deadline:       form.deadline || null,
      status:         form.status,
      notes:          form.notes,
    }).eq('id', task.id)
    onUpdate({ ...task, ...form })
    setEditing(false)
  }

  async function cycleStatus() {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(task.status) + 1) % STATUS_OPTIONS.length]
    const updates = { status: next, completed_at: next === 'done' ? new Date().toISOString() : null }
    await supabase.from('tasks').update(updates).eq('id', task.id)
    onUpdate({ ...task, ...updates })
  }

  async function copyPublicLink() {
    let token = task.public_token
    if (!token) {
      token = generateToken()
      await supabase.from('tasks').update({ public_token: token }).eq('id', task.id)
      onUpdate({ ...task, public_token: token })
    }
    const url = `${window.location.origin}/task/${token}`
    navigator.clipboard.writeText(url)
    alert(`Link copied!\n\n${url}\n\nShare on WhatsApp — no login needed.`)
  }

  const allPeople = [
    ...teamUsers.map(u => ({ label: u.full_name || u.email, value: u.email, type: 'team' })),
    ...freelancers.map(f => ({ label: `${f.full_name} (${f.city || 'freelancer'})`, value: f.full_name, type: 'freelancer' })),
  ]

  // ── EDIT MODE ─────────────────────────────────────────────
  if (editing) {
    const editFields = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Category owner</div>
            <input list="people-list-edit" value={form.category_owner}
              onChange={e => setForm(p => ({ ...p, category_owner: e.target.value }))}
              placeholder="Category owner"
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Assigned to</div>
            <input list="people-list-edit" value={form.assigned_name || form.assigned_to}
              onChange={e => {
                const found = teamUsers.find(u => u.full_name === e.target.value || u.email === e.target.value)
                setForm(p => ({ ...p, assigned_to: found?.email || '', assigned_name: e.target.value }))
              }}
              placeholder="Assigned to"
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
            <datalist id="people-list-edit">
              {allPeople.map(p => <option key={p.value} value={p.label} />)}
            </datalist>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Phone</div>
            <input value={form.assigned_phone || ''}
              onChange={e => setForm(p => ({ ...p, assigned_phone: e.target.value }))}
              placeholder="+91 98..."
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Deadline</div>
            <input type="date" value={form.deadline || ''}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Status</div>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Notes</div>
            <input value={form.notes || ''}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes..."
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={save} style={{ padding: '7px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ padding: '7px 10px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
        </div>
      </>
    )

    // Mobile: edit as card
    if (isMobile) {
      return (
        <div style={{ padding: '12px 14px', background: '#FFFBEB', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px' }}>{task.element_name}</div>
          {editFields}
        </div>
      )
    }
    // Desktop: edit as table row
    return (
      <tr style={{ background: '#FFFBEB' }}>
        <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
          <div>{task.element_name}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            {task.size && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{task.size}{task.size_unit ? ' '+task.size_unit : ''}</span>}
            {task.qty && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Qty: {task.qty}</span>}
            {task.days && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{task.days}d</span>}
          </div>
        </td>
        <td colSpan={7} style={{ padding: '8px 10px' }}>{editFields}</td>
      </tr>
    )
  }

  // ── VIEW MODE — Mobile card ───────────────────────────────
  if (isMobile) {
    return (
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', background: task.status === 'done' ? '#F9FFF9' : 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>
              {task.element_name || <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>—</span>}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {task.size && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.size}{task.size_unit ? ' '+task.size_unit : ''}</span>}
              {task.qty && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>×{task.qty}</span>}
              {task.city && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>📍{task.city}</span>}
            </div>
          </div>
          <button onClick={cycleStatus}
            style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: sc.bg, color: sc.color, border: 'none', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {STATUS_LABELS[task.status]}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {(task.assigned_name || task.assigned_to) && (
            <span>👤 {task.assigned_name || task.assigned_to}</span>
          )}
          {!task.assigned_name && !task.assigned_to && (
            <span style={{ color: '#A32D2D', fontSize: '11px' }}>Unassigned</span>
          )}
          {task.deadline && (
            <span style={{ color: task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' ? '#A32D2D' : 'var(--text-secondary)' }}>
              📅 {fmt(task.deadline)}
            </span>
          )}
        </div>
        {task.notes && <div style={{ fontSize: '11px', color: '#92400E', marginBottom: '8px' }}>Note: {task.notes}</div>}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setEditing(true)}
            style={{ padding: '5px 12px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Edit
          </button>
          <button onClick={copyPublicLink}
            style={{ padding: '5px 12px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            🔗 Copy link
          </button>
        </div>
      </div>
    )
  }

  // ── VIEW MODE — Desktop table row ────────────────────────
  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)', background: task.status === 'done' ? '#F9FFF9' : 'var(--bg)' }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
      onMouseOut={e => e.currentTarget.style.background = task.status === 'done' ? '#F9FFF9' : 'var(--bg)'}
    >
      <td style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
        <div>{task.element_name || <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>—</span>}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
          {task.size && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.size}{task.size_unit ? ' '+task.size_unit : ''}</span>}
          {task.qty && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Qty: {task.qty}</span>}
          {task.days && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.days} day{task.days > 1 ? 's' : ''}</span>}
          {task.finish && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.finish}</span>}
        </div>
        {task.source && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Vendor: {task.source}</div>}
        {task.notes && <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px' }}>Note: {task.notes}</div>}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{task.category_owner || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
      <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {task.assigned_name || task.assigned_to || <span style={{ color: '#A32D2D', fontSize: '11px' }}>Unassigned</span>}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.assigned_phone || '—'}</td>
      <td style={{ padding: '8px 10px', fontSize: '12px', color: task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' ? '#A32D2D' : 'var(--text-secondary)' }}>
        {fmt(task.deadline)}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <button onClick={cycleStatus} title="Click to change status"
          style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: sc.bg, color: sc.color, border: 'none', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {STATUS_LABELS[task.status]}
        </button>
      </td>
      <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.city || '—'}</td>
      <td style={{ padding: '8px 6px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setEditing(true)} title="Edit task"
            style={{ padding: '3px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Edit
          </button>
          <button onClick={copyPublicLink} title="Copy public link for freelancer"
            style={{ padding: '3px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            🔗
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main TaskBoard ────────────────────────────────────────
export default function TaskBoard({ event, userRole, session }) {
  const [tasks,          setTasks]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [generating,     setGenerating]     = useState(false)
  const [teamUsers,      setTeamUsers]      = useState([])
  const [freelancers,    setFreelancers]    = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPerson,   setFilterPerson]   = useState('')
  const [showFreelancers,setShowFreelancers]= useState(false)
  const [newFreelancer,  setNewFreelancer]  = useState({ full_name: '', phone: '', email: '', city: '', categories: [], notes: '' })
  const [collapsedCats,  setCollapsedCats]  = useState(new Set())
  const [activeCity,     setActiveCity]     = useState('__all__')

  const w        = useWindowSize()
  const isMobile = w < 768

  function toggleCat(key) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  useEffect(() => { loadAll() }, [event.id])

  async function handleDownloadTasks() {
    const { exportTaskAssignment } = await import('../utils/excelExport')
    const { data: client } = await supabase.from('clients').select('*').eq('id', event.client_id).single()
    await exportTaskAssignment(event, tasks, client)
  }

  async function copyAllLinks() {
    const tasksNeedingTokens = tasks.filter(t => !t.public_token)
    if (tasksNeedingTokens.length > 0) {
      for (const t of tasksNeedingTokens) {
        const token = generateToken()
        await supabase.from('tasks').update({ public_token: token }).eq('id', t.id)
        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, public_token: token } : x))
      }
      await loadAll()
      return
    }
    const lines = []
    lines.push(`*${event.event_name} — Task Links*`)
    lines.push(`Share with your team. No login needed.`)
    lines.push('')
    const cats = [...new Set(tasks.map(t => t.category))]
    cats.forEach(cat => {
      const catTasks = tasks.filter(t => t.category === cat)
      lines.push(`*${cat}*`)
      catTasks.forEach(t => {
        if (t.public_token) {
          const url = `${window.location.origin}/task/${t.public_token}`
          const who = t.assigned_name || t.assigned_to || 'Unassigned'
          lines.push(`${t.element_name} (${who}): ${url}`)
        }
      })
      lines.push('')
    })
    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('✓ All ' + tasks.filter(t => t.public_token).length + ' task links copied!\n\nPaste directly into WhatsApp or any messenger.')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('Links copied!')
    }
  }

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: u }, { data: f }] = await Promise.all([
      supabase.from('tasks').select('*, elements(element_name,size,size_unit,qty,days,finish,source,city)').eq('event_id', event.id).order('category'),
      supabase.from('users').select('email,full_name').neq('status','inactive'),
      supabase.from('freelancers').select('*').order('full_name'),
    ])
    if (t) setTasks(t.map(task => ({
      ...task,
      element_name: task.elements?.element_name || task.element_name || '',
      size:         task.elements?.size         || '',
      size_unit:    task.elements?.size_unit    || '',
      qty:          task.elements?.qty          || '',
      days:         task.elements?.days         || '',
      finish:       task.elements?.finish       || '',
      source:       task.elements?.source       || '',
      city:         task.elements?.city         || '',
    })))
    setTeamUsers(u || [])
    setFreelancers(f || [])
    setLoading(false)
  }

  async function generateTasks() {
    setGenerating(true)
    const { data: elements } = await supabase.from('elements').select('*').eq('event_id', event.id)
    if (!elements?.length) { setGenerating(false); return }
    await supabase.from('tasks').delete().eq('event_id', event.id)
    const taskRows = elements.map(el => ({
      event_id:       event.id,
      element_id:     el.id,
      category:       el.category,
      category_owner: '',
      assigned_to:    el.responsibility || '',
      assigned_name:  el.responsibility || '',
      assigned_phone: '',
      deadline:       null,
      status:         'not_started',
      notes:          '',
      public_token:   generateToken(),
    }))
    const batchSize = 50
    for (let i = 0; i < taskRows.length; i += batchSize) {
      await supabase.from('tasks').insert(taskRows.slice(i, i + batchSize))
    }
    await loadAll()
    setGenerating(false)
  }

  function updateTask(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  async function setCategoryOwnerBulk(category, owner) {
    await supabase.from('tasks').update({ category_owner: owner }).eq('event_id', event.id).eq('category', category)
    setTasks(prev => prev.map(t => t.category === category ? { ...t, category_owner: owner } : t))
  }
  async function setDeadlineBulk(category, deadline) {
    await supabase.from('tasks').update({ deadline }).eq('event_id', event.id).eq('category', category)
    setTasks(prev => prev.map(t => t.category === category ? { ...t, deadline } : t))
  }
  async function setAssigneeBulk(category, name) {
    const found = teamUsers.find(u => u.full_name === name || u.email === name)
    await supabase.from('tasks').update({ assigned_to: found?.email || '', assigned_name: name }).eq('event_id', event.id).eq('category', category)
    setTasks(prev => prev.map(t => t.category === category ? { ...t, assigned_to: found?.email || '', assigned_name: name } : t))
  }
  async function addFreelancer() {
    if (!newFreelancer.full_name.trim()) return
    await supabase.from('freelancers').insert({ ...newFreelancer, added_by: session?.user?.email })
    setNewFreelancer({ full_name: '', phone: '', email: '', city: '', categories: [], notes: '' })
    const { data } = await supabase.from('freelancers').select('*').order('full_name')
    setFreelancers(data || [])
  }

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const unassigned = tasks.filter(t => !t.assigned_name && !t.assigned_to).length
  const overdue    = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = tasks.filter(t => {
    const matchCat    = !filterCategory || t.category === filterCategory
    const matchStatus = !filterStatus   || t.status === filterStatus
    const matchPerson = !filterPerson   || t.assigned_name?.includes(filterPerson) || t.assigned_to?.includes(filterPerson) || t.category_owner?.includes(filterPerson)
    return matchCat && matchStatus && matchPerson
  })

  const cities      = event.cities?.length > 0 ? event.cities : [...new Set(tasks.map(t => t.city).filter(Boolean))]
  const isMultiCity = cities.length > 1
  const cityFiltered = filtered.filter(t =>
    activeCity === '__all__' || !isMultiCity || t.city === activeCity || (!t.city && activeCity === cities[0])
  )

  const grouped = {}
  cityFiltered.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })

  const categories = [...new Set(tasks.map(t => t.category))]
  const allPeople = [...new Set([
    ...tasks.map(t => t.category_owner).filter(Boolean),
    ...tasks.map(t => t.assigned_name || t.assigned_to).filter(Boolean),
  ])].sort()

  const thStyle = { padding: '6px 10px', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>Task board</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {total === 0
              ? 'Generate tasks from approved elements to start execution.'
              : `${done}/${total} done · ${pct}% complete${unassigned > 0 ? ` · ${unassigned} unassigned` : ''}${overdue > 0 ? ` · ${overdue} overdue` : ''}`}
          </p>
        </div>
        {/* Bug fix: on mobile stack the buttons vertically */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowFreelancers(!showFreelancers)}
            style={{ padding: '8px 14px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
            👥 Ground staff ({freelancers.length})
          </button>
          {tasks.length > 0 && (
            <button onClick={copyAllLinks}
              style={{ padding: '8px 14px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
              🔗 All links
            </button>
          )}
          {tasks.length > 0 && (
            <button onClick={handleDownloadTasks}
              style={{ padding: '8px 14px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
              ↓ Export
            </button>
          )}
          <button onClick={generateTasks} disabled={generating}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
            {generating ? 'Generating...' : tasks.length > 0 ? '↻ Regenerate' : '⚡ Generate tasks'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--text)', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* City tabs */}
      {isMultiCity && (
        <div style={{ display: 'flex', gap: '0', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content', marginBottom: '20px' }}>
          {cities.map(city => (
            <button key={city} onClick={() => setActiveCity(city)}
              style={{ padding: '7px 18px', fontSize: '13px', fontWeight: activeCity === city ? 500 : 400, fontFamily: 'var(--font-body)', background: activeCity === city ? 'var(--text)' : 'var(--bg)', color: activeCity === city ? 'var(--bg)' : 'var(--text-tertiary)', border: 'none', borderRight: '0.5px solid var(--border)', cursor: 'pointer' }}>
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Bug fix: Freelancer panel — was '1fr 1fr 1fr 1fr 1fr auto' (6 cols) — now stacks on mobile */}
      {showFreelancers && (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '20px', background: 'var(--bg-secondary)' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '12px' }}>Ground staff / Freelancers</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[
              { key: 'full_name', placeholder: 'Full name *' },
              { key: 'phone',     placeholder: 'Phone / WhatsApp' },
              { key: 'city',      placeholder: 'City' },
              { key: 'email',     placeholder: 'Email' },
              { key: 'notes',     placeholder: 'Notes (skill, role...)' },
            ].map(f => (
              <input key={f.key} value={newFreelancer[f.key]}
                onChange={e => setNewFreelancer(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ padding: '7px 10px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
            ))}
            <button onClick={addFreelancer} disabled={!newFreelancer.full_name.trim()}
              style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: newFreelancer.full_name.trim() ? 1 : 0.5 }}>
              Add
            </button>
          </div>
          {freelancers.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {freelancers.map(f => (
                <div key={f.id} style={{ display: 'flex', gap: '12px', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text)', minWidth: '120px' }}>{f.full_name}</span>
                  <span>{f.phone || '—'}</span>
                  <span>{f.city || '—'}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{f.notes || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {total > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '7px 10px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '7px 10px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <input value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
            placeholder="Filter by person..."
            style={{ padding: '7px 10px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', minWidth: '140px' }} />
          {(filterCategory || filterStatus || filterPerson) && (
            <button onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterPerson('') }}
              style={{ padding: '7px 12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              Clear
            </button>
          )}
          {!isMobile && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(s => {
                const count = tasks.filter(t => t.status === s).length
                if (!count) return null
                const sc = STATUS_COLORS[s]
                return (
                  <span key={s} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: 500 }}>
                    {STATUS_LABELS[s]} {count}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && total === 0 && (
        <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '60px 32px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)', marginBottom: '8px' }}>Ready to execute</p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Click "Generate tasks" to create a task for every element in this event.<br/>
            Then assign owners, set deadlines, and track to completion.
          </p>
        </div>
      )}

      {/* Task groups */}
      {Object.entries(grouped).map(([category, catTasks]) => {
        const catKey      = `${activeCity}__${category}`
        const isCollapsed = collapsedCats.has(catKey)
        const catDone     = catTasks.filter(t => t.status === 'done').length
        const catOwner    = catTasks[0]?.category_owner || ''
        const catDeadline = catTasks[0]?.deadline || ''
        const catAssignee = catTasks.every(t => (t.assigned_name||t.assigned_to) === (catTasks[0]?.assigned_name||catTasks[0]?.assigned_to))
          ? (catTasks[0]?.assigned_name || catTasks[0]?.assigned_to || '') : ''

        return (
          <div key={catKey} style={{ marginBottom: '16px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {/* Category header */}
            <div style={{ padding: isMobile ? '10px 14px' : '10px 14px', background: 'var(--bg-secondary)', borderBottom: isCollapsed ? 'none' : '0.5px solid var(--border)', cursor: 'pointer' }}
              onClick={() => toggleCat(catKey)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-tertiary)', padding: '0', flexShrink: 0 }}>
                  {isCollapsed ? '▶' : '▼'}
                </button>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{category}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{catDone}/{catTasks.length} done</span>
              </div>
              {/* Bulk controls — shown below on mobile, inline on desktop */}
              {!isCollapsed && (
                <div onClick={e => e.stopPropagation()}
                  style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Owner:</span>
                    <input defaultValue={catOwner} onBlur={e => setCategoryOwnerBulk(category, e.target.value)}
                      list="people-list-cat" placeholder="Set owner"
                      style={{ padding: '3px 8px', fontSize: '12px', border: '0.5px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: isMobile ? '130px' : '150px' }} />
                    <datalist id="people-list-cat">
                      {teamUsers.map(u => <option key={u.email} value={u.full_name || u.email} />)}
                    </datalist>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Assign all:</span>
                    <input defaultValue={catAssignee} onBlur={e => e.target.value && setAssigneeBulk(category, e.target.value)}
                      list={`assignee-list-${category}`} placeholder="Assign all to..."
                      style={{ padding: '3px 8px', fontSize: '12px', border: '0.5px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: isMobile ? '130px' : '150px' }} />
                    <datalist id={`assignee-list-${category}`}>
                      {teamUsers.map(u => <option key={u.email} value={u.full_name || u.email} />)}
                      {freelancers.map(f => <option key={f.id} value={f.full_name} />)}
                    </datalist>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>By:</span>
                    <input type="date" defaultValue={catDeadline} onBlur={e => setDeadlineBulk(category, e.target.value || null)}
                      style={{ padding: '3px 8px', fontSize: '12px', border: '0.5px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Bug fix: on mobile show cards, on desktop show table */}
            {!isCollapsed && (
              isMobile ? (
                <div>
                  {catTasks.map(task => (
                    <TaskRow key={task.id} task={task} teamUsers={teamUsers} freelancers={freelancers}
                      onUpdate={updateTask} onDelete={() => {}} isMobile={true} />
                  ))}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Element · Details</th>
                      <th style={thStyle}>Category owner</th>
                      <th style={thStyle}>Assigned to</th>
                      <th style={thStyle}>Phone</th>
                      <th style={thStyle}>Deadline</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>City</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catTasks.map(task => (
                      <TaskRow key={task.id} task={task} teamUsers={teamUsers} freelancers={freelancers}
                        onUpdate={updateTask} onDelete={() => {}} isMobile={false} />
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
