import { useState } from 'react'
import { MASTER_CATEGORIES, CATEGORY_SUGGESTIONS } from './CategoryLibrary'
import { supabase } from '../supabase'
import * as XLSX from 'xlsx'

const FIELD_OPTIONS = [
  { value: '', label: '— Ignore this column —' },
  { value: 'element_name', label: 'Element name' },
  { value: 'finish', label: 'Finish / specs' },
  { value: 'size', label: 'Size / dimensions' },
  { value: 'qty', label: 'Quantity' },
  { value: 'days', label: 'Days' },
  { value: 'rate', label: 'Client rate (unit)' },
  { value: 'amount', label: 'Client amount (lump)' },
  { value: 'internal_rate', label: 'Internal rate (unit)' },
  { value: 'internal_amount', label: 'Internal amount (lump)' },
  { value: 'source', label: 'Source / vendor' },
  { value: 'category', label: 'Category name' },
]

// Fuzzy match imported category names to master taxonomy
function matchToMasterCategory(raw) {
  if (!raw) return raw
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9 ]/g,'')
  // Exact match
  const exact = MASTER_CATEGORIES.find(mc => mc.toLowerCase() === raw.trim().toLowerCase())
  if (exact) return exact
  // Keyword map for common event industry terms
  const keywordMap = [
    { keys: ['manpower','labour','labor','staff','crew','human','volunteer','host','anchor','emcee','security'], cat: 'Manpower' },
    { keys: ['stage','platform','riser','steps','podium','lectern','skirting','green room'], cat: 'Stage' },
    { keys: ['production','fabricat','backdrop','arch','structure','build','construct','panel','masking','carpet','booth','kiosk','counter'], cat: 'Production & Fabrication' },
    { keys: ['brand','sign','banner','print','flex','vinyl','standie','standee','logo','hoarding','display'], cat: 'Branding & Signage' },
    { keys: ['sound','audio','mic','speaker','pa system','monitor','amplifier','dj'], cat: 'Sound' },
    { keys: ['light','lighting','follow spot','gobo','fairy','ambient light','stage light','truss'], cat: 'Lighting' },
    { keys: ['video','led','led wall','projector','screen','imag','teleprompter','switching','confidence'], cat: 'Video & LED' },
    { keys: ['furniture','chair','table','sofa','lounge','seating','podium','lectern','desk'], cat: 'Furniture' },
    { keys: ['power','electrical','genset','generator','dg set','diesel','fuel','db','distribution','cabling','wiring','electrician','earthing','ups'], cat: 'Power & Electrical' },
    { keys: ['venue','hall','room','space','infrastructure','ac','cooling','tentage','flooring','barricad'], cat: 'Venue & Infrastructure' },
    { keys: ['venue book','hall book','property','hotel book'], cat: 'Venue Booking' },
    { keys: ['food','beverage','f&b','fb','catering','meal','lunch','dinner','breakfast','snack','tea','coffee','water','drink'], cat: 'Food & Beverage' },
    { keys: ['travel','flight','train','transport','cab','bus','coach','transfer','pickup','drop','conveyance'], cat: 'Travel Booking' },
    { keys: ['logistics','cargo','courier','truck','material','loading','unload','warehouse','packing','shipping'], cat: 'Logistics' },
    { keys: ['permission','permit','noc','license','legal','police','fire','municipality','union','matadi'], cat: 'Permissions & Legal' },
    { keys: ['insurance','cover','indemnity'], cat: 'Insurance' },
    { keys: ['technology','tech','it','app','wifi','internet','tablet','kiosk','stream','qr','badge','software'], cat: 'Technology & IT' },
    { keys: ['gift','merchandise','merch','kit','hamper','trophy','award','mement','souvenir','bag','tote'], cat: 'Gifts & Merchandise' },
    { keys: ['photo','video','film','camera','drone','shoot','cinema','edit','post','coverage'], cat: 'Photography & Videography' },
    { keys: ['agency','fee','management','coordination','creative','design','tlb'], cat: 'Agency Cost' },
    { keys: ['misc','general','other','contingency','stationery'], cat: 'Miscellaneous' },
  ]
  for (const {keys, cat} of keywordMap) {
    if (keys.some(k => normalized.includes(k))) return cat
  }
  return raw // keep original if no match
}

