import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { exportProposalExcel } from '../utils/excelExport'

function fmt(n) { return (!n || n === 0) ? '—' : '₹' + Math.round(n).toLocaleString('en-IN') }
function calcClient(el) { return el.lump_sum ? (el.amount || 0) : (el.rate || 0) * (el.qty || 1) * (el.days || 1) }
function calcInternal(el) { return el.internal_lump ? (el.internal_amount || 0) : (el.internal_rate || 0) * (el.qty || 1) * (el.days || 1) }

const DEFAULT_CLAUSES = [
  { id:'p1', text:'A purchase order (PO) must be issued prior to commencement of work.' },
  { id:'p2', text:'50% advance payment is required along with the purchase order. Balance to be cleared within 15 days of billing.' },
  { id:'p3', text:'40% payment required with purchase order as advance. 20% on event date. Balance 20% post-activity completion against invoice.' },
  { id:'p4', text:'100% advance is required for all F&B and hotel bookings at the time of booking.' },
  { id:'p5', text:'A single consolidated invoice will be raised for the entire activity.' },
  { id:'s1', text:'All costs are based on the scope of work as detailed in this proposal. Any modification, addition, or reduction in scope will result in a corresponding revision of costs.' },
  { id:'s2', text:'Any additional elements or services requested beyond the agreed scope will be charged separately.' },
  { id:'s3', text:'This is an estimated budget. Any change in elements, quantity, or specifications will affect the final cost.' },
  { id:'s4', text:'Agency travel costs (flights, local transport, meals) will be charged as additional and billed on actuals.' },
  { id:'s5', text:'Travel and local conveyance costs are dynamic in nature and will be billed on actuals.' },
  { id:'s6', text:'2 rooms to be provided by the client at the event venue during setup, event, and dismantling days.' },
  { id:'l1', text:'All necessary permissions (Police, Municipality, Fire NOC) are to be obtained as per legal requirements and will be billed to the client on actuals.' },
  { id:'l2', text:'All permissions and licenses must be applied for a minimum of 15 working days in advance.' },
  { id:'l3', text:'Matadi, union labour, and genset permission charges will be billed on actuals.' },
  { id:'l4', text:'Entertainment and performance license costs will be charged on actuals after selection of entertainment preference.' },
  { id:'l5', text:'Air courier and cargo charges for product or demo material will be billed on actuals.' },
  { id:'c1', text:'Any change or cancellation post confirmation will attract 100% payment of the agreed amount.' },
  { id:'c2', text:'All manpower is subject to availability at the time of confirmation.' },
  { id:'g1', text:'GST will be charged extra as applicable, at the prevailing government rate at the time of final billing.' },
  { id:'g2', text:'All information, materials, and documents shared as part of this proposal are strictly confidential and shall not be disclosed to any third party.' },
  { id:'g3', text:'Myoozz Consulting Pvt. Ltd. shall not be held responsible for any delay or disruption caused by factors beyond human control (force majeure).' },
]

// Bug fix: was using non-reactive window.innerWidth — replaced with reactive hook
function useWindowSize() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

