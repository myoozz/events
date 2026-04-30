import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CategoryManager({ userRole }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (userRole !== 'admin') return null;

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('sort_order');
    if (!error) setCategories(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const slug = generateSlug(newName.trim());
    const maxOrder = categories.length > 0
      ? Math.max(...categories.map(c => c.sort_order))
      : 0;
    setAdding(true);
    const { error } = await supabase
      .from('event_categories')
      .insert({ name: newName.trim(), slug, sort_order: maxOrder + 1 });
    if (error) { setError(error.message); } else { setNewName(''); await fetchCategories(); }
    setAdding(false);
  }

  async function handleRename(cat) {
    if (!editingName.trim() || editingName.trim() === cat.name) {
      setEditingId(null);
      return;
    }
    const newSlug = generateSlug(editingName.trim());
    const oldName = cat.name;
    const newNameTrimmed = editingName.trim();
    setSaving(true);
    const { error: e1 } = await supabase
      .from('event_categories')
      .update({ name: newNameTrimmed, slug: newSlug })
      .eq('id', cat.id);
    if (e1) { setError(e1.message); setSaving(false); return; }
    await supabase.from('rate_cards').update({ category: newNameTrimmed }).eq('category', oldName);
    await supabase.from('elements').update({ category: newNameTrimmed }).eq('category', oldName);
    setEditingId(null);
    await fetchCategories();
    setSaving(false);
  }

  async function handleToggleActive(cat) {
    await supabase
      .from('event_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    await fetchCategories();
  }

  async function handleMove(index, direction) {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const aOrder = categories[index].sort_order;
    const bOrder = categories[swapIndex].sort_order;
    await supabase.from('event_categories').update({ sort_order: bOrder }).eq('id', categories[index].id);
    await supabase.from('event_categories').update({ sort_order: aOrder }).eq('id', categories[swapIndex].id);
    await fetchCategories();
  }

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#bc1723', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Admin · Category Manager
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, color: '#1a1008', lineHeight: 1.2 }}>
          Category Registry
        </h1>
        <p style={{ color: '#7a7060', marginTop: 8, fontSize: 14 }}>
          Single source of truth for all categories across ElementBuilder and Rate Card.
          Renaming here updates it everywhere automatically.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fde8ea', border: '1px solid #f5b5ba', borderRadius: 6, padding: '10px 14px', color: '#bc1723', fontSize: 13, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#bc1723', fontSize: 16 }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#7a7060', fontSize: 13 }}>Loading categories...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #d8d2c8', borderRadius: 8 }}>
          {categories.map((cat, index) => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: index < categories.length - 1 ? '1px solid #f2efe9' : 'none',
              opacity: cat.is_active ? 1 : 0.5
            }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => handleMove(index, -1)} disabled={index === 0}
                  style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: '#7a7060', fontSize: 11, padding: '1px 4px', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => handleMove(index, 1)} disabled={index === categories.length - 1}
                  style={{ background: 'none', border: 'none', cursor: index === categories.length - 1 ? 'default' : 'pointer', color: '#7a7060', fontSize: 11, padding: '1px 4px', opacity: index === categories.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#d8d2c8', width: 20, textAlign: 'center' }}>
                {cat.sort_order}
              </div>

              {editingId === cat.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(cat); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={() => handleRename(cat)}
                  style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 14, border: '1px solid #bc1723', borderRadius: 4, padding: '4px 8px', outline: 'none', color: '#1a1008' }}
                />
              ) : (
                <div
                  style={{ flex: 1, fontSize: 14, color: '#1a1008', cursor: 'text' }}
                  onDoubleClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                >
                  {cat.name}
                </div>
              )}

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8b0a0', minWidth: 160 }}>
                {cat.slug}
              </div>

              <div style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3,
                textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 64, textAlign: 'center',
                background: cat.is_active ? '#e6f4ec' : '#e8e4dc',
                color: cat.is_active ? '#1a6b3a' : '#7a7060'
              }}>
                {cat.is_active ? 'Active' : 'Inactive'}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                  style={{ fontSize: 11, color: '#1a4b8a', background: '#e8eef8', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}
                >
                  Rename
                </button>
                <button
                  onClick={() => handleToggleActive(cat)}
                  style={{ fontSize: 11, color: '#7a7060', background: '#f2efe9', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}
                >
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}

          <div style={{ padding: '12px 16px', background: '#faf8f5', borderTop: '1px solid #e8e4dc', display: 'flex', gap: 10, alignItems: 'center', borderRadius: '0 0 8px 8px' }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="New category name"
              style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, border: '1px solid #d8d2c8', borderRadius: 4, padding: '6px 10px', outline: 'none', color: '#1a1008', background: '#fff' }}
            />
            {newName && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#b8b0a0' }}>
                {generateSlug(newName)}
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              style={{
                background: newName.trim() ? '#bc1723' : '#e8e4dc',
                color: newName.trim() ? '#fff' : '#b8b0a0',
                border: 'none', borderRadius: 4, padding: '6px 14px',
                fontSize: 13, cursor: newName.trim() ? 'pointer' : 'default',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500
              }}
            >
              {adding ? 'Adding...' : '+ Add Category'}
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: '#7a7060', marginTop: 16 }}>
        Double-click any name to rename · Rename cascades to all rate card and element data · Deactivated categories are hidden from dropdowns but existing data is preserved.
      </p>
    </div>
  );
}