function guessField(header) {
  const h = String(header).toLowerCase().trim()
  if (h.includes('element') || h.includes('item') || h.includes('particular') || h.includes('description') || h === 'name') return 'element_name'
  if (h.includes('spec') || h.includes('finish') || h.includes('remark') || h.includes('note') || h.includes('detail')) return 'finish'
  if (h.includes('size') || h.includes('dimension')) return 'size'
  if (h.includes('qty') || h.includes('quantity') || h === 'nos' || h === 'no.') return 'qty'
  if (h.includes('day')) return 'days'
  if (h.includes('internal') || h.includes('vendor rate') || h.includes('cost price')) return 'internal_rate'
  if ((h.includes('amount') || h.includes('rate') || h.includes('price') || h.includes('cost') || h === 'amt') && !h.includes('internal')) return 'rate'
  if (h.includes('source') || h.includes('vendor') || h.includes('supplier')) return 'source'
  if (h.includes('category') || h.includes('section') || h.includes('head')) return 'category'
  return ''
}

function isCategoryRow(row, nameCol) {
  // A row is a category if: has text in first meaningful column, all numeric cols are empty
  const vals = row.map(v => String(v || '').trim())
  const hasText = vals.some(v => v && isNaN(parseFloat(v.replace(/[₹,]/g, ''))))
  const hasNumbers = vals.some(v => v && !isNaN(parseFloat(v.replace(/[₹,]/g, ''))) && parseFloat(v.replace(/[₹,]/g, '')) > 10)
  // Category rows have text but no amounts
  return hasText && !hasNumbers
}

function parseRows(rows, mapping, headerRowIdx) {
  const categories = {}
  let currentCategory = 'General'
  const dataRows = rows.slice(headerRowIdx + 1)

  dataRows.forEach(row => {
    const vals = row.map(v => String(v || '').trim())
    if (!vals.some(v => v)) return // empty row

    // Check if this is a category row (has text, no significant numbers)
    const catColIdx = mapping.findIndex(m => m.field === 'category')
    const nameColIdx = mapping.findIndex(m => m.field === 'element_name')

    // Is this row a category header? (colored rows in your format)
    // Detect: SNO column is empty/non-numeric AND no amount value
    const snoLike = vals[0]
    const hasSno = snoLike && (snoLike.match(/^[0-9]+$/) || snoLike.match(/^[a-z]$/i))
    const hasAmount = vals.some(v => {
      const n = parseFloat(String(v).replace(/[₹,\s]/g, ''))
      return !isNaN(n) && n > 50
    })

    if (!hasSno && !hasAmount && vals.some(v => v)) {
      // Likely a category or sub-header row
      const catText = catColIdx >= 0 ? vals[catColIdx] :
        vals.find(v => v && v.length > 2 && isNaN(parseFloat(v.replace(/[₹,]/g, ''))))
      if (catText && catText.length > 2) {
        currentCategory = catText
        return
      }
    }

    // Build element from mapping
    const el = {
      element_name: '', finish: '', size: '', size_unit: 'ft',
      qty: 1, days: 1, rate: 0, lump_sum: false, amount: 0,
      internal_rate: 0, internal_lump: false, internal_amount: 0,
      source: '', cost_status: 'Estimated',
    }

    mapping.forEach(({ colIdx, field }) => {
      if (!field) return
      const raw = vals[colIdx] || ''
      const num = parseFloat(String(raw).replace(/[₹,\s]/g, ''))
      if (field === 'element_name') el.element_name = raw
      else if (field === 'finish') el.finish = raw
      else if (field === 'size') el.size = raw
      else if (field === 'qty') el.qty = isNaN(num) ? 1 : num
      else if (field === 'days') el.days = isNaN(num) ? 1 : num
      else if (field === 'rate') { el.rate = isNaN(num) ? 0 : num; el.lump_sum = false }
      else if (field === 'amount') { el.amount = isNaN(num) ? 0 : num; el.lump_sum = true }
      else if (field === 'internal_rate') { el.internal_rate = isNaN(num) ? 0 : num; el.internal_lump = false }
      else if (field === 'internal_amount') { el.internal_amount = isNaN(num) ? 0 : num; el.internal_lump = true }
      else if (field === 'source') el.source = raw
      else if (field === 'category') { if (raw) currentCategory = raw }
    })

    if (!el.element_name) return // skip rows with no element name

    if (!categories[currentCategory]) categories[currentCategory] = []
    categories[currentCategory].push(el)
  })

  return Object.entries(categories)
    .filter(([, items]) => items.length > 0)
    .map(([name, items]) => ({ name: matchToMasterCategory(name), items }))
}

