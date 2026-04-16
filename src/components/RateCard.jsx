import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { MASTER_CATEGORIES } from './CategoryLibrary'
import { generateRateCardTemplate, RC_CATEGORIES } from '../utils/excelExport'
import * as XLSX from 'xlsx'

function fmt(n) { return n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '—' }
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
  const [tab, setTab] = useState('upload')           // 'upload' | 'json'
  const [step, setStep] = useState('upload')          // upload → mapping → preview → importing
  const [vendorName, setVendorName] = useState('')
  const [category, setCategory] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [dupeWarning, setDupeWarning] = useState(null) // { count, source }
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [copied, setCopied] = useState(false)
  const [dlCategory, setDlCategory] = useState('')
  const [dlLoading, setDlLoading] = useState(false)
  const fileRef = useRef(null)

  // ── Template download ──────────────────────────────────────────────────────
  async function handleDownload() {
    if (!dlCategory) return
    setDlLoading(true)
    try { await generateRateCardTemplate(dlCategory) }
    finally { setDlLoading(false) }
  }

  // ── File upload ────────────────────────────────────────────────────────────
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

  // ── JSON paste ─────────────────────────────────────────────────────────────
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

  function copyPrompt() {
    if (!category) return
    navigator.clipboard.writeText(buildResearchPrompt(category))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Dupe check + import ────────────────────────────────────────────────────
  async function checkAndImport() {
    // Check for same category + element_name + city + vendor_name (Case 4)
    const sampleKeys = preview.slice(0, 20).map(r =>
      `${r.category}||${r.element_name}||${r.city || ''}||${r.vendor_name || ''}`
    )
    const { data: existing } = await supabase
      .from('rate_cards')
      .select('category, element_name, city, vendor_name')
      .or(
        preview.slice(0, 20).map(r =>
          `and(category.eq.${r.category || ''},element_name.eq.${r.element_name},vendor_name.eq.${r.vendor_name || ''})`
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
      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: '720px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
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

          {/* ── IMPORTING ── */}
          {importing && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)', marginBottom: '10px' }}>Importing...</p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{progress}</p>
            </div>
          )}

          {/* ── DUPE WARNING ── */}
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

          {/* ── STEP: UPLOAD ── */}
          {!importing && !dupeWarning && step === 'upload' && (
            <>
              {/* Tabs */}
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

              {/* Category selector (shared) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Category</div>
                <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                  <option value="">— Select category —</option>
                  {RC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── UPLOAD TAB ── */}
              {tab === 'upload' && (
                <>
                  {/* Download template */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, minWidth: '160px' }}>
                      Don't have a rate card? Download the blank template for this category.
                    </span>
                    <select value={dlCategory} onChange={e => setDlCategory(e.target.value)}
                      style={{ ...selectStyle, width: 'auto', minWidth: '180px' }}>
                      <option value="">— Pick category —</option>
                      {RC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={handleDownload} disabled={!dlCategory || dlLoading}
                      style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: dlCategory ? 'var(--text)' : 'var(--bg)', color: dlCategory ? 'var(--bg)' : 'var(--text-tertiary)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: dlCategory ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                      {dlLoading ? 'Downloading...' : '↓ Download template'}
                    </button>
                  </div>

                  {/* Vendor name */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Vendor / Source name</div>
                    <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                      placeholder="e.g. Sharma Fabricators, ABC AV Rentals..."
                      style={inputStyle} />
                  </div>

                  {/* Dropzone */}
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

              {/* ── JSON TAB ── */}
              {tab === 'json' && (
                <>
                  {/* Copy prompt */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, margin: 0 }}>
                      Research rates using any AI tool, paste the JSON output below.
                    </p>
                    <button onClick={copyPrompt} disabled={!category}
                      style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: copied ? '#D1FAE5' : (category ? 'var(--bg-secondary)' : 'var(--bg)'), color: copied ? '#065F46' : (category ? 'var(--text)' : 'var(--text-tertiary)'), border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: category ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      {copied ? '✓ Copied!' : '⌘ Copy research prompt'}
                    </button>
                  </div>

                  {!category && (
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

          {/* ── STEP: MAPPING ── */}
          {!importing && !dupeWarning && step === 'mapping' && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                Green = auto-matched · Amber = unmatched · Select "— Skip —" to ignore a column.
              </p>
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '20px' }}>
                {/* Header */}
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

          {/* ── STEP: PREVIEW ── */}
          {!importing && !dupeWarning && step === 'preview' && (
            <>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Rows</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.length}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>With min rate</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.filter(r => r.rate_min > 0).length}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Category</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{category || '—'}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Source</div><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview[0]?.rate_type === 'ai_research' ? 'AI Research' : (vendorName || preview[0]?.vendor_name || '—')}</div></div>
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
export default function RateCard({ session, userRole }) {
  const isAdmin   = userRole === 'admin'
  const canEdit   = isAdmin
  const canAdd    = ['admin','manager','event_lead'].includes(userRole)

  // ── Data ──────────────────────────────────────────────────────────────────
  const [rates,       setRates]       = useState([])
  const [events,      setEvents]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showImport,  setShowImport]  = useState(false)
  const [showAddRow,  setShowAddRow]  = useState(false)
  const [editingRow,  setEditingRow]  = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [newRow, setNewRow] = useState({
    vendor_name:'', category:'', element_name:'', specification:'',
    unit:'nos', rate_min:'', rate_max:'', per_unit_type:'', city:'', notes:''
  })

  // ── Browse state ──────────────────────────────────────────────────────────
  const [selectedCat,    setSelectedCat]    = useState(null)
  const [locationFilter, setLocationFilter] = useState('')   // '' = All
  const [selectedSource, setSelectedSource] = useState(null)
  const [selected,       setSelected]       = useState(new Set()) // rate row IDs

  // ── Add to event modal ────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal]   = useState(false)
  const [targetEvent,  setTargetEvent]   = useState('')
  const [targetCity,   setTargetCity]    = useState('')
  const [addWarnings,  setAddWarnings]   = useState([])
  const [adding,       setAdding]        = useState(false)
  const [addDone,      setAddDone]       = useState(false)

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

  // Reset source + selection when category changes
  useEffect(() => { setSelectedSource(null); setSelected(new Set()); setLocationFilter('') }, [selectedCat])
  // Reset selection when source changes
  useEffect(() => { setSelected(new Set()) }, [selectedSource])

  // ── Derived ───────────────────────────────────────────────────────────────
  const categories = [...new Set(rates.map(r => r.category).filter(Boolean))].sort()

  // Sources within selected category (optionally filtered by location)
  const ratesInCat = selectedCat ? rates.filter(r => r.category === selectedCat) : []

  // All unique locations within category for filter chips
  const locationChips = ['All',
    ...([...new Set(ratesInCat.map(r => r.city).filter(Boolean))].sort((a,b) =>
      a === 'Pan-India' ? 1 : b === 'Pan-India' ? -1 : a.localeCompare(b)
    ))
  ]

  const ratesInCatFiltered = locationFilter && locationFilter !== 'All'
    ? ratesInCat.filter(r => r.city === locationFilter || r.city === 'Pan-India')
    : ratesInCat

  // Group by source/vendor within filtered category
  const sourcesInCat = [...new Set(ratesInCatFiltered.map(r => r.vendor_name).filter(Boolean))].sort()

  // Rows for selected source
  const sourceRows = (selectedSource && selectedCat)
    ? ratesInCatFiltered.filter(r => r.vendor_name === selectedSource)
    : []

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === sourceRows.length) setSelected(new Set())
    else setSelected(new Set(sourceRows.map(r => r.id)))
  }

  const selectedRows = sourceRows.filter(r => selected.has(r.id))

  // Compute warnings for Add to event modal
  async function computeWarnings(eventId, city) {
    const warnings = []
    if (!eventId || !city) return warnings

    // 1. Fetch existing elements in this event+city
    const { data: existingEls } = await supabase
      .from('elements')
      .select('element_name')
      .eq('event_id', eventId)
      .eq('city', city)

    const existingNames = new Set((existingEls || []).map(e => e.element_name?.toLowerCase()))

    // 2. Check each selected row
    const namesSeen = new Set()
    for (const row of selectedRows) {
      const nameLower = row.element_name?.toLowerCase()

      // Duplicate in event
      if (existingNames.has(nameLower)) {
        warnings.push({ type: 'duplicate', text: `"${row.element_name}" already exists in this event · ${city}` })
      }

      // Duplicate within selection (same element from multiple cities)
      if (namesSeen.has(nameLower)) {
        warnings.push({ type: 'multi_city', text: `"${row.element_name}" selected multiple times — different city entries. Only one will be added.` })
      }
      namesSeen.add(nameLower)

      // City mismatch
      if (row.city && row.city !== 'Pan-India' && row.city !== city) {
        warnings.push({ type: 'city_mismatch', text: `"${row.element_name}" rate is for ${row.city}, but you're adding to ${city}. Rate may not be accurate.` })
      }

      // Zero rate
      if (!row.rate_min && !row.rate_max) {
        warnings.push({ type: 'no_rate', text: `"${row.element_name}" has no rate data — cost must be entered manually.` })
      }
    }

    // 3. Mandatory items not selected
    const mandatoryInCat = ratesInCat.filter(r => r.mandatory && r.vendor_name === selectedSource)
    const selectedNames  = new Set(selectedRows.map(r => r.element_name?.toLowerCase()))
    const missedMandatory = mandatoryInCat.filter(r => !selectedNames.has(r.element_name?.toLowerCase()))
    if (missedMandatory.length > 0) {
      warnings.push({ type: 'mandatory', text: `Mandatory items not selected: ${missedMandatory.map(r => r.element_name).join(', ')}` })
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
    if (!targetEvent || !targetCity || selectedRows.length === 0) return
    setAdding(true)

    // Dedupe by element_name — keep first (city-specific preferred over Pan-India)
    const seen = new Set()
    const toInsert = []
    for (const row of selectedRows) {
      const key = row.element_name?.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        toInsert.push({
          event_id:      targetEvent,
          city:          targetCity,
          category:      row.category,
          element_name:  row.element_name,
          internal_rate: row.rate_min || 0,
          source:        row.vendor_name || '',
          qty:           1,
          days:          1,
          rate:          0,
          lump_sum:      false,
          internal_lump: false,
          internal_amount: 0,
          amount:        0,
          cost_status:   'Estimated',
          sort_order:    999,
        })
      }
    }

    await supabase.from('elements').insert(toInsert)
    setAdding(false)
    setAddDone(true)
  }

  // Admin inline save/delete
  async function saveRow(row) {
    const { id, ...fields } = row
    await supabase.from('rate_cards').update(fields).eq('id', id)
    setEditingRow(null); loadRates()
  }
  async function deleteRow(id) {
    await supabase.from('rate_cards').delete().eq('id', id)
    setDeleteConfirm(null); loadRates()
  }
  async function addNewRow() {
    await supabase.from('rate_cards').insert({
      ...newRow,
      rate_min: +newRow.rate_min || 0,
      rate_max: +newRow.rate_max || 0,
      rate_type: 'user_entered',
    })
    setNewRow({ vendor_name:'', category:'', element_name:'', specification:'', unit:'nos', rate_min:'', rate_max:'', per_unit_type:'', city:'', notes:'' })
    setShowAddRow(false); loadRates()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = { fontFamily: 'var(--font-body)' }
  const inpSt = { ...s, padding:'6px 10px', fontSize:'12px', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', background:'var(--bg)', color:'var(--text)', outline:'none', width:'100%', boxSizing:'border-box' }
  const chipSt = (active) => ({
    ...s, fontSize:'11px', padding:'3px 10px', borderRadius:'20px', cursor:'pointer', whiteSpace:'nowrap',
    background: active ? 'var(--text)' : 'var(--bg)',
    color:      active ? 'var(--bg)'   : 'var(--text-secondary)',
    border:     active ? 'none'        : '0.5px solid var(--border)',
  })

  const warningIcon = { duplicate:'⚠️', city_mismatch:'🏙️', multi_city:'🔁', no_rate:'—', mandatory:'📋' }
  const warningColor = { duplicate:'#FEF3C7', city_mismatch:'#FEF3C7', multi_city:'#FEF3C7', no_rate:'#F3F4F6', mandatory:'#EFF6FF' }

  const selectedEvent = events.find(e => e.id === targetEvent)
  const eventCities   = selectedEvent?.cities || []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...s }}>

      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:500, color:'var(--text)', marginBottom:'4px' }}>Rate card library</h2>
          <p style={{ fontSize:'13px', color:'var(--text-tertiary)' }}>
            {rates.length} rates · {categories.length} categories · Suggested when your team enters internal costs
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {canEdit && (
            <button onClick={() => setShowAddRow(v => !v)}
              style={{ ...s, padding:'9px 16px', fontSize:'13px', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
              + Add rate
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowImport(true)}
              style={{ ...s, padding:'9px 18px', fontSize:'13px', fontWeight:500, background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
              ↑ Import / Add data
            </button>
          )}
        </div>
      </div>

      {/* Add row — admin only */}
      {canEdit && showAddRow && (
        <div style={{ border:'0.5px solid var(--text)', borderRadius:'var(--radius-sm)', padding:'16px', marginBottom:'16px', background:'var(--bg-secondary)' }}>
          <p style={{ fontSize:'11px', fontWeight:600, color:'var(--text)', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Add single rate</p>
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1fr auto', gap:'8px', alignItems:'end' }}>
            {[
              { key:'vendor_name',   label:'Vendor *',     placeholder:'Vendor name' },
              { key:'category',      label:'Category',     type:'catselect' },
              { key:'element_name',  label:'Element *',    placeholder:'Element name' },
              { key:'specification', label:'Spec',         placeholder:'Specification' },
              { key:'unit',          label:'Unit',         type:'unitselect' },
              { key:'rate_min',      label:'Rate Min (₹)', placeholder:'0', type:'number' },
              { key:'rate_max',      label:'Rate Max (₹)', placeholder:'0', type:'number' },
              { key:'city',          label:'City',         placeholder:'Mumbai / Pan-India' },
              { key:'notes',         label:'Notes',        placeholder:'Notes' },
            ].map(field => (
              <div key={field.key}>
                <div style={{ fontSize:'10px', color:'var(--text-tertiary)', marginBottom:'4px' }}>{field.label}</div>
                {field.type === 'catselect' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))} style={{ ...inpSt, padding:'5px 6px' }}>
                    <option value="">—</option>
                    {MASTER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : field.type === 'unitselect' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))} style={{ ...inpSt, padding:'5px 6px' }}>
                    {['nos','sqft','sqmtr','mtr','ft','day','shift','pax','ls','set','KVA'].map(u => <option key={u}>{u}</option>)}
                  </select>
                ) : (
                  <input type={field.type || 'text'} value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={inpSt} />
                )}
              </div>
            ))}
            <div style={{ display:'flex', gap:'4px' }}>
              <button onClick={addNewRow} disabled={!newRow.vendor_name || !newRow.element_name}
                style={{ ...s, padding:'7px 14px', fontSize:'12px', fontWeight:500, background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'4px', cursor:'pointer', opacity: newRow.vendor_name && newRow.element_name ? 1 : 0.5 }}>
                Save
              </button>
              <button onClick={() => setShowAddRow(false)}
                style={{ ...s, padding:'7px 10px', fontSize:'12px', background:'none', border:'0.5px solid var(--border)', borderRadius:'4px', cursor:'pointer', color:'var(--text-tertiary)' }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && rates.length === 0 && (
        <div style={{ border:'0.5px dashed var(--border-strong)', borderRadius:'var(--radius)', padding:'60px 32px', textAlign:'center' }}>
          <p style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'8px' }}>No rate cards yet</p>
          <p style={{ fontSize:'13px', color:'var(--text-tertiary)', marginBottom:'24px', lineHeight:1.6 }}>
            Upload vendor rate cards or paste AI research JSON.<br/>Rates are suggested when your team enters internal costs.
          </p>
          {canEdit && (
            <button onClick={() => setShowImport(true)}
              style={{ ...s, padding:'10px 24px', fontSize:'13px', fontWeight:500, background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
              ↑ Add first rate card data
            </button>
          )}
        </div>
      )}

      {/* ── 3-panel browse ── */}
      {!loading && rates.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'200px 260px 1fr', gap:'0', border:'0.5px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', minHeight:'520px' }}>

          {/* Col 1 — Categories */}
          <div style={{ borderRight:'0.5px solid var(--border)', overflowY:'auto' }}>
            <div style={{ padding:'10px 12px', fontSize:'10px', fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'0.5px solid var(--border)', background:'var(--bg-secondary)' }}>
              Categories
            </div>
            {categories.map(cat => {
              const count = rates.filter(r => r.category === cat).length
              const active = selectedCat === cat
              return (
                <div key={cat} onClick={() => setSelectedCat(active ? null : cat)}
                  style={{ padding:'10px 12px', cursor:'pointer', borderBottom:'0.5px solid var(--border)', background: active ? 'var(--text)' : 'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background 0.1s' }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.background = 'var(--bg)' }}>
                  <span style={{ fontSize:'12px', color: active ? 'var(--bg)' : 'var(--text)', fontWeight: active ? 500 : 400, lineHeight:1.3 }}>{cat}</span>
                  <span style={{ fontSize:'10px', color: active ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)', marginLeft:'6px', flexShrink:0 }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Col 2 — Sources */}
          <div style={{ borderRight:'0.5px solid var(--border)', overflowY:'auto', background:'var(--bg-secondary)' }}>
            {!selectedCat ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-tertiary)', fontSize:'12px' }}>
                ← Select a category
              </div>
            ) : (
              <>
                {/* Location filter chips */}
                <div style={{ padding:'10px 12px', borderBottom:'0.5px solid var(--border)', display:'flex', gap:'6px', flexWrap:'wrap', background:'var(--bg)' }}>
                  {locationChips.map(loc => (
                    <span key={loc} onClick={() => setLocationFilter(loc === 'All' ? '' : loc)}
                      style={chipSt(loc === 'All' ? !locationFilter : locationFilter === loc)}>
                      {loc}
                    </span>
                  ))}
                </div>

                {/* Source cards */}
                <div style={{ padding:'10px' }}>
                  {sourcesInCat.length === 0 && (
                    <div style={{ padding:'24px', textAlign:'center', color:'var(--text-tertiary)', fontSize:'12px' }}>
                      No sources for this filter
                    </div>
                  )}
                  {sourcesInCat.map(source => {
                    const rows   = ratesInCatFiltered.filter(r => r.vendor_name === source)
                    const cities = [...new Set(rows.map(r => r.city).filter(Boolean))]
                    const active = selectedSource === source
                    const typeColor = rows[0]?.rate_type === 'vendor_quoted' ? { bg:'#D1FAE5', text:'#065F46' }
                                    : rows[0]?.rate_type === 'ai_research'   ? { bg:'#EFF6FF', text:'#1D4ED8' }
                                    : { bg:'#F3F4F6', text:'#4B5563' }
                    return (
                      <div key={source} onClick={() => setSelectedSource(active ? null : source)}
                        style={{ padding:'12px', marginBottom:'8px', borderRadius:'var(--radius-sm)', border: active ? '1px solid var(--text)' : '0.5px solid var(--border)', background: active ? 'var(--bg)' : 'var(--bg)', cursor:'pointer', boxShadow: active ? 'none' : 'none', transition:'border 0.1s' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                          <span style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', lineHeight:1.3 }}>{source}</span>
                          <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'20px', background:typeColor.bg, color:typeColor.text, flexShrink:0, marginLeft:'6px' }}>
                            {rows.length} rates
                          </span>
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                          {cities.slice(0,5).map(c => (
                            <span key={c} style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'20px', background:'var(--bg-secondary)', color:'var(--text-tertiary)', border:'0.5px solid var(--border)' }}>{c}</span>
                          ))}
                          {cities.length > 5 && <span style={{ fontSize:'10px', color:'var(--text-tertiary)' }}>+{cities.length-5}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Col 3 — Rate rows */}
          <div style={{ overflowY:'auto', display:'flex', flexDirection:'column' }}>
            {!selectedSource ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-tertiary)', fontSize:'12px', flex:1 }}>
                ← Select a source
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{ padding:'8px 14px', borderBottom:'0.5px solid var(--border)', background:'var(--bg-secondary)', display:'flex', alignItems:'center', gap:'10px', position:'sticky', top:0, zIndex:1 }}>
                  <input type="checkbox" checked={selected.size === sourceRows.length && sourceRows.length > 0}
                    onChange={toggleAll} style={{ cursor:'pointer', accentColor:'var(--text)', flexShrink:0 }} />
                  <div style={{ display:'grid', gridTemplateColumns: canEdit ? '2fr 1.2fr 0.7fr 1fr 0.7fr 80px' : '2fr 1.2fr 0.7fr 1fr 0.7fr', flex:1, gap:'8px' }}>
                    {['Element','Specification','Unit','Rate Range','City', ...(canEdit ? [''] : [])].map((h,i) => (
                      <span key={i} style={{ fontSize:'10px', fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</span>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div style={{ flex:1 }}>
                  {sourceRows.map((r, ri) => (
                    editingRow?.id === r.id ? (
                      <div key={r.id} style={{ padding:'8px 14px', borderBottom:'0.5px solid var(--border)', background:'#FFFBEB', display:'flex', alignItems:'center', gap:'10px' }}>
                        <input type="checkbox" checked={false} readOnly style={{ flexShrink:0 }} />
                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 0.7fr 0.5fr 0.5fr 0.7fr 80px', flex:1, gap:'6px', alignItems:'center' }}>
                          <input value={editingRow.element_name} onChange={e=>setEditingRow(p=>({...p,element_name:e.target.value}))} style={inpSt} />
                          <input value={editingRow.specification||''} onChange={e=>setEditingRow(p=>({...p,specification:e.target.value}))} style={inpSt} />
                          <input value={editingRow.unit||''} onChange={e=>setEditingRow(p=>({...p,unit:e.target.value}))} style={inpSt} />
                          <input type="number" placeholder="Min" value={editingRow.rate_min||''} onChange={e=>setEditingRow(p=>({...p,rate_min:e.target.value}))} style={inpSt} />
                          <input type="number" placeholder="Max" value={editingRow.rate_max||''} onChange={e=>setEditingRow(p=>({...p,rate_max:e.target.value}))} style={inpSt} />
                          <input value={editingRow.city||''} onChange={e=>setEditingRow(p=>({...p,city:e.target.value}))} placeholder="City" style={inpSt} />
                          <div style={{ display:'flex', gap:'4px' }}>
                            <button onClick={()=>saveRow(editingRow)} style={{ ...s, padding:'4px 10px', fontSize:'11px', fontWeight:500, background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'3px', cursor:'pointer' }}>Save</button>
                            <button onClick={()=>setEditingRow(null)} style={{ ...s, padding:'4px 8px', fontSize:'11px', background:'none', border:'0.5px solid var(--border)', borderRadius:'3px', cursor:'pointer', color:'var(--text-tertiary)' }}>✕</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={r.id}
                        style={{ padding:'8px 14px', borderBottom: ri < sourceRows.length-1 ? '0.5px solid var(--border)' : 'none', background: selected.has(r.id) ? '#F0F7FF' : ri%2===1 ? 'var(--bg-secondary)' : 'var(--bg)', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}
                        onClick={() => toggleSelect(r.id)}>
                        <input type="checkbox" checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}
                          onClick={e=>e.stopPropagation()} style={{ cursor:'pointer', accentColor:'var(--text)', flexShrink:0 }} />
                        <div style={{ display:'grid', gridTemplateColumns: canEdit ? '2fr 1.2fr 0.7fr 1fr 0.7fr 80px' : '2fr 1.2fr 0.7fr 1fr 0.7fr', flex:1, gap:'8px', alignItems:'center' }}>
                          <div>
                            <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)' }}>{r.element_name}</div>
                            {r.mandatory && <span style={{ fontSize:'9px', color:'#bc1723', fontWeight:500 }}>mandatory</span>}
                          </div>
                          <div style={{ fontSize:'11px', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.specification||'—'}</div>
                          <div style={{ fontSize:'11px', color:'var(--text-tertiary)' }}>{r.unit||'—'}</div>
                          <div style={{ fontSize:'12px', fontWeight:500, color: (r.rate_min||r.rate_max) ? 'var(--text)' : 'var(--text-tertiary)' }}>
                            {fmtRange(r.rate_min, r.rate_max)}
                            {r.per_unit_type && <span style={{ fontSize:'10px', color:'var(--text-tertiary)', marginLeft:'3px' }}>{r.per_unit_type}</span>}
                          </div>
                          <div style={{ fontSize:'11px', color:'var(--text-tertiary)' }}>{r.city||'Pan-India'}</div>
                          {canEdit && (
                            <div style={{ display:'flex', gap:'4px' }} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>setEditingRow({...r})} style={{ ...s, padding:'3px 8px', fontSize:'11px', background:'none', border:'0.5px solid var(--border)', borderRadius:'3px', cursor:'pointer', color:'var(--text-secondary)' }}>Edit</button>
                              <button onClick={()=>setDeleteConfirm(r.id)} style={{ ...s, padding:'3px 6px', fontSize:'11px', background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)' }}
                                onMouseOver={e=>e.currentTarget.style.color='#A32D2D'} onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}>✕</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Add to event footer */}
                {canAdd && selected.size > 0 && (
                  <div style={{ padding:'12px 16px', borderTop:'0.5px solid var(--border)', background:'var(--bg-secondary)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', position:'sticky', bottom:0 }}>
                    <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                      {selected.size} item{selected.size !== 1 ? 's' : ''} selected
                    </span>
                    <button onClick={openAddModal}
                      style={{ ...s, padding:'8px 20px', fontSize:'13px', fontWeight:500, background:'#bc1723', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>
                      + Add to event
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add to event modal ── */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'28px 28px 24px', maxWidth:'480px', width:'100%' }}>
            {addDone ? (
              <>
                <div style={{ textAlign:'center', padding:'16px 0' }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>✓</div>
                  <p style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Added to event</p>
                  <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{selected.size} element{selected.size!==1?'s':''} added · Go to the event to fill client costs and quantities.</p>
                </div>
                <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
                  <button onClick={()=>{ setShowAddModal(false); setSelected(new Set()) }}
                    style={{ ...s, flex:1, padding:'9px', fontSize:'13px', fontWeight:500, background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:500, color:'var(--text)', marginBottom:'4px' }}>Add to event</h3>
                <p style={{ fontSize:'12px', color:'var(--text-tertiary)', marginBottom:'20px' }}>
                  {selected.size} item{selected.size!==1?'s':''} selected · Internal rates will be pre-filled. Client cost and quantities to be set in ElementBuilder.
                </p>

                {/* Event picker */}
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'11px', color:'var(--text-tertiary)', marginBottom:'4px' }}>Event</div>
                  <select value={targetEvent}
                    onChange={e => { const ev=e.target.value; setTargetEvent(ev); setTargetCity(''); setAddWarnings([]); }}
                    style={{ ...inpSt }}>
                    <option value="">Select event</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>

                {/* City picker */}
                {targetEvent && (
                  <div style={{ marginBottom:'16px' }}>
                    <div style={{ fontSize:'11px', color:'var(--text-tertiary)', marginBottom:'4px' }}>City</div>
                    <select value={targetCity}
                      onChange={e => onEventCityChange(targetEvent, e.target.value)}
                      style={{ ...inpSt }}>
                      <option value="">Select city</option>
                      {eventCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Warnings */}
                {addWarnings.length > 0 && (
                  <div style={{ marginBottom:'16px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {addWarnings.map((w, i) => (
                      <div key={i} style={{ fontSize:'12px', padding:'8px 10px', borderRadius:'var(--radius-sm)', background: warningColor[w.type]||'#FEF3C7', color:'var(--text)', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                        <span style={{ flexShrink:0 }}>{warningIcon[w.type]||'⚠️'}</span>
                        <span>{w.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={confirmAddToEvent}
                    disabled={!targetEvent || !targetCity || adding}
                    style={{ ...s, flex:1, padding:'9px', fontSize:'13px', fontWeight:500, background:'#bc1723', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', opacity: targetEvent && targetCity ? 1 : 0.5 }}>
                    {adding ? 'Adding…' : addWarnings.some(w=>w.type==='duplicate') ? 'Add anyway' : 'Confirm'}
                  </button>
                  <button onClick={()=>setShowAddModal(false)}
                    style={{ ...s, flex:1, padding:'9px', fontSize:'13px', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,21,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'24px' }}>
          <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'28px 32px', maxWidth:'360px', width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>Remove rate?</h3>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'20px' }}>This rate will be removed from the library. Won't affect existing events.</p>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>deleteRow(deleteConfirm)} style={{ ...s, flex:1, padding:'9px', fontSize:'13px', fontWeight:500, background:'#A32D2D', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer' }}>Remove</button>
              <button onClick={()=>setDeleteConfirm(null)} style={{ ...s, flex:1, padding:'9px', fontSize:'13px', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportRateCard session={session} userRole={userRole} onImported={loadRates} onClose={()=>setShowImport(false)} />
      )}
    </div>
  )
}
