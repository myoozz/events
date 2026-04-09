import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const STAGES = [
  {
    key: 'proposal',
    label: 'Proposal',
    icon: '📋',
    desc: 'Cost sheet built and exported',
  },
  {
    key: 'won',
    label: 'Won',
    icon: '🏆',
    desc: 'Client confirmed the project',
  },
  {
    key: 'execution',
    label: 'Execution',
    icon: '⚡',
    desc: 'Tasks assigned with deadlines',
  },
  {
    key: 'production',
    label: 'Production',
    icon: '🎨',
    desc: 'Creatives approved, fabrication live',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: '✅',
    desc: 'All tasks done, event executed',
  },
]

// Colors matching app color system
const STAGE_COLORS = {
  done:    { bg: '#DCFCE7', border: '#16A34A', text: '#15803D', dot: '#16A34A' },
  active:  { bg: '#FFF7ED', border: '#F97316', text: '#EA580C', dot: '#F97316' },
  pending: { bg: 'var(--bg-secondary)', border: 'var(--border)', text: 'var(--text-tertiary)', dot: 'var(--border-strong)' },
}

async function computeMilestones(event) {
  const achieved = new Set()

  // Stage 1: Proposal — has elements + status was ever set
  const { count: elementCount } = await supabase
    .from('elements').select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
  if (elementCount > 0) achieved.add('proposal')

  // Stage 2: Won
  if (['won', 'active', 'completed'].includes(event.status)) {
    achieved.add('proposal')
    achieved.add('won')
  }

  // Stage 3: Execution — tasks exist and most are assigned
  const { data: tasks } = await supabase
    .from('tasks').select('assigned_name, assigned_to, deadline, status')
    .eq('event_id', event.id)
  if (tasks && tasks.length > 0) {
    const assigned = tasks.filter(t => t.assigned_name || t.assigned_to).length
    const withDeadline = tasks.filter(t => t.deadline).length
    if (assigned >= tasks.length * 0.7 && withDeadline >= tasks.length * 0.5) {
      achieved.add('execution')
    }
  }

  // Stage 4: Production — all creatives approved or file_sent
  if (tasks && tasks.length > 0) {
    const { data: prodTasks } = await supabase
      .from('tasks')
      .select('element_type, creative_status')
      .eq('event_id', event.id)
      .in('element_type', ['fab_print', 'print', 'creative'])
    if (prodTasks && prodTasks.length > 0) {
      const allApproved = prodTasks.every(t =>
        ['client_approved', 'file_sent', 'not_started'].includes(t.creative_status)
      )
      if (allApproved) achieved.add('production')
    } else if (achieved.has('execution')) {
      achieved.add('production') // no print/creative elements, skip stage
    }
  }

  // Stage 5: Delivered — all tasks done
  if (tasks && tasks.length > 0) {
    const allDone = tasks.every(t => t.status === 'done')
    if (allDone) achieved.add('delivered')
  }

  return achieved
}

export default function EventMilestone({ event }) {
  const [achieved, setAchieved] = useState(new Set())
  const [showTooltip, setShowTooltip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    computeMilestones(event).then(a => {
      setAchieved(a)
      setLoading(false)
    })
  }, [event.id, event.status])

  // Find active stage
  const doneStages = STAGES.filter(s => achieved.has(s.key))
  const activeIdx = Math.min(doneStages.length, STAGES.length - 1)

  if (loading) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Milestone stepper */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', position: 'relative' }}>
        {STAGES.map((stage, i) => {
          const isDone = achieved.has(stage.key)
          const isActive = !isDone && i === activeIdx
          const state = isDone ? 'done' : isActive ? 'active' : 'pending'
          const colors = STAGE_COLORS[state]
          const isLast = i === STAGES.length - 1

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? 0 : 1 }}>
              {/* Stage */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: '64px' }}
                onMouseEnter={() => setShowTooltip(stage.key)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                {/* Coin / badge */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: colors.bg,
                  border: `2px solid ${colors.dot}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isDone ? '16px' : '14px',
                  transition: 'all 0.2s',
                  boxShadow: isDone ? `0 2px 8px ${colors.dot}40` : 'none',
                }}>
                  {isDone ? stage.icon : isActive ? '◐' : '○'}
                </div>

                {/* Label */}
                <span style={{ fontSize: '10px', fontWeight: isDone || isActive ? 600 : 400, color: colors.text, textAlign: 'center', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
                  {stage.label}
                </span>

                {/* Tooltip */}
                {showTooltip === stage.key && (
                  <div style={{
                    position: 'absolute', top: '48px', zIndex: 100,
                    background: 'var(--text)', color: 'var(--bg)',
                    padding: '6px 10px', borderRadius: '6px',
                    fontSize: '11px', whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}>
                    {isDone ? `✓ ${stage.desc}` : stage.desc}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  flex: 1, height: '2px', marginTop: '17px',
                  background: achieved.has(STAGES[i + 1]?.key) || isDone
                    ? '#16A34A'
                    : isActive ? '#F97316' : 'var(--border)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* What's next hint */}
      {activeIdx < STAGES.length && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'center' }}>
          {!achieved.has('proposal') && '→ Add elements and export your proposal to reach the first milestone'}
          {achieved.has('proposal') && !achieved.has('won') && '→ Mark this event as Won when the client confirms'}
          {achieved.has('won') && !achieved.has('execution') && '→ Go to Execution tab, generate tasks, assign your team'}
          {achieved.has('execution') && !achieved.has('production') && '→ Go to Production tab, get all creatives approved'}
          {achieved.has('production') && !achieved.has('delivered') && '→ Mark all tasks done when the event is complete'}
          {achieved.has('delivered') && '🎉 Event delivered. Well done.'}
        </p>
      )}
    </div>
  )
}
