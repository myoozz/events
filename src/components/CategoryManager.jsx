import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Icon } from '../icons';

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
  const [aliases, setAliases] = useState({});
  const [customCats, setCustomCats] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myTenantId, setMyTenantId] = useState(null);
  const [editingAlias, setEditingAlias] = useState(null);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
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
    const { data: { session } } = await supabase.auth.getSession();
    const payload = session?.access_token
      ? JSON.parse(atob(session.access_token.split('.')[1])) : {};
    const sa = payload.platform_role === 'super_admin';
    const tenantId = payload.tenant_id;
    setIsSuperAdmin(sa);
    setMyTenantId(tenantId);
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('sort_order');
    if (!error) setCategories(data || []);
    if (sa) {
      const { data: pending } = await supabase
        .from('tenant_category_config')
        .select('*, tenants(name)')
        .eq('sa_status', 'pending')
        .eq('is_custom', true);
      setPendingSuggestions(pending || []);
    } else {
      const { data: tenantConfig } = await supabase
        .from('tenant_category_config')
        .select('*')
        .eq('tenant_id', tenantId);
      const aliasMap = {};
      const customs = [];
      (tenantConfig || []).forEach(row => {
        if (!row.is_custom && row.alias) aliasMap[row.category_id] = { id: row.id, alias: row.alias };
        if (row.is_custom) customs.push(row);
      });
      setAliases(aliasMap);
      setCustomCats(customs);
    }
    setLoading(false);
  }

  const saveAlias = async (categoryId, aliasText) => {
    const existing = aliases[categoryId];
    if (!aliasText.trim()) { removeAlias(categoryId); return; }
    if (existing) {
      await supabase.from('tenant_category_config')
        .update({ alias: aliasText.trim() })
        .eq('id', existing.id);
    } else {
      await supabase.from('tenant_category_config')
        .insert({ tenant_id: myTenantId, category_id: categoryId, alias: aliasText.trim(), is_custom: false, sa_status: 'accepted' });
    }
    setEditingAlias(null);
    await fetchCategories();
  };

  const removeAlias = async (categoryId) => {
    const existing = aliases[categoryId];
    if (existing) {
      await supabase.from('tenant_category_config').delete().eq('id', existing.id);
      await fetchCategories();
    }
  };

  const addCustomCategory = async (name) => {
    if (!name.trim()) return;
    await supabase.from('tenant_category_config').insert({
      tenant_id: myTenantId, category_id: null,
      custom_name: name.trim(), is_custom: true, sa_status: 'pending',
    });
    await fetchCategories();
  };

  const handleSASuggestion = async (id, accept, customName) => {
    if (accept) {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
      const slug = customName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await supabase.from('event_categories')
        .insert({ name: customName, slug, sort_order: maxOrder + 1, is_active: true });
      await supabase.from('tenant_category_config')
        .update({ sa_status: 'accepted' }).eq('id', id);
    } else {
      await supabase.from('tenant_category_config')
        .update({ sa_status: 'rejected' }).eq('id', id);
    }
    await fetchCategories();
  };

  const CATEGORY_TYPES = [
    { value: 'rental',           label: 'Rental' },
    { value: 'creative_print',   label: 'Creative & Print' },
    { value: 'booking',          label: 'Booking' },
    { value: 'service',          label: 'Service' },
    { value: 'permissions',      label: 'Permissions' },
    { value: 'print_only',       label: 'Print Only' },
    { value: 'print_fabrication', label: 'Print & Fabrication' },
    { value: 'design_digital',         label: 'Design — Digital Output' },
    { value: 'purchase_procurement',   label: 'Purchase & Procurement' },
  ];

  const [activeTab, setActiveTab] = useState('categories');
  const [stageConfig, setStageConfig] = useState({});
  const [stageLoading, setStageLoading] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [isCustomised, setIsCustomised] = useState({});
  const [openPanels, setOpenPanels] = useState({});

  useEffect(() => {
    if (activeTab === 'stages') fetchStageConfig();
  }, [activeTab]);

  const fetchStageConfig = async () => {
    setStageLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload = session?.access_token
      ? JSON.parse(atob(session.access_token.split('.')[1])) : {};
    const tenantId = payload.tenant_id;
    const sa = payload.platform_role === 'super_admin';
    setMyTenantId(tenantId);
    setIsSuperAdmin(sa);
    if (sa) {
      const { data } = await supabase
        .from('category_stage_config')
        .select('*')
        .is('tenant_id', null)
        .order('sort_order');
      const grouped = {};
      (data || []).forEach(r => {
        if (!grouped[r.category_type]) grouped[r.category_type] = [];
        grouped[r.category_type].push(r);
      });
      setStageConfig(grouped);
      setIsCustomised({});
    } else {
      const [{ data: defaults }, { data: overrides }] = await Promise.all([
        supabase.from('category_stage_config').select('*').is('tenant_id', null).order('sort_order'),
        supabase.from('category_stage_config').select('*').eq('tenant_id', tenantId).order('sort_order'),
      ]);
      const defaultMap = {}, overrideMap = {}, customised = {};
      (defaults || []).forEach(r => {
        if (!defaultMap[r.category_type]) defaultMap[r.category_type] = [];
        defaultMap[r.category_type].push(r);
      });
      (overrides || []).forEach(r => {
        if (!overrideMap[r.category_type]) overrideMap[r.category_type] = [];
        overrideMap[r.category_type].push(r);
      });
      const merged = {};
      const allKeys = new Set([...Object.keys(defaultMap), ...Object.keys(overrideMap)]);
      allKeys.forEach(key => {
        if (overrideMap[key]?.length > 0) {
          merged[key] = overrideMap[key];
          customised[key] = true;
        } else {
          merged[key] = (defaultMap[key] || []).map(r => ({ ...r, _isDefault: true }));
          customised[key] = false;
        }
      });
      setStageConfig(merged);
      setIsCustomised(customised);
    }
    setStageLoading(false);
  };

  const updateCategoryType = async (categoryId, newType) => {
    if (!isSuperAdmin) return;
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
    let query = supabase.from('category_stage_config').update({ stage_name: newName.trim() }).eq('id', stageId);
    if (!isSuperAdmin) query = query.eq('tenant_id', myTenantId);
    const { error } = await query;
    if (!error) fetchStageConfig();
  };

  const updateStageDays = async (stageId, newDays) => {
    const parsed = parseInt(newDays, 10);
    if (isNaN(parsed) || parsed < 0) return;
    let query = supabase.from('category_stage_config').update({ days_before_event: parsed }).eq('id', stageId);
    if (!isSuperAdmin) query = query.eq('tenant_id', myTenantId);
    const { error } = await query;
    if (!error) fetchStageConfig();
  };

  const toggleStageTerminal = async (stageId, current) => {
    let query = supabase.from('category_stage_config').update({ is_terminal: !current }).eq('id', stageId);
    if (!isSuperAdmin) query = query.eq('tenant_id', myTenantId);
    const { error } = await query;
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
      .insert({ category_type: typeKey, stage_name: 'New Stage', sort_order: maxOrder + 1, days_before_event: 0, tenant_id: isSuperAdmin ? null : myTenantId });
    if (!error) fetchStageConfig();
  };

  const deleteStage = async (stageId) => {
    let query = supabase.from('category_stage_config').delete().eq('id', stageId);
    if (!isSuperAdmin) query = query.eq('tenant_id', myTenantId);
    const { error } = await query;
    if (!error) fetchStageConfig();
  };

  const customiseCategory = async (typeKey) => {
    const rows = stageConfig[typeKey] || [];
    const inserts = rows.map(({ id, created_at, tenant_id, _isDefault, ...rest }) => ({
      ...rest, tenant_id: myTenantId,
    }));
    await supabase.from('category_stage_config').insert(inserts);
    fetchStageConfig();
  };

  const resetToDefault = async (typeKey) => {
    await supabase.from('category_stage_config')
      .delete()
      .eq('category_type', typeKey)
      .eq('tenant_id', myTenantId);
    fetchStageConfig();
  };

  const togglePanel = (typeKey) => {
    setOpenPanels(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

  async function handleAdd() {
    if (!isSuperAdmin) return;
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

  async function handleRename(catId, newName) {
    if (!isSuperAdmin) return;
    if (!newName?.trim()) { setEditingName(null); return; }
    const cat = categories.find(c => c.id === catId);
    if (!cat || newName.trim() === cat.name) { setEditingName(null); return; }
    const newSlug = generateSlug(newName.trim());
    const oldName = cat.name;
    const newNameTrimmed = newName.trim();
    setSaving(true);
    const { error: e1 } = await supabase
      .from('event_categories')
      .update({ name: newNameTrimmed, slug: newSlug })
      .eq('id', catId);
    if (e1) { setError(e1.message); setSaving(false); return; }
    await supabase.from('rate_cards').update({ category: newNameTrimmed }).eq('category', oldName);
    await supabase.from('elements').update({ category: newNameTrimmed }).eq('category', oldName);
    setEditingName(null);
    await fetchCategories();
    setSaving(false);
  }

  async function handleToggleActive(cat) {
    if (!isSuperAdmin) return;
    await supabase
      .from('event_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    await fetchCategories();
  }

  async function handleMove(index, direction) {
    if (!isSuperAdmin) return;
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
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--app-accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Admin · Category Manager
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, color: 'var(--app-ink)', lineHeight: 1.2 }}>
          Category Registry
        </h1>
        <p style={{ color: 'var(--app-text-dim-lg)', marginTop: 8, fontSize: 14 }}>
          Single source of truth for all categories across ElementBuilder and Rate Card.
          Renaming here updates it everywhere automatically.
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--app-border)', marginBottom: 20 }}>
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
              borderBottom: activeTab === tab.key ? '2px solid var(--app-accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--app-ink)' : 'var(--app-text-dim-lg)',
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
        <div style={{ background: 'var(--state-danger-bg)', border: '1px solid var(--state-danger-bg)', borderRadius: 6, padding: '10px 14px', color: 'var(--app-accent)', fontSize: 13, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-accent)', fontSize: 16 }}>×</button>
        </div>
      )}

      {activeTab === 'categories' && (loading ? (
        <div style={{ color: 'var(--app-text-dim-lg)', fontSize: 13 }}>Loading categories...</div>
      ) : (
        <>
        <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8 }}>
          <style>{`
            .cm-cat-slug { opacity: 0; transition: opacity 0.15s ease; }
            .cm-cat-row:hover .cm-cat-slug { opacity: 1; }
          `}</style>
          {categories.map((cat, index) => (
            <div key={cat.id} className="cm-cat-row" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: index < categories.length - 1 ? '1px solid var(--app-surface)' : 'none',
              opacity: cat.is_active ? 1 : 0.5
            }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => handleMove(index, -1)} disabled={index === 0}
                  style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: 'var(--app-text-dim-lg)', fontSize: 11, padding: '1px 4px', opacity: index === 0 ? 0.3 : 1 }}><Icon name="sortUp" size={12} /></button>
                <button onClick={() => handleMove(index, 1)} disabled={index === categories.length - 1}
                  style={{ background: 'none', border: 'none', cursor: index === categories.length - 1 ? 'default' : 'pointer', color: 'var(--app-text-dim-lg)', fontSize: 11, padding: '1px 4px', opacity: index === categories.length - 1 ? 0.3 : 1 }}><Icon name="sortDown" size={12} /></button>
              </div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--app-border)', width: 20, textAlign: 'center' }}>
                {cat.sort_order}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {isSuperAdmin ? (
                  editingName?.id === cat.id ? (
                    <input autoFocus defaultValue={cat.name}
                      onBlur={e => handleRename(cat.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(cat.id, e.target.value); if (e.key === 'Escape') setEditingName(null); }}
                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, border: '1px solid var(--app-accent)', borderRadius: 4, padding: '4px 8px', outline: 'none', color: 'var(--app-ink)' }} />
                  ) : (
                    <span onDoubleClick={() => setEditingName({ id: cat.id })}
                      style={{ fontWeight: 500, fontSize: 14, cursor: 'text', color: 'var(--app-ink)' }}>{cat.name}</span>
                  )
                ) : (
                  editingAlias === cat.id ? (
                    <input autoFocus defaultValue={aliases[cat.id]?.alias || cat.name}
                      onBlur={e => saveAlias(cat.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveAlias(cat.id, e.target.value); if (e.key === 'Escape') setEditingAlias(null); }}
                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, border: '1px solid var(--app-accent)', borderRadius: 4, padding: '4px 8px', outline: 'none', color: 'var(--app-ink)' }} />
                  ) : (
                    <span onDoubleClick={() => setEditingAlias(cat.id)} style={{ cursor: 'text' }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--app-ink)' }}>
                        {aliases[cat.id]?.alias || cat.name}
                      </span>
                      {aliases[cat.id] && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--app-text-dim-lg)', marginLeft: 6 }}>({cat.name})</span>
                          <button onClick={() => removeAlias(cat.id)}
                            style={{ marginLeft: 4, fontSize: 10, color: 'var(--app-text-dim-lg)', background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="close" size={11} /></button>
                        </>
                      )}
                    </span>
                  )
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="cm-cat-slug" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--app-text-dim)' }}>
                    {cat.slug}
                  </span>
                  <span style={{ fontSize: 11, color: '#b8b0a0', flexShrink: 0 }}>Type</span>
                  <select
                    value={cat.category_type || ''}
                    onChange={e => updateCategoryType(cat.id, e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '1px 5px',
                      border: '1px solid #e8e4dc',
                      borderRadius: 3,
                      background: 'var(--app-bg)',
                      color: cat.category_type ? 'var(--app-ink)' : 'var(--app-text-dim-lg)',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      height: 22,
                    }}
                  >
                    <option value="">Untyped</option>
                    {CATEGORY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                  textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 64, textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  background: cat.is_active ? 'var(--state-success-bg)' : '#e8e4dc',
                  color: cat.is_active ? 'var(--state-success)' : 'var(--app-text-dim-lg)'
                }}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setEditingName({ id: cat.id })}
                      style={{ fontSize: 11, color: '#1a4b8a', background: 'var(--state-info-bg)', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      Rename
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(cat)}
                    style={{ fontSize: 11, color: cat.is_active ? 'var(--state-warning)' : 'var(--app-text-dim-lg)', background: 'var(--app-surface)', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}
                  >
                    {cat.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {isSuperAdmin && (
            <div style={{ padding: '12px 16px', background: 'var(--app-bg)', borderTop: '1px solid #e8e4dc', display: 'flex', gap: 10, alignItems: 'center', borderRadius: '0 0 8px 8px' }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="New category name"
                style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, border: '1px solid var(--app-border)', borderRadius: 4, padding: '6px 10px', outline: 'none', color: 'var(--app-ink)', background: 'var(--app-bg)' }}
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
                  background: newName.trim() ? 'var(--app-accent)' : '#e8e4dc',
                  color: newName.trim() ? '#fff' : '#b8b0a0',
                  border: 'none', borderRadius: 4, padding: '6px 14px',
                  fontSize: 13, cursor: newName.trim() ? 'pointer' : 'default',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500
                }}
              >
                {adding ? 'Adding...' : '+ Add Category'}
              </button>
            </div>
          )}
        </div>

        {!isSuperAdmin && customCats.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--app-border)', paddingTop: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--app-text-dim-lg)', marginBottom: 8 }}>Your custom categories</p>
            {customCats.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--app-surface)' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{c.custom_name}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: c.sa_status === 'pending' ? 'var(--state-warning-bg)' : c.sa_status === 'accepted' ? 'var(--state-success-bg)' : 'var(--state-danger-bg)',
                  color: c.sa_status === 'pending' ? 'var(--state-warning)' : c.sa_status === 'accepted' ? 'var(--state-success)' : 'var(--state-danger)' }}>
                  {c.sa_status === 'pending' ? 'Pending review' : c.sa_status === 'accepted' ? 'Added to master' : 'Not added to master'}
                </span>
              </div>
            ))}
          </div>
        )}
        {!isSuperAdmin && (
          <button onClick={() => { const n = prompt('New category name:'); if (n) addCustomCategory(n); }}
            style={{ marginTop: 12, fontSize: 12, color: 'var(--app-accent)', background: 'none', border: '1px dashed var(--app-accent)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
            + Add custom category
          </button>
        )}

        {isSuperAdmin && pendingSuggestions.length > 0 && (
          <div style={{ marginTop: 24, borderTop: '1px solid var(--app-border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 10 }}>
              Category suggestions from agencies ({pendingSuggestions.length})
            </p>
            {pendingSuggestions.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--app-surface)' }}>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{s.custom_name}</span>
                <span style={{ fontSize: 11, color: 'var(--app-text-dim-lg)' }}>{s.tenants?.name}</span>
                <button onClick={() => handleSASuggestion(s.id, true, s.custom_name)}
                  style={{ fontSize: 11, background: 'var(--state-success-bg)', color: 'var(--state-success)', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>Accept</button>
                <button onClick={() => handleSASuggestion(s.id, false, s.custom_name)}
                  style={{ fontSize: 11, background: 'var(--state-danger-bg)', color: 'var(--state-danger)', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>Reject</button>
              </div>
            ))}
          </div>
        )}
        </>
      ))}

      {activeTab === 'stages' && (
        <div>
          {stageLoading ? (
            <p style={{ color: 'var(--app-text-dim-lg)', fontSize: 13 }}>Loading stage config…</p>
          ) : (
            CATEGORY_TYPES.map(type => {
              const stages = stageConfig[type.value] || [];
              const isOpen = !!openPanels[type.value];
              return (
                <div
                  key={type.value}
                  style={{
                    border: '1px solid var(--app-border)',
                    borderRadius: 8,
                    marginBottom: 12,
                    background: 'var(--app-surface)',
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
                      background: isOpen ? 'var(--app-surface)' : 'var(--app-bg)',
                      borderBottom: isOpen ? '1px solid var(--app-border)' : 'none',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-ink)' }}>
                        {type.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--app-text-dim-lg)', marginLeft: 10 }}>
                        {stages.length} stage{stages.length !== 1 ? 's' : ''}
                      </span>
                      {!isSuperAdmin && (
                        isCustomised[type.value]
                          ? <button onClick={e => { e.stopPropagation(); resetToDefault(type.value); }}
                              style={{ fontSize: 11, color: 'var(--app-text-dim-lg)', marginLeft: 12, cursor: 'pointer', background: 'none', border: 'none' }}>
                              Reset to default
                            </button>
                          : <button onClick={e => { e.stopPropagation(); customiseCategory(type.value); }}
                              style={{ fontSize: 11, color: 'var(--app-accent)', marginLeft: 12, cursor: 'pointer', background: 'none', border: 'none' }}>
                              Customise for my agency
                            </button>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--app-text-dim-lg)' }}>
                      {isOpen ? <Icon name="sortUp" size={12} /> : <Icon name="sortDown" size={12} />}
                    </span>
                  </div>

                  {/* Panel Body */}
                  {isOpen && (
                    <div style={{ padding: '12px 18px 16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--app-surface)' }}>
                            <th style={{ padding: '5px 8px 5px 0', textAlign: 'left', color: 'var(--app-text-dim-lg)', fontWeight: 500, width: 32 }}>#</th>
                            <th style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--app-text-dim-lg)', fontWeight: 500 }}>Stage Name</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--app-text-dim-lg)', fontWeight: 500, width: 80 }}>Days Before</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--app-text-dim-lg)', fontWeight: 500, width: 72 }}>Terminal</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--app-text-dim-lg)', fontWeight: 500, width: 90 }}>Reorder</th>
                            <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--app-text-dim-lg)', fontWeight: 500, width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage, idx) => (
                            <tr key={stage.id} style={{ borderBottom: '1px solid var(--app-surface)' }}>
                              <td style={{ padding: '7px 8px 7px 0', color: 'var(--app-text-dim-lg)' }}>
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
                                    style={{ fontSize: 12, border: '1px solid var(--app-border)', borderRadius: 4, padding: '3px 7px', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
                                  />
                                ) : (
                                  <span
                                    onDoubleClick={() => !stage._isDefault && setEditingStage({ id: stage.id, field: 'name' })}
                                    style={{ cursor: stage._isDefault ? 'default' : 'text', color: stage.is_terminal ? 'var(--state-success)' : 'var(--app-ink)', opacity: stage._isDefault ? 0.6 : 1 }}
                                    title={stage._isDefault ? 'Customise this category to edit stages' : 'Double-click to edit'}
                                  >
                                    {stage.stage_name}
                                    {stage.is_terminal && (
                                      <span style={{ fontSize: 10, background: 'var(--state-success-bg)', color: 'var(--state-success)', padding: '1px 5px', borderRadius: 3, marginLeft: 6 }}>
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
                                    style={{ fontSize: 12, border: '1px solid var(--app-border)', borderRadius: 4, padding: '3px 6px', width: 60, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}
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
                                  style={{ cursor: 'pointer', accentColor: 'var(--state-success)' }}
                                  title="Mark as terminal (final) stage"
                                />
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => moveStage(type.value, idx, 'up')}
                                  disabled={idx === 0}
                                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 12, padding: '0 3px' }}
                                ><Icon name="up" size={12} /></button>
                                <button
                                  onClick={() => moveStage(type.value, idx, 'down')}
                                  disabled={idx === stages.length - 1}
                                  style={{ background: 'none', border: 'none', cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === stages.length - 1 ? 0.3 : 1, fontSize: 12, padding: '0 3px' }}
                                ><Icon name="down" size={12} /></button>
                              </td>

                              <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete stage "${stage.stage_name}"?`)) deleteStage(stage.id);
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-dim-lg)', fontSize: 13 }}
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
                          border: '1px dashed var(--app-border)',
                          borderRadius: 4,
                          color: 'var(--app-text-dim-lg)',
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

      <p style={{ fontSize: 12, color: 'var(--app-text-dim-lg)', marginTop: 16 }}>
        Double-click any name to rename · Rename cascades to all rate card and element data · Deactivated categories are hidden from dropdowns but existing data is preserved.
      </p>
    </div>
  );
}
