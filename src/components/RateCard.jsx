import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { MASTER_CATEGORIES } from './CategoryLibrary'
import { generateRateCardTemplate, RC_CATEGORIES } from '../utils/excelExport'
import * as XLSX from 'xlsx'

function fmt(n) { return n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '—' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `Updated: ${+day} ${MONTHS[+m - 1]} ${y}`
}
function fmtRange(min, max) {
  if (!min && !max) return '—'
  if (min && max && min !== max) return `₹${Number(min).toLocaleString('en-IN')} – ₹${Number(max).toLocaleString('en-IN')}`
  return fmt(min || max)
}

// ─── Myoozz fields for mapping ───────────────────────────────────────────────
const MYOOZZ_FIELDS = [
  { key: 'element_name',   label: 'Element Name',     required: true  },
  { key: 'specification',  label: 'Specification',    required: false },
  { key: 'unit',           label: 'Unit',             required: false },
  { key: 'city',           label: 'City',             required: false },
  { key: 'country',        label: 'Country',          required: false },
  { key: 'location_scope', label: 'Location Scope',   required: false },
  { key: 'venue_type',     label: 'Venue Type',       required: false },
  { key: 'rate_min',       label: 'Rate Min',         required: false },
  { key: 'rate_max',       label: 'Rate Max',         required: false },
  { key: 'rate',           label: 'Rate Confirmed',   required: false },
  { key: 'per_unit_type',  label: 'Per Unit Type',    required: false },
  { key: 'vendor_name',    label: 'Vendor / Company', required: false },
  { key: 'source',         label: 'Source',           required: false },
  { key: 'source_url',     label: 'Source URL',       required: false },
  { key: 'gst_applicable', label: 'GST (Y/N)',        required: false },
  { key: 'notes',          label: 'Notes',            required: false },
  { key: 'category',       label: 'Category',         required: false },
  { key: 'pax_min',        label: 'Pax Slab Min',     required: false },
  { key: 'pax_max',        label: 'Pax Slab Max',     required: false },
]

// Auto-map detected header → Myoozz field key
function autoMap(detectedHeaders) {
  const mapping = {}
  detectedHeaders.forEach(h => {
    const low = h.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match =
      low.includes('elementname') || low === 'element' || low === 'item' || low === 'particular' || low === 'description' ? 'element_name'
      : low.includes('spec') || low.includes('finish') || low.includes('detail') ? 'specification'
      : low === 'unit' ? 'unit'
      : low === 'city' || low === 'location' ? 'city'
      : low === 'country' ? 'country'
      : low.includes('locationscope') || low.includes('scope') ? 'location_scope'
      : low.includes('venuetype') || low.includes('venue') ? 'venue_type'
      : low.includes('ratemin') || low.includes('minrate') || low.includes('rateminimum') ? 'rate_min'
      : low.includes('ratemax') || low.includes('maxrate') || low.includes('ratemaximum') ? 'rate_max'
      : low.includes('rateconfirmed') || low.includes('confirmed') ? 'rate'
      : low.includes('rate') || low.includes('price') || low.includes('cost') ? 'rate_min'
      : low.includes('perunit') || low.includes('unittype') ? 'per_unit_type'
      : low.includes('vendor') || low.includes('supplier') || low.includes('company') ? 'vendor_name'
      : low === 'source' ? 'source'
      : low.includes('sourceurl') || low.includes('url') || low.includes('link') ? 'source_url'
      : low.includes('gst') ? 'gst_applicable'
      : low === 'notes' || low === 'remarks' || low === 'remark' ? 'notes'
      : low === 'category' || low === 'head' || low === 'section' ? 'category'
      : low.includes('paxmin') || low.includes('paxslabmin') ? 'pax_min'
      : low.includes('paxmax') || low.includes('paxslabmax') ? 'pax_max'
      : null
    if (match) mapping[h] = match
  })
  return mapping
}

// Parse raw headers + rows from xlsx file
function parseRawExcel(file, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    // Find header row — first row with 3+ non-empty cells
    let hdrIdx = 0
    for (let i = 0; i < Math.min(allRows.length, 8); i++) {
      const filled = allRows[i].filter(x => String(x || '').trim()).length
      if (filled >= 3) { hdrIdx = i; break }
    }
    const rawHeaders = allRows[hdrIdx].map(x => String(x || '').trim()).filter(Boolean)
    const dataRows = allRows.slice(hdrIdx + 1).filter(row => row.some(x => String(x || '').trim()))
    cb(rawHeaders, dataRows)
  }
  reader.readAsArrayBuffer(file)
}

// Apply confirmed mapping to raw rows
function applyMapping(rawHeaders, dataRows, mapping, vendorName, category) {
  return dataRows.map(row => {
    const obj = { vendor_name: vendorName, category: category || '', rate_type: 'vendor_quoted' }
    rawHeaders.forEach((h, i) => {
      const field = mapping[h]
      if (!field) return
      let val = String(row[i] ?? '').trim()
      if (field === 'rate_min' || field === 'rate_max' || field === 'rate' || field === 'pax_min' || field === 'pax_max') {
        val = parseFloat(val.replace(/[₹,\s]/g, '')) || 0
      }
      if (field === 'gst_applicable') val = !['no','n','false','0'].includes(val.toLowerCase())
      if (val !== '' && val !== 0) obj[field] = val
    })
    return obj
  }).filter(r => r.element_name && String(r.element_name).length > 1)
}

