import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ROLE_CONFIG = {
  admin:       { label: 'Admin',       color: '#bc1723', bg: '#fdf0f0' },
  manager:     { label: 'Manager',     color: '#1a6b4a', bg: '#edf7f2' },
  event_lead:  { label: 'Event Lead',  color: '#7a4f1e', bg: '#fdf4ea' },
  team:        { label: 'Team',        color: '#2c4a7c', bg: '#eef2fb' },
};

function timeAgoShort(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Initials({ name, size = 36 }) {
  const parts = (name || '?').trim().split(' ');
  const ini = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#bc1723', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: size * 0.35, fontWeight: 600,
      textTransform: 'uppercase', flexShrink: 0, letterSpacing: 0.5,
    }}>
      {ini.toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: '#888', bg: '#f4f4f4' };
  return (
    <span style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 10, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      borderRadius: 100, padding: '2px 8px',
      textTransform: 'uppercase', letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function WorkloadBar({ open = 0, done = 0, overdue = 0 }) {
  const total = open + done + overdue;
  if (total === 0) return (
    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#ccc' }}>
      No tasks
    </span>
  );
  const pDone    = Math.round((done / total) * 100);
  const pOverdue = Math.round((overdue / total) * 100);
  const pOpen    = 100 - pDone - pOverdue;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div style={{
        display: 'flex', height: 5, borderRadius: 100, overflow: 'hidden',
        background: '#f0ece8', gap: 1,
      }}>
        {pDone > 0    && <div style={{ width: `${pDone}%`,    background: '#2e9e68', borderRadius: 100 }} />}
        {pOpen > 0    && <div style={{ width: `${pOpen}%`,    background: '#d6cfc8', borderRadius: 100 }} />}
        {pOverdue > 0 && <div style={{ width: `${pOverdue}%`, background: '#bc1723', borderRadius: 100 }} />}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {done > 0    && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#2e9e68' }}>{done} done</span>}
        {open > 0    && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#999' }}>{open} open</span>}
        {overdue > 0 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#bc1723' }}>{overdue} overdue</span>}
      </div>
    </div>
  );
}

export default function TeamView({ userId, userRole, onViewProfile }) {
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    if (!userId || !userRole) return;
    loadTeam();
  }, [userId, userRole]);

  async function loadTeam() {
    setLoading(true);
    try {
      let userIds = null;

      // Manager: scope to users assigned to their events
      if (userRole === 'manager') {
        const { data: myEvents } = await supabase
          .from('events')
          .select('assigned_to')
          .contains('assigned_to', [userId])
          .eq('archived', false);

        const allIds = new Set();
        myEvents?.forEach((e) => {
          (e.assigned_to || []).forEach((id) => allIds.add(id));
        });
        allIds.delete(userId); // exclude self
        userIds = [...allIds];
        if (userIds.length === 0) {
          setMembers([]);
          setLoading(false);
          return;
        }
      }

      // Fetch users
      let userQuery = supabase
        .from('users')
        .select('id, name, email, role, base_city, base_state');
      if (userIds) userQuery = userQuery.in('id', userIds);
      const { data: users } = await userQuery.order('name');

      if (!users?.length) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const ids = users.map((u) => u.id);

      // Fetch workload + last active in parallel
      const [{ data: workload }, { data: lastActive }] = await Promise.all([
        supabase.from('v_user_workload').select('*').in('assigned_to', ids),
        supabase.from('v_user_last_active').select('*').in('user_id', ids),
      ]);

      const workloadMap   = {};
      const lastActiveMap = {};
      workload?.forEach((r) => { workloadMap[r.assigned_to] = r; });
      lastActive?.forEach((r) => { lastActiveMap[r.user_id] = r.last_active; });

      const enriched = users.map((u) => {
        const w = workloadMap[u.id] || {};
        return {
          ...u,
          open:       parseInt(w.not_started || 0) + parseInt(w.in_progress || 0),
          done:       parseInt(w.done || 0),
          overdue:    parseInt(w.overdue || 0),
          total:      parseInt(w.total || 0),
          last_active: lastActiveMap[u.id] || null,
        };
      });

      setMembers(enriched);
    } catch (err) {
      console.error('TeamView error:', err);
    } finally {
      setLoading(false);
    }
  }

  const roles = ['all', ...Object.keys(ROLE_CONFIG)];

  const filtered = members.filter((m) => {
    const matchRole = filterRole === 'all' || m.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.base_city?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const title = userRole === 'admin' ? 'Team' : 'My Team';

  return (
    <>
      <style>{`
        @keyframes tv-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tv-row {
          display: grid;
          grid-template-columns: 36px 1fr 80px 160px 70px;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid #F0ECE8;
          transition: background 0.1s;
          animation: tv-fade 0.2s ease both;
        }
        .tv-row:last-child { border-bottom: none; }
        .tv-row:hover { background: #FAFAF8; }
        .tv-header-row {
          display: grid;
          grid-template-columns: 36px 1fr 80px 160px 70px;
          gap: 14px;
          padding: 8px 16px;
          border-bottom: 2px solid #E8E4DF;
        }
        @media (max-width: 640px) {
          .tv-row, .tv-header-row {
            grid-template-columns: 36px 1fr 70px;
          }
          .tv-col-workload, .tv-col-activity { display: none; }
        }
        .tv-col-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tv-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #1a1a1a;
        }
        .tv-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #aaa;
          margin-top: 1px;
        }
        .tv-activity {
          font-family: 'DM Sans', sans-serif;
          font-size: 11.5px;
          color: #999;
        }
        .tv-profile-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #bc1723;
          background: none;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .tv-profile-btn:hover {
          border-color: #bc1723;
          background: #fdf0f0;
        }
        .tv-filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .tv-filter-chip {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 100px;
          border: 1px solid #E0DBD6;
          background: #fff;
          color: #666;
          cursor: pointer;
          transition: all 0.12s;
        }
        .tv-filter-chip.active {
          background: #bc1723;
          border-color: #bc1723;
          color: #fff;
        }
        .tv-search {
          flex: 1;
          min-width: 140px;
          max-width: 220px;
          padding: 5px 12px;
          border: 1px solid #E0DBD6;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #333;
          outline: none;
          background: #fff;
          transition: border-color 0.15s;
        }
        .tv-search:focus { border-color: #bc1723; }
        .tv-empty {
          text-align: center;
          padding: 40px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #bbb;
        }
        .tv-skeleton {
          height: 52px;
          background: linear-gradient(90deg, #f4f1ee 25%, #eae6e2 50%, #f4f1ee 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 4px;
          margin-bottom: 1px;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{
        background: '#fff',
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid #F0ECE8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20, fontWeight: 600, color: '#1a1a1a',
            }}>
              {title}
            </span>
            {!loading && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, color: '#aaa', marginLeft: 8,
              }}>
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>
          <button
            onClick={loadTeam}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11, color: '#bc1723', background: 'none',
              border: '1px solid #f5c4c6', borderRadius: 8,
              padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 16px 0' }}>
          <div className="tv-filter-bar">
            {roles.map((r) => (
              <button
                key={r}
                className={`tv-filter-chip${filterRole === r ? ' active' : ''}`}
                onClick={() => setFilterRole(r)}
              >
                {r === 'all' ? 'All' : ROLE_CONFIG[r]?.label || r}
              </button>
            ))}
            <input
              className="tv-search"
              placeholder="Search name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Column headers */}
        <div className="tv-header-row">
          <div />
          <div className="tv-col-label">Member</div>
          <div className="tv-col-label">Role</div>
          <div className="tv-col-label tv-col-workload">Workload</div>
          <div className="tv-col-label tv-col-activity">Active</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '8px 16px' }}>
            {[1, 2, 3].map((i) => <div key={i} className="tv-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="tv-empty">
            {members.length === 0
              ? (userRole === 'manager'
                  ? 'No team members assigned to your events yet.'
                  : 'No team members found.')
              : 'No results match your filter.'}
          </div>
        ) : (
          filtered.map((m, i) => (
            <div
              key={m.id}
              className="tv-row"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <Initials name={m.name} size={36} />

              <div>
                <div className="tv-name">{m.name || '—'}</div>
                <div className="tv-sub">
                  {[m.base_city, m.base_state].filter(Boolean).join(', ') || m.email}
                </div>
              </div>

              <div><RoleBadge role={m.role} /></div>

              <div className="tv-col-workload">
                <WorkloadBar
                  open={m.open}
                  done={m.done}
                  overdue={m.overdue}
                />
              </div>

              <div className="tv-col-activity">
                {onViewProfile ? (
                  <button
                    className="tv-profile-btn"
                    onClick={() => onViewProfile(m.id)}
                  >
                    View
                  </button>
                ) : (
                  <span className="tv-activity">
                    {timeAgoShort(m.last_active)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
