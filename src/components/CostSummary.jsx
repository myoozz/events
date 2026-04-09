import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DEFAULT_CLAUSES = [
  { id:'p1', category:'Payment terms', text:'A purchase order (PO) must be issued prior to commencement of work.' },
  { id:'p2', category:'Payment terms', text:'50% advance payment is required along with the purchase order. Balance to be cleared within 15 days of billing.' },
  { id:'p3', category:'Payment terms', text:'40% payment required with purchase order as advance. 20% on event date. Balance 20% post-activity completion against invoice.' },
  { id:'p4', category:'Payment terms', text:'100% advance is required for all F&B and hotel bookings at the time of booking.' },
  { id:'p5', category:'Payment terms', text:'A single consolidated invoice will be raised for the entire activity.' },
  { id:'s1', category:'Scope & cost changes', text:'All costs are based on the scope of work as detailed in this proposal. Any modification, addition, or reduction in scope will result in a corresponding revision of costs.' },
  { id:'s2', category:'Scope & cost changes', text:'Any additional elements or services requested beyond the agreed scope will be charged separately.' },
  { id:'s3', category:'Scope & cost changes', text:'This is an estimated budget. Any change in elements, quantity, or specifications will affect the final cost.' },
  { id:'s4', category:'Scope & cost changes', text:'Agency travel costs (flights, local transport, meals) will be charged as additional and billed on actuals.' },
  { id:'s5', category:'Scope & cost changes', text:'Travel and local conveyance costs are dynamic in nature and will be billed on actuals.' },
  { id:'s6', category:'Scope & cost changes', text:'2 rooms to be provided by the client at the event venue during setup, event, and dismantling days.' },
  { id:'l1', category:'Permissions & licenses', text:'All necessary permissions (Police, Municipality, Fire NOC) are to be obtained as per legal requirements and will be billed to the client on actuals.' },
  { id:'l2', category:'Permissions & licenses', text:'All permissions and licenses must be applied for a minimum of 15 working days in advance.' },
  { id:'l3', category:'Permissions & licenses', text:'Matadi, union labour, and genset permission charges will be billed on actuals.' },
  { id:'l4', category:'Permissions & licenses', text:'Entertainment and performance license costs will be charged on actuals after selection of entertainment preference.' },
  { id:'l5', category:'Permissions & licenses', text:'Air courier and cargo charges for product or demo material will be billed on actuals.' },
  { id:'c1', category:'Cancellation & confirmation', text:'Any change or cancellation post confirmation will attract 100% payment of the agreed amount.' },
  { id:'c2', category:'Cancellation & confirmation', text:'All manpower is subject to availability at the time of confirmation.' },
  { id:'g1', category:'General conditions', text:'GST will be charged extra as applicable, at the prevailing government rate at the time of final billing.' },
  { id:'g2', category:'General conditions', text:'All information, materials, and documents shared as part of this proposal are strictly confidential and shall not be disclosed to any third party.' },
  { id:'g3', category:'General conditions', text:'Myoozz Consulting Pvt. Ltd. shall not be held responsible for any delay or disruption caused by factors beyond human control (force majeure).' },
]

const TNC_CATEGORIES = ['Payment terms','Scope & cost changes','Permissions & licenses','Cancellation & confirmation','General conditions']

function fmt(n){ return (!n||n===0)?'—':'₹'+Math.round(n).toLocaleString('en-IN') }
function calcClient(el){ return el.lump_sum?(el.amount||0):(el.rate||0)*(el.qty||1)*(el.days||1) }
function calcInternal(el){ return el.internal_lump?(el.internal_amount||0):(el.internal_rate||0)*(el.qty||1)*(el.days||1) }

