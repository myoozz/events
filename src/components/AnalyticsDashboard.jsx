// src/components/AnalyticsDashboard.jsx
// Phase E — Analytics  |  Admin only  |  Volume & velocity, no financials

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND_RED  = '#bc1723'
const WARM_BG    = '#FAFAF8'
const FONT_HEAD  = '"Cormorant Garamond", Georgia, serif'
const FONT_BODY  = '"DM Sans", system-ui, sans-serif'

const PERIOD_OPTIONS = [
  { label: 'Week',   value: 'week'   },
  { label: 'Month',  value: 'month'  },
  { label: 'Year',   value: 'year'   },
  { label: 'Custom', value: 'custom' },
]

// ─── Date helpers ──────────────────────────────────────────────────────────────
function getPeriodRange(period, customFrom, customTo) {
  const now = new Date()
  if (period === 'custom') {
    const start = customFrom
      ? new Date(customFrom).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = customTo
      ? new Date(customTo + 'T23:59:59').toISOString()
      : now.toISOString()
    return { start, end }
  }
  const start = new Date()
  if      (period === 'week')  start.setDate(now.getDate() - 7)
  else if (period === 'month') start.setDate(now.getDate() - 30)
  else                         start.setFullYear(now.getFullYear() - 1)
  return { start: start.toISOString(), end: now.toISOString() }
}

// Auto-pick bucket granularity for custom ranges
function resolveBucketPeriod(period, customFrom, customTo) {
  if (period !== 'custom') return period
  if (!customFrom || !customTo) return 'month'
  const days = (new Date(customTo) - new Date(customFrom)) / 86_400_000
  if (days <= 14)  return 'week'
  if (days <= 90)  return 'month'
  return 'year'
}

