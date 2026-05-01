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

  const CATEGORY_TYPES = [
    { value: 'rental',         label: 'Rental' },
    { value: 'creative_print', label: 'Creative & Print' },
    { value: 'booking',        label: 'Booking' },
    { value: 'service',        label: 'Service' },
    { value: 'permissions',    label: 'Permissions' },
  ];

  const [activeTab, setActiveTab] = useState('categories');
  const [stageConfig, setStageConfig] = useState({});
  const [stageLoading, setStageLoading] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [openPanels, setOpenPanels] = useState({});

  useEffect(() => {
    if (activeTab === 'stages') fetchStageConfig();
  }, [activeTab]);

  const fetchStageConfig = async () => {
    setStageLoading(true);
    const { data, error } = await supabase
      .from('category_stage_config')
      .select('*')
      .order('category_type')
      .order('sort_order');
    if (!error && data) {
      const grouped = {};
      CATEGORY_TYPES.forEach(t => { grouped[t.value] = []; });
      data.forEach(row => {
        if (grouped[row.category_type]) grouped[row.category_type].push(row);
      });
      setStageConfig(grouped);
    }
    setStageLoading(false);
  };

  const updateCategoryType = async (categoryId, newType) => {
    const { error } = await supabase
      .from('event_categories')
      .update({ category_type: newType || null })
      .eq('id', categoryId);
    if (!error) {
      setCategories(prev =>
        prev.map(c => c.id === categoryId ? { ...c, category_type: newType || null } : c)
      );
    }
  };

  const updateStageName = async (stageId, newName) => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from('category_stage_config')
      .update({ stage_name: newName.trim() })
      .eq('id', stageId);
    if (!error) fetchStageConfig();
  };

  const updateStageDays = async (stageId, newDays) => {
    const parsed = parseInt(newDays, 10);
    if (isNaN(parsed) || parsed < 0) return;
    const { error } = await supabase
      .from('category_stage_config')
      .update({ days_before_event: parsed })
      .eq('id', stageId);
    if (!error) fetchStageConfig();
  };

  const toggleStageTerminal = async (stageId, current) => {
    const { error } = await supabase
      .from('category_stage_config')
      .update({ is_terminal: !current })
      .eq('id', stageId);
    if (!error) fetchStageConfig();
  };

  const moveStage = async (typeKey, index, direction) => {
    const stages = [...stageConfig[typeKey]];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stages.length) return;
    const updates = [
      { id: stages[index].id,     sort_order: stages[swapIndex].sort_order },
      { id: stages[swapIndex].id, sort_order: stages[index].sort_order },
    ];
    await Promise.all(updates.map(u =>
      supabase.from('category_stage_config').update({ sort_order: u.sort_order }).eq('id', u.id)
    ));
    fetchStageConfig();
  };

  const addStage = async (typeKey) => {
    const stages = stageConfig[typeKey] || [];
    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) : 0;
    const { error } = await supabase
      .from('category_stage_config')
      .insert({ category_type: typeKey, stage_name: 'New Stage', sort_order: maxOrder + 1, days_before_event: 0 });
    if (!error) fetchStageConfig();
  };

  const deleteStage = async (stageId) => {
    const { error } = await supabase
      .from('category_stage_config')
      .delete()
      .eq('id', stageId);
    if (!error) fetchStageConfig();
  };

  const togglePanel = (typeKey) => {
    setOpenPanels(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

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

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #d8d2c8', marginBottom: 20 }}>
        {[
          { key: 'categories', label: 'Categories' },
          { key: 'stages',     label: 'Stage Config' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #bc1723' : '2px solid transparent',
              color: activeTab === tab.key ? '#1a1008' : '#7a7060',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fde8ea', border: '1px solid #f5b5ba', borderRadius: 6, padding: '10px 14px', color: '#bc1723', fontSize: 13, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#bc1723', fontSize: 16 }}>×</button>
        </div>
      )}

      {activeTab === 'categories' && (loading ? (
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

              <select
                value={cat.category_type || ''}
                onChange={e => updateCategoryType(cat.id, e.target.value)}
                style={{
                  fontSize: 11,
                  padding: '3px 7px',
                  border: '1px solid #d8d2c8',
                  borderRadius: 4,
                  background: '#fff',
                  color: cat.category_type ? '#1a1008' : '#7a7060',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minWidth: 120,
                  flexShrink: 0,
                }}
              >
                <option value="">Untyped</option>
                {CATEGORY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

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
      ))}

      {activeTab === 'stages' && (
        <div>
          {stageLoading ? (
            <p style={{ color: '#7a7060', fontSize: 13 }}>Loading stage config…</p>
          ) : (
            CATEGORY_TYPES.map(type => {
              const stages = stageConfig[type.value] || [];
              const isOpen = !!openPanels[type.value];
              return (
                <div
                  key={type.value}
                  style={{
                    border: '1px solid #d8d2c8',
                    borderRadius: 8,
                    marginBottom: 12,
                    background: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  {/* Panel Header */}
                  <div
                    onClick={() => togglePanel(type.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      cursor: 'pointer',
                      background: isOpen ? '#f2efe9' : '#fff',
                      borderBottom: isOpen ? '1px solid #d8d2c8' : 'none',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1008' }}>
                        {type.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#7a7060', marginLeft: 10 }}>
                        {stages.length} stage{stages.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#7a7060' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Panel Body */}
                  {isOpen && (
                    <div style={{ padding: '12px 18px 16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f2efe9' }}>
                            <th style={{ padding: '5px 8px 5px 0', textAlign: 'left', color: '#7a7060', fontWeight: 500, width: 32 }}>#</th>
                            <th style={{ padding: '5px 8px', textAlign: 'left', color: '#7a7060', fontWeight: 500 }}>Stage Name</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: '#7a7060', fontWeight: 500, width: 80 }}>Days Before</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: '#7a7060', fontWeight: 500, width: 72 }}>Terminal</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: '#7a7060', fontWeight: 500, width: 90 }}>Reorder</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: '#7a7060', fontWeight: 500, width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage, idx) => (
                            <tr key={stage.id} style={{ borderBottom: '1px solid #f2efe9' }}>
                              <td style={{ padding: '7px 8px 7px 0', color: '#7a7060' }}>
                                {stage.sort_order}
                              </td>

                              <td style={{ padding: '7px 8px' }}>
                                {editingStage?.id === stage.id && editingStage.field === 'name' ? (
                                  <input
                                    autoFocus
                                    defaultValue={stage.stage_name}
                                    onBlur={e => {
                                      updateStageName(stage.id, e.target.value);
                                      setEditingStage(null);
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { updateStageName(stage.id, e.target.value); setEditingStage(null); }
                                      if (e.key === 'Escape') setEditingStage(null);
                                    }}
                                    style={{ fontSize: 12, border: '1px solid #d8d2c8', borderRadius: 4, padding: '3px 7px', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
                                  />
                                ) : (
                                  <span
                                    onDoubleClick={() => setEditingStage({ id: stage.id, field: 'name' })}
                                    style={{ cursor: 'text', color: stage.is_terminal ? '#1a6b3a' : '#1a1008' }}
                                    title="Double-click to edit"
                                  >
                                    {stage.stage_name}
                                    {stage.is_terminal && (
                                      <span style={{ fontSize: 10, background: '#e6f4ec', color: '#1a6b3a', padding: '1px 5px', borderRadius: 3, marginLeft: 6 }}>
                                        Final
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                {editingStage?.id === stage.id && editingStage.field === 'days' ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    min={0}
                                    defaultValue={stage.days_before_event}
                                    onBlur={e => { updateStageDays(stage.id, e.target.value); setEditingStage(null); }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { updateStageDays(stage.id, e.target.value); setEditingStage(null); }
                                      if (e.key === 'Escape') setEditingStage(null);
                                    }}
                                    style={{ fontSize: 12, border: '1px solid #d8d2c8', borderRadius: 4, padding: '3px 6px', width: 60, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}
                                  />
                                ) : (
                                  <span
                                    onDoubleClick={() => setEditingStage({ id: stage.id, field: 'days' })}
                                    style={{ cursor: 'text', fontFamily: 'DM Mono, monospace', fontSize: 12 }}
                                    title="Double-click to edit"
                                  >
                                    {stage.days_before_event}d
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={stage.is_terminal}
                                  onChange={() => toggleStageTerminal(stage.id, stage.is_terminal)}
                                  style={{ cursor: 'pointer', accentColor: '#1a6b3a' }}
                                  title="Mark as terminal (final) stage"
                                />
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => moveStage(type.value, idx, 'up')}
                                  disabled={idx === 0}
                                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 12, padding: '0 3px' }}
                                >↑</button>
                                <button
                                  onClick={() => moveStage(type.value, idx, 'down')}
                                  disabled={idx === stages.length - 1}
                                  style={{ background: 'none', border: 'none', cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === stages.length - 1 ? 0.3 : 1, fontSize: 12, padding: '0 3px' }}
                                >↓</button>
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete stage "${stage.stage_name}"?`)) deleteStage(stage.id);
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7060', fontSize: 13 }}
                                  title="Delete stage"
                                >×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <button
                        onClick={() => addStage(type.value)}
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          padding: '5px 12px',
                          background: 'none',
                          border: '1px dashed #d8d2c8',
                          borderRadius: 4,
                          color: '#7a7060',
                          cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        + Add Stage
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#7a7060', marginTop: 16 }}>
        Double-click any name to rename · Rename cascades to all rate card and element data · Deactivated categories are hidden from dropdowns but existing data is preserved.
      </p>
    </div>
  );
}
