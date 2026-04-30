import { useState, useEffect } from 'react'
import { CATEGORY_SUGGESTIONS } from './CategoryLibrary'
import { supabase } from '../supabase'

export default function CategoryPicker({ existingCategories, onAdd, onClose }) {
  const [selected, setSelected] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])

  useEffect(() => {
    supabase
      .from('event_categories')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setAvailableCategories(data?.map(c => c.name) || []))
  }, [])

  const existing = existingCategories.map(c => c.name)
  const available = availableCategories.filter(mc => !existing.includes(mc))

  function toggle(mc) {
    setSelected(prev =>
      prev.includes(mc) ? prev.filter(s => s !== mc) : [...prev, mc]
    )
  }

  function handleAddSelected() {
    selected.forEach(name => onAdd(name))
    setSelected([])
    // Keep picker open so user can add more if needed
    // Close only if they explicitly click Done or ✕
  }

  const totalSuggestions = selected.reduce((s, mc) => s + (CATEGORY_SUGGESTIONS[mc]?.length || 0), 0)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,25,21,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 400, padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '28px 32px',
        maxWidth: '600px', width: '100%', maxHeight: '82vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
              Add categories
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Select one or more. Each comes with suggested elements to speed things up.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-tertiary)', padding: '0 4px', marginLeft: '16px', flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
              Standard categories {available.length === 0 ? '— all added' : `(${available.length} available)`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {available.map(mc => {
                const isSelected = selected.includes(mc)
                const count = CATEGORY_SUGGESTIONS[mc]?.length || 0
                return (
                  <button
                    key={mc}
                    onClick={() => toggle(mc)}
                    style={{
                      textAlign: 'left', padding: '10px 14px', fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      background: isSelected ? 'var(--text)' : 'var(--bg-secondary)',
                      border: `0.5px solid ${isSelected ? 'var(--text)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      color: isSelected ? 'var(--bg)' : 'var(--text)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                        border: `1.5px solid ${isSelected ? 'var(--bg)' : 'var(--border-strong)'}`,
                        background: isSelected ? 'var(--bg)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l2 2L6.5 2" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span>{mc}</span>
                    </div>
                    {count > 0 && (
                      <span style={{ fontSize: '10px', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)', flexShrink: 0, marginLeft: '8px' }}>
                        {count} items
                      </span>
                    )}
                  </button>
                )
              })}
              {available.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', gridColumn: '1/-1' }}>
                  All standard categories already added.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer — sticky */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '16px', borderTop: '0.5px solid var(--border)', marginTop: '16px', flexShrink: 0,
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {selected.length === 0
              ? 'Select categories above'
              : `${selected.length} selected · ${totalSuggestions} elements will be pre-filled`}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
              Done
            </button>
            {selected.length > 0 && (
              <button
                onClick={handleAddSelected}
                style={{
                  padding: '8px 20px', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'var(--font-body)', background: 'var(--text)',
                  color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >
                Add {selected.length} {selected.length === 1 ? 'category' : 'categories'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