function CategoryBreakdown({ cities, getCitySummary, isAdmin }) {
  const [expandedCats, setExpandedCats] = useState({})

  // Build combined category map across all cities
  const allCats = {}
  cities.forEach(city => {
    getCitySummary(city).forEach(cat => {
      if (!allCats[cat.name]) allCats[cat.name] = { name: cat.name, total: 0, internalTotal: 0, cities: {} }
      allCats[cat.name].total += cat.clientTotal
      allCats[cat.name].internalTotal += cat.internalTotal
      allCats[cat.name].cities[city] = { clientTotal: cat.clientTotal, internalTotal: cat.internalTotal }
    })
  })

  const cats = Object.values(allCats)
  const isMultiCity = cities.length > 1

  if (cats.length === 0) return (
    <div style={{ marginBottom: '32px', padding: '24px', border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No elements yet. Go to Elements & Costs tab to start building.</p>
    </div>
  )

  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px' }}>
        Category breakdown
      </h3>
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {cats.map((cat, i) => {
          const isExpanded = expandedCats[cat.name]
          const isLast = i === cats.length - 1
          return (
            <div key={cat.name}>
              {/* Category row */}
              <div
                onClick={() => isMultiCity && setExpandedCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: isExpanded ? 'var(--bg-secondary)' : 'var(--bg)',
                  borderBottom: (!isLast || isExpanded) ? '0.5px solid var(--border)' : 'none',
                  cursor: isMultiCity ? 'pointer' : 'default',
                }}
                onMouseOver={e => { if (isMultiCity) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  {/* Expand toggle for multi-city */}
                  {isMultiCity && (
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{cat.name}</span>

                  {/* City tags — shown when collapsed */}
                  {isMultiCity && !isExpanded && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {cities.map(city => {
                        const cityAmt = cat.cities[city]?.clientTotal || 0
                        return cityAmt > 0 ? (
                          <span key={city} style={{
                            fontSize: '10px', padding: '1px 7px',
                            borderRadius: '20px',
                            background: 'var(--bg-secondary)',
                            border: '0.5px solid var(--border)',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                          }}>
                            {city}: {fmt(cityAmt)}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{fmt(cat.total)}</div>
                  {isAdmin && cat.internalTotal > 0 && (
                    <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px' }}>Internal: {fmt(cat.internalTotal)}</div>
                  )}
                </div>
              </div>

              {/* Expanded city breakdown */}
              {isMultiCity && isExpanded && (
                <div style={{ background: 'var(--bg-secondary)', borderBottom: !isLast ? '0.5px solid var(--border)' : 'none' }}>
                  {cities.map((city, ci) => {
                    const cityData = cat.cities[city]
                    if (!cityData || cityData.clientTotal === 0) return null
                    return (
                      <div key={city} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 18px 8px 36px',
                        borderBottom: ci < cities.length - 1 ? '0.5px solid var(--border)' : 'none',
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{city}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{fmt(cityData.clientTotal)}</div>
                          {isAdmin && cityData.internalTotal > 0 && (
                            <div style={{ fontSize: '11px', color: '#92400E' }}>Internal: {fmt(cityData.internalTotal)}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Category total row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 18px 8px 36px', borderTop: '0.5px solid var(--border)', background: 'var(--bg)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Total across {cities.length} cities</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{fmt(cat.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CostSummary({ event, userRole }) {
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tncSelected, setTncSelected] = useState([])
  const [tncCustom, setTncCustom] = useState([])
  const [newClause, setNewClause] = useState('')
  const [openCat, setOpenCat] = useState('Payment terms')
  const [savingTnc, setSavingTnc] = useState(false)
  const [tncSaved, setTncSaved] = useState(false)
  const isAdmin = userRole === 'admin'
  const cities = event.cities?.length > 0 ? event.cities : ['General']

  useEffect(() => { loadData() }, [event.id])

  async function loadData() {
    setLoading(true)
    const [{ data: els }, { data: ev }] = await Promise.all([
      supabase.from('elements').select('*').eq('event_id', event.id).order('sort_order'),
      supabase.from('events').select('tnc_selected, tnc_custom').eq('id', event.id).single()
    ])
    setElements(els || [])
    if (ev) {
      setTncSelected(ev.tnc_selected || [])
      setTncCustom(ev.tnc_custom || [])
    }
    setLoading(false)
  }

  async function saveTnc(sel, cust) {
    setSavingTnc(true)
    await supabase.from('events').update({ tnc_selected: sel, tnc_custom: cust }).eq('id', event.id)
    setSavingTnc(false)
    setTncSaved(true)
    setTimeout(() => setTncSaved(false), 2000)
  }

  function toggleClause(id) {
    const next = tncSelected.includes(id)
      ? tncSelected.filter(s => s !== id)
      : [...tncSelected, id]
    setTncSelected(next)
    saveTnc(next, tncCustom)
  }

  function addCustom() {
    if (!newClause.trim()) return
    const next = [...tncCustom, newClause.trim()]
    setTncCustom(next)
    setNewClause('')
    saveTnc(tncSelected, next)
  }

  function removeCustom(idx) {
    const next = tncCustom.filter((_, i) => i !== idx)
    setTncCustom(next)
    saveTnc(tncSelected, next)
  }

  // Build summary data per city
  function getCitySummary(city) {
    const cityEls = elements.filter(el => el.city === city)
    const cats = {}
    cityEls.forEach(el => {
      if (!cats[el.category]) cats[el.category] = { name: el.category, clientTotal: 0, internalTotal: 0 }
      cats[el.category].clientTotal += calcClient(el)
      cats[el.category].internalTotal += calcInternal(el)
    })
    return Object.values(cats)
  }

  // Grand totals across all cities
  let grandClient = 0, grandInternal = 0
  cities.forEach(city => {
    getCitySummary(city).forEach(cat => {
      grandClient += cat.clientTotal
      grandInternal += cat.internalTotal
    })
  })

  const agencyFee = Math.round(grandClient * (event.agency_fee_percent || 10) / 100)
  const subtotalWithFee = grandClient + agencyFee
  const gstAmt = Math.round(subtotalWithFee * (event.gst_percent || 18) / 100)
  const grandTotal = subtotalWithFee + gstAmt
  const totalMargin = grandClient - grandInternal
  const tncCount = tncSelected.length + tncCustom.length

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '0.5px solid var(--border)',
  }
  const labelStyle = { fontSize: '14px', color: 'var(--text-secondary)' }
  const valueStyle = { fontSize: '14px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }

  if (loading) return <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading...</p>

  async function handleDownload() {
    const { exportProposalExcel } = await import('../utils/excelExport')
    const { supabase } = await import('../supabase')
    const { data: els } = await supabase.from('elements').select('*').eq('event_id', event.id)
    const { data: client } = await supabase.from('clients').select('*').eq('id', event.client_id).single()
    await exportProposalExcel(event, els || [], [], {})
  }

  return (
    <div style={{ maxWidth: '680px' }}>

      {/* Download button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={handleDownload}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
          ↓ Download proposal
        </button>
      </div>

      {/* Combined category breakdown across all cities */}
      <CategoryBreakdown
        cities={cities}
        getCitySummary={getCitySummary}
        isAdmin={isAdmin}
      />

      {/* Cost calculation */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px' }}>
          Cost calculation
        </h3>
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 20px' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Elements subtotal</span>
            <span style={valueStyle}>{fmt(grandClient)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Agency fee ({event.agency_fee_percent || 10}%)</span>
            <span style={valueStyle}>{fmt(agencyFee)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ ...labelStyle, fontWeight: 500, color: 'var(--text)' }}>Subtotal (before GST)</span>
            <span style={{ ...valueStyle, fontSize: '16px' }}>{fmt(subtotalWithFee)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>GST ({event.gst_percent || 18}%)</span>
            <span style={valueStyle}>{fmt(gstAmt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>Grand total</span>
            <span style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Admin margin summary */}
        {isAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '12px' }}>
            {[
              { label: 'Total internal cost', value: fmt(grandInternal) || '—', color: '#92400E', bg: '#FFFBEB', border: '#F59E0B' },
              { label: 'Gross margin', value: fmt(totalMargin) || '₹0', color: totalMargin > 0 ? '#15803D' : totalMargin === 0 ? '#92400E' : '#B91C1C', bg: totalMargin > 0 ? '#F0FDF4' : totalMargin === 0 ? '#FFFBEB' : '#FEF2F2', border: totalMargin > 0 ? '#22C55E' : totalMargin === 0 ? '#F59E0B' : '#F87171' },
              { label: 'Margin %', value: grandClient > 0 ? Math.round((totalMargin / grandClient) * 100) + '%' : '—', color: totalMargin > 0 ? '#15803D' : totalMargin === 0 ? '#92400E' : '#B91C1C', bg: totalMargin > 0 ? '#F0FDF4' : totalMargin === 0 ? '#FFFBEB' : '#FEF2F2', border: totalMargin > 0 ? '#22C55E' : totalMargin === 0 ? '#F59E0B' : '#F87171' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: s.color, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 500, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {isAdmin && totalMargin === 0 && grandClient > 0 && (
          <p style={{ fontSize: '11px', color: '#92400E', marginTop: '6px' }}>
            Margin is ₹0 — add internal (vendor) costs in Elements tab to see actual margin.
          </p>
        )}
      </div>

      {/* T&C */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
            Terms & conditions
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {tncCount} clause{tncCount !== 1 ? 's' : ''} selected
            {savingTnc && ' · Saving...'}
            {tncSaved && <span style={{ color: 'var(--green)' }}> · Saved ✓</span>}
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
          Select clauses that apply to this proposal. They will appear at the bottom of your exported document.
        </p>

        {/* Clause categories */}
        {TNC_CATEGORIES.map(cat => {
          const clauses = DEFAULT_CLAUSES.filter(c => c.category === cat)
          const selectedInCat = clauses.filter(c => tncSelected.includes(c.id)).length
          const isOpen = openCat === cat
          return (
            <div key={cat} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '6px', overflow: 'hidden' }}>
              <div onClick={() => setOpenCat(isOpen ? null : cat)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: isOpen ? 'var(--bg-secondary)' : 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{cat}</span>
                  {selectedInCat > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: 'var(--green-light)', color: 'var(--green)' }}>
                      {selectedInCat} selected
                    </span>
                  )}
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <path d="M3 5l4 4 4-4" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen && (
                <div style={{ borderTop: '0.5px solid var(--border)' }}>
                  {clauses.map(clause => {
                    const sel = tncSelected.includes(clause.id)
                    return (
                      <div key={clause.id} onClick={() => toggleClause(clause.id)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: sel ? '#F0FDF4' : 'none', borderBottom: '0.5px solid var(--border)' }}
                        onMouseOver={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'none' }}
                      >
                        <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, border: sel ? 'none' : '0.5px solid var(--border-strong)', background: sel ? 'var(--text)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                          {sel && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{clause.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Custom clause */}
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: tncCustom.length > 0 ? '0.5px solid var(--border)' : 'none' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>Add a custom clause</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                placeholder="Type your custom clause here..."
                value={newClause}
                onChange={e => setNewClause(e.target.value)}
                rows={2}
                style={{ flex: 1, padding: '8px 10px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'var(--bg)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
              <button onClick={addCustom} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', alignSelf: 'flex-end' }}>
                Add
              </button>
            </div>
          </div>
          {tncCustom.map((clause, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: '#F0FDF4', borderBottom: idx < tncCustom.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <p style={{ flex: 1, fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                {clause} <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>· Custom</span>
              </p>
              <button onClick={() => removeCustom(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-tertiary)', padding: '0 4px', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>

        {/* T&C preview */}
        {tncCount > 0 && (
          <div style={{ marginTop: '20px', padding: '20px 24px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              Preview — as it will appear on your proposal
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px' }}>Terms & Conditions</p>
            <ol style={{ paddingLeft: '18px', margin: 0 }}>
              {tncSelected.map(id => {
                const c = DEFAULT_CLAUSES.find(x => x.id === id)
                return c ? <li key={id} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '6px' }}>{c.text}</li> : null
              })}
              {tncCustom.map((c, i) => (
                <li key={'c'+i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '6px' }}>{c}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
