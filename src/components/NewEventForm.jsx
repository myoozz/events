import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── Data ────────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  {
    label: 'Corporate Events', value: 'corporate', icon: '🏢',
    sub: ['Conference / Summit', 'Awards Night', 'Team Offsite', 'Town Hall', 'Leadership Meet'],
  },
  {
    label: 'Brand Activations', value: 'brand_activation', icon: '⚡',
    sub: ['Product Launch', 'Press Conference', 'Experiential / Pop-Up', 'Road Show'],
  },
  {
    label: 'MICE', value: 'mice', icon: '✈️',
    sub: ['Incentive Trip', 'International Conference', 'Exhibition Tour', 'FAM Trip'],
  },
  {
    label: 'Exhibitions & Trade Shows', value: 'exhibition', icon: '🏛️',
    sub: ['Trade Show', 'Consumer Exhibition', 'Tech Expo', 'Industry Fair'],
  },
  {
    label: 'Government & Public Events', value: 'government', icon: '🎌',
    sub: ['State Function', 'Public Ceremony', 'Government Launch', 'Mass Gathering'],
  },
]

const SEATING = [
  'Theatre', 'Classroom', 'Banquet', 'Cocktail / Standing', 'Exhibition', 'Mixed',
]

const TIERS = [
  { value: 'standard',      label: 'Standard',      desc: 'Functional, on-budget delivery' },
  { value: 'premium',       label: 'Premium',        desc: 'Elevated experience, quality focus' },
  { value: 'ultra_premium', label: 'Ultra Premium',  desc: 'No-compromise benchmark event' },
]

const TOTAL_STEPS = 10

