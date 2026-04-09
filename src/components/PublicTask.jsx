import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const STATUS_OPTIONS = ['not_started','in_progress','arranged','on_site','done']
const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  arranged: 'Arranged ✓',
  on_site: 'On site',
  done: 'Done ✓',
}
const STATUS_COLORS = {
  not_started: { bg:'#F3F4F6', color:'#6B7280' },
  in_progress:  { bg:'#DBEAFE', color:'#1E40AF' },
  arranged:     { bg:'#FEF3C7', color:'#92400E' },
  on_site:      { bg:'#EDE9FE', color:'#5B21B6' },
  done:         { bg:'#D1FAE5', color:'#065F46' },
}

export default function PublicTask() {
  const { token } = useParams()
  const [task, setTask] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => { load() }, [token])

  async function load() {
    const { data: t } = await supabase.from('tasks')
      .select('*, elements(element_name, size, size_unit, qty, days, finish, source, city)')
      .eq('public_token', token).single()
    if (!t) { setLoading(false); return }
    const task = {
      ...t,
      element_name: t.elements?.element_name || '',
      size: t.elements?.size || '',
      size_unit: t.elements?.size_unit || '',
      qty: t.elements?.qty || '',
      days: t.elements?.days || '',
      finish: t.elements?.finish || '',
      source: t.elements?.source || '',
      city: t.elements?.city || '',
    }
    setTask(task)
    setNotes(t.notes || '')
    const { data: ev } = await supabase.from('events').select('event_name, clients(group_name)').eq('id', t.event_id).single()
    setEvent(ev)
    setLoading(false)
  }

  async function updateStatus(status) {
    setSaving(true)
    await supabase.from('tasks').update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('public_token', token)
    setTask(p => ({ ...p, status }))
    setSaving(false)
  }

  async function saveNotes() {
    await supabase.from('tasks').update({ notes }).eq('public_token', token)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F7', fontFamily: 'var(--font-body)' }}>
      <p style={{ color: '#6B7280' }}>Loading...</p>
    </div>
  )

  if (!task) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F7', fontFamily: 'var(--font-body)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '20px', color: '#1A1917', marginBottom: '8px' }}>Task not found</p>
        <p style={{ fontSize: '13px', color: '#6B7280' }}>This link may be invalid or expired.</p>
      </div>
    </div>
  )

  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.not_started

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F7', fontFamily: 'system-ui, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {event?.clients?.group_name || 'Myoozz Events'}
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1A1917', marginBottom: '4px' }}>
            {event?.event_name || 'Event'}
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>{task.category}</p>
        </div>

        {/* Task card */}
        <div style={{ background: 'white', border: '0.5px solid #E0DDD8', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1917', marginBottom: '8px' }}>
              {task.element_name}
            </h2>
            {/* Element details */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {task.size && <span style={{ fontSize: '12px', padding: '3px 10px', background: '#F3F4F6', borderRadius: '20px', color: '#374151' }}>📐 {task.size}{task.size_unit ? ' '+task.size_unit : ''}</span>}
              {task.qty && <span style={{ fontSize: '12px', padding: '3px 10px', background: '#F3F4F6', borderRadius: '20px', color: '#374151' }}>× {task.qty} nos</span>}
              {task.days && <span style={{ fontSize: '12px', padding: '3px 10px', background: '#F3F4F6', borderRadius: '20px', color: '#374151' }}>📅 {task.days} day{task.days > 1 ? 's' : ''}</span>}
              {task.city && <span style={{ fontSize: '12px', padding: '3px 10px', background: '#F3F4F6', borderRadius: '20px', color: '#374151' }}>📍 {task.city}</span>}
            </div>
            {task.finish && <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Spec: {task.finish}</p>}
            {task.source && <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Vendor: {task.source}</p>}

            {task.deadline && (
              <p style={{ fontSize: '13px', color: new Date(task.deadline) < new Date() && task.status !== 'done' ? '#A32D2D' : '#6B7280', marginBottom: '16px' }}>
                {new Date(task.deadline) < new Date() && task.status !== 'done' ? '⚠️ ' : '📅 '}
                Deadline: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            {/* Current status */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Current status</p>
              <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, background: sc.bg, color: sc.color }}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>

            {/* Update status */}
            <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Update status</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STATUS_OPTIONS.map(s => {
                const c = STATUS_COLORS[s]
                const isActive = task.status === s
                return (
                  <button key={s} onClick={() => !isActive && updateStatus(s)} disabled={saving || isActive}
                    style={{
                      padding: '12px 16px', fontSize: '14px', fontWeight: isActive ? 600 : 400,
                      textAlign: 'left', borderRadius: '8px', cursor: isActive ? 'default' : 'pointer',
                      background: isActive ? c.bg : '#F9F9F7',
                      color: isActive ? c.color : '#6B7280',
                      border: `1.5px solid ${isActive ? c.color : '#E0DDD8'}`,
                      transition: 'all 0.15s',
                    }}>
                    {isActive ? '● ' : '○ '}{STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div style={{ borderTop: '0.5px solid #E0DDD8', padding: '16px 20px', background: '#FAFAF8' }}>
            <p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Notes / updates</p>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add any notes, updates, or issues here..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '0.5px solid #E0DDD8', borderRadius: '8px', resize: 'none', fontFamily: 'system-ui, sans-serif', color: '#1A1917', background: 'white', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#B8B4AE', textAlign: 'center' }}>
          Powered by Myoozz Events · myoozzevents.netlify.app
        </p>
      </div>
    </div>
  )
}
