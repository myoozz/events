import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function FeedbackAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function markDone(item) {
    // Update status
    await supabase.from('feedback').update({ status: 'done' }).eq('id', item.id)

    // TODO: When notification system is built, ping the user here
    // For now — update local state
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done' } : i))
  }

  async function markStatus(id, status) {
    await supabase.from('feedback').update({ status }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const STATUS_STYLES = {
    new:      { bg: '#FEF3C7', color: '#92400E', label: 'New' },
    reviewed: { bg: '#DBEAFE', color: '#1E40AF', label: 'Reviewed' },
    planned:  { bg: '#EDE9FE', color: '#5B21B6', label: 'Planned' },
    done:     { bg: '#D1FAE5', color: '#065F46', label: 'Done ✓' },
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)
  const newCount = items.filter(i => i.status === 'new').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
            Feedback
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {newCount > 0
              ? `${newCount} new feedback item${newCount > 1 ? 's' : ''} waiting for your review`
              : 'All feedback reviewed — good job.'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '0.5px solid var(--border)', paddingBottom: '0' }}>
        {[
          { key: 'new', label: `New (${items.filter(i => i.status === 'new').length})` },
          { key: 'reviewed', label: 'Reviewed' },
          { key: 'planned', label: 'Planned' },
          { key: 'done', label: 'Done' },
          { key: 'all', label: 'All' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: filter === tab.key ? 'var(--text)' : 'var(--text-tertiary)',
              fontWeight: filter === tab.key ? 500 : 400,
              borderBottom: filter === tab.key ? '2px solid var(--text)' : '2px solid transparent',
              marginBottom: '-1px',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No feedback in this category.</p>
        </div>
      )}

      {!loading && filtered.map(item => {
        const ss = STATUS_STYLES[item.status] || STATUS_STYLES.new
        return (
          <div key={item.id} style={{
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px 18px',
            marginBottom: '8px',
            background: item.status === 'done' ? 'var(--bg-secondary)' : 'var(--bg)',
            opacity: item.status === 'done' ? 0.7 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                {/* Message */}
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, marginBottom: '10px' }}>
                  {item.message}
                </p>
                {/* Meta */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {item.submitted_by}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {/* Status badge */}
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {item.status !== 'done' && (
                  <>
                    {item.status === 'new' && (
                      <button onClick={() => markStatus(item.id, 'reviewed')}
                        style={{ padding: '5px 12px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
                        Mark reviewed
                      </button>
                    )}
                    {item.status === 'reviewed' && (
                      <button onClick={() => markStatus(item.id, 'planned')}
                        style={{ padding: '5px 12px', fontSize: '11px', fontFamily: 'var(--font-body)', background: '#EDE9FE', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: '#5B21B6', fontWeight: 500 }}>
                        Mark planned
                      </button>
                    )}
                    <button onClick={() => markDone(item)}
                      style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      Done ✓
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
