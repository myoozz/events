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
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ vendor_name: '', category: '', element_name: '', specification: '', unit: 'nos', rate_min: '', rate_max: '', per_unit_type: '', city: '', notes: '' })

  const isAdmin = userRole === 'admin'

  async function loadRates() {
    setLoading(true)
    const { data } = await supabase.from('rate_cards').select('*').order('category').order('element_name')
    setRates(data || [])
    setLoading(false)
  }

  useEffect(() => { loadRates() }, [])

  async function saveRow(row) {
    const { id, ...fields } = row
    await supabase.from('rate_cards').update(fields).eq('id', id)
    setEditingRow(null)
    loadRates()
  }

  async function deleteRow(id) {
    await supabase.from('rate_cards').delete().eq('id', id)
    setDeleteConfirm(null)
    loadRates()
  }

  async function addNewRow() {
    await supabase.from('rate_cards').insert({
      ...newRow,
      rate_min: +newRow.rate_min || 0,
      rate_max: +newRow.rate_max || 0,
      rate_type: 'user_entered',
      created_by: session?.user?.email,
      last_updated: new Date().toISOString().split('T')[0],
    })
    setNewRow({ vendor_name: '', category: '', element_name: '', specification: '', unit: 'nos', rate_min: '', rate_max: '', per_unit_type: '', city: '', notes: '' })
    setShowAddRow(false)
    loadRates()
  }

  // Derived
  const vendors    = [...new Set(rates.map(r => r.vendor_name).filter(Boolean))].sort()
  const categories = [...new Set(rates.map(r => r.category).filter(Boolean))].sort()
  const cities     = [...new Set(rates.map(r => r.city).filter(Boolean))].sort()

  const filtered = rates.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search || r.element_name?.toLowerCase().includes(q) || r.vendor_name?.toLowerCase().includes(q) || r.element_name?.toLowerCase().includes(q)
    const matchVendor = !filterVendor || r.vendor_name === filterVendor
    const matchCat    = !filterCategory || r.category === filterCategory
    const matchCity   = !filterCity || r.city === filterCity
    return matchSearch && matchVendor && matchCat && matchCity
  })

  const grouped = {}
  filtered.forEach(r => {
    const key = r.vendor_name || 'Unknown'
    if (!grouped[key]) grouped[key] = {}
    const cat = r.category || 'Uncategorised'
    if (!grouped[key][cat]) grouped[key][cat] = []
    grouped[key][cat].push(r)
  })

  const colSt  = { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '6px 10px' }
  const cellSt = (bold) => ({ fontSize: '12px', color: bold ? 'var(--text)' : 'var(--text-secondary)', fontWeight: bold ? 500 : 400, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
  const inpSt  = { padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }

  // Grid columns — admin sees rate_type, non-admin doesn't
  const gridCols = isAdmin
    ? '2fr 1.2fr 0.6fr 1fr 1fr 0.8fr 0.7fr 90px'
    : '2fr 1.2fr 0.6fr 1fr 1fr 0.8fr 90px'
  const gridHeaders = isAdmin
    ? ['Element', 'Specification', 'Unit', 'Rate Range', 'Per Unit', 'City', 'Type', '']
    : ['Element', 'Specification', 'Unit', 'Rate Range', 'Per Unit', 'City', '']

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>Rate card library</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {rates.length} rates across {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · Suggested when your team enters internal costs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button onClick={() => setShowAddRow(true)}
              style={{ padding: '9px 16px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
              + Add rate
            </button>
          )}
          <button onClick={() => setShowImport(true)}
            style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            ↑ Import / Add data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search element or vendor..."
          style={{ flex: 1, minWidth: '180px', padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }} />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {(search || filterVendor || filterCategory || filterCity) && (
          <button onClick={() => { setSearch(''); setFilterVendor(''); setFilterCategory(''); setFilterCity('') }}
            style={{ padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Add row inline — admin only */}
      {isAdmin && showAddRow && (
        <div style={{ border: '0.5px solid var(--text)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px', background: 'var(--bg-secondary)' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add single rate</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            {[
              { key: 'vendor_name',   label: 'Vendor *',    placeholder: 'Vendor name' },
              { key: 'category',      label: 'Category',    type: 'catselect' },
              { key: 'element_name',  label: 'Element *',   placeholder: 'Element name' },
              { key: 'specification', label: 'Spec',        placeholder: 'Specification' },
              { key: 'unit',          label: 'Unit',        type: 'unitselect' },
              { key: 'rate_min',      label: 'Rate Min (₹)', placeholder: '0', type: 'number' },
              { key: 'rate_max',      label: 'Rate Max (₹)', placeholder: '0', type: 'number' },
              { key: 'city',          label: 'City',        placeholder: 'Mumbai / Pan-India' },
              { key: 'notes',         label: 'Notes',       placeholder: 'Notes' },
            ].map(field => (
              <div key={field.key}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{field.label}</div>
                {field.type === 'catselect' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    style={{ ...inpSt, padding: '6px 8px' }}>
                    <option value="">—</option>
                    {MASTER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : field.type === 'unitselect' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    style={{ ...inpSt, padding: '6px 8px' }}>
                    {['nos','sqft','sqmtr','mtr','ft','day','shift','pax','ls','set','KVA'].map(u => <option key={u}>{u}</option>)}
                  </select>
                ) : (
                  <input type={field.type || 'text'} value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={inpSt} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '4px', paddingBottom: 0 }}>
              <button onClick={addNewRow} disabled={!newRow.vendor_name || !newRow.element_name}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: newRow.vendor_name && newRow.element_name ? 1 : 0.5 }}>
                Save
              </button>
              <button onClick={() => setShowAddRow(false)}
                style={{ padding: '7px 10px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && rates.length === 0 && (
        <div style={{ border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '60px 32px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)', marginBottom: '8px' }}>No rate cards yet</p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Upload vendor rate cards, paste AI research JSON, or add rates manually.<br/>
            Rates are suggested when your team enters internal costs in ElementBuilder.
          </p>
          <button onClick={() => setShowImport(true)}
            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            ↑ Add first rate card data
          </button>
        </div>
      )}

      {/* Rate table grouped by vendor → category */}
      {!loading && Object.entries(grouped).map(([vendor, catMap]) => {
        const vendorTotal = Object.values(catMap).flat().length
        return (
          <div key={vendor} style={{ marginBottom: '24px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {/* Vendor header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{vendor}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 8px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '20px' }}>
                  {vendorTotal} rates
                </span>
              </div>
            </div>

            {Object.entries(catMap).map(([cat, rows]) => (
              <div key={cat}>
                {/* Category sub-header */}
                <div style={{ padding: '5px 16px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {cat}
                </div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  {gridHeaders.map((h, i) => <div key={i} style={colSt}>{h}</div>)}
                </div>
                {/* Rows */}
                {rows.map((r, ri) => (
                  editingRow?.id === r.id ? (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '6px 8px', background: '#FFFBEB', borderBottom: '0.5px solid var(--border)', alignItems: 'center' }}>
                      <input value={editingRow.element_name} onChange={e => setEditingRow(p => ({ ...p, element_name: e.target.value }))} style={inpSt} />
                      <input value={editingRow.specification || ''} onChange={e => setEditingRow(p => ({ ...p, specification: e.target.value }))} style={inpSt} />
                      <input value={editingRow.unit || ''} onChange={e => setEditingRow(p => ({ ...p, unit: e.target.value }))} style={inpSt} />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" placeholder="Min" value={editingRow.rate_min || ''} onChange={e => setEditingRow(p => ({ ...p, rate_min: e.target.value }))} style={{ ...inpSt, width: '50%' }} />
                        <input type="number" placeholder="Max" value={editingRow.rate_max || ''} onChange={e => setEditingRow(p => ({ ...p, rate_max: e.target.value }))} style={{ ...inpSt, width: '50%' }} />
                      </div>
                      <input value={editingRow.per_unit_type || ''} onChange={e => setEditingRow(p => ({ ...p, per_unit_type: e.target.value }))} style={inpSt} />
                      <input value={editingRow.city || ''} onChange={e => setEditingRow(p => ({ ...p, city: e.target.value }))} style={inpSt} placeholder="City" />
                      {isAdmin && (
                        <select value={editingRow.rate_type || ''} onChange={e => setEditingRow(p => ({ ...p, rate_type: e.target.value }))} style={{ ...inpSt, padding: '5px 6px' }}>
                          {['ai_research','vendor_quoted','user_entered','system_captured'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => saveRow(editingRow)} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingRow(null)} style={{ padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: ri < rows.length - 1 ? '0.5px solid var(--border)' : 'none', background: ri % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseOut={e => e.currentTarget.style.background = ri % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)'}>
                      <div style={cellSt(true)}>{r.element_name}</div>
                      <div style={cellSt(false)}>{r.specification || '—'}</div>
                      <div style={{ ...cellSt(false), fontSize: '11px' }}>{r.unit || '—'}</div>
                      <div style={{ ...cellSt(true), color: (r.rate_min > 0 || r.rate_max > 0) ? 'var(--text)' : 'var(--text-tertiary)', fontSize: '11px' }}>
                        {fmtRange(r.rate_min, r.rate_max)}
                      </div>
                      <div style={{ ...cellSt(false), fontSize: '11px' }}>{r.per_unit_type || '—'}</div>
                      <div style={{ ...cellSt(false), fontSize: '11px' }}>{r.city || 'Pan-India'}</div>
                      {isAdmin && (
                        <div style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontFamily: 'var(--font-body)',
                            background: r.rate_type === 'vendor_quoted' ? '#D1FAE5' : r.rate_type === 'ai_research' ? '#EFF6FF' : '#F3F4F6',
                            color: r.rate_type === 'vendor_quoted' ? '#065F46' : r.rate_type === 'ai_research' ? '#1D4ED8' : '#4B5563',
                          }}>
                            {r.rate_type || 'unknown'}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', alignItems: 'center' }}>
                        {isAdmin && (
                          <>
                            <button onClick={() => setEditingRow({ ...r })}
                              style={{ padding: '3px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                              Edit
                            </button>
                            <button onClick={() => setDeleteConfirm(r.id)}
                              style={{ padding: '3px 6px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                              onMouseOver={e => e.currentTarget.style.color = '#A32D2D'}
                              onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ))}
          </div>
        )
      })}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' }}>
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', maxWidth: '360px', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>Remove rate?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>This rate will be removed from the library. Won't affect existing events.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => deleteRow(deleteConfirm)} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: '#A32D2D', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Remove</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportRateCard session={session} userRole={userRole} onImported={loadRates} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