function PreviewEditor({ parsed, setParsed, city, onBack, onImport }) {
  const [editingCat, setEditingCat] = useState(null) // index being renamed
  const [editVal, setEditVal] = useState('')
  const [mergeFrom, setMergeFrom] = useState(null) // index to merge from

  function renameCategory(idx, newName) {
    if (!newName.trim()) return
    setParsed(prev => prev.map((cat, i) => i === idx ? { ...cat, name: newName.trim() } : cat))
    setEditingCat(null)
  }

  function mergeInto(fromIdx, toName) {
    setParsed(prev => {
      const from = prev[fromIdx]
      return prev
        .filter((_, i) => i !== fromIdx)
        .map(cat => cat.name === toName
          ? { ...cat, items: [...cat.items, ...from.items] }
          : cat
        )
    })
    setMergeFrom(null)
  }

  function assignToMaster(idx, masterName) {
    setParsed(prev => prev.map((cat, i) => i === idx ? { ...cat, name: masterName } : cat))
  }

  const totalElements = parsed.reduce((s, c) => s + c.items.length, 0)

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Categories</span><div style={{ fontSize: '20px', fontWeight: 500 }}>{parsed.length}</div></div>
        <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Elements</span><div style={{ fontSize: '20px', fontWeight: 500 }}>{totalElements}</div></div>
        <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>City</span><div style={{ fontSize: '20px', fontWeight: 500 }}>{city}</div></div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Click category name to rename · use dropdowns to assign or merge
        </div>
      </div>

      {/* Category list */}
      <div style={{ maxHeight: '380px', overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
        {parsed.map((cat, ci) => (
          <div key={ci}>
            {/* Category header — editable */}
            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', position: 'sticky', top: 0, zIndex: 2 }}>

              {/* Editable name */}
              {editingCat === ci ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={() => renameCategory(ci, editVal)}
                  onKeyDown={e => { if (e.key === 'Enter') renameCategory(ci, editVal); if (e.key === 'Escape') setEditingCat(null) }}
                  style={{ flex: 1, fontSize: '13px', fontWeight: 500, padding: '3px 8px', border: '1px solid var(--text)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--bg)' }}
                />
              ) : (
                <span
                  onClick={() => { setEditingCat(ci); setEditVal(cat.name) }}
                  title="Click to rename"
                  style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text)', cursor: 'text', textTransform: 'uppercase', letterSpacing: '0.3px' }}
                >
                  {cat.name}
                </span>
              )}

              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {cat.items.length} items
              </span>

              {/* Assign to master category */}
              <select
                value=""
                onChange={e => { if (e.target.value) assignToMaster(ci, e.target.value) }}
                title="Assign to a standard category"
                style={{ fontSize: '11px', padding: '3px 6px', border: '0.5px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', cursor: 'pointer', maxWidth: '160px' }}
              >
                <option value="">Rename to standard →</option>
                {MASTER_CATEGORIES.map(mc => (
                  <option key={mc} value={mc}>{mc}</option>
                ))}
              </select>

              {/* Merge into another */}
              {parsed.length > 1 && (
                <select
                  value=""
                  onChange={e => { if (e.target.value) mergeInto(ci, e.target.value) }}
                  title="Merge all elements into another category"
                  style={{ fontSize: '11px', padding: '3px 6px', border: '0.5px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', cursor: 'pointer', maxWidth: '140px' }}
                >
                  <option value="">Merge into →</option>
                  {parsed.filter((_, i) => i !== ci).map((other, oi) => (
                    <option key={oi} value={other.name}>{other.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Elements */}
            {cat.items.map((el, ei) => (
              <div key={ei} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 60px 60px 100px 130px', gap: '8px', padding: '6px 12px 6px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', alignItems: 'center' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.element_name}</div>
                <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.finish || '—'}</div>
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{el.qty} nos</div>
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{el.days}d</div>
                <div style={{ fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
                  {el.rate > 0 ? '₹' + el.rate.toLocaleString('en-IN') : el.amount > 0 ? '₹' + el.amount.toLocaleString('en-IN') : '—'}
                </div>
                {/* Move to another category */}
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return
                    const toCat = e.target.value
                    setParsed(prev => prev.map(c => {
                      if (c.name === cat.name) return { ...c, items: c.items.filter((_, i) => i !== ei) }
                      if (c.name === toCat) return { ...c, items: [...c.items, el] }
                      return c
                    }).filter(c => c.items.length > 0))
                  }}
                  title="Move this element to another category"
                  style={{ fontSize: '10px', padding: '2px 4px', border: '0.5px solid var(--border)', borderRadius: '4px', background: 'none', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', width: '100%' }}
                >
                  <option value="">Move to →</option>
                  {parsed.filter(c => c.name !== cat.name).map((other, oi) => (
                    <option key={oi} value={other.name}>{other.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onBack} style={{ padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>← Adjust mapping</button>
        <button onClick={onImport} style={{ padding: '9px 24px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
          Import {totalElements} elements →
        </button>
      </div>
    </div>
  )
}

export default function ImportModal({ event, city, onImported, onClose }) {
  const [step, setStep] = useState('upload') // upload | map | preview | importing
  const [rawRows, setRawRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [headerRowIdx, setHeaderRowIdx] = useState(0)
  const [mapping, setMapping] = useState([])
  const [parsed, setParsed] = useState([])
  const [progress, setProgress] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState('file') // file | paste

  function readFile(file) {
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1, defval: '', raw: false
      })
      loadRows(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  function readPaste(text) {
    const rows = text.trim().split('\n').map(l => l.split('\t').map(c => c.trim()))
    loadRows(rows)
  }

  function loadRows(rows) {
    // Find header row — look for row with "element" or "item" or "particular"
    let hdrIdx = 0
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const low = rows[i].map(v => String(v).toLowerCase())
      if (low.some(v => v.includes('element') || v.includes('item') || v.includes('particular') || v.includes('description'))) {
        hdrIdx = i; break
      }
    }
    const hdrs = rows[hdrIdx].map(v => String(v || '').trim())
    const mp = hdrs.map((h, i) => ({ colIdx: i, header: h, field: guessField(h) }))
      .filter(m => m.header) // ignore empty header cols

    setRawRows(rows)
    setHeaders(hdrs)
    setHeaderRowIdx(hdrIdx)
    setMapping(mp)
    setStep('map')
  }

  function updateMapping(colIdx, field) {
    setMapping(prev => prev.map(m => m.colIdx === colIdx ? { ...m, field } : m))
  }

  function buildPreview() {
    const result = parseRows(rawRows, mapping, headerRowIdx)
    setParsed(result)
    setStep('preview')
  }

  async function runImport() {
    setStep('importing')
    let total = 0
    for (const cat of parsed) {
      setProgress(`Importing ${cat.name}...`)
      for (let i = 0; i < cat.items.length; i++) {
        const el = cat.items[i]
        const clientAmt = el.lump_sum ? (el.amount || 0) : (el.rate || 0) * (el.qty || 1) * (el.days || 1)
        const internalAmt = el.internal_lump ? (el.internal_amount || 0) : (el.internal_rate || 0) * (el.qty || 1) * (el.days || 1)
        await supabase.from('elements').insert({
          event_id: event.id, city, category: cat.name,
          element_name: el.element_name, finish: el.finish || '',
          size: el.size || '', size_unit: el.size_unit || 'ft',
          qty: el.qty || 1, days: el.days || 1,
          rate: el.rate || 0, lump_sum: el.lump_sum || false, amount: clientAmt,
          internal_rate: el.internal_rate || 0, internal_lump: el.internal_lump || false,
          internal_amount: internalAmt,
          source: el.source || '', cost_status: 'Estimated',
          bundled: false, sort_order: i,
        })
        total++
      }
    }
    setProgress(`Done — ${total} elements imported.`)
    setTimeout(() => { onImported(); onClose() }, 1200)
  }

  const previewRows = rawRows.slice(Math.max(0, headerRowIdx - 2), headerRowIdx + 8)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>
              Import elements — {city}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {step === 'upload' && 'Upload your cost sheet or paste from Excel'}
              {step === 'map' && 'Review column mapping — adjust if needed'}
              {step === 'preview' && 'Confirm what will be imported'}
              {step === 'importing' && 'Importing...'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-tertiary)', padding: '4px 8px' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button onClick={() => setMode('file')} style={{ flex: 1, padding: '12px', fontSize: '13px', fontFamily: 'var(--font-body)', background: mode === 'file' ? 'var(--text)' : 'var(--bg-secondary)', color: mode === 'file' ? 'var(--bg)' : 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: mode === 'file' ? 500 : 400 }}>
                  ↑ Upload Excel / CSV
                </button>
                <button onClick={() => setMode('paste')} style={{ flex: 1, padding: '12px', fontSize: '13px', fontFamily: 'var(--font-body)', background: mode === 'paste' ? 'var(--text)' : 'var(--bg-secondary)', color: mode === 'paste' ? 'var(--bg)' : 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: mode === 'paste' ? 500 : 400 }}>
                  ⌘ Paste from Excel
                </button>
              </div>

              {mode === 'file' && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
                  style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '48px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => document.getElementById('import-file-input').click()}
                >
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>Drop your file here</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>or click to browse — Excel (.xlsx, .xls) or CSV</p>
                  <button style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Browse file
                  </button>
                  <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) readFile(e.target.files[0]) }} />
                </div>
              )}

              {mode === 'paste' && (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '10px', lineHeight: 1.6 }}>
                    Select your data in Excel → Cmd+C → paste below. Include the header row.
                  </p>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste Excel data here..."
                    rows={10}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', background: 'var(--bg-secondary)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button onClick={() => readPaste(pasteText)} disabled={!pasteText.trim()} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: pasteText.trim() ? 1 : 0.5 }}>
                      Detect columns →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'map' && (
            <div>
              {/* Raw preview */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                  File preview (rows around detected header)
                </p>
                <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri + Math.max(0, headerRowIdx - 2) === headerRowIdx ? '#FFFBEB' : ri % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)' }}>
                        {row.slice(0, 10).map((cell, ci) => (
                          <td key={ci} style={{ padding: '5px 10px', borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', color: ri + Math.max(0, headerRowIdx - 2) === headerRowIdx ? '#92400E' : 'var(--text)', fontWeight: ri + Math.max(0, headerRowIdx - 2) === headerRowIdx ? 500 : 400 }}>
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </table>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  Highlighted row = detected header. Header row: {headerRowIdx + 1}
                  <button onClick={() => setHeaderRowIdx(Math.max(0, headerRowIdx - 1))} style={{ marginLeft: '10px', fontSize: '11px', padding: '1px 8px', border: '0.5px solid var(--border)', borderRadius: '3px', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>↑</button>
                  <button onClick={() => setHeaderRowIdx(Math.min(rawRows.length - 1, headerRowIdx + 1))} style={{ marginLeft: '4px', fontSize: '11px', padding: '1px 8px', border: '0.5px solid var(--border)', borderRadius: '3px', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>↓</button>
                </p>
              </div>

              {/* Column mapping */}
              <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                Map columns to fields
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                {mapping.map(m => (
                  <div key={m.colIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: m.field ? '#F0FDF4' : 'var(--bg-secondary)', border: `0.5px solid ${m.field ? '#22C55E' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Col {m.colIdx + 1}: <strong style={{ color: 'var(--text)' }}>{m.header || '(empty)'}</strong>
                      </div>
                      <select
                        value={m.field}
                        onChange={e => updateMapping(m.colIdx, e.target.value)}
                        style={{ width: '100%', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('upload')} style={{ padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>← Back</button>
                <button onClick={buildPreview} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Preview import →</button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div>
              {parsed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No elements detected.</p>
                  <p style={{ fontSize: '13px' }}>Check your column mapping — make sure "Element name" is assigned.</p>
                  <button onClick={() => setStep('map')} style={{ marginTop: '16px', padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>← Adjust mapping</button>
                </div>
              ) : (
                <PreviewEditor
                  parsed={parsed}
                  setParsed={setParsed}
                  city={city}
                  onBack={() => setStep('map')}
                  onImport={runImport}
                />
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginBottom: '12px' }}>Importing...</p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{progress}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
