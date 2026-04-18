import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { logActivity } from '../utils/activityLogger';
import { notifyTaskAssigned, notifyTaskStatusChanged } from '../utils/notificationService';

/* ─── helpers ──────────────────────────────────────────────── */
const SCHEMA = import.meta.env.VITE_SUPABASE_SCHEMA || 'public';

const db = (table) => supabase.schema(SCHEMA).from(table);

const STATUS_OPTIONS = ['pending', 'in_progress', 'done', 'blocked'];

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#9CA3AF', bg: '#F3F4F6' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  done:        { label: 'Done',        color: '#059669', bg: '#ECFDF5' },
  blocked:     { label: 'Blocked',     color: '#DC2626', bg: '#FEF2F2' },
};

const ROLE_CAN_ASSIGN = (role, scope) => {
  if (role === 'admin' || role === 'manager') return true;
  if (role === 'event_lead' && (scope === 'full' || scope === 'ops')) return true;
  return false;
};

const initials = (name = '') =>
  name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');

/* ─── component ────────────────────────────────────────────── */
export default function TaskBoard({ eventId, event, session, userRole, delegationScope, eventCities = [] }) {
  const [tasks,       setTasks]       = useState([]);
  const [users,       setUsers]       = useState([]);
  const [activeCity,  setActiveCity]  = useState('');
  const [collapsed,   setCollapsed]   = useState({});
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);   // { taskId, taskTitle }
  const [assignTo,    setAssignTo]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [statusMenu,  setStatusMenu]  = useState(null);   // taskId
  const [addOpen,     setAddOpen]     = useState(false);
  const [newTask,     setNewTask]     = useState({ title: '', category: '', city: '', due_date: '', notes: '' });
  const [adding,      setAdding]      = useState(false);
  const modalRef  = useRef(null);
  const statusRef = useRef(null);

  const canAssign = ROLE_CAN_ASSIGN(userRole, delegationScope);
  const canAdd    = userRole === 'admin' || userRole === 'manager' || userRole === 'event_lead';

  /* cities: prefer eventCities prop, else derive from tasks */
  const cities = eventCities.length > 0
    ? eventCities
    : [...new Set(tasks.map((t) => t.city).filter(Boolean))];

  /* ── fetch ── */
  useEffect(() => {
    if (!eventId) return;
    fetchTasks();
    fetchUsers();
  }, [eventId]);

  /* set default city tab once tasks + cities load */
  useEffect(() => {
    if (!activeCity && cities.length > 0) setActiveCity(cities[0]);
  }, [cities.length]);

  /* close modals on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (modal      && modalRef.current  && !modalRef.current.contains(e.target))  setModal(null);
      if (statusMenu && statusRef.current && !statusRef.current.contains(e.target)) setStatusMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modal, statusMenu]);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await db('tasks').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
    if (!error) setTasks(data || []);
    setLoading(false);
  }

  async function fetchUsers() {
    const { data } = await db('users').select('id, full_name, role').order('full_name');
    setUsers(data || []);
  }

  /* ── derived: city-filtered tasks grouped by category ── */
  const cityTasks = tasks.filter((t) => {
    if (!activeCity) return true;
    return !t.city || t.city === activeCity;
  });

  const categories = [...new Set(cityTasks.map((t) => t.category || 'General'))];

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = cityTasks.filter((t) => (t.category || 'General') === cat);
    return acc;
  }, {});

  /* ── assign ── */
  function openAssign(task) {
    setAssignTo(task.assigned_to || '');
    setModal({ taskId: task.id, taskTitle: task.title });
  }

  async function saveAssign() {
    if (!modal) return;
    setSaving(true);
    const user = users.find((u) => u.id === assignTo);
    const { error } = await db('tasks').update({
      assigned_to:      assignTo || null,
      assigned_to_name: user?.full_name || null,
    }).eq('id', modal.taskId);

    if (!error) {
      await logActivity({
        action:      'task_assigned',
        entity_type: 'task',
        entity_name: modal.taskTitle,
        event_id:    eventId,
        details:     { assigned_to: user?.full_name || 'Unassigned' },
      });

      // Phase C — notify the person being assigned (skip if unassigning)
      if (assignTo) {
        await notifyTaskAssigned({
          recipientId: assignTo,
          actorId:     session.user.id,
          taskTitle:   modal.taskTitle,
          eventName:   event?.name,
          eventId,
          taskId:      modal.taskId,
        });
      }

      await fetchTasks();
      setModal(null);
    }
    setSaving(false);
  }

  /* ── status ── */
  async function updateStatus(taskId, taskTitle, status, assignedTo) {
    const { error } = await db('tasks').update({ status }).eq('id', taskId);
    if (!error) {
      await logActivity({
        action:      'task_status_changed',
        entity_type: 'task',
        entity_name: taskTitle,
        event_id:    eventId,
        details:     { status },
      });

      // Phase C — smart notification routing
      const actorId = session.user.id;

      // Case 1: Someone else changed the status → notify the assignee
      if (assignedTo && assignedTo !== actorId) {
        await notifyTaskStatusChanged({
          recipientId: assignedTo,
          actorId,
          taskTitle,
          newStatus:   status,
          eventName:   event?.name,
          eventId,
          taskId,
        });
      }

      // Case 2: Assignee completed their own task → notify all admins + managers
      if (assignedTo === actorId && (status === 'done' || status === 'completed')) {
        const managers = users.filter(
          (u) => (u.role === 'admin' || u.role === 'manager') && u.id !== actorId
        );
        await Promise.all(
          managers.map((mgr) =>
            notifyTaskStatusChanged({
              recipientId: mgr.id,
              actorId,
              taskTitle,
              newStatus:   status,
              eventName:   event?.name,
              eventId,
              taskId,
            })
          )
        );
      }

      await fetchTasks();
    }
    setStatusMenu(null);
  }

  /* ── add task ── */
  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setAdding(true);
    const { error } = await db('tasks').insert({
      event_id:   eventId,
      title:      newTask.title.trim(),
      category:   newTask.category || 'General',
      city:       newTask.city || activeCity || null,
      due_date:   newTask.due_date || null,
      notes:      newTask.notes || null,
      status:     'pending',
      sort_order: tasks.length,
    });
    if (!error) {
      await fetchTasks();
      setNewTask({ title: '', category: '', city: '', due_date: '', notes: '' });
      setAddOpen(false);
    }
    setAdding(false);
  }

  /* ─── render ──────────────────────────────────────────────── */
  return (
    <div style={styles.root}>

      {/* ── city tabs ── */}
      {cities.length > 1 && (
        <div style={styles.tabRow}>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setActiveCity(city)}
              style={{
                ...styles.tab,
                ...(activeCity === city ? styles.tabActive : {}),
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* ── add task ── */}
      {canAdd && (
        <div style={styles.addWrap}>
          {!addOpen ? (
            <button style={styles.addBtn} onClick={() => setAddOpen(true)}>
              <span style={styles.addIcon}>+</span> Add Task
            </button>
          ) : (
            <form onSubmit={handleAddTask} style={styles.addForm}>
              <div style={styles.addRow}>
                <input
                  style={{ ...styles.input, flex: 2 }}
                  placeholder="Task title *"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                  autoFocus
                />
                <input
                  style={styles.input}
                  placeholder="Category"
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                />
                <select
                  style={styles.input}
                  value={newTask.city}
                  onChange={(e) => setNewTask({ ...newTask, city: e.target.value })}
                >
                  <option value="">City (all)</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  style={styles.input}
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div style={styles.addActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => { setAddOpen(false); setNewTask({ title: '', category: '', city: '', due_date: '', notes: '' }); }}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn} disabled={adding}>
                  {adding ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── task categories ── */}
      {loading ? (
        <div style={styles.empty}>Loading tasks…</div>
      ) : cityTasks.length === 0 ? (
        <div style={styles.empty}>No tasks yet for {activeCity || 'this event'}.</div>
      ) : (
        categories.map((cat) => (
          <div key={cat} style={styles.category}>
            {/* category header */}
            <button
              style={styles.catHeader}
              onClick={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
            >
              <span style={styles.catTitle}>{cat}</span>
              <span style={styles.catMeta}>
                <span style={styles.catCount}>{grouped[cat].length}</span>
                <span style={styles.catChevron}>{collapsed[cat] ? '▸' : '▾'}</span>
              </span>
            </button>

            {/* tasks */}
            {!collapsed[cat] && (
              <div style={styles.taskList}>
                {grouped[cat].map((task) => {
                  const sm   = STATUS_META[task.status] || STATUS_META.pending;
                  const ini  = task.assigned_to_name ? initials(task.assigned_to_name) : null;
                  return (
                    <div key={task.id} style={styles.card}>
                      <div style={styles.cardLeft}>
                        {/* status pill */}
                        <div style={{ position: 'relative' }}>
                          <button
                            style={{ ...styles.statusPill, color: sm.color, background: sm.bg }}
                            onClick={() => canAssign && setStatusMenu(statusMenu === task.id ? null : task.id)}
                            title={canAssign ? 'Change status' : sm.label}
                          >
                            {sm.label}
                            {canAssign && <span style={{ marginLeft: 3, fontSize: 9 }}>▾</span>}
                          </button>
                          {statusMenu === task.id && (
                            <div ref={statusRef} style={styles.statusDropdown}>
                              {STATUS_OPTIONS.map((s) => {
                                const m = STATUS_META[s];
                                return (
                                  <button
                                    key={s}
                                    style={{ ...styles.statusOption, color: m.color }}
                                    onClick={() => updateStatus(task.id, task.title, s, task.assigned_to)}
                                  >
                                    {m.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span style={styles.taskTitle}>{task.title}</span>
                      </div>

                      <div style={styles.cardRight}>
                        {task.due_date && (
                          <span style={styles.dueDate}>
                            {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}

                        {/* assigned user pill */}
                        {ini ? (
                          <button
                            style={styles.assignedPill}
                            onClick={() => canAssign && openAssign(task)}
                            title={canAssign ? `Reassign (${task.assigned_to_name})` : task.assigned_to_name}
                          >
                            <span style={styles.initialsCircle}>{ini}</span>
                            <span style={styles.assignedName}>{task.assigned_to_name}</span>
                          </button>
                        ) : (
                          canAssign && (
                            <button style={styles.assignBtn} onClick={() => openAssign(task)}>
                              Assign
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {/* ── assign modal ── */}
      {modal && (
        <div style={styles.overlay}>
          <div ref={modalRef} style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Assign Task</h3>
              <button style={styles.modalClose} onClick={() => setModal(null)}>✕</button>
            </div>
            <p style={styles.modalSub}>{modal.taskTitle}</p>

            <label style={styles.label}>Assign to</label>
            <select
              style={styles.select}
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                  {u.role ? ` (${u.role.replace('_', ' ')})` : ''}
                </option>
              ))}
            </select>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={saveAssign} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── styles ──────────────────────────────────────────────── */
const styles = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
  },
  tabRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tab: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1.5px solid #E5E1DC',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    color: '#6B7280',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#bc1723',
    borderColor: '#bc1723',
    color: '#fff',
    fontWeight: 600,
  },

  /* add task */
  addWrap:  { marginBottom: 20 },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1.5px dashed #D1CBC3',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s, color 0.15s',
  },
  addIcon: { fontSize: 18, lineHeight: 1 },
  addForm: {
    background: '#FAFAF8',
    border: '1.5px solid #E5E1DC',
    borderRadius: 10,
    padding: 16,
  },
  addRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    minWidth: 120,
    padding: '8px 12px',
    border: '1.5px solid #E5E1DC',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    background: '#fff',
    color: '#1a1a1a',
    outline: 'none',
  },
  addActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },

  /* category */
  category:  { marginBottom: 12 },
  catHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 14px',
    borderRadius: 8,
    transition: 'background 0.1s',
    ':hover': { background: '#F5F0EB' },
  },
  catTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    fontWeight: 600,
    color: '#1a1a1a',
    letterSpacing: '0.01em',
  },
  catMeta:  { display: 'flex', alignItems: 'center', gap: 8 },
  catCount: {
    background: '#F0EBE5',
    color: '#6B7280',
    borderRadius: 12,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 500,
  },
  catChevron: { color: '#9CA3AF', fontSize: 13 },

  taskList: { paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 },

  /* task card */
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    border: '1px solid #EDE8E2',
    borderRadius: 8,
    padding: '10px 14px',
    gap: 12,
    transition: 'box-shadow 0.15s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  cardLeft:  { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },

  taskTitle: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: 450,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  /* status pill */
  statusPill: {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  statusDropdown: {
    position: 'absolute',
    top: '110%',
    left: 0,
    background: '#fff',
    border: '1px solid #E5E1DC',
    borderRadius: 8,
    padding: '4px 0',
    zIndex: 50,
    minWidth: 130,
    boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  },
  statusOption: {
    display: 'block',
    width: '100%',
    padding: '7px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    transition: 'background 0.1s',
  },

  /* due date */
  dueDate: {
    fontSize: 12,
    color: '#9CA3AF',
    whiteSpace: 'nowrap',
  },

  /* assign */
  assignBtn: {
    padding: '4px 12px',
    border: '1.5px solid #E5E1DC',
    borderRadius: 14,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    color: '#6B7280',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    transition: 'border-color 0.15s, color 0.15s',
  },
  assignedPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1.5px solid #E5E1DC',
    borderRadius: 14,
    background: '#FAFAF8',
    padding: '3px 10px 3px 4px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  },
  initialsCircle: {
    width: 22,
    height: 22,
    borderRadius: '6px',
    background: '#bc1723',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  assignedName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 500,
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* empty */
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    padding: '40px 0',
  },

  /* modal overlay */
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 20,
  },
  modal: {
    background: '#FAFAF8',
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    color: '#1a1a1a',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    color: '#9CA3AF',
    padding: 4,
    lineHeight: 1,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    margin: '0 0 20px',
    fontStyle: 'italic',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #E5E1DC',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    background: '#fff',
    color: '#1a1a1a',
    outline: 'none',
    marginBottom: 20,
    cursor: 'pointer',
  },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },

  /* shared buttons */
  cancelBtn: {
    padding: '9px 18px',
    border: '1.5px solid #E5E1DC',
    borderRadius: 8,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    color: '#6B7280',
    fontWeight: 500,
  },
  saveBtn: {
    padding: '9px 22px',
    border: 'none',
    borderRadius: 8,
    background: '#bc1723',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    transition: 'opacity 0.15s',
  },
};