function groupByBucket(tasks, bucketPeriod) {
  const map = new Map()
  tasks.forEach(task => {
    const d = new Date(task.created_at)
    let key, label
    if (bucketPeriod === 'week') {
      key   = d.toISOString().slice(0, 10)
      label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
    } else if (bucketPeriod === 'month') {
      const wom = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)
      key   = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-W${wom}`
      label = `${d.toLocaleDateString('en-IN', { month: 'short' })} W${wom}`
    } else {
      key   = d.toISOString().slice(0, 7)
      label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    }
    if (!map.has(key)) map.set(key, { key, label, created: 0, completed: 0 })
    const b = map.get(key)
    b.created++
    if (['done', 'completed'].includes(task.status)) b.completed++
  })
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, loading }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e4df',
      borderRadius: 14,
      padding: '24px 24px 20px',
      fontFamily: FONT_BODY,
    }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{
          fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600,
          margin: 0, color: '#1a1a1a', letterSpacing: '-0.3px',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#999', margin: '3px 0 0', fontFamily: FONT_BODY }}>
            {subtitle}
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: 160, borderRadius: 8,
              background: '#f0ede9',
              animation: 'myz-shimmer 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      ) : children}
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '5px 14px', borderRadius: 20,
      background: color + '15', border: `1px solid ${color}28`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: '#444', whiteSpace: 'nowrap' }}>
        <strong style={{ color: '#1a1a1a' }}>{value}</strong> {label}
      </span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e4df', borderRadius: 8,
      fontFamily: FONT_BODY, fontSize: 13, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1a1a1a' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ userId, userRole }) {

  const [period,     setPeriod]     = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const [pipelineData, setPipelineData] = useState([])
  const [trendData,    setTrendData]    = useState([])
  const [workloadData, setWorkloadData] = useState([])

  const [loadingPipeline, setLoadingPipeline] = useState(true)
  const [loadingTrends,   setLoadingTrends]   = useState(true)
  const [loadingWorkload, setLoadingWorkload] = useState(true)

  // ── Event pipeline (all-time, doesn't change with period) ──────────────────
  const fetchPipeline = useCallback(async () => {
    setLoadingPipeline(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, review_status, archived_at')
      if (error) throw error

      let active = 0, pending = 0, archived = 0
      ;(data || []).forEach(e => {
        if (e.archived_at)                     archived++
        else if (e.review_status === 'approved') active++
        else                                     pending++
      })
      setPipelineData([
        { label: 'Active',           count: active,   color: '#22c55e'  },
        { label: 'Pending Approval', count: pending,  color: '#f59e0b'  },
        { label: 'Archived',         count: archived, color: '#94a3b8'  },
      ])
    } catch (err) {
      console.error('[Analytics] Pipeline error:', err)
    } finally {
      setLoadingPipeline(false)
    }
  }, [])

  // ── Task completion trends (period-aware) ──────────────────────────────────
  const fetchTrends = useCallback(async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoadingTrends(true)
    try {
      const { start, end } = getPeriodRange(period, customFrom, customTo)
      const { data, error } = await supabase
        .from('tasks')
        .select('id, created_at, status')
        .gte('created_at', start)
        .lte('created_at', end)
      if (error) throw error

      const bucketPeriod = resolveBucketPeriod(period, customFrom, customTo)
      setTrendData(groupByBucket(data || [], bucketPeriod))
    } catch (err) {
      console.error('[Analytics] Trends error:', err)
    } finally {
      setLoadingTrends(false)
    }
  }, [period, customFrom, customTo])

  // ── Team workload (uses v_user_workload view) ──────────────────────────────
  const fetchWorkload = useCallback(async () => {
    setLoadingWorkload(true)
    try {
      const [{ data: wl, error: wlErr }, { data: users, error: uErr }] = await Promise.all([
        supabase.from('v_user_workload').select('*'),
        supabase.from('users').select('id, full_name'),
      ])
      if (wlErr) throw wlErr
      if (uErr)  throw uErr

      const nameMap = {}
      ;(users || []).forEach(u => { nameMap[u.id] = u.full_name || 'Team Member' })

      const rows = (wl || [])
        .map(w => ({
          name:    nameMap[w.assigned_to] || null,
          done:    w.done          || 0,
          active:  (w.in_progress  || 0) + (w.not_started || 0),
          overdue: w.overdue       || 0,
          total:   (w.done || 0) + (w.in_progress || 0) + (w.not_started || 0) + (w.overdue || 0),
        }))
        .filter(w => w.name && w.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      setWorkloadData(rows)
    } catch (err) {
      console.error('[Analytics] Workload error:', err)
    } finally {
      setLoadingWorkload(false)
    }
  }, [])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])
  useEffect(() => { fetchTrends()   }, [fetchTrends])
  useEffect(() => { fetchWorkload() }, [fetchWorkload])

  // Admin guard — after all hooks
  if (userRole !== 'admin') return null

  const totalEvents = pipelineData.reduce((s, d) => s + d.count, 0)
  const barHeight   = Math.max(280, workloadData.length * 44)

  return (
    <div style={{ fontFamily: FONT_BODY, padding: '0 0 48px', background: WARM_BG, minHeight: '100%' }}>

      {/* Keyframe injection */}
      <style>{`
        @keyframes myz-shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e8e4df' }}>
        <h1 style={{
          fontFamily: FONT_HEAD, fontSize: 34, fontWeight: 700,
          margin: 0, color: '#1a1a1a', letterSpacing: '-0.6px',
        }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: '#999', margin: '4px 0 0', fontFamily: FONT_BODY }}>
          Volume &amp; velocity — no financials shown here
        </p>
      </div>

      {/* ── Period selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {PERIOD_OPTIONS.map(opt => {
          const active = period === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '7px 20px',
                borderRadius: 20,
                border:      active ? `1.5px solid ${BRAND_RED}` : '1.5px solid #e8e4df',
                background:  active ? BRAND_RED : '#fff',
                color:       active ? '#fff' : '#666',
                fontFamily:  FONT_BODY,
                fontSize:    13,
                fontWeight:  active ? 600 : 400,
                cursor:      'pointer',
                transition:  'all 0.15s',
                lineHeight:  1,
              }}
            >
              {opt.label}
            </button>
          )
        })}

        {/* Custom date pickers */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 4, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8,
                border: '1.5px solid #e8e4df', fontFamily: FONT_BODY,
                fontSize: 13, color: '#333', background: '#fff',
                outline: 'none',
              }}
            />
            <span style={{ color: '#bbb', fontSize: 13 }}>→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8,
                border: '1.5px solid #e8e4df', fontFamily: FONT_BODY,
                fontSize: 13, color: '#333', background: '#fff',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Panels ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Panel 1 — Event Pipeline */}
        <SectionCard
          title="Event Pipeline"
          subtitle={`${totalEvents} total event${totalEvents !== 1 ? 's' : ''} across all statuses`}
          loading={loadingPipeline}
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {pipelineData.map(d => (
              <StatPill key={d.label} label={d.label} value={d.count} color={d.color} />
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#888' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#888' }}
                axisLine={false} tickLine={false} allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f2ee' }} />
              <Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {pipelineData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Panel 2 — Task Completion Trends */}
        <SectionCard
          title="Task Completion Trends"
          subtitle="Tasks created vs completed in the selected period"
          loading={loadingTrends}
        >
          {!loadingTrends && trendData.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '44px 0',
              color: '#bbb', fontFamily: FONT_BODY, fontSize: 14,
            }}>
              No task data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#888' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#888' }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontFamily: FONT_BODY, fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  type="monotone" dataKey="created" name="Created"
                  stroke="#94a3b8" strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#94a3b8', strokeWidth: 0 }}
                  activeDot={{ r: 5.5, fill: '#94a3b8' }}
                />
                <Line
                  type="monotone" dataKey="completed" name="Completed"
                  stroke="#22c55e" strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#22c55e', strokeWidth: 0 }}
                  activeDot={{ r: 5.5, fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Panel 3 — Team Workload Summary */}
        <SectionCard
          title="Team Workload"
          subtitle="Done · Active · Overdue — top 10 by task volume"
          loading={loadingWorkload}
        >
          {!loadingWorkload && workloadData.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '44px 0',
              color: '#bbb', fontFamily: FONT_BODY, fontSize: 14,
            }}>
              No workload data found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart
                layout="vertical"
                data={workloadData}
                margin={{ top: 4, right: 16, bottom: 4, left: 110 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#888' }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <YAxis
                  type="category" dataKey="name" width={105}
                  tick={{ fontFamily: FONT_BODY, fontSize: 12, fill: '#444' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f2ee' }} />
                <Legend wrapperStyle={{ fontFamily: FONT_BODY, fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="done"    name="Done"    stackId="w" fill="#22c55e" />
                <Bar dataKey="active"  name="Active"  stackId="w" fill="#93c5fd" />
                <Bar dataKey="overdue" name="Overdue" stackId="w" fill={BRAND_RED} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
