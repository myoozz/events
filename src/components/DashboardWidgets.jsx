import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ROLE_LABEL = {
  admin: 'Admin',
  manager: 'Manager',
  event_lead: 'Event Lead',
  team: 'Team Member',
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatShortDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function DashboardWidgets({ userId, userRole, userName }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !userRole) return;
    loadStats();
  }, [userId, userRole]);

  async function loadStats() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let s = {};

      if (userRole === 'admin') {
        const [
          { count: pending },
          { count: active },
          { count: team },
          { count: overdue },
        ] = await Promise.all([
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('review_status', 'pending')
            .eq('archived', false),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('archived', false),
          supabase
            .from('users')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .not('status', 'in', '(done,completed)')
            .not('deadline', 'is', null)
            .lt('deadline', today),
        ]);
        s = { pending, active, team, overdue };

      } else if (userRole === 'manager') {
        const { data: myEventRows } = await supabase
          .from('events')
          .select('id')
          .contains('assigned_to', [userId])
          .eq('archived', false);

        const ids = myEventRows?.map((e) => e.id) || [];
        let pending = 0, inProgress = 0, overdue = 0;

        if (ids.length > 0) {
          const [{ count: p }, { count: a }, { count: o }] = await Promise.all([
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .in('event_id', ids)
              .in('status', ['not_started', 'pending']),
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .in('event_id', ids)
              .in('status', ['in_progress', 'review']),
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .in('event_id', ids)
              .not('status', 'in', '(done,completed)')
              .not('deadline', 'is', null)
              .lt('deadline', today),
          ]);
          pending = p; inProgress = a; overdue = o;
        }
        s = { myEvents: ids.length, pending, inProgress, overdue };

      } else {
        // event_lead + team
        const { data: myTasks } = await supabase
          .from('tasks')
          .select('status, deadline')
          .eq('assigned_to', userId);

        const open = myTasks?.filter((t) =>
          ['not_started', 'pending', 'in_progress', 'review'].includes(t.status)
        ).length || 0;
        const done = myTasks?.filter((t) =>
          ['done', 'completed'].includes(t.status)
        ).length || 0;
        const overdue = myTasks?.filter((t) =>
          !['done', 'completed'].includes(t.status) &&
          t.deadline && t.deadline < today
        ).length || 0;
        const next = myTasks
          ?.filter((t) => !['done', 'completed'].includes(t.status) && t.deadline)
          .map((t) => t.deadline)
          .sort()[0];

        s = { total: myTasks?.length || 0, open, done, overdue, next };
      }

      setStats(s);
    } catch (err) {
      console.error('DashboardWidgets error:', err);
    } finally {
      setLoading(false);
    }
  }

  function buildCards() {
    if (!stats) return [];

    if (userRole === 'admin') {
      return [
        {
          label: 'Pending Approvals',
          value: stats.pending ?? '—',
          hot: stats.pending > 0,
          hint: stats.pending > 0 ? 'Needs your review' : 'All clear',
        },
        {
          label: 'Active Events',
          value: stats.active ?? '—',
          hot: false,
          hint: 'Not archived',
        },
        {
          label: 'Team Members',
          value: stats.team ?? '—',
          hot: false,
          hint: 'All roles',
        },
        {
          label: 'Overdue Tasks',
          value: stats.overdue ?? '—',
          hot: stats.overdue > 0,
          hint: stats.overdue > 0 ? 'Past deadline' : 'Nothing overdue',
        },
      ];
    }

    if (userRole === 'manager') {
      return [
        {
          label: 'My Events',
          value: stats.myEvents ?? '—',
          hot: false,
          hint: 'Active, assigned to you',
        },
        {
          label: 'Pending Tasks',
          value: stats.pending ?? '—',
          hot: false,
          hint: 'Not started yet',
        },
        {
          label: 'In Progress',
          value: stats.inProgress ?? '—',
          hot: false,
          hint: 'Active right now',
        },
        {
          label: 'Overdue',
          value: stats.overdue ?? '—',
          hot: stats.overdue > 0,
          hint: stats.overdue > 0 ? 'Past deadline' : 'On track',
        },
      ];
    }

    // event_lead + team
    const lastCard =
      userRole === 'event_lead'
        ? {
            label: 'Next Deadline',
            value: formatShortDate(stats.next),
            hot: false,
            hint: stats.next ? stats.next : 'No upcoming deadlines',
          }
        : {
            label: 'Overdue',
            value: stats.overdue ?? '—',
            hot: stats.overdue > 0,
            hint: stats.overdue > 0 ? 'Past deadline' : 'All on track',
          };

    return [
      {
        label: 'My Tasks',
        value: stats.total ?? '—',
        hot: false,
        hint: 'Total assigned to you',
      },
      {
        label: 'Open',
        value: stats.open ?? '—',
        hot: false,
        hint: 'Pending + in progress',
      },
      {
        label: 'Done',
        value: stats.done ?? '—',
        hot: false,
        hint: 'Completed tasks',
      },
      lastCard,
    ];
  }

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .dw-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 768px) {
          .dw-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 400px) {
          .dw-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
        .dw-card {
          background: #ffffff;
          border: 1px solid #E8E4DF;
          border-radius: 10px;
          padding: 18px 20px 15px;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.15s ease;
          cursor: default;
        }
        .dw-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        }
        .dw-card.hot {
          border-color: #f5c4c6;
          background: #fffafa;
        }
        .dw-card .accent-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #E8E4DF;
          border-radius: 10px 10px 0 0;
        }
        .dw-card.hot .accent-bar {
          background: #bc1723;
        }
        .dw-card .card-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 600;
          color: #1a1a1a;
          line-height: 1;
          margin: 6px 0 5px;
          letter-spacing: -0.5px;
        }
        .dw-card.hot .card-value {
          color: #bc1723;
        }
        .dw-card .card-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #888;
          font-weight: 400;
          letter-spacing: 0.1px;
          margin-bottom: 2px;
        }
        .dw-card .card-hint {
          font-family: 'DM Sans', sans-serif;
          font-size: 10.5px;
          color: #bbb;
          font-weight: 400;
        }
        .dw-card.hot .card-hint {
          color: #e08a8e;
        }
        .dw-skeleton {
          height: 96px;
          background: linear-gradient(90deg, #f4f1ee 25%, #eae6e2 50%, #f4f1ee 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border: none !important;
        }
        .dw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .dw-greeting {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 500;
          color: #1a1a1a;
          letter-spacing: -0.2px;
        }
        .dw-role-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #bc1723;
          background: #fdf0f0;
          border: 1px solid #f5c4c6;
          border-radius: 100px;
          padding: 3px 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div style={{ marginBottom: '28px' }}>
        <div className="dw-header">
          <span className="dw-greeting">
            Good {getTimeOfDay()}, {firstName}
          </span>
          <span className="dw-role-tag">{ROLE_LABEL[userRole] || userRole}</span>
        </div>

        <div className="dw-grid">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="dw-card dw-skeleton" />
              ))
            : buildCards().map((card, i) => (
                <div
                  key={i}
                  className={`dw-card${card.hot ? ' hot' : ''}`}
                >
                  <div className="accent-bar" />
                  <div className="card-label">{card.label}</div>
                  <div className="card-value">{card.value}</div>
                  <div className="card-hint">{card.hint}</div>
                </div>
              ))}
        </div>
      </div>
    </>
  );
}