// ─── Research prompts per category ───────────────────────────────────────────
const RESEARCH_PROMPTS = {
  'Permissions & Legal': 'Include: PPL, IPRS, NOVEX, Police NOC, Fire NOC, Municipal NOC, Liquor/Excise, Foreign Artist Permission, Noise Permit. Set mandatory=true for Police NOC, Fire NOC, Municipal NOC. Pax slabs where relevant.',
  'Sound': 'Include PA systems by scale (small/medium/large), DJ setups, monitoring systems, line arrays. Cover corporate events and concerts separately. Pax slabs.',
  'Lighting': 'Include wash lights, moving heads, truss, LED battens, pin spots. Rate per day. Area sqft where relevant.',
  'Video & LED': 'Include LED walls by pixel pitch (P2.6, P3.9, P4.8), projectors, screens, media servers. Rate per sqft per day.',
  'Stage': 'Include stage by area (20x20, 30x40, 40x60 ft). Carpet, skirting, stairs. Rate per sqft per day and per event.',
  'Production & Fabrication': 'Include flex, sunboard, foam, acrylic, wooden fabrication. Rate per sqft.',
  'Branding & Signage': 'Include standees, banners, backdrops, step-and-repeat. Rate per sqft and per running mtr.',
  'Manpower': 'Include event managers, coordinators, ushers, security, hospitality. Rate per shift and per day. Pax slabs for ushers/hospitality.',
  'Furniture': 'Include chairs (banquet/tiffany/theatre), tables, sofas, highboys. Rate per piece per day and per event.',
  'Venue & Infrastructure': 'Include banquet halls, lawns, hotels, convention centres. Rate per day, per event. Area and pax slabs.',
  'Power & Electrical': 'Include DG sets by KVA (62.5, 125, 250, 500 KVA), cabling, distribution boxes. Rate per KVA per day.',
  'Food & Beverage': 'Include welcome drinks, snack packages, full meal packages. Rate per pax. Pax slabs.',
  'Travel Booking': 'Include flights (economy/business), train, cab, hotel per night. Rate per pax.',
  'Logistics': 'Include trucks (small/large), tempo, courier. Rate per trip, per day, per load.',
  'Insurance': 'Include event cancellation, liability, equipment insurance. Rate as % of budget and per event flat.',
}

const FOCUS_NOTES = {
  'Permissions & Legal': 'Include PPL, IPRS, NOVEX, Police NOC, Fire NOC, Municipal NOC, Liquor/Excise license, Foreign Artist Permission, Noise Permit. Set mandatory=true for Police NOC, Fire NOC, Municipal NOC. Add pax slabs where relevant.',
  'Sound': 'Include line array, column array, subwoofers, monitors, mixing console, playback system, DJ setup, mic types (handheld/lapel/headset/choir), intercom, IEM. Separate dry hire vs with operator. Add pax slabs where relevant.',
  'Lighting': 'Include moving heads (beam/wash/hybrid), LED par, profile spots, follow spot, haze machine, strobe, truss per mtr, rigging per point, control desk. Separate dry hire vs with operator.',
  'Video & LED': 'Include LED wall by pixel pitch (P2.6/P3.9/P4.8/P6), projectors by lumen (10k/15k/20k), screens (front/rear), video switcher, media server, confidence monitors. Per sqft, operator included/excluded separately.',
  'Stage & Structure': 'Include stage per sqft by finish (basic/premium/glass), truss per mtr, riser, podium, green room, roof structure, gate arch. With and without labour.',
  'Production & Fabrication': 'Include fabricated backdrop per sqft (basic/premium), custom props, acrylic work, carpentry, vinyl wrapping, installation labour per shift.',
  'Branding & Signage': 'Include flex print (single/double side), fabric print (dye sublimation), vinyl wrap, backlit panel, acrylic lettering, standee, backdrop frame per sqft.',
  'Manpower': 'Include event manager, coordinator, hostess, security guard, housekeeping, loader, rigger, electrician, F&B steward. Per shift and per day both.',
  'Furniture': 'Include chairs (banquet/chiavari/lounge), tables (round 5ft/rectangle/cocktail), sofa sets, bar counter, registration desk, carpet per sqft.',
  'Venue & Infrastructure': 'Include banquet hall per day by city tier, outdoor ground, rooftop, convention centre. Pax slabs: under 100 / 100–300 / 300–500 / 500+ for each.',
  'Power & Electrical': 'Include DG sets by KVA (25/62.5/125/250/500), cabling per mtr, distribution boxes, cable protectors, earthing, electrician per shift.',
  'Food & Beverage': 'Include veg/non-veg per pax (sit-down/buffet/cocktail), hi-tea, welcome drinks, beverage counter, live counters, service staff per 50 pax.',
  'Travel Booking': 'Include flight booking fee, hotel per night (3-star/4-star/5-star) per city, cab per day (sedan/Innova/tempo traveller), bus per day, train ticket service fee.',
  'Logistics': 'Include truck (14ft/20ft/32ft) per trip, loading/unloading labour per shift, warehouse per day, forklift, packing material.',
  'Insurance': 'Include public liability (1Cr/5Cr/10Cr cover), equipment insurance per event, event cancellation insurance. Add pax slabs where relevant.',
}

const PROMPT_CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Pan-India']

function buildPromptFromParams(category, cities, country, focusNotes) {
  const cityList = cities.filter(c => c !== 'Pan-India').join(', ')
  const hasPanIndia = cities.includes('Pan-India')
  return `You are a professional event industry researcher for ${country}.
I need you to build a rate card database for the event management category: ${category}

Research realistic market rates across ${country} cities and return your findings ONLY as a JSON array. No explanation, no preamble, no markdown fences. Pure JSON only. Start your response with [ and end with ]

Each object in the array must use EXACTLY these keys:

{
  "element_name": "",
  "specification": "",
  "unit": "",
  "city": "",
  "country": "${country}",
  "location_scope": "",
  "venue_type": "",
  "rate_min": 0,
  "rate_max": 0,
  "per_unit_type": "",
  "source": "Myoozz AI Research",
  "source_url": "",
  "gst_applicable": true,
  "mandatory": false,
  "pax_min": null,
  "pax_max": null,
  "notes": ""
}

location_scope MUST be one of: "city" / "state" / "national" / "international"
venue_type MUST be one of: "Indoor" / "Outdoor" / "All"
per_unit_type MUST be one of: "per day" / "per event" / "per pax" / "per sqft" / "per sqmtr" / "per ft" / "per mtr" / "per running ft" / "per running mtr" / "per KVA" / "per trip" / "per load" / "per shift" / "% of budget"

Research guidelines:
- Cover at minimum: ${cityList}${hasPanIndia ? ' + Pan-India fallback' : ''}
${hasPanIndia ? '- Give Pan-India entry (city = "Pan-India", location_scope = "national") for items with low city variation\n' : ''}- Rates should reflect 2024-2025 market reality for professional event companies (not retail/consumer)
- Where rates depend on scale (pax slab or area), give one row per slab
- Be specific: "LED Video Wall (P3.9)" not "LED Wall"
- rate_min and rate_max should reflect the real market spread

${focusNotes}`.trim()
}

