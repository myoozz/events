import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function CategoryManager({ userRole }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('event_categories')
      .select('id, name, slug, sort_order, is_active')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data)
        setLoading(false)
      })
  }, [])

  if (userRole !== 'admin') return null

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
        Categories
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
        Master category list — single source of truth for all event budgets.
      </p>

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Slug</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>{cat.sort_order}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{cat.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{cat.slug}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    background: cat.is_active ? 'var(--green-light)' : 'var(--bg-secondary)',
                    color: cat.is_active ? 'var(--green)' : 'var(--text-tertiary)',
                  }}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
