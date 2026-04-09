import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { MASTER_CATEGORIES } from './CategoryLibrary'
import * as XLSX from 'xlsx'

function fmt(n) { return n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '—' }

// ─── Excel import parser ────────────────────────────────────────────────────
function parseRateCardExcel(file, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
    const col = {}
    let hdrFound = false
    const results = []
    let vendorName = ''

    rows.forEach(row => {
      const v = row.map(x => String(x || '').trim())
      if (!v.some(x => x)) return

      // Try to detect vendor name from top rows before header
      if (!hdrFound && !vendorName) {
        const line = v.join(' ').toLowerCase()
        if (line.includes('vendor') || line.includes('supplier') || line.includes('rate card')) {
          const nameVal = v.find(x => x && x.length > 2 && !x.toLowerCase().includes('vendor') && !x.toLowerCase().includes('rate card'))
          if (nameVal) vendorName = nameVal
        }
      }

      if (!hdrFound) {
        const low = v.map(x => x.toLowerCase())
        if (low.some(x => x.includes('element') || x.includes('item') || x.includes('particular'))) {
          hdrFound = true
          low.forEach((x, i) => {
            if (x.includes('element') || x.includes('item') || x.includes('particular') || x.includes('description')) col.element = i
            if (x.includes('category') || x.includes('head') || x.includes('section')) col.category = i
            if (x.includes('vendor') || x.includes('supplier') || x.includes('company')) col.vendor = i
            if (x.includes('spec') || x.includes('finish') || x.includes('remark') || x.includes('detail')) col.spec = i
            if (x.includes('unit')) col.unit = i
            if (x.includes('rate') || x.includes('price') || x.includes('cost') || x.includes('amount')) col.rate = i
            if (x.includes('date') || x.includes('updated') || x.includes('valid')) col.date = i
            if (x.includes('note') || x.includes('remark')) col.notes = i
          })
          return
        }
      }

      if (!hdrFound) return
      const name = col.element !== undefined ? v[col.element] : (v[1] || v[0])
      if (!name || name.length < 2) return

      const rateRaw = col.rate !== undefined ? v[col.rate] : ''
      const rate = parseFloat(String(rateRaw).replace(/[₹,\s]/g, '')) || 0

      results.push({
        vendor_name: col.vendor !== undefined && v[col.vendor] ? v[col.vendor] : (vendorName || 'Unknown Vendor'),
        category: col.category !== undefined ? v[col.category] : '',
        element_name: name,
        specification: col.spec !== undefined ? v[col.spec] : '',
        unit: col.unit !== undefined ? v[col.unit] : 'nos',
        rate,
        last_updated: col.date !== undefined && v[col.date] ? v[col.date] : null,
        notes: col.notes !== undefined ? v[col.notes] : '',
      })
    })
    cb(results, vendorName)
  }
  reader.readAsArrayBuffer(file)
}

