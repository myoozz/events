import { useState, useEffect } from 'react'
import ElementBuilder from './ElementBuilder'
import CostSummary from './CostSummary'
import ExportPreview from './ExportPreview'
import ScreenGuide from './ScreenGuide'
import TaskBoard from './TaskBoard'
import Production from './Production'
import DeliveredCenter from './DeliveredCenter'
import CueSheet from './CueSheet'
import EventMilestone from './EventMilestone'
import PageDescription from './PageDescription'
import { supabase } from '../supabase'

// ── Tab definitions — single source of truth for bar + bottom nav ──
const TABS = [
  { key: 'elements',   label: 'Elements & Costs' },
  { key: 'costs',      label: 'Cost Summary' },
  { key: 'export',     label: 'Preview & Export' },
  { key: 'tasks',      label: 'Execution' },
  { key: 'production', label: 'Production' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cuesheet',   label: 'Show Flow' },
]

const tabStyle = (active) => ({
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: active ? 500 : 400,
  fontFamily: 'var(--font-body)',
  color: active ? 'var(--text)' : 'var(--text-tertiary)',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #bc1723' : '2px solid transparent',
  cursor: 'pointer',
  letterSpacing: '0.2px',
  transition: 'all 0.15s',
})

const STATUS_OPTIONS = ['pitch', 'submitted', 'won', 'lost', 'on hold']
const STATUS_LABELS = {
  pitch: 'Pitch',
  submitted: 'Submitted',
  won: 'Won',
  lost: 'Lost',
  'on hold': 'On Hold',
}
const LOSS_REASONS = [
  'Budget constraint',
  'Went to another agency',
  'Client cancelled the event',
  'No response from client',
  'Brief withdrawn',
  'Lost on pricing',
  'Timing did not work out',
  'Other',
]

const statusColor = {
  pitch:    { bg: 'var(--blue-light)',  color: 'var(--blue)' },
  submitted:{ bg: 'var(--amber-light)', color: 'var(--amber)' },
  won:      { bg: 'var(--green-light)', color: 'var(--green)' },
  lost:     { bg: '#FCEBEB',            color: '#A32D2D' },
  'on hold':{ bg: 'var(--bg-secondary)',color: 'var(--text-tertiary)' },
}

export default function EventPage({ event, userRole, session, onBack, onUpdated, initialTab }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const [activeTab,    setActiveTab]    = useState(initialTab || 'elements')
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [showWonModal, setShowWonModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(event)
  const [teamUsers,    setTeamUsers]    = useState([])

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase.from('users').select('email, full_name').neq('status','inactive')
      setTeamUsers(data || [])
    }
    fetchTeam()
  }, [])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setRefreshKey(k => k + 1)
  }

  const [status,       setStatus]       = useState(event.status || 'pitch')
  const [lossReason,   setLossReason]   = useState(event.loss_reason || '')
  const [customReason, setCustomReason] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const sc      = statusColor[status] || statusColor.pitch
  const isAdmin = userRole === 'admin'

  async function handleStatusChange(newStatus) {
    if (newStatus === 'won') setShowWonModal(true)
    setStatus(newStatus)
    if (newStatus !== 'lost') {
      setSavingStatus(true)
      await supabase.from('events').update({ status: newStatus, loss_reason: null }).eq('id', event.id)
      setSavingStatus(false)
    }
  }

  async function saveLossReason() {
    const reason = lossReason === 'Other' ? customReason : lossReason
    setSavingStatus(true)
    await supabase.from('events').update({ status: 'lost', loss_reason: reason }).eq('id', event.id)
    setSavingStatus(false)
  }

  return (
    <div>
      {/* ← Back */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', fontSize: '13px',
          color: 'var(--text-tertiary)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', padding: '0',
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        ← All events
      </button>

      {/* ── Event header ── */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {event.event_subtype && (
                <span style={{
                  fontSize: '11px', color: 'var(--text-tertiary)',
                  padding: '3px 10px', borderRadius: '20px',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                }}>
                  {event.event_subtype}
                </span>
              )}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '32px',
              fontWeight: 500, color: 'var(--text)',
              letterSpacing: '-0.5px', marginBottom: '6px', lineHeight: 1.2,
            }}>
              {event.event_name}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {event.clients?.group_name}
              {event.clients?.brand_name ? ` · ${event.clients.brand_name}` : ''}
            </p>
          </div>

          {/* Status control — Admin only */}
          {isAdmin && (
            <div style={{ minWidth: '200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Pitch status
              </div>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '13px',
                  fontFamily: 'var(--font-body)', fontWeight: 500,
                  background: sc.bg, color: sc.color,
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {savingStatus && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Saving...</div>}

              {/* Loss reason */}
              {status === 'lost' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                    Reason for loss
                  </div>
                  <select
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '13px',
                      fontFamily: 'var(--font-body)', background: 'var(--bg)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', outline: 'none', color: 'var(--text)',
                    }}
                  >
                    <option value="">Select reason</option>
                    {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {lossReason === 'Other' && (
                    <input
                      placeholder="Describe the reason..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      style={{
                        width: '100%', marginTop: '6px', padding: '8px 12px',
                        fontSize: '13px', fontFamily: 'var(--font-body)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  {lossReason && (
                    <button
                      onClick={saveLossReason}
                      style={{
                        marginTop: '8px', padding: '7px 14px', fontSize: '12px',
                        fontFamily: 'var(--font-body)', fontWeight: 500,
                        background: 'var(--text)', color: 'var(--bg)',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}
                    >
                      Save reason
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Non-admin badge */}
          {!isAdmin && (
            <span style={{
              fontSize: '11px', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              padding: '4px 12px', borderRadius: '20px',
              background: sc.bg, color: sc.color,
            }}>
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: isMobile ? '16px' : '24px', marginTop: '16px', flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
          {/* City dates — per-city if available */}
          {event.cities?.length > 0 && event.city_dates && Object.keys(event.city_dates).length > 0 ? (
            event.cities.map(city => {
              const cd = event.city_dates[city]
              if (!cd?.start) return null
              const start = new Date(cd.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              const end = cd.end && cd.end !== cd.start
                ? new Date(cd.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : new Date(cd.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={city}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>{city}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {cd.end && cd.end !== cd.start ? `${start} – ${end}` : end}
                  </div>
                </div>
              )
            })
          ) : (
            <>
              {/* Bug 11 fix — city bubbles instead of plain text */}
              {event.cities?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Cities</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {event.cities.map(c => (
                      <span key={c} style={{
                        fontSize: '12px', color: 'var(--text)',
                        padding: '3px 10px', borderRadius: '20px',
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border)',
                        fontFamily: 'var(--font-body)',
                      }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {event.event_date && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Event date</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              )}
            </>
          )}
          {event.proposal_due_date && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Proposal due</div>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                {new Date(event.proposal_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Agency fee</div>
            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{event.agency_fee_percent}%</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>GST</div>
            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{event.gst_percent}%</div>
          </div>
        </div>
      </div>

      {/* Milestone stepper */}
      <EventMilestone event={event} />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: isMobile ? '20px' : '32px', gap: '4px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} style={tabStyle(activeTab === tab.key)}
            onClick={() => handleTabChange(tab.key)}>
            {tab.key === 'tasks'      ? '⚡ ' + tab.label :
             tab.key === 'production' ? '🎨 ' + tab.label :
             tab.key === 'delivered'  ? '✅ ' + tab.label :
             tab.key === 'cuesheet'   ? '🎬 ' + tab.label :
             tab.label}
          </button>
        ))}
      </div>

      <ScreenGuide screen={activeTab === 'elements' ? 'elements' : activeTab === 'costs' ? 'costs' : activeTab === 'tasks' ? 'tasks' : 'export'} />

      {/* Page descriptions */}
      {activeTab === 'elements' && (
        <PageDescription
          icon="📋"
          title="Build your cost sheet"
          description="Add every element by category. Fill client cost and internal cost to see your margin. Use Import to bring in existing Excel sheets."
          tip="Start with categories — each comes with suggested elements so you never start from zero."
        />
      )}
      {activeTab === 'costs' && (
        <PageDescription
          icon="₹"
          title="Your complete cost summary"
          description="All categories totalled by city, with agency fee and GST calculated automatically. This is what your client pays."
          tip="Select Terms & Conditions before exporting. They appear at the bottom of every proposal."
        />
      )}
      {activeTab === 'export' && (
        <PageDescription
          icon="📤"
          title="Preview and export your proposal"
          description="See exactly what your client will see. Toggle sections on or off, then download as a formatted Excel."
          tip="Switch between Estimate and Invoice before downloading. Multi-city events get one sheet per city."
        />
      )}
      {activeTab === 'tasks' && (
        <PageDescription
          icon="⚡"
          title="Project won — now execute"
          description="Generate a task for every element. Assign your team, set deadlines, and track to completion. Share a public link with any freelancer — no login needed."
          tip="Set the Category Owner first — they are accountable for everything in that category. Then assign individual elements."
        />
      )}
      {activeTab === 'production' && (
        <PageDescription
          icon="🎨"
          title="Track creative, fabrication and print"
          description="Every branded element needs creative approval before it goes to print. Track each stream independently and catch gaps before they become problems."
          tip="Nothing moves to print without client-approved artwork. The system will flag it if someone tries."
        />
      )}

      {/* ── Tab content ── */}
      {activeTab === 'elements' && (
        <ElementBuilder key={'elements-'+refreshKey} event={event} userRole={userRole} session={session} teamUsers={teamUsers} />
      )}
      {activeTab === 'costs' && (
        <CostSummary key={'costs-'+refreshKey} event={event} userRole={userRole} />
      )}
      {activeTab === 'export' && (
        <ExportPreview key={'export-'+refreshKey} event={event} userRole={userRole} session={session} />
      )}
      {activeTab === 'tasks' && (
        <TaskBoard key={'tasks-'+refreshKey} event={event} userRole={userRole} session={session} />
      )}
      {activeTab === 'production' && (
        <Production key={'production-'+refreshKey} event={event} teamUsers={teamUsers} />
      )}
      {activeTab === 'delivered' && (
        <PageDescription
          icon="✅"
          title="Event delivered. Well done."
          description="All your documents are ready. Download individually or take everything at once."
          tip="Share the proposal with your client, brief sheets with vendors, and keep the timeline for your records."
        />
      )}
      {activeTab === 'cuesheet' && (
        <PageDescription
          icon="🎬"
          title="Cue sheet / Show flow"
          description="Build your minute-by-minute show flow with named screens for each technical department. Add Sound, Light, LED Wall, Main Screen — whatever your setup needs."
          tip="Set start time + duration on first row — end fills automatically. Each row inherits the previous row's end time."
        />
      )}
      {activeTab === 'cuesheet' && (
        <CueSheet key={'cuesheet-'+refreshKey} event={event} />
      )}
      {activeTab === 'delivered' && (
        <DeliveredCenter key={'delivered-'+refreshKey} event={event} session={session} />
      )}

      {/* ── Bug 5: Section navigation — clean secondary buttons ── */}
      {(() => {
        const currentIdx = TABS.findIndex(t => t.key === activeTab)
        const prev = currentIdx > 0 ? TABS[currentIdx - 1] : null
        const next = currentIdx < TABS.length - 1 ? TABS[currentIdx + 1] : null
        const btnStyle = {
          padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)',
          background: 'none', border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)',
          transition: 'background 0.15s',
        }
        return (
          <div style={{
            marginTop: '48px', paddingTop: '20px',
            borderTop: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {prev ? (
              <button onClick={() => handleTabChange(prev.key)} style={btnStyle}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                ← {prev.label}
              </button>
            ) : <div />}
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#16A34A' }}>✓</span> Auto-saved
            </span>
            {next ? (
              <button onClick={() => handleTabChange(next.key)} style={btnStyle}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                {next.label} →
              </button>
            ) : <div />}
          </div>
        )
      })()}

      {/* ── Bug 12: Footer disclaimer — all tabs ── */}
      <div style={{
        marginTop: '24px',
        paddingTop: '14px',
        borderTop: '0.5px solid var(--border)',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-body)',
        }}>
          Confidential · Prepared for {currentEvent.clients?.group_name || 'your client'} ·&nbsp;
          Myoozz Events · Myoozz Consulting Pvt. Ltd.
        </p>
      </div>

      {/* ── Won celebration modal ── */}
      {showWonModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'40px 36px', maxWidth:'440px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🏆</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>
              Congratulations.
            </h2>
            <p style={{ fontSize:'15px', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:'8px' }}>
              Now the real work begins.
            </p>
            <p style={{ fontSize:'13px', color:'var(--text-tertiary)', lineHeight:1.7, marginBottom:'28px' }}>
              Jump into execution — assign every element to your team, set deadlines, and track to done. Nothing falls through the cracks.
            </p>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setShowWonModal(false); setActiveTab('tasks'); setRefreshKey(k=>k+1) }}
                style={{ flex:2, padding:'12px', fontSize:'14px', fontWeight:500, fontFamily:'var(--font-body)', background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
                Let's go ⚡
              </button>
              <button onClick={() => setShowWonModal(false)}
                style={{ flex:1, padding:'12px', fontSize:'13px', fontFamily:'var(--font-body)', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