function Toggle({ label, checked, onChange, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '40px', height: '22px', borderRadius: '11px',
          background: checked ? 'var(--text)' : 'var(--border-strong)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: 'white', position: 'absolute',
          top: '3px', left: checked ? '21px' : '3px',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

export default function ExportPreview({ event, userRole }) {
  const [elements, setElements] = useState([])
  const [tncSelected, setTncSelected] = useState([])
  const [tncCustom, setTncCustom] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})
  const w = useWindowSize()
  const isMobile = w < 768

  function toggleSection(key) {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Display toggles
  const [sheetType, setSheetType] = useState('Estimate')
  const [showInternal, setShowInternal] = useState(false)
  const [showSize, setShowSize] = useState(true)
  const [showQtyDays, setShowQtyDays] = useState(true)
  const [showFinish, setShowFinish] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [showAgencyFee, setShowAgencyFee] = useState(false)
  const [showTnc, setShowTnc] = useState(true)
  const [groupByCity, setGroupByCity] = useState(true)

  const cities = event.cities?.length > 0 ? event.cities : ['General']
  const isAdmin = userRole === 'admin'

  useEffect(() => { loadData() }, [event.id])

  async function loadData() {
    setLoading(true)
    const [{ data: els }, { data: ev }] = await Promise.all([
      supabase.from('elements').select('*').eq('event_id', event.id).order('sort_order'),
      supabase.from('events').select('tnc_selected, tnc_custom').eq('id', event.id).single()
    ])
    setElements(els || [])
    if (ev) { setTncSelected(ev.tnc_selected || []); setTncCustom(ev.tnc_custom || []) }
    setLoading(false)
  }

  // Build preview data
  function buildPreviewData() {
    const sections = []
    if (groupByCity && cities.length > 1) {
      // Show each city separately
      cities.forEach(city => {
        const cityEls = elements.filter(el => el.city === city)
        if (!cityEls.length) return
        const cats = {}
        cityEls.forEach(el => {
          if (!cats[el.category]) cats[el.category] = []
          cats[el.category].push(el)
        })
        sections.push({ type: 'city', name: city, cats })
      })
    } else {
      // Combined view — use first city only to avoid duplicates
      // If multi-city, sum amounts per element name + category
      const firstCity = cities[0]
      const cats = {}
      if (cities.length > 1) {
        // Aggregate by category + element_name across all cities
        const aggMap = {}
        elements.forEach(el => {
          const key = el.category + '||' + el.element_name
          if (!aggMap[key]) {
            aggMap[key] = { ...el, _cities: [el.city] }
          } else {
            // Sum costs
            aggMap[key].rate = (aggMap[key].rate || 0) + (el.rate || 0)
            aggMap[key].amount = (aggMap[key].amount || 0) + (el.amount || 0)
            aggMap[key].internal_rate = (aggMap[key].internal_rate || 0) + (el.internal_rate || 0)
            aggMap[key]._cities.push(el.city)
          }
        })
        Object.values(aggMap).forEach(el => {
          if (!cats[el.category]) cats[el.category] = []
          cats[el.category].push(el)
        })
      } else {
        elements.filter(el => el.city === firstCity).forEach(el => {
          if (!cats[el.category]) cats[el.category] = []
          cats[el.category].push(el)
        })
      }
      sections.push({ type: 'all', name: 'All cities combined', cats })
    }
    return sections
  }

  // Totals
  let grandClient = 0
  elements.forEach(el => { grandClient += calcClient(el) })
  const agencyFee = Math.round(grandClient * (event.agency_fee_percent || 10) / 100)
  const subtotal = grandClient + agencyFee
  const gstAmt = Math.round(subtotal * (event.gst_percent || 18) / 100)
  const grandTotal = subtotal + gstAmt

  const allTnc = [
    ...tncSelected.map(id => DEFAULT_CLAUSES.find(c => c.id === id)?.text).filter(Boolean),
    ...tncCustom,
  ]

  async function exportExcel() {
    setExporting(true)
    try {
      await exportProposalExcel(event, elements, showTnc ? allTnc : [], {
        showSize, showFinish, showQtyDays, showStatus,
        showInternal: showInternal && isAdmin,
        sheetType,
      })
    } catch(e) {
      console.error('Export error:', e)
      alert('Export failed: ' + e.message)
    }
    setExporting(false)
  }

  function buildGridCols() {
    const cols = ['24px', '1fr']
    if (showSize) cols.push('70px')
    if (showFinish) cols.push('1.2fr')
    if (showQtyDays) cols.push('40px', '40px')
    cols.push('100px')
    if (showStatus) cols.push('80px')
    return cols.join(' ')
  }

  if (loading) return <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading...</p>

  const sections = buildPreviewData()

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        gap: '32px', alignItems: 'start'
      }}>

        {/* Left — Preview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
              Client preview
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              This is what your client will see
            </span>
          </div>

          {/* Proposal header */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Cost proposal
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
                {event.event_name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {event.clients?.group_name}
                {event.clients?.brand_name ? ` · ${event.clients.brand_name}` : ''}
                {event.event_date ? ` · ${new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
              </p>
              {cities.length > 1 && (
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Cities: {cities.join(', ')}
                </p>
              )}
            </div>

            {/* Element table */}
            {sections.map((section, si) => (
              <div key={si}>
                {/* City header — collapsible */}
                {section.type === 'city' && (
                  <div
                    onClick={() => toggleSection('city-' + section.name)}
                    style={{ padding: '10px 24px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', fontSize: '13px', fontWeight: 500, color: 'var(--text)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{section.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{collapsedSections['city-' + section.name] ? '▶' : '▼'}</span>
                  </div>
                )}
                {/* Categories */}
                {!collapsedSections['city-' + section.name] && Object.entries(section.cats).map(([catName, els], ci) => {
                  const sectionKey = section.name + '-' + catName
                  const isCatCollapsed = collapsedSections[sectionKey]
                  const catTotal = els.reduce((s, el) => s + (el.cost_status === 'Client scope' ? 0 : calcClient(el)), 0)
                  return (
                    <div key={ci}>
                      {/* Category header */}
                      <div
                        onClick={() => toggleSection(sectionKey)}
                        style={{ padding: '8px 24px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', borderTop: '0.5px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{catName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{fmt(catTotal)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{isCatCollapsed ? '▶' : '▼'}</span>
                        </div>
                      </div>
                      {/* Column headers — hidden when collapsed */}
                      {!isCatCollapsed && (
                        <div style={{ display: 'grid', gridTemplateColumns: buildGridCols(), gap: '8px', padding: '6px 24px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>#</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>ELEMENT</div>
                          {showSize && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>SIZE</div>}
                          {showFinish && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500, overflow: 'hidden' }}>FINISH / SPECS</div>}
                          {showQtyDays && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'center' }}>QTY</div>}
                          {showQtyDays && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'center' }}>DAYS</div>}
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>AMOUNT</div>
                          {showStatus && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>STATUS</div>}
                        </div>
                      )}
                      {/* Element rows — hidden when collapsed */}
                      {!isCatCollapsed && els.map((el, ei) => {
                        const clientAmt = calcClient(el)
                        const isActuals = el.cost_status === 'Client scope'
                        return (
                          <div key={ei} style={{ display: 'grid', gridTemplateColumns: buildGridCols(), gap: '8px', padding: '8px 24px', borderBottom: '0.5px solid var(--border)', alignItems: 'start' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ei + 1}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{el.element_name || '—'}</div>
                            {showSize && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{el.size ? `${el.size} ${el.size_unit}` : '—'}</div>}
                            {showFinish && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{el.finish || '—'}</div>}
                            {showQtyDays && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{el.qty || 1}</div>}
                            {showQtyDays && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{el.days || 1}</div>}
                            <div style={{ fontSize: '13px', fontWeight: 500, color: isActuals ? 'var(--text-tertiary)' : 'var(--text)', textAlign: 'right' }}>
                              {isActuals ? 'On actuals' : fmt(clientAmt)}
                            </div>
                            {showStatus && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{el.cost_status}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Grand total section */}
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Elements subtotal</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{fmt(grandClient)}</span>
              </div>
              {showAgencyFee && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Agency fee ({event.agency_fee_percent || 10}%)</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{fmt(agencyFee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>GST ({event.gst_percent || 18}%)</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{fmt(gstAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
                <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>Grand total</span>
                <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            {/* T&C */}
            {showTnc && allTnc.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>
                  Terms & Conditions
                </p>
                <ol style={{ paddingLeft: '16px', margin: 0 }}>
                  {allTnc.map((t, i) => (
                    <li key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '4px' }}>{t}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '12px 24px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Myoozz Consulting Pvt. Ltd.</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>myoozz.events</span>
            </div>
          </div>
        </div>

        {/* Right — Controls */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: '20px', maxHeight: isMobile ? 'none' : 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px' }}>
            Export settings
          </h3>

          {/* Summary — TOP */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', border: '0.5px solid var(--border)', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Proposal summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total elements</span>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>{elements.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Elements subtotal</span>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>{fmt(grandClient)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GST ({event.gst_percent || 18}%)</span>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>{fmt(gstAmt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '0.5px solid var(--border)', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Grand total</span>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{fmt(grandTotal)}</span>
            </div>
            {allTnc.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid var(--border)' }}>
                ✓ {allTnc.length} T&C clause{allTnc.length !== 1 ? 's' : ''} selected · visible in Cost Summary tab
              </div>
            )}
            {allTnc.length === 0 && (
              <div style={{ fontSize: '11px', color: '#92400E', marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid var(--border)' }}>
                No T&C selected · Go to Cost Summary tab to add clauses
              </div>
            )}
          </div>

          {/* Download button — below summary */}
          <button
            onClick={exportExcel}
            disabled={exporting}
            style={{
              width: '100%', padding: '12px', fontSize: '14px', fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              marginBottom: '6px',
            }}
          >
            {exporting ? 'Generating...' : '↓ Download Excel'}
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: '20px' }}>
            PDF & Word coming soon
          </p>

          {/* Sheet type */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Document type</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Estimate', 'Invoice'].map(t => (
                <button key={t} onClick={() => setSheetType(t)} style={{
                  flex: 1, padding: '7px', fontSize: '13px', fontFamily: 'var(--font-body)',
                  background: sheetType === t ? 'var(--text)' : 'var(--bg-secondary)',
                  color: sheetType === t ? 'var(--bg)' : 'var(--text-tertiary)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontWeight: sheetType === t ? 500 : 400,
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Display toggles — below download */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', padding: '12px 0 8px' }}>
              Show on proposal
            </div>
            <Toggle label="Size & unit" checked={showSize} onChange={setShowSize} desc="Dimensions of each element" />
            <Toggle label="Finish / specs" checked={showFinish} onChange={setShowFinish} desc="Material and specification details" />
            <Toggle label="Qty & days" checked={showQtyDays} onChange={setShowQtyDays} desc="Quantity and number of days" />
            <Toggle label="Status labels" checked={showStatus} onChange={setShowStatus} desc="Estimated, confirmed, actuals" />
            <Toggle label="Agency fee line" checked={showAgencyFee} onChange={setShowAgencyFee} desc="Show fee as separate line item" />
            {isAdmin && <Toggle label="Internal cost column" checked={showInternal} onChange={setShowInternal} desc="Show vendor costs — admin use only" />}
            <Toggle label="Terms & conditions" checked={showTnc} onChange={setShowTnc} desc="Show T&C at bottom" />
            {cities.length > 1 && (
              <Toggle label="Separate by city" checked={groupByCity} onChange={setGroupByCity} desc="Group elements under each city" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