// ─── Import Modal ────────────────────────────────────────────────────────────
function ImportRateCard({ onImported, onClose, session }) {
  const [step, setStep] = useState('upload')
  const [vendorName, setVendorName] = useState('')
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState('file')
  const fileRef = useRef(null)

  function handleFile(file) {
    parseRateCardExcel(file, (rows, detectedVendor) => {
      if (detectedVendor && !vendorName) setVendorName(detectedVendor)
      setPreview(rows)
      setStep('preview')
    })
  }

  function handlePaste() {
    const rows = pasteText.trim().split('\n').map(l => l.split('\t').map(c => c.trim()))
    const results = []
    rows.slice(1).forEach(v => {
      if (!v.some(x => x)) return
      results.push({
        vendor_name: vendorName || 'Unknown Vendor',
        category: v[0] || '',
        element_name: v[1] || '',
        specification: v[2] || '',
        unit: v[3] || 'nos',
        rate: parseFloat(String(v[4] || '').replace(/[₹,]/g, '')) || 0,
        notes: v[5] || '',
      })
    })
    setPreview(results)
    setStep('preview')
  }

  async function runImport() {
    setImporting(true)
    const rows = preview.map(r => ({
      ...r,
      vendor_name: vendorName || r.vendor_name,
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,21,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: '680px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>
              Import rate card
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {step === 'upload' ? 'Upload vendor rate card — Excel or paste' : `${preview.length} rates ready to import`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-tertiary)' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {importing ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginBottom: '12px' }}>Importing...</p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{progress}</p>
            </div>
          ) : step === 'upload' ? (
            <>
              {/* Vendor name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Vendor name <span style={{ color: '#A32D2D' }}>*</span>
                </label>
                <input
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="e.g. Sharma Fabricators, ABC AV Rentals..."
                  style={{ width: '100%', padding: '9px 12px', fontSize: '14px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Upload mode toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['file', 'paste'].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '10px', fontSize: '13px', fontFamily: 'var(--font-body)',
                    background: mode === m ? 'var(--text)' : 'var(--bg-secondary)',
                    color: mode === m ? 'var(--bg)' : 'var(--text)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    fontWeight: mode === m ? 500 : 400,
                  }}>
                    {m === 'file' ? '↑ Upload Excel' : '⌘ Paste from Excel'}
                  </button>
                ))}
              </div>

              {mode === 'file' ? (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '40px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>Drop rate card here</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Excel (.xlsx, .xls) or CSV</p>
                  <button style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Browse file
                  </button>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', lineHeight: 1.6 }}>
                    Expected columns: Category | Element | Specification | Unit | Rate | Notes
                  </p>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste Excel data here (include header row)..."
                    rows={8}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', background: 'var(--bg-secondary)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button onClick={handlePaste} disabled={!pasteText.trim() || !vendorName.trim()}
                      style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: pasteText.trim() && vendorName.trim() ? 1 : 0.5 }}>
                      Preview →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Preview
            <>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
                <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Vendor</span><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{vendorName || 'Unknown'}</div></div>
                <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Rates</span><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.length}</div></div>
                <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>With rates</span><div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{preview.filter(r => r.rate > 0).length}</div></div>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: '0', padding: '6px 14px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Element', 'Category', 'Unit', 'Rate'].map((h, i) => (
                    <div key={i} style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                  ))}
                </div>
                {preview.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: '0', padding: '8px 14px', borderBottom: '0.5px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.element_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.category || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.unit || 'nos'}</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: r.rate > 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>{fmt(r.rate)}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('upload')} style={{ padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>← Back</button>
                <button onClick={runImport} style={{ padding: '9px 24px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
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

// ─── Main Rate Card Screen ────────────────────────────────────────────────────
export default function RateCard({ session }) {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ vendor_name: '', category: '', element_name: '', specification: '', unit: 'nos', rate: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadRates() }, [])

  async function loadRates() {
    setLoading(true)
    const { data } = await supabase.from('rate_cards').select('*').order('vendor_name').order('category').order('element_name')
    setRates(data || [])
    setLoading(false)
  }

  async function saveRow(row) {
    if (row.id) {
      await supabase.from('rate_cards').update({
        vendor_name: row.vendor_name, category: row.category,
        element_name: row.element_name, specification: row.specification,
        unit: row.unit, rate: row.rate, notes: row.notes,
        last_updated: new Date().toISOString().split('T')[0],
      }).eq('id', row.id)
    } else {
      await supabase.from('rate_cards').insert({
        ...row, rate: parseFloat(row.rate) || 0,
        created_by: session?.user?.email,
        last_updated: new Date().toISOString().split('T')[0],
      })
    }
    setEditingRow(null)
    setShowAddRow(false)
    setNewRow({ vendor_name: '', category: '', element_name: '', specification: '', unit: 'nos', rate: '', notes: '' })
    loadRates()
  }

  async function deleteRow(id) {
    await supabase.from('rate_cards').delete().eq('id', id)
    setDeleteConfirm(null)
    loadRates()
  }

  // Derived values
  const vendors = [...new Set(rates.map(r => r.vendor_name))].sort()
  const categories = [...new Set(rates.map(r => r.category).filter(Boolean))].sort()

  const filtered = rates.filter(r => {
    const matchSearch = !search || r.element_name?.toLowerCase().includes(search.toLowerCase()) || r.vendor_name?.toLowerCase().includes(search.toLowerCase())
    const matchVendor = !filterVendor || r.vendor_name === filterVendor
    const matchCat = !filterCategory || r.category === filterCategory
    return matchSearch && matchVendor && matchCat
  })

  // Group by vendor + category
  const grouped = {}
  filtered.forEach(r => {
    const key = r.vendor_name
    if (!grouped[key]) grouped[key] = {}
    const cat = r.category || 'Uncategorised'
    if (!grouped[key][cat]) grouped[key][cat] = []
    grouped[key][cat].push(r)
  })

  const colStyle = { fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '6px 10px' }
  const cellStyle = (bold) => ({ fontSize: '13px', color: bold ? 'var(--text)' : 'var(--text-secondary)', fontWeight: bold ? 500 : 400, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>Rate card library</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {rates.length} rates across {vendors.length} vendors · Used as internal cost reference when building proposals
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAddRow(true)}
            style={{ padding: '9px 18px', fontSize: '13px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
            + Add rate
          </button>
          <button onClick={() => setShowImport(true)}
            style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            ↑ Import rate card
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search element or vendor..."
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }} />
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filterVendor || filterCategory) && (
          <button onClick={() => { setSearch(''); setFilterVendor(''); setFilterCategory('') }}
            style={{ padding: '8px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Add row inline */}
      {showAddRow && (
        <div style={{ border: '0.5px solid var(--text)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px', background: 'var(--bg-secondary)' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add single rate</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr 0.8fr 0.8fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            {[
              { key: 'vendor_name', label: 'Vendor *', placeholder: 'Vendor name' },
              { key: 'category', label: 'Category', placeholder: 'Category', type: 'select' },
              { key: 'element_name', label: 'Element *', placeholder: 'Element name' },
              { key: 'specification', label: 'Spec', placeholder: 'Specification' },
              { key: 'unit', label: 'Unit', placeholder: 'nos', type: 'unitselect' },
              { key: 'rate', label: 'Rate (₹) *', placeholder: '0', type: 'number' },
              { key: 'notes', label: 'Notes', placeholder: 'Notes' },
            ].map(field => (
              <div key={field.key}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{field.label}</div>
                {field.type === 'select' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }}>
                    <option value="">— Select —</option>
                    {MASTER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : field.type === 'unitselect' ? (
                  <select value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }}>
                    {['nos', 'sqft', 'mtr', 'day', 'shift', 'pax', 'ls', 'set'].map(u => <option key={u}>{u}</option>)}
                  </select>
                ) : (
                  <input type={field.type || 'text'} value={newRow[field.key]} onChange={e => setNewRow(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '7px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px', paddingBottom: '0' }}>
              <button onClick={() => saveRow(newRow)} disabled={!newRow.vendor_name || !newRow.element_name || !newRow.rate}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: newRow.vendor_name && newRow.element_name && newRow.rate ? 1 : 0.5 }}>
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
            Upload vendor rate cards to build your internal cost reference.<br/>
            Rates will be suggested when your team enters internal costs.
          </p>
          <button onClick={() => setShowImport(true)}
            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            ↑ Import first rate card
          </button>
        </div>
      )}

      {/* Rate table grouped by vendor */}
      {!loading && Object.entries(grouped).map(([vendor, catMap]) => {
        const vendorTotal = Object.values(catMap).flat().filter(r => r.rate > 0).length
        return (
          <div key={vendor} style={{ marginBottom: '24px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {/* Vendor header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{vendor}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 8px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '20px' }}>
                  {vendorTotal} rates
                </span>
              </div>
            </div>

            {/* Categories within vendor */}
            {Object.entries(catMap).map(([cat, rows]) => (
              <div key={cat}>
                <div style={{ padding: '6px 16px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {cat}
                </div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.7fr 1fr 0.8fr 80px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Element', 'Specification', 'Unit', 'Rate', 'Notes', ''].map((h, i) => (
                    <div key={i} style={colStyle}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {rows.map((r, ri) => (
                  editingRow?.id === r.id ? (
                    // Inline edit
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.7fr 1fr 0.8fr 80px', gap: '4px', padding: '6px 8px', background: '#FFFBEB', borderBottom: '0.5px solid var(--border)', alignItems: 'center' }}>
                      <input value={editingRow.element_name} onChange={e => setEditingRow(p => ({ ...p, element_name: e.target.value }))}
                        style={{ padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <input value={editingRow.specification} onChange={e => setEditingRow(p => ({ ...p, specification: e.target.value }))}
                        style={{ padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <select value={editingRow.unit} onChange={e => setEditingRow(p => ({ ...p, unit: e.target.value }))}
                        style={{ padding: '5px 6px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none' }}>
                        {['nos', 'sqft', 'mtr', 'day', 'shift', 'pax', 'ls', 'set'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" value={editingRow.rate} onChange={e => setEditingRow(p => ({ ...p, rate: e.target.value }))}
                        style={{ padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <input value={editingRow.notes} onChange={e => setEditingRow(p => ({ ...p, notes: e.target.value }))}
                        style={{ padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => saveRow(editingRow)} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingRow(null)} style={{ padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.7fr 1fr 0.8fr 80px', borderBottom: ri < rows.length - 1 ? '0.5px solid var(--border)' : 'none', background: ri % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseOut={e => e.currentTarget.style.background = ri % 2 === 1 ? 'var(--bg-secondary)' : 'var(--bg)'}
                    >
                      <div style={cellStyle(true)}>{r.element_name}</div>
                      <div style={cellStyle(false)}>{r.specification || '—'}</div>
                      <div style={{ ...cellStyle(false), fontSize: '11px' }}>{r.unit || 'nos'}</div>
                      <div style={{ ...cellStyle(true), color: r.rate > 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>{fmt(r.rate)}</div>
                      <div style={{ ...cellStyle(false), fontSize: '11px' }}>{r.notes || '—'}</div>
                      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', alignItems: 'center' }}>
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
        <ImportRateCard session={session} onImported={loadRates} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