// ─── Shared Styles ────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(26,16,8,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    background: '#faf8f5', borderRadius: '12px', width: '100%',
    maxWidth: '580px', maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(26,16,8,0.22)',
  },
  header: {
    padding: '24px 28px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexShrink: 0,
  },
  body: {
    padding: '20px 28px 8px', overflowY: 'auto', flex: 1,
  },
  footer: {
    padding: '14px 28px', borderTop: '1px solid #e8e4dc',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#faf8f5', flexShrink: 0,
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '26px', fontWeight: 700,
    color: '#1a1008', lineHeight: 1.2, margin: 0,
  },
  sub: { fontSize: '13px', color: '#7a7060', marginTop: '3px' },
  label: {
    display: 'block', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.8px',
    color: '#7a7060', marginBottom: '6px',
  },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1px solid #d8d2c8', borderRadius: '6px',
    fontSize: '14px', color: '#1a1008', background: '#fff',
    outline: 'none', fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  tile: {
    width: '100%', border: '1.5px solid #d8d2c8', borderRadius: '8px',
    padding: '12px 14px', cursor: 'pointer', background: '#fff',
    transition: 'all 0.12s', textAlign: 'left',
    fontFamily: "'DM Sans', sans-serif",
  },
  tileActive: {
    borderColor: '#bc1723', background: '#fde8ea',
  },
  btn: {
    padding: '9px 18px', borderRadius: '6px', fontSize: '13px',
    fontWeight: 500, cursor: 'pointer', border: 'none',
    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  },
  btnDark: { background: '#1a1008', color: '#fff' },
  btnRed:  { background: '#bc1723', color: '#fff' },
  btnGhost: {
    background: 'transparent', color: '#7a7060',
    padding: '9px 0',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#7a7060', fontSize: '22px', lineHeight: 1,
    padding: '2px 4px', fontFamily: 'inherit',
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#1a1008', color: '#e8e4dc',
    borderRadius: '20px', padding: '3px 10px 3px 10px',
    fontSize: '12px',
  },
  sectionLabel: {
    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '1px', color: '#7a7060', marginBottom: '12px',
  },
  divider: {
    border: 'none', borderTop: '1px solid #e8e4dc', margin: '16px 0',
  },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewEventForm({ onClose, onCreated, userRole, session }) {
  const [flowMode, setFlowMode] = useState('entry') // entry | guided | classic | brief
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [showMore, setShowMore] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [error, setError] = useState('')

  const [a, setA] = useState({
    eventName: '',
    eventType: '', subCategory: '',
    startDate: '', endDate: '',
    cities: [],
    paxCount: '',
    seatingFormat: '',
    budgetTier: '',
    hasSubEvents: false, subEventCount: 2,
    clientSpocName: '', clientSpocContact: '',
    agencyPocId: '',
    // More details
    clientName: '', brandName: '',
    proposalDueDate: '',
    agencyFee: 10, gst: 18,
  })

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, role')
      .in('role', ['admin', 'manager', 'event_lead'])
      .then(({ data }) => { if (data) setUsers(data) })
  }, [])

  const set = (key, val) => setA(prev => ({ ...prev, [key]: val }))

  const addCity = () => {
    if (!cityInput.trim()) return
    const city = cityInput.trim().toLowerCase()
    if (!a.cities.includes(city)) set('cities', [...a.cities, city])
    setCityInput('')
  }
  const removeCity = (c) => set('cities', a.cities.filter(x => x !== c))

  const handleCreate = async () => {
    if (!a.eventName.trim()) { setError('Event name is required.'); return }
    setLoading(true)
    setError('')
    try {
      const cityDates = {}
      a.cities.forEach(c => {
        cityDates[c] = { start: a.startDate || null, end: a.endDate || null }
      })

      const payload = {
        name: a.eventName.trim(),
        client_name: a.clientName || a.clientSpocName || null,
        brand_name: a.brandName || null,
        contact_person: a.clientSpocName || null,
        contact_info: a.clientSpocContact || null,
        event_type: a.eventType || null,
        sub_category: a.subCategory || null,
        cities: a.cities,
        city_dates: Object.keys(cityDates).length ? cityDates : null,
        start_date: a.startDate || null,
        end_date: a.endDate || null,
        proposal_due_date: a.proposalDueDate || null,
        pax_count: a.paxCount ? parseInt(a.paxCount) : null,
        seating_format: a.seatingFormat || null,
        budget_tier: a.budgetTier || null,
        sub_events: a.hasSubEvents ? { count: a.subEventCount } : null,
        status: 'active',
        proposal_status: 'pitch',
        created_by: session?.user?.id,
        created_by_role: userRole,
        review_status: userRole === 'event_lead' ? 'pending' : 'approved',
      }

      const { data: event, error: dbErr } = await supabase
        .from('events').insert(payload).select().single()
      if (dbErr) throw dbErr
      onCreated(event)
      onClose()
    } catch (err) {
      console.error('Create event error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── ENTRY ─────────────────────────────────────────────────────────────────
  if (flowMode === 'entry') {
    return (
      <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={S.modal}>
          <div style={S.header}>
            <div>
              <h2 style={S.title}>New event</h2>
              <p style={S.sub}>How do you want to start?</p>
            </div>
            <button style={S.closeBtn} onClick={onClose}>×</button>
          </div>
          <div style={{ ...S.body, display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', paddingBottom: '28px' }}>
            <EntryTile
              icon="💬"
              title="Guide me through it"
              desc="Answer a few questions — ME sets everything up for you."
              onClick={() => { setFlowMode('guided'); setStep(1) }}
              accent
            />
            <EntryTile
              icon="✏️"
              title="I'll fill it myself"
              desc="Quick form with all fields. Fill what you know now."
              onClick={() => setFlowMode('classic')}
            />
            <EntryTile
              icon="📄"
              title="I have a brief"
              desc="Paste or upload a client brief — ME reads it for you."
              disabled
              badge="Coming soon"
            />
          </div>
        </div>
      </div>
    )
  }

  // ── GUIDED — QUESTIONS ────────────────────────────────────────────────────
  if (flowMode === 'guided' && step !== 'preview') {
    const pct = (step / TOTAL_STEPS) * 100
    const isLastStep = step >= TOTAL_STEPS
    const canAdvance = step !== 1 || a.eventName.trim().length > 0

    return (
      <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={S.modal}>
          <div style={{ ...S.header, alignItems: 'center' }}>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#7a7060',
            }}>
              {step} / {TOTAL_STEPS}
            </span>
            <button style={S.closeBtn} onClick={onClose}>×</button>
          </div>

          {/* Progress bar */}
          <div style={{ height: '2px', background: '#e8e4dc', margin: '12px 28px 0', borderRadius: '2px' }}>
            <div style={{
              height: '2px', background: '#bc1723', borderRadius: '2px',
              width: `${pct}%`, transition: 'width 0.3s ease',
            }} />
          </div>

          <div style={{ ...S.body, paddingTop: '24px' }}>
            <GuidedStepContent
              step={step} a={a} set={set}
              cityInput={cityInput} setCityInput={setCityInput}
              addCity={addCity} removeCity={removeCity}
              users={users}
            />
          </div>

          <div style={S.footer}>
            <button
              style={{ ...S.btn, ...S.btnGhost }}
              onClick={() => step === 1 ? setFlowMode('entry') : setStep(step - 1)}
            >
              ← Back
            </button>
            <button
              id="nef-next"
              style={{ ...S.btn, ...(canAdvance ? S.btnDark : { ...S.btnDark, opacity: 0.4, cursor: 'not-allowed' }) }}
              onClick={() => canAdvance && (isLastStep ? setStep('preview') : setStep(step + 1))}
            >
              {isLastStep ? 'Review →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GUIDED — PREVIEW ──────────────────────────────────────────────────────
  if (flowMode === 'guided' && step === 'preview') {
    return (
      <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={{ ...S.modal, maxWidth: '620px' }}>
          <div style={S.header}>
            <div>
              <h2 style={S.title}>{a.eventName || 'Your event'}</h2>
              <p style={S.sub}>Review everything before creating</p>
            </div>
            <button style={S.closeBtn} onClick={onClose}>×</button>
          </div>
          <div style={{ ...S.body, paddingTop: '20px', paddingBottom: '20px' }}>

            <PreviewCard a={a} onEdit={(s) => { setStep(s) }} />

            {/* More Details */}
            <div style={{ marginTop: '16px' }}>
              <button
                style={{ ...S.btn, ...S.btnGhost, fontSize: '12px', color: '#7a7060' }}
                onClick={() => setShowMore(!showMore)}
              >
                {showMore ? '▾' : '▸'} More details — Agency fee, GST, Proposal date
              </button>

              {showMore && (
                <div style={{
                  marginTop: '12px', padding: '16px', background: '#f2efe9',
                  borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={S.label}>Client / Group</label>
                      <input style={S.input} value={a.clientName}
                        onChange={e => set('clientName', e.target.value)}
                        placeholder="e.g. Aditya Birla Group" />
                    </div>
                    <div>
                      <label style={S.label}>Brand / Division</label>
                      <input style={S.input} value={a.brandName}
                        onChange={e => set('brandName', e.target.value)}
                        placeholder="e.g. Birla Opus" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={S.label}>Agency Fee — {a.agencyFee}%</label>
                      <input type="range" min="0" max="30" step="0.5"
                        value={a.agencyFee}
                        onChange={e => set('agencyFee', parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#bc1723' }} />
                    </div>
                    <div>
                      <label style={S.label}>GST</label>
                      <select style={S.input} value={a.gst}
                        onChange={e => set('gst', parseFloat(e.target.value))}>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Proposal Due</label>
                      <input style={S.input} type="date" value={a.proposalDueDate}
                        onChange={e => set('proposalDueDate', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                marginTop: '12px', padding: '10px 14px', background: '#fde8ea',
                border: '1px solid #f5b5ba', borderRadius: '6px',
                fontSize: '13px', color: '#8a1119',
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setStep(TOTAL_STEPS)}>
              ← Edit
            </button>
            <button
              style={{ ...S.btn, ...S.btnRed, opacity: loading ? 0.7 : 1 }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create event →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CLASSIC FORM ──────────────────────────────────────────────────────────
  if (flowMode === 'classic') {
    return (
      <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={S.modal}>
          <div style={S.header}>
            <div>
              <h2 style={S.title}>New event</h2>
              <p style={S.sub}>Fill in what you know. Everything can be edited later.</p>
            </div>
            <button style={S.closeBtn} onClick={onClose}>×</button>
          </div>

          <div style={{ ...S.body, paddingTop: '20px' }}>
            {/* CLIENT & BRAND */}
            <div style={S.sectionLabel}>Client & Brand</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={S.label}>Client / Group <span style={{ color: '#bc1723' }}>*</span></label>
                <input style={S.input} value={a.clientName}
                  onChange={e => set('clientName', e.target.value)}
                  placeholder="e.g. Aditya Birla Group" />
              </div>
              <div>
                <label style={S.label}>Brand / Division</label>
                <input style={S.input} value={a.brandName}
                  onChange={e => set('brandName', e.target.value)}
                  placeholder="e.g. Birla Opus" />
              </div>
              <div>
                <label style={S.label}>Contact Person</label>
                <input style={S.input} value={a.clientSpocName}
                  onChange={e => set('clientSpocName', e.target.value)}
                  placeholder="Name" />
              </div>
              <div>
                <label style={S.label}>Phone / Email</label>
                <input style={S.input} value={a.clientSpocContact}
                  onChange={e => set('clientSpocContact', e.target.value)}
                  placeholder="Phone or email" />
              </div>
            </div>

            <hr style={S.divider} />

            {/* EVENT DETAILS */}
            <div style={S.sectionLabel}>Event Details</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={S.label}>Event Name <span style={{ color: '#bc1723' }}>*</span></label>
              <input style={S.input} value={a.eventName}
                onChange={e => set('eventName', e.target.value)}
                placeholder="e.g. Udaan Contractor Meet 2026" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={S.label}>Event Type <span style={{ color: '#bc1723' }}>*</span></label>
                <select style={S.input} value={a.eventType}
                  onChange={e => { set('eventType', e.target.value); set('subCategory', '') }}>
                  <option value="">Select type</option>
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Sub-category</label>
                <select style={S.input} value={a.subCategory}
                  onChange={e => set('subCategory', e.target.value)}
                  disabled={!a.eventType}>
                  <option value="">Select sub-category</option>
                  {(EVENT_TYPES.find(t => t.value === a.eventType)?.sub || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Start Date</label>
                <input style={S.input} type="date" value={a.startDate}
                  onChange={e => set('startDate', e.target.value)} />
              </div>
              <div>
                <label style={S.label}>End Date</label>
                <input style={S.input} type="date" value={a.endDate}
                  onChange={e => set('endDate', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={S.label}>Cities</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input style={S.input} value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCity()}
                  placeholder="Type city and press Add" />
                <button style={{ ...S.btn, ...S.btnDark, whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={addCity}>
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {a.cities.map(c => (
                  <span key={c} style={S.pill}>
                    {c}
                    <button onClick={() => removeCity(c)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(232,228,220,0.7)', padding: 0, fontSize: '15px',
                        lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={S.label}>Proposal Due Date</label>
              <input style={{ ...S.input, maxWidth: '200px' }} type="date"
                value={a.proposalDueDate}
                onChange={e => set('proposalDueDate', e.target.value)} />
            </div>

            <hr style={S.divider} />

            {/* COMMERCIAL */}
            <div style={S.sectionLabel}>Commercial</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={S.label}>Agency Fee — {a.agencyFee}%</label>
                <input type="range" min="0" max="30" step="0.5"
                  value={a.agencyFee}
                  onChange={e => set('agencyFee', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#bc1723', marginTop: '6px' }} />
              </div>
              <div>
                <label style={S.label}>GST</label>
                <select style={S.input} value={a.gst}
                  onChange={e => set('gst', parseFloat(e.target.value))}>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: '12px', padding: '10px 14px', background: '#fde8ea',
                border: '1px solid #f5b5ba', borderRadius: '6px',
                fontSize: '13px', color: '#8a1119',
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setFlowMode('entry')}>
              ← Back
            </button>
            <button
              style={{ ...S.btn, ...S.btnDark, opacity: (!a.eventName.trim() || loading) ? 0.5 : 1 }}
              onClick={handleCreate}
              disabled={!a.eventName.trim() || loading}
            >
              {loading ? 'Creating...' : 'Create event'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── Entry Tile ───────────────────────────────────────────────────────────────

function EntryTile({ icon, title, desc, onClick, accent, disabled, badge }) {
  return (
    <button
      style={{
        ...S.tile,
        ...(accent ? { background: '#1a1008', borderColor: '#1a1008' } : {}),
        ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
        display: 'flex', gap: '14px', alignItems: 'flex-start',
      }}
      onClick={disabled ? undefined : onClick}
    >
      <span style={{ fontSize: '20px', marginTop: '2px', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{
          fontWeight: 600, fontSize: '14px', marginBottom: '2px',
          color: accent ? '#fff' : '#1a1008',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {title}
          {badge && (
            <span style={{
              fontSize: '9px', background: '#e8e4dc', color: '#7a7060',
              padding: '2px 6px', borderRadius: '3px', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: accent ? 'rgba(255,255,255,0.55)' : '#7a7060' }}>
          {desc}
        </div>
      </div>
      <span style={{ color: accent ? 'rgba(255,255,255,0.3)' : '#d8d2c8', fontSize: '16px', marginTop: '4px' }}>
        →
      </span>
    </button>
  )
}

// ─── Guided Step Content ──────────────────────────────────────────────────────

function GuidedStepContent({ step, a, set, cityInput, setCityInput, addCity, removeCity, users }) {
  const inputRef = useRef(null)
  const selectedType = EVENT_TYPES.find(t => t.value === a.eventType)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [step])

  const execDays = (a.startDate && a.endDate)
    ? Math.max(1, Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / 86400000) + 1)
    : null

  const STEPS = {
    1: {
      title: "What's the event called?",
      hint: "You can change this anytime.",
      content: (
        <input
          ref={inputRef}
          style={{ ...S.input, fontSize: '18px', padding: '14px 16px' }}
          value={a.eventName}
          onChange={e => set('eventName', e.target.value)}
          placeholder="e.g. Udaan Contractor Meet 2026"
          onKeyDown={e => e.key === 'Enter' && a.eventName.trim() && document.getElementById('nef-next')?.click()}
        />
      ),
    },
    2: {
      title: "What kind of event is this?",
      hint: "Pick a type, then narrow it down.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {EVENT_TYPES.map(t => (
              <button key={t.value}
                style={{
                  ...S.tile,
                  ...(a.eventType === t.value ? S.tileActive : {}),
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  padding: '12px 14px',
                }}
                onClick={() => { set('eventType', t.value); set('subCategory', '') }}
              >
                <span style={{ fontSize: '18px' }}>{t.icon}</span>
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: a.eventType === t.value ? '#bc1723' : '#1a1008',
                }}>{t.label}</span>
              </button>
            ))}
          </div>
          {selectedType && (
            <div>
              <label style={S.label}>Format / Sub-category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedType.sub.map(sub => (
                  <button key={sub}
                    style={{
                      padding: '6px 13px', borderRadius: '20px', cursor: 'pointer',
                      fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
                      border: '1px solid',
                      borderColor: a.subCategory === sub ? '#bc1723' : '#d8d2c8',
                      background: a.subCategory === sub ? '#fde8ea' : '#fff',
                      color: a.subCategory === sub ? '#bc1723' : '#2c2518',
                      transition: 'all 0.12s',
                    }}
                    onClick={() => set('subCategory', sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    3: {
      title: "When is it happening?",
      hint: "Start and end dates. Execution days are calculated automatically.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={S.label}>Start Date</label>
              <input ref={inputRef} style={S.input} type="date"
                value={a.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label style={S.label}>End Date</label>
              <input style={S.input} type="date"
                value={a.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          {execDays && (
            <div style={{
              padding: '10px 14px', background: '#e6f4ec', borderRadius: '6px',
              fontSize: '13px', color: '#0d4a26',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '15px' }}>📅</span>
              <span><strong>{execDays}</strong> execution day{execDays > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      ),
    },
    4: {
      title: "Where is it?",
      hint: "One city or many — ME handles multi-city events.",
      content: (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              ref={inputRef}
              style={S.input}
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCity()}
              placeholder="Type a city and press Add"
            />
            <button style={{ ...S.btn, ...S.btnDark, whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={addCity}>
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {a.cities.map(c => (
              <span key={c} style={S.pill}>
                {c}
                <button onClick={() => removeCity(c)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(232,228,220,0.7)', padding: 0, fontSize: '16px',
                    lineHeight: 1, fontFamily: 'inherit' }}>×</button>
              </span>
            ))}
          </div>
          {a.cities.length > 1 && (
            <div style={{
              marginTop: '10px', padding: '10px 14px', background: '#fef3e0',
              borderRadius: '6px', fontSize: '12px', color: '#7a4a00',
            }}>
              Multi-city event — set different dates per city on the event page after creating.
            </div>
          )}
        </div>
      ),
    },
    5: {
      title: "How many guests are expected?",
      hint: "An estimate is fine. This helps with venue, F&B, and manpower.",
      content: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              ref={inputRef}
              style={{ ...S.input, fontSize: '20px', padding: '14px', maxWidth: '180px' }}
              type="number"
              value={a.paxCount}
              onChange={e => set('paxCount', e.target.value)}
              placeholder="500"
            />
            <span style={{ fontSize: '13px', color: '#7a7060' }}>guests (PAX)</span>
          </div>
          <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '10px' }}>
            You can update this later. Even a rough number helps.
          </p>
        </div>
      ),
    },
    6: {
      title: "How will they be seated?",
      hint: "Drives stage layout, AV setup, and space planning.",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {SEATING.map(f => (
            <button key={f}
              style={{
                ...S.tile,
                ...(a.seatingFormat === f ? S.tileActive : {}),
                padding: '14px 10px', textAlign: 'center',
              }}
              onClick={() => set('seatingFormat', f)}
            >
              <div style={{
                fontSize: '13px', fontWeight: 600,
                color: a.seatingFormat === f ? '#bc1723' : '#1a1008',
              }}>
                {f}
              </div>
            </button>
          ))}
        </div>
      ),
    },
    7: {
      title: "What's the budget positioning?",
      hint: "Helps benchmark elements and flag rate anomalies.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {TIERS.map(t => (
            <button key={t.value}
              style={{
                ...S.tile,
                ...(a.budgetTier === t.value ? S.tileActive : {}),
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onClick={() => set('budgetTier', t.value)}
            >
              <div>
                <div style={{
                  fontWeight: 600, fontSize: '14px',
                  color: a.budgetTier === t.value ? '#bc1723' : '#1a1008',
                }}>
                  {t.label}
                </div>
                <div style={{ fontSize: '12px', color: '#7a7060', marginTop: '2px' }}>
                  {t.desc}
                </div>
              </div>
              {a.budgetTier === t.value && (
                <span style={{ color: '#bc1723', fontSize: '18px', flexShrink: 0 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      ),
    },
    8: {
      title: "Does this event have sub-events?",
      hint: "e.g. A conference + gala dinner + site visit across separate days.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'No — it\'s one event', val: false },
              { label: 'Yes — multiple sub-events', val: true },
            ].map(({ label, val }) => (
              <button key={String(val)}
                style={{
                  ...S.tile,
                  ...(a.hasSubEvents === val ? S.tileActive : {}),
                  padding: '14px',
                }}
                onClick={() => set('hasSubEvents', val)}
              >
                <div style={{
                  fontSize: '13px', fontWeight: 600,
                  color: a.hasSubEvents === val ? '#bc1723' : '#1a1008',
                }}>
                  {label}
                </div>
              </button>
            ))}
          </div>
          {a.hasSubEvents && (
            <div>
              <label style={S.label}>How many sub-events?</label>
              <input style={{ ...S.input, maxWidth: '120px' }}
                type="number" min="2"
                value={a.subEventCount}
                onChange={e => set('subEventCount', parseInt(e.target.value) || 2)} />
            </div>
          )}
        </div>
      ),
    },
    9: {
      title: "Who is the client contact?",
      hint: "The person on the client side you coordinate with.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={S.label}>Name</label>
            <input ref={inputRef} style={S.input} value={a.clientSpocName}
              onChange={e => set('clientSpocName', e.target.value)}
              placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label style={S.label}>Phone or Email</label>
            <input style={S.input} value={a.clientSpocContact}
              onChange={e => set('clientSpocContact', e.target.value)}
              placeholder="Phone number or email" />
          </div>
        </div>
      ),
    },
    10: {
      title: "Who is leading this event?",
      hint: "The ME team member responsible end-to-end.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.length === 0 && (
            <p style={{ fontSize: '13px', color: '#7a7060' }}>Loading team...</p>
          )}
          {users.map(u => (
            <button key={u.id}
              style={{
                ...S.tile,
                ...(a.agencyPocId === u.id ? S.tileActive : {}),
                display: 'flex', alignItems: 'center', gap: '12px',
              }}
              onClick={() => set('agencyPocId', u.id)}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '7px', flexShrink: 0,
                background: a.agencyPocId === u.id ? '#bc1723' : '#1a1008',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '13px', fontWeight: 700,
              }}>
                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600,
                  color: a.agencyPocId === u.id ? '#bc1723' : '#1a1008',
                }}>
                  {u.full_name}
                </div>
                <div style={{
                  fontSize: '10px', color: '#7a7060',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px',
                }}>
                  {u.role === 'manager'    ? 'Project Head' :
                   u.role === 'event_lead' ? 'Manager'      : u.role}
                </div>
              </div>
              {a.agencyPocId === u.id && (
                <span style={{ color: '#bc1723', fontSize: '16px' }}>✓</span>
              )}
            </button>
          ))}
          <button
            style={{ ...S.tile, color: '#7a7060', fontSize: '13px', textAlign: 'center', padding: '10px' }}
            onClick={() => set('agencyPocId', '')}
          >
            Skip — assign later
          </button>
        </div>
      ),
    },
  }

  const q = STEPS[step]
  if (!q) return null

  return (
    <div>
      <h2 style={{ ...S.title, fontSize: '22px', marginBottom: '4px' }}>{q.title}</h2>
      <p style={{ ...S.sub, marginBottom: '22px' }}>{q.hint}</p>
      {q.content}
    </div>
  )
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function PreviewCard({ a, onEdit }) {
  const selectedType = EVENT_TYPES.find(t => t.value === a.eventType)
  const tierLabel = TIERS.find(t => t.value === a.budgetTier)?.label

  const rows = [
    { label: 'Event name',   value: a.eventName,        step: 1 },
    { label: 'Type',         value: selectedType ? `${selectedType.label}${a.subCategory ? ` · ${a.subCategory}` : ''}` : '—', step: 2 },
    { label: 'Dates',        value: a.startDate ? `${a.startDate}${a.endDate ? ` → ${a.endDate}` : ''}` : '—', step: 3 },
    { label: 'Cities',       value: a.cities.length ? a.cities.join(', ') : '—', step: 4 },
    { label: 'PAX',          value: a.paxCount ? `${a.paxCount} guests` : '—', step: 5 },
    { label: 'Seating',      value: a.seatingFormat || '—', step: 6 },
    { label: 'Tier',         value: tierLabel || '—', step: 7 },
    { label: 'Sub-events',   value: a.hasSubEvents ? `Yes · ${a.subEventCount}` : 'No', step: 8 },
    { label: 'Client SPOC',  value: [a.clientSpocName, a.clientSpocContact].filter(Boolean).join(' · ') || '—', step: 9 },
  ]

  return (
    <div style={{ border: '1px solid #e8e4dc', borderRadius: '8px', overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: 'flex', alignItems: 'center',
          padding: '9px 14px',
          borderBottom: i < rows.length - 1 ? '1px solid #f2efe9' : 'none',
          background: i % 2 === 0 ? '#fff' : '#faf8f5',
        }}>
          <span style={{ fontSize: '11px', color: '#7a7060', width: '100px', flexShrink: 0 }}>
            {row.label}
          </span>
          <span style={{ fontSize: '13px', color: '#1a1008', flex: 1 }}>
            {row.value}
          </span>
          <button
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#bc1723', fontSize: '11px', padding: '2px 8px',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onClick={() => onEdit(row.step)}
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  )
}