function buildResearchPrompt(category) {
  const notes = RESEARCH_PROMPTS[category] || ''
  return `You are a professional event industry researcher for India.
I need you to build a rate card database for the event management category: ${category}

Research realistic market rates across Indian cities and return your findings ONLY as a JSON array. No explanation, no preamble, no markdown fences. Pure JSON only. Start your response with [ and end with ]

Each object in the array must use EXACTLY these keys:

{
  "element_name": "",
  "specification": "",
  "unit": "",
  "city": "",
  "country": "India",
  "location_scope": "",
  "venue_type": "",
  "rate_min": 0,
  "rate_max": 0,
  "per_unit_type": "",
  "source": "Myoozz AI Research",
  "source_url": "",
  "gst_applicable": true,
  "mandatory": false,
  "pax_min": null,
  "pax_max": null,
  "notes": ""
}

location_scope MUST be one of: "city" / "state" / "national" / "international"
venue_type MUST be one of: "Indoor" / "Outdoor" / "All"
per_unit_type MUST be one of: "per day" / "per event" / "per pax" / "per sqft" / "per sqmtr" / "per ft" / "per mtr" / "per running ft" / "per running mtr" / "per KVA" / "per trip" / "per load" / "per shift" / "% of budget"

Research guidelines:
- Cover at minimum: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad + Pan-India fallback
- Give Pan-India entry (city = "Pan-India", location_scope = "national") for items with low city variation
- Rates should reflect 2024-2025 market reality for professional event companies (not retail/consumer)
- Where rates depend on scale (pax slab or area), give one row per slab
- Be specific: "LED Video Wall (P3.9)" not "LED Wall"
- rate_min and rate_max should reflect the real market spread

${notes}`
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportRateCard({ onImported, onClose, session, userRole }) {
  const [tab, setTab] = useState('upload')
  const [step, setStep] = useState('upload')
  const [vendorName, setVendorName] = useState('')
  const [category, setCategory] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [dupeWarning, setDupeWarning] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [dlLoading, setDlLoading] = useState(false)
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [pbCities, setPbCities] = useState([...PROMPT_CITIES])
  const [pbCountry, setPbCountry] = useState('India')
  const [pbFocusNotes, setPbFocusNotes] = useState('')
  const [pbCopied, setPbCopied] = useState(false)
  const [availableCategories, setAvailableCategories] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    supabase.from('event_categories').select('name').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setAvailableCategories(data.map(c => c.name)) })
  }, [])

  async function handleDownload() {
    if (!category) return
    setDlLoading(true)
    try { await generateRateCardTemplate(category) }
    finally { setDlLoading(false) }
  }

  function handleFile(file) {
    parseRawExcel(file, (headers, rows) => {
      setRawHeaders(headers)
      setRawRows(rows)
      const auto = autoMap(headers)
      setMapping(auto)
      setStep('mapping')
    })
  }

  function confirmMapping() {
    const rows = applyMapping(rawHeaders, rawRows, mapping, vendorName, category)
    setPreview(rows)
    setStep('preview')
  }

  function handleJsonParse() {
    setJsonError('')
    try {
      const parsed = JSON.parse(jsonText.trim())
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array')
      const rows = parsed
        .filter(r => r.element_name)
        .map(r => ({
          ...r,
          vendor_name: r.vendor_name || r.source || 'Myoozz AI Research',
          category: category || r.category || '',
          rate_type: r.rate_type || 'ai_research',
          source: r.source || 'Myoozz AI Research',
        }))
      if (!rows.length) throw new Error('No valid rows found (element_name required)')
      setPreview(rows)
      setStep('preview')
    } catch (err) {
      setJsonError(err.message)
    }
  }

  function togglePromptBuilder() {
    const opening = !showPromptBuilder
    setShowPromptBuilder(opening)
    if (opening) setPbFocusNotes(FOCUS_NOTES[category] || '')
  }

  async function checkAndImport() {
    const sampleKeys = preview.slice(0, 20).map(r =>
      `${r.category}||${r.element_name}||${r.city || ''}||${r.vendor_name || ''}`
    )
    const { data: existing } = await supabase
      .from('rate_cards')
      .select('category, element_name, city, vendor_name')
      .or(
        preview.slice(0, 20).map(r =>
          `and(category.eq.${r.category || ''},vendor_name.eq.${r.vendor_name || ''})`
        ).join(',')
      )

    if (existing?.length) {
      const dupeCount = existing.length
      const dupeSource = existing[0].vendor_name
      setDupeWarning({ count: dupeCount, source: dupeSource })
      return
    }
    runImport()
  }

  async function runImport() {
    setDupeWarning(null)
    setImporting(true)
    const rows = preview.map(r => ({
      ...r,
      vendor_name: vendorName || r.vendor_name || 'Unknown',
      source: vendorName || r.source || r.vendor_name || 'Unknown',
      category: category || r.category || '',
      created_by: session?.user?.email,
      last_updated: new Date().toISOString().split('T')[0],
    }))
    const batchSize = 50
    for (let i = 0; i < rows.length; i += batchSize) {
      setProgress(`Saving ${Math.min(i + batchSize, rows.length)} of ${rows.length}...`)
      await supabase.from('rate_cards').insert(rows.slice(i, i + batchSize))
    }
    setProgress('Done!')
    setTimeout(() => { onImported(); onClose() }, 800)
  }

  const isMapped = Object.keys(mapping).some(k => mapping[k] === 'element_name')
  const s = { fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }
  const inputStyle = { ...s, width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }
  const selectStyle = { ...inputStyle }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
      <div style={{ '--bg': '#141413', '--bg-secondary': '#1e1e1c', '--text': '#e8e6e0', '--text-secondary': '#a8a49e', '--text-tertiary': '#6b6760', '--border': '#2e2e2c', '--border-strong': '#3e3e3c', background: '#141413', border: '0.5px solid #2e2e2c', borderRadius: 'var(--radius)', maxWidth: '720px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Add rate card data</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {step === 'upload' && 'Upload a vendor file, paste JSON, or download a blank template'}
              {step === 'mapping' && `${rawHeaders.length} columns detected — map to Myoozz fields`}
              {step === 'preview' && `${preview.length} rates ready to import`}
              {importing && progress}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-tertiary)', padding: '4px' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {importing && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)', marginBottom: '10px' }}>Importing...</p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{progress}</p>
            </div>
          )}

          {!importing && dupeWarning && (
            <div style={{ border: '0.5px solid #FCD34D', borderRadius: 'var(--radius-sm)', padding: '20px', background: '#FFFBEB', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400E', marginBottom: '6px' }}>
                ⚠ {dupeWarning.count} rate{dupeWarning.count > 1 ? 's' : ''} from <strong>{dupeWarning.source}</strong> already exist with the same element name and city.
              </p>
              <p style={{ fontSize: '13px', color: '#78350F', marginBottom: '16px' }}>
                Adding again will create duplicate entries for the same source. Continue only if this is an updated rate card from the same vendor.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={runImport} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#BC1723', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Import anyway
                </button>
                <button onClick={() => setDupeWarning(null)} style={{ padding: '8px 14px', fontSize: '13px', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!importing && !dupeWarning && step === 'upload' && (
            <>
              <div style={{ display: 'flex', gap: '0', marginBottom: '24px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {[['upload', '↑ Upload / Download'], ['json', '{ } Paste JSON']].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: '10px', fontSize: '13px', fontFamily: 'var(--font-body)',
                    background: tab === t ? 'var(--text)' : 'var(--bg-secondary)',
                    color: tab === t ? 'var(--bg)' : 'var(--text)',
                    border: 'none', cursor: 'pointer', fontWeight: tab === t ? 500 : 400,
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Category</div>
                <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                  <option value="">— Select category —</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {tab === 'upload' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, minWidth: '160px' }}>
                      Don't have a rate card? Download blank template for the selected category.
                    </span>
                    <button onClick={handleDownload} disabled={!category || dlLoading}
                      style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: category ? 'var(--text)' : 'var(--bg)', color: category ? 'var(--bg)' : 'var(--text-tertiary)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: category ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                      {dlLoading ? 'Downloading...' : '↓ Download template'}
                    </button>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Vendor / Source name</div>
                    <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                      placeholder="e.g. Sharma Fabricators, ABC AV Rentals..."
                      style={inputStyle} />
                  </div>

                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onClick={() => fileRef.current?.click()}
                    style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '40px', textAlign: 'center', cursor: 'pointer' }}
                  >
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>Drop rate card here</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Excel (.xlsx, .xls) or CSV · Any format — you'll map columns next</p>
                    <button style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      Browse file
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />
                  </div>
                </>
              )}

              {tab === 'json' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, margin: 0 }}>
                      Research rates using any AI tool, paste the JSON output below.
                    </p>
                    <button onClick={togglePromptBuilder}
                      style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: showPromptBuilder ? 'var(--bg-secondary)' : 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      {showPromptBuilder ? '✕ Close prompt builder' : '⌘ Build research prompt'}
                    </button>
                  </div>

                  {showPromptBuilder && (
                    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Category */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Category</label>
                        <input
                          value={category || ''}
                          readOnly
                          style={{ ...inputStyle, background: 'var(--bg)', color: category ? 'var(--text)' : 'var(--text-tertiary)', cursor: 'default' }}
                          placeholder='Select a category above first'
                        />
                      </div>

                      {/* Cities */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Cities</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {PROMPT_CITIES.map(city => (
                            <label key={city} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={pbCities.includes(city)}
                                onChange={e => setPbCities(prev => e.target.checked ? [...prev, city] : prev.filter(c => c !== city))}
                                style={{ cursor: 'pointer' }}
                              />
                              {city}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Country */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Country</label>
                        <input
                          value={pbCountry}
                          onChange={e => setPbCountry(e.target.value)}
                          style={{ ...inputStyle, background: 'var(--bg)' }}
                          placeholder='India'
                        />
                      </div>

                      {/* Focus Notes */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Focus Notes</label>
                        <textarea
                          value={pbFocusNotes}
                          onChange={e => setPbFocusNotes(e.target.value)}
                          rows={3}
                          style={{ ...inputStyle, background: 'var(--bg)', resize: 'vertical', lineHeight: 1.5 }}
                          placeholder='Optional — specific items, units, or rate structures to include'
                        />
                      </div>

                      {/* Copy button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          disabled={!category || pbCities.length === 0}
                          onClick={() => {
                            navigator.clipboard.writeText(buildPromptFromParams(category, pbCities, pbCountry, pbFocusNotes))
                            setPbCopied(true)
                            setTimeout(() => setPbCopied(false), 2000)
                          }}
                          style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: pbCopied ? '#D1FAE5' : (category && pbCities.length > 0 ? 'var(--text)' : 'var(--bg)'), color: pbCopied ? '#065F46' : (category && pbCities.length > 0 ? 'var(--bg)' : 'var(--text-tertiary)'), border: 'none', borderRadius: 'var(--radius-sm)', cursor: (category && pbCities.length > 0) ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                          {pbCopied ? '✓ Copied!' : 'Copy Prompt'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!category && !showPromptBuilder && (
                    <p style={{ fontSize: '12px', color: '#B45309', background: '#FEF3C7', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px' }}>
                      Select a category above to copy the prompt for that category.
                    </p>
                  )}

                  <textarea
                    value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonError('') }}
                    placeholder='Paste JSON array here — [ { "element_name": "...", ... }, ... ]'
                    rows={10}
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px', background: 'var(--bg-secondary)', resize: 'vertical', lineHeight: 1.6 }}
                  />
                  {jsonError && (
                    <p style={{ fontSize: '12px', color: '#BC1723', marginTop: '6px' }}>⚠ {jsonError}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button onClick={handleJsonParse} disabled={!jsonText.trim()}
                      style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: jsonText.trim() ? 'var(--text)' : 'var(--bg-secondary)', color: jsonText.trim() ? 'var(--bg)' : 'var(--text-tertiary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: jsonText.trim() ? 'pointer' : 'default' }}>
                      Preview →
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {!importing && !dupeWarning && step === 'mapping' && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                Green = auto-matched · Amber = unmatched · Select "— Skip —" to ignore a column.
              </p>
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', padding: '8px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your column</div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Maps to</div>
                </div>
                {rawHeaders.map(h => {
                  const mapped = mapping[h]
                  const isMatched = !!mapped
                  return (
                    <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '0.5px solid var(--border)', background: isMatched ? '#F0FDF4' : '#FFFBEB', alignItems: 'center', padding: '6px 14px', gap: '12px' }}>
                      <div style={{ fontSize: '13px', color: isMatched ? '#065F46' : '#92400E', fontWeight: 500 }}>
                        {isMatched ? '✓ ' : '· '}{h}
                      </div>
                      <select value={mapped || ''} onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value || undefined }))}
                        style={{ ...selectStyle, fontSize: '12px', padding: '5px 8px', background: 'var(--bg)' }}>
                        <option value="">— Skip —</option>
                        {MYOOZZ_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('upload')} style={{ padding: '9px 16px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>← Back</button>
                <button onClick={confirmMapping} disabled={!isMapped}
                  style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: isMapped ? 'var(--text)' : 'var(--bg-secondary)', color: isMapped ? 'var(--bg)' : 'var(--text-tertiary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: isMapped ? 'pointer' : 'default' }}>
                  Preview {isMapped ? `→` : '(map Element Name first)'}
                </button>
              </div>
            </>
          )}

          {!importing && !dupeWarning && step === 'preview' && (
            <>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Rows</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.length}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>With min rate</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.filter(r => r.rate_min > 0).length}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Category</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{category || '—'}</div></div>
                <div style={{ flex: 1, minWidth: '160px' }}><div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Source</div><input value={vendorName || preview[0]?.source || preview[0]?.vendor_name || ''} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Gemini, Vendor name..." style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', background: 'transparent', border: '0.5px solid var(--border-strong)', borderRadius: '4px', padding: '3px 7px', width: '100%', fontFamily: 'var(--font-body)', outline: 'none' }} /></div>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '7px 12px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Element', 'City', 'Rate Min', 'Rate Max', 'Per Unit'].map(h => (
                    <div key={h} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                  ))}
                </div>
                {preview.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', padding: '7px 12px', borderBottom: '0.5px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.element_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.city || 'Pan-India'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text)' }}>{r.rate_min > 0 ? fmt(r.rate_min) : '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text)' }}>{r.rate_max > 0 ? fmt(r.rate_max) : '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.per_unit_type || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(tab === 'json' ? 'upload' : 'mapping')}
                  style={{ padding: '9px 16px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
                  ← Back
                </button>
                <button onClick={checkAndImport}
                  style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Import {preview.length} rates →
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Main RateCard component ──────────────────────────────────────────────────
export default function RateCard({ session, userRole, canManageRateCards = false }) {
  const isAdmin = userRole === 'admin'
  const canEdit = isAdmin || canManageRateCards

  // ── Data ──────────────────────────────────────────────────────────────────
  const [rates,         setRates]         = useState([])
  const [events,        setEvents]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showImport,    setShowImport]    = useState(false)
  const [editingRow,    setEditingRow]    = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Browse state ──────────────────────────────────────────────────────────
  const [selectedCat,    setSelectedCat]    = useState(null)
  const [locationFilter, setLocationFilter] = useState('')
  const [selectedItem,   setSelectedItem]   = useState(null)
  const [selected,       setSelected]       = useState(new Set())

  // ── Add to event modal ────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [targetEvent,  setTargetEvent]  = useState('')
  const [targetCity,   setTargetCity]   = useState('')
  const [addWarnings,  setAddWarnings]  = useState([])
  const [adding,       setAdding]       = useState(false)
  const [addDone,      setAddDone]      = useState(false)

  async function loadRates() {
    setLoading(true)
    const { data } = await supabase.from('rate_cards').select('*').order('category').order('element_name')
    setRates(data || [])
    setLoading(false)
  }

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, cities')
      .is('archived_at', null)
      .order('name')
    setEvents(data || [])
  }

  useEffect(() => { loadRates(); loadEvents() }, [])
  useEffect(() => { setLocationFilter(''); setSelectedItem(null); setSelected(new Set()) }, [selectedCat])

  // ── Derived ───────────────────────────────────────────────────────────────
  const categories = [...new Set(rates.map(r => r.category).filter(Boolean))].sort()
  const ratesInCat = selectedCat ? rates.filter(r => r.category === selectedCat) : []

  const locationChips = ['All',
    ...([...new Set(ratesInCat.map(r => r.city).filter(Boolean))].sort((a, b) =>
      a === 'Pan-India' ? 1 : b === 'Pan-India' ? -1 : a.localeCompare(b)
    ))
  ]

  const ratesFiltered = locationFilter && locationFilter !== 'All'
    ? ratesInCat.filter(r => r.city === locationFilter || r.city === 'Pan-India')
    : ratesInCat

  // Group items by source within selected category
  const groupedItems = {}
  ratesFiltered.forEach(r => {
    const src = r.vendor_name || r.source || 'Other'
    if (!groupedItems[src]) groupedItems[src] = []
    groupedItems[src].push(r)
  })

  // ── Warnings ──────────────────────────────────────────────────────────────
  async function computeWarnings(eventId, city) {
    const warnings = []
    if (!eventId || !city || !selectedItem) return warnings

    const { data: existingEls } = await supabase
      .from('elements')
      .select('element_name')
      .eq('event_id', eventId)
      .eq('city', city)

    const existingNames = new Set((existingEls || []).map(e => e.element_name?.toLowerCase()))
    const nameLower = selectedItem.element_name?.toLowerCase()

    if (existingNames.has(nameLower)) {
      warnings.push({ type: 'duplicate', text: `"${selectedItem.element_name}" already exists in this event · ${city}` })
    }
    if (selectedItem.city && selectedItem.city !== 'Pan-India' && selectedItem.city !== city) {
      warnings.push({ type: 'city_mismatch', text: `Rate is for ${selectedItem.city}, but you're adding to ${city}. Rate may not be accurate.` })
    }
    if (!selectedItem.rate_min && !selectedItem.rate_max) {
      warnings.push({ type: 'no_rate', text: `"${selectedItem.element_name}" has no rate data — cost must be entered manually.` })
    }
    return warnings
  }

  async function openAddModal() {
    setTargetEvent(''); setTargetCity(''); setAddWarnings([]); setAddDone(false)
    setShowAddModal(true)
  }

  async function onEventCityChange(eventId, city) {
    setTargetEvent(eventId); setTargetCity(city)
    if (eventId && city) {
      const w = await computeWarnings(eventId, city)
      setAddWarnings(w)
    } else {
      setAddWarnings([])
    }
  }

  async function confirmAddToEvent() {
    if (!targetEvent || !targetCity || !selectedItem) return
    setAdding(true)
    await supabase.from('elements').insert({
      event_id: targetEvent,
      city: targetCity,
      element_name: selectedItem.element_name,
      category: selectedItem.category,
      specification: selectedItem.specification || '',
      unit: selectedItem.unit || 'nos',
      internal_rate: selectedItem.rate_min || 0,
    })
    setAdding(false)
    setAddDone(true)
  }

  async function saveRow(row) {
    const { id, ...fields } = row
    await supabase.from('rate_cards').update(fields).eq('id', id)
    setEditingRow(null)
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, ...fields })
    loadRates()
  }

  async function deleteRow(id) {
    await supabase.from('rate_cards').delete().eq('id', id)
    setDeleteConfirm(null)
    if (selectedItem?.id === id) setSelectedItem(null)
    loadRates()
  }

  // ── Dark theme tokens ─────────────────────────────────────────────────────
  const D = {
    bg:        '#1a1a1a',
    card:      '#252525',
    cardHov:   '#2e2e2e',
    border:    '#333333',
    borderAct: '#555555',
    text:      '#ffffff',
    sub:       '#aaaaaa',
    dim:       '#666666',
    red:       '#bc1723',
  }

  const s = { fontFamily: 'var(--font-body)' }

  const inpSt = {
    ...s, padding: '6px 10px', fontSize: '12px',
    border: '0.5px solid #444', borderRadius: '6px',
    background: '#2a2a2a', color: '#fff',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const chipSt = (active, small) => ({
    ...s,
    fontSize: small ? '11px' : '12px',
    padding: small ? '3px 10px' : '6px 16px',
    borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1a1a1a' : D.text,
    border: '0.5px solid ' + (active ? '#ffffff' : '#444'),
    transition: 'all 0.1s',
  })

  const badgeSt = (mandatory) => ({
    fontSize: '10px', padding: '2px 9px', borderRadius: '20px', fontWeight: 500,
    background: mandatory ? '#5C1A1A' : '#2a2a2a',
    color: mandatory ? '#ffffff' : D.sub,
    flexShrink: 0,
  })

  const warningIcon  = { duplicate: '⚠️', city_mismatch: '🏙️', multi_city: '🔁', no_rate: '—', mandatory: '📋' }
  const warningColor = { duplicate: '#FEF3C7', city_mismatch: '#FEF3C7', multi_city: '#FEF3C7', no_rate: '#F3F4F6', mandatory: '#EFF6FF' }
  const selectedEvent = events.find(e => e.id === targetEvent)
  const eventCities   = selectedEvent?.cities || []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...s, background: D.bg, minHeight: '100vh', padding: '28px 32px', color: D.text }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 500, color: D.text, marginBottom: '5px' }}>
            Rate card library
          </h2>
          <p style={{ fontSize: '13px', color: D.sub }}>
            {rates.length} rates · {categories.length} {categories.length === 1 ? 'category' : 'categories'} · Suggested when your team enters internal costs
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowImport(true)}
            style={{ ...s, padding: '9px 20px', fontSize: '13px', fontWeight: 500, background: 'transparent', color: D.text, border: '1px solid #555', borderRadius: '8px', cursor: 'pointer' }}>
            ↑ Import data
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {!loading && rates.length === 0 && (
        <div style={{ border: '0.5px dashed #444', borderRadius: '14px', padding: '80px 32px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: D.text, marginBottom: '8px' }}>No rate cards yet</p>
          <p style={{ fontSize: '13px', color: D.sub, marginBottom: '24px', lineHeight: 1.6 }}>
            Upload vendor rate cards or paste AI research JSON.<br />Rates are suggested when your team enters internal costs.
          </p>
          {canEdit && (
            <button onClick={() => setShowImport(true)}
              style={{ ...s, padding: '10px 28px', fontSize: '13px', fontWeight: 500, background: 'transparent', color: D.text, border: '1px solid #555', borderRadius: '8px', cursor: 'pointer' }}>
              ↑ Add first rate card data
            </button>
          )}
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && rates.length > 0 && (
        <>
          {/* Category chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {categories.map(cat => {
              const count = rates.filter(r => r.category === cat).length
              const active = selectedCat === cat
              return (
                <span key={cat}
                  onClick={() => { setSelectedCat(active ? null : cat); setSelectedItem(null) }}
                  style={chipSt(active)}>
                  {cat}
                  <span style={{ marginLeft: '7px', fontSize: '10px', opacity: 0.55 }}>{count}</span>
                </span>
              )
            })}
          </div>

          {/* No category selected */}
          {!selectedCat && (
            <div style={{ padding: '60px 0', textAlign: 'center', color: D.dim, fontSize: '13px' }}>
              Select a category above to browse rates
            </div>
          )}

          {/* Category selected — filters + 2-panel */}
          {selectedCat && (
            <>
              {/* City filter chips */}
              {locationChips.length > 2 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: D.dim, marginRight: '4px' }}>City</span>
                  {locationChips.map(loc => (
                    <span key={loc}
                      onClick={() => setLocationFilter(loc === 'All' ? '' : loc)}
                      style={chipSt(loc === 'All' ? !locationFilter : locationFilter === loc, true)}>
                      {loc}
                    </span>
                  ))}
                </div>
              )}

              {/* 2-panel */}
              <div
                onContextMenu={e => e.preventDefault()}
                onCopy={e => e.preventDefault()}
                style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', alignItems: 'start' }}>

                {/* ── Left panel — item list ── */}
                <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
                  {Object.keys(groupedItems).length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: D.dim, fontSize: '12px' }}>
                      No rates for this filter
                    </div>
                  )}
                  {Object.entries(groupedItems).map(([src, items]) => (
                    <div key={src} style={{ marginBottom: '22px' }}>
                      {/* Group header */}
                      <div style={{ fontSize: '10px', fontWeight: 600, color: D.dim, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '2px' }}>
                        {src}
                      </div>
                      {/* Item cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map(item => {
                          const isActive = selectedItem?.id === item.id
                          return (
                            <div key={item.id}
                              onClick={() => { setSelectedItem(isActive ? null : item); setSelected(new Set(isActive ? [] : [item.id])) }}
                              style={{
                                background: isActive ? '#2e2e2e' : D.card,
                                border: `0.5px solid ${isActive ? '#666' : D.border}`,
                                borderRadius: '10px', padding: '12px 14px',
                                cursor: 'pointer', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px',
                                transition: 'background 0.1s, border-color 0.1s',
                              }}
                              onMouseOver={e => { if (!isActive) e.currentTarget.style.background = D.cardHov }}
                              onMouseOut={e => { if (!isActive) e.currentTarget.style.background = D.card }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: D.text, marginBottom: '3px', lineHeight: 1.3, userSelect: 'none' }}>
                                  {item.element_name}
                                </div>
                                <div style={{ fontSize: '11px', color: D.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.specification || (item.city && item.city !== 'Pan-India' ? item.city : 'Pan-India')}
                                </div>
                                {fmtDate(item.last_updated) && (
                                  <div style={{ fontSize: '10px', color: D.dim, marginTop: '2px' }}>
                                    {fmtDate(item.last_updated)}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                                {item.mandatory && <span style={badgeSt(true)}>mandatory</span>}
                                <span style={{ fontSize: '12px', fontWeight: 500, color: D.text, userSelect: 'none' }}>
                                  {fmtRange(item.rate_min, item.rate_max)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Right panel — detail view ── */}
                <div style={{ background: D.card, border: `0.5px solid ${D.border}`, borderRadius: '14px', minHeight: '420px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '20px' }}>

                  {/* Empty state */}
                  {!selectedItem && !editingRow && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '14px' }}>
                      <div style={{ width: '46px', height: '46px', border: `1px solid ${D.borderAct}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: D.dim }}>
                        +
                      </div>
                      <p style={{ fontSize: '13px', color: D.dim, textAlign: 'center', lineHeight: 1.5 }}>
                        Select a rate to view details
                      </p>
                    </div>
                  )}

                  {/* Edit form */}
                  {editingRow && (
                    <div style={{ padding: '24px', flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                        Edit rate
                      </div>
                      {[
                        { key: 'element_name', label: 'Element Name' },
                        { key: 'specification', label: 'Specification' },
                        { key: 'unit', label: 'Unit' },
                        { key: 'city', label: 'City' },
                        { key: 'notes', label: 'Notes' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', color: D.dim, marginBottom: '4px' }}>{f.label}</div>
                          <input value={editingRow[f.key] || ''} onChange={e => setEditingRow(p => ({ ...p, [f.key]: e.target.value }))} style={inpSt} />
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: D.dim, marginBottom: '4px' }}>Rate Min (₹)</div>
                          <input type="number" value={editingRow.rate_min || ''} onChange={e => setEditingRow(p => ({ ...p, rate_min: e.target.value }))} style={inpSt} />
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: D.dim, marginBottom: '4px' }}>Rate Max (₹)</div>
                          <input type="number" value={editingRow.rate_max || ''} onChange={e => setEditingRow(p => ({ ...p, rate_max: e.target.value }))} style={inpSt} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button onClick={() => saveRow(editingRow)}
                          style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: D.text, color: D.bg, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingRow(null)}
                          style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', background: 'transparent', border: `0.5px solid ${D.borderAct}`, borderRadius: '8px', cursor: 'pointer', color: D.sub }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detail view */}
                  {selectedItem && !editingRow && (
                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                      {/* Detail header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                          <div style={{ fontSize: '17px', fontWeight: 600, color: D.text, lineHeight: 1.3, marginBottom: '4px', userSelect: 'none' }}>
                            {selectedItem.element_name}
                          </div>
                          {selectedItem.specification
                            ? <div style={{ marginTop: '8px', padding: '10px 12px', background: '#1e1e1c', borderRadius: '6px' }}>
                                <div style={{ fontSize: '10px', color: D.dim, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>What it covers</div>
                                <div style={{ fontSize: '12px', color: D.sub, lineHeight: 1.5 }}>{selectedItem.specification}</div>
                              </div>
                            : null}
                        </div>
                        {selectedItem.mandatory && <span style={badgeSt(true)}>mandatory</span>}
                      </div>

                      {/* Rate highlight box */}
                      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '18px', margin: '16px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: D.text, marginBottom: '5px', userSelect: 'none' }}>
                          {fmtRange(selectedItem.rate_min, selectedItem.rate_max) || '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: D.sub }}>
                          {[selectedItem.per_unit_type, selectedItem.city && selectedItem.city !== 'Pan-India' ? selectedItem.city : 'Pan-India'].filter(Boolean).join(' · ')}
                        </div>
                      </div>

                      {/* Fields */}
                      <div style={{ flex: 1 }}>
                        {[
                          { label: 'Venue type',  value: selectedItem.venue_type || '—' },
                          { label: 'Unit',        value: selectedItem.unit || '—' },
                          { label: 'GST',         value: selectedItem.gst_applicable ? 'Applicable' : 'Not applicable' },
                          { label: 'Source',      value: selectedItem.source || selectedItem.vendor_name || '—' },
                          { label: 'Things to know', value: selectedItem.notes || '—' },
                          ...(fmtDate(selectedItem.last_updated) ? [{ label: 'Last updated', value: fmtDate(selectedItem.last_updated), dim: true }] : []),
                        ].map(({ label, value, dim }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `0.5px solid ${D.border}` }}>
                            <span style={{ fontSize: '12px', color: D.sub }}>{label}</span>
                            <span style={{ fontSize: '12px', color: dim ? D.dim : D.text, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {selectedItem.source_url && (
                        <a href={selectedItem.source_url} target="_blank" rel="noreferrer"
                          style={{ display: 'block', fontSize: '11px', color: D.dim, textDecoration: 'none', padding: '8px 0', borderBottom: `0.5px solid ${D.border}`, marginBottom: '4px' }}>
                          ↗ View source
                        </a>
                      )}
                      {/* Admin actions */}
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button onClick={() => setEditingRow({ ...selectedItem })}
                            style={{ ...s, padding: '7px 18px', fontSize: '12px', background: 'transparent', border: `0.5px solid ${D.borderAct}`, borderRadius: '6px', cursor: 'pointer', color: D.text }}>
                            Edit
                          </button>
                          <button onClick={() => setDeleteConfirm(selectedItem.id)}
                            style={{ ...s, padding: '7px 14px', fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: D.dim, transition: 'color 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.color = D.red}
                            onMouseOut={e => e.currentTarget.style.color = D.dim}>
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Add to event */}
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `0.5px solid ${D.border}` }}>
                        <button onClick={openAddModal}
                          style={{ ...s, width: '100%', padding: '11px', fontSize: '13px', fontWeight: 500, background: D.red, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                          + Add to event
                        </button>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </>
      )}

      {/* ── Add to event modal ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}>
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 28px 24px', maxWidth: '480px', width: '100%' }}>
            {addDone ? (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>Added to event</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Element added · Go to the event to fill client costs and quantities.</p>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <button onClick={() => { setShowAddModal(false); setSelected(new Set()) }}
                    style={{ ...s, width: '100%', padding: '9px', fontSize: '13px', fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>Add to event</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                  {selectedItem?.element_name} · Internal rate will be pre-filled.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Event</div>
                  <select value={targetEvent}
                    onChange={e => { setTargetEvent(e.target.value); setTargetCity(''); setAddWarnings([]) }}
                    style={{ fontFamily: 'var(--font-body)', width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="">Select event</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
                {targetEvent && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>City</div>
                    <select value={targetCity}
                      onChange={e => onEventCityChange(targetEvent, e.target.value)}
                      style={{ fontFamily: 'var(--font-body)', width: '100%', padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                      <option value="">Select city</option>
                      {eventCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {addWarnings.length > 0 && (
                  <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {addWarnings.map((w, i) => (
                      <div key={i} style={{ fontSize: '12px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: warningColor[w.type] || '#FEF3C7', color: 'var(--text)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>{warningIcon[w.type] || '⚠️'}</span>
                        <span>{w.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={confirmAddToEvent}
                    disabled={!targetEvent || !targetCity || adding}
                    style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: '#bc1723', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: targetEvent && targetCity ? 1 : 0.5 }}>
                    {adding ? 'Adding…' : addWarnings.some(w => w.type === 'duplicate') ? 'Add anyway' : 'Confirm'}
                  </button>
                  <button onClick={() => setShowAddModal(false)}
                    style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}>
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', maxWidth: '360px', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>Remove rate?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>This rate will be removed from the library. Won't affect existing events.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => deleteRow(deleteConfirm)}
                style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: '#A32D2D', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                Remove
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ ...s, flex: 1, padding: '9px', fontSize: '13px', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ── */}
      {showImport && (
        <ImportRateCard session={session} userRole={userRole} onImported={loadRates} onClose={() => setShowImport(false)} />
      )}

    </div>
  )
}
