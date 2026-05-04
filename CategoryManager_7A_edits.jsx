// ============================================================
// CATEGORYMANAGER.JSX — Phase 7A Surgical Edits
// This file contains the exact code blocks to insert.
// Claude Code will grep the live file for exact line numbers
// before applying any change. Do NOT apply blindly.
// ============================================================


// ============================================================
// BLOCK A — New state variables + useEffect
// WHERE: paste immediately after the existing useState/useEffect
// block that fetches categories. Grep target:
//   grep -n "setCategories\|fetchCategories\|useEffect" CategoryManager.jsx | head -20
// ============================================================

// --- PASTE THIS after the existing useEffect that loads categories ---

  const CATEGORY_TYPES = [
    { value: 'rental',         label: 'Rental' },
    { value: 'creative_print', label: 'Creative & Print' },
    { value: 'booking',        label: 'Booking' },
    { value: 'service',        label: 'Service' },
    { value: 'permissions',    label: 'Permissions' },
  ];

  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'stages'
  const [stageConfig, setStageConfig] = useState({});        // keyed by category_type
  const [stageLoading, setStageLoading] = useState(false);
  const [editingStage, setEditingStage] = useState(null);    // { id, field, value }
  const [openPanels, setOpenPanels] = useState({});          // which type panels are expanded

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


// ============================================================
// BLOCK B — Tab header (Categories | Stage Config)
// WHERE: Find the wrapping div that contains the category list
// heading / title. Grep target:
//   grep -n "Category Manager\|admin-only\|h2\|page-header\|<h1" CategoryManager.jsx | head -10
// Insert this TAB BAR immediately before the category list content
// ============================================================

// --- PASTE THIS just before the categories list render block ---

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
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
                fontFamily: 'var(--sans)',
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


// ============================================================
// BLOCK C — Type dropdown column in category row
// WHERE: Inside the existing category row render — find the
// column that shows the category name and the ↑↓ buttons.
// Grep target:
//   grep -n "sort_order\|moveCategory\|arrow\|↑\|↓\|is_active" CategoryManager.jsx | head -20
// Add this as an additional <td> or inline element after the
// name/slug display and before (or after) the action buttons.
// ============================================================

// --- ADD THIS inline in the category row, as a new column or appended element ---

                        {/* Category Type Dropdown */}
                        <select
                          value={cat.category_type || ''}
                          onChange={e => updateCategoryType(cat.id, e.target.value)}
                          style={{
                            fontSize: 11,
                            padding: '3px 7px',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            background: '#fff',
                            color: cat.category_type ? 'var(--text)' : 'var(--dim)',
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                          }}
                        >
                          <option value="">Untyped</option>
                          {CATEGORY_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>


// ============================================================
// BLOCK D — Stage Config tab panel (full render block)
// WHERE: Find where the categories list is conditionally rendered.
// Grep target:
//   grep -n "categories.map\|category.map\|activeTab\|return.*<div" CategoryManager.jsx | head -20
// Wrap existing category list render in: {activeTab === 'categories' && (...)}
// Then add the Stage Config panel below it:
//   {activeTab === 'stages' && (<StageConfigPanel />)}
// ============================================================

// --- PASTE THIS as the Stage Config tab panel ---

        {activeTab === 'stages' && (
          <div>
            {stageLoading ? (
              <p style={{ color: 'var(--dim)', fontSize: 13 }}>Loading stage config…</p>
            ) : (
              CATEGORY_TYPES.map(type => {
                const stages = stageConfig[type.value] || [];
                const isOpen = !!openPanels[type.value];
                return (
                  <div
                    key={type.value}
                    style={{
                      border: '1px solid var(--border)',
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
                        background: isOpen ? 'var(--bg2)' : '#fff',
                        borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {type.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--dim)', marginLeft: 10 }}>
                          {stages.length} stage{stages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>

                    {/* Panel Body */}
                    {isOpen && (
                      <div style={{ padding: '12px 18px 16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--bg3)' }}>
                              <th style={{ padding: '5px 8px 5px 0', textAlign: 'left', color: 'var(--dim)', fontWeight: 500, width: 32 }}>#</th>
                              <th style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--dim)', fontWeight: 500 }}>Stage Name</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--dim)', fontWeight: 500, width: 80 }}>Days Before</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--dim)', fontWeight: 500, width: 72 }}>Terminal</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--dim)', fontWeight: 500, width: 90 }}>Reorder</th>
                              <th style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--dim)', fontWeight: 500, width: 60 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {stages.map((stage, idx) => (
                              <tr key={stage.id} style={{ borderBottom: '1px solid var(--bg3)' }}>
                                {/* Sort Order */}
                                <td style={{ padding: '7px 8px 7px 0', color: 'var(--dim)' }}>
                                  {stage.sort_order}
                                </td>

                                {/* Stage Name — inline edit */}
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
                                        if (e.key === 'Enter') {
                                          updateStageName(stage.id, e.target.value);
                                          setEditingStage(null);
                                        }
                                        if (e.key === 'Escape') setEditingStage(null);
                                      }}
                                      style={{
                                        fontSize: 12, border: '1px solid var(--border)',
                                        borderRadius: 4, padding: '3px 7px', width: '100%',
                                        fontFamily: 'var(--sans)',
                                      }}
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => setEditingStage({ id: stage.id, field: 'name' })}
                                      style={{ cursor: 'text', color: stage.is_terminal ? 'var(--green)' : 'var(--text)' }}
                                      title="Double-click to edit"
                                    >
                                      {stage.stage_name}
                                      {stage.is_terminal && (
                                        <span style={{ fontSize: 10, background: 'var(--green-bg)', color: 'var(--green)', padding: '1px 5px', borderRadius: 3, marginLeft: 6 }}>
                                          Final
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </td>

                                {/* Days Before Event — inline edit */}
                                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                  {editingStage?.id === stage.id && editingStage.field === 'days' ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      min={0}
                                      defaultValue={stage.days_before_event}
                                      onBlur={e => {
                                        updateStageDays(stage.id, e.target.value);
                                        setEditingStage(null);
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          updateStageDays(stage.id, e.target.value);
                                          setEditingStage(null);
                                        }
                                        if (e.key === 'Escape') setEditingStage(null);
                                      }}
                                      style={{
                                        fontSize: 12, border: '1px solid var(--border)',
                                        borderRadius: 4, padding: '3px 6px', width: 60, textAlign: 'center',
                                        fontFamily: 'var(--mono)',
                                      }}
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => setEditingStage({ id: stage.id, field: 'days' })}
                                      style={{ cursor: 'text', fontFamily: 'var(--mono)', fontSize: 12 }}
                                      title="Double-click to edit"
                                    >
                                      {stage.days_before_event}d
                                    </span>
                                  )}
                                </td>

                                {/* Terminal toggle */}
                                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={stage.is_terminal}
                                    onChange={() => toggleStageTerminal(stage.id, stage.is_terminal)}
                                    style={{ cursor: 'pointer', accentColor: '#1a6b3a' }}
                                    title="Mark as terminal (final) stage"
                                  />
                                </td>

                                {/* Reorder */}
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

                                {/* Delete */}
                                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Delete stage "${stage.stage_name}"?`)) deleteStage(stage.id);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 13 }}
                                    title="Delete stage"
                                  >×</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Add Stage button */}
                        <button
                          onClick={() => addStage(type.value)}
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            padding: '5px 12px',
                            background: 'none',
                            border: '1px dashed var(--border)',
                            borderRadius: 4,
                            color: 'var(--dim)',
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
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
