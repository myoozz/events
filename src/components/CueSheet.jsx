import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── Time utilities ───────────────────────────────────────
function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return ''
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const m = ((mins % 1440) + 1440) % 1440 % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function durationToMinutes(d) {
  if (!d) return 0
  if (d.includes(':')) {
    const [h, m] = d.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  return parseInt(d) || 0
}

function minutesToDuration(mins) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h}h ${m}m`
}

function newRow(id, screens) {
  const screenCues = {}
  screens.forEach(s => { screenCues[s] = '' })
  return {
    id,
    start: '',
    end: '',
    duration: '',
    location: '',
    activity: '',
    screenCues,
  }
}

// ─── City Cue Sheet ───────────────────────────────────────
function CityCueSheet({ event, city, sheetData, onSave, saving }) {
  const [screens, setScreens] = useState(sheetData?.screens || [])
  const [rows, setRows] = useState(sheetData?.rows?.length > 0 ? sheetData.rows : [newRow(Date.now(), sheetData?.screens || [])])
  const [newScreen, setNewScreen] = useState('')
  const [showAddScreen, setShowAddScreen] = useState(false)
  const saveTimeout = useRef(null)

  // Auto-save with debounce
  function triggerSave(updatedRows, updatedScreens) {
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      onSave({ city, screens: updatedScreens || screens, rows: updatedRows || rows })
    }, 800)
  }

  function addScreen() {
    if (!newScreen.trim()) return
    const updated = [...screens, newScreen.trim()]
    const updatedRows = rows.map(r => ({
      ...r,
      screenCues: { ...(r.screenCues || {}), [newScreen.trim()]: '' }
    }))
    setScreens(updated)
    setRows(updatedRows)
    setNewScreen('')
    setShowAddScreen(false)
    triggerSave(updatedRows, updated)
  }

  function removeScreen(screen) {
    const updated = screens.filter(s => s !== screen)
    const updatedRows = rows.map(r => {
      const cues = { ...r.screenCues }
      delete cues[screen]
      return { ...r, screenCues: cues }
    })
    setScreens(updated)
    setRows(updatedRows)
    triggerSave(updatedRows, updated)
  }

  function addRow(afterIdx) {
    const id = Date.now() + Math.random()
    const nr = newRow(id, screens)

    // Inherit start from previous row's end
    if (afterIdx >= 0 && rows[afterIdx]?.end) {
      nr.start = rows[afterIdx].end
    }

    const updated = [
      ...rows.slice(0, afterIdx + 1),
      nr,
      ...rows.slice(afterIdx + 1),
    ]
    setRows(updated)
    triggerSave(updated, screens)
  }

  function deleteRow(idx) {
    if (rows.length === 1) return
    const updated = rows.filter((_, i) => i !== idx)
    setRows(updated)
    triggerSave(updated, screens)
  }

  function updateRow(idx, field, value) {
    const updated = rows.map((r, i) => {
      if (i !== idx) return r
      const row = { ...r, [field]: value }

      // Time calculations
      if (field === 'start' || field === 'duration') {
        const startMins = timeToMinutes(row.start)
        const durMins = durationToMinutes(row.duration)
        if (row.start && row.duration) {
          row.end = minutesToTime(startMins + durMins)
        }
      }
      if (field === 'end') {
        const startMins = timeToMinutes(row.start)
        const endMins = timeToMinutes(row.end)
        if (row.start && row.end) {
          const dur = endMins - startMins
          row.duration = minutesToDuration(dur >= 0 ? dur : dur + 1440)
        }
        // Push next row start
      }
      if (field === 'start' && !r.start) {
        // If duration exists, calculate end
        const durMins = durationToMinutes(row.duration)
        if (durMins > 0) row.end = minutesToTime(timeToMinutes(value) + durMins)
      }
      return row
    })

    // Cascade start times if end changed
    if (field === 'end' || field === 'duration') {
      for (let i = idx + 1; i < updated.length; i++) {
        const prev = updated[i - 1]
        if (prev.end && !updated[i].start) {
          updated[i] = { ...updated[i], start: prev.end }
          if (updated[i].duration) {
            const startM = timeToMinutes(prev.end)
            const durM = durationToMinutes(updated[i].duration)
            updated[i].end = minutesToTime(startM + durM)
          }
        } else break
      }
    }

    setRows(updated)
    triggerSave(updated, screens)
  }

  function updateScreenCue(idx, screen, value) {
    const updated = rows.map((r, i) =>
      i === idx ? { ...r, screenCues: { ...r.screenCues, [screen]: value } } : r
    )
    setRows(updated)
    triggerSave(updated, screens)
  }

  const inp = {
    padding: '5px 7px',
    fontSize: '12px',
    border: '0.5px solid transparent',
    borderRadius: '3px',
    fontFamily: 'var(--font-body)',
    background: 'transparent',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    lineHeight: 1.4,
  }

  const inpFocus = {
    ...inp,
    border: '0.5px solid var(--border-strong)',
    background: 'var(--bg)',
  }

  const thStyle = {
    padding: '6px 8px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--bg)',
    background: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* City header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--text)' }}>
          {city}
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Screen tags */}
          {screens.map(s => (
            <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--text)', color: 'var(--bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {s}
              <button onClick={() => removeScreen(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bg)', fontSize: '11px', padding: '0', lineHeight: 1, opacity: 0.7 }}>✕</button>
            </span>
          ))}
          {showAddScreen ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <input value={newScreen} onChange={e => setNewScreen(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScreen()}
                placeholder="Screen name..."
                autoFocus
                style={{ padding: '4px 8px', fontSize: '12px', border: '0.5px solid var(--border-strong)', borderRadius: '4px', fontFamily: 'var(--font-body)', outline: 'none', width: '130px' }} />
              <button onClick={addScreen} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddScreen(false)} style={{ padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAddScreen(true)}
              style={{ padding: '4px 10px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: '20px', cursor: 'pointer', color: 'var(--text)' }}>
              + Add screen
            </button>
          )}
          {saving && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Saving...</span>}
        </div>
      </div>

      {/* Cue table */}
      <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${600 + screens.length * 160}px` }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '32px' }}>#</th>
              <th style={{ ...thStyle, width: '80px' }}>Start</th>
              <th style={{ ...thStyle, width: '80px' }}>End</th>
              <th style={{ ...thStyle, width: '72px' }}>Duration</th>
              <th style={{ ...thStyle, width: '110px' }}>Location</th>
              <th style={{ ...thStyle, minWidth: '200px' }}>Activity / Script</th>
              {screens.map(s => (
                <th key={s} style={{ ...thStyle, minWidth: '150px', background: '#2C2C2C' }}>{s}</th>
              ))}
              <th style={{ ...thStyle, width: '28px', background: 'var(--text)' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id}
                style={{ borderBottom: '0.5px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)' }}
                onMouseOver={e => e.currentTarget.style.background = '#F5F3EF'}
                onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)'}
              >
                {/* Row number */}
                <td style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', verticalAlign: 'top', paddingTop: '10px' }}>
                  {idx + 1}
                </td>

                {/* Start */}
                <td style={{ padding: '2px', verticalAlign: 'top' }}>
                  <input type="time" value={row.start}
                    onChange={e => updateRow(idx, 'start', e.target.value)}
                    style={{ ...inp, fontVariantNumeric: 'tabular-nums' }}
                    onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                    onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                  />
                </td>

                {/* End */}
                <td style={{ padding: '2px', verticalAlign: 'top' }}>
                  <input type="time" value={row.end}
                    onChange={e => updateRow(idx, 'end', e.target.value)}
                    style={{ ...inp, fontVariantNumeric: 'tabular-nums' }}
                    onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                    onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                  />
                </td>

                {/* Duration */}
                <td style={{ padding: '2px', verticalAlign: 'top' }}>
                  <input value={row.duration}
                    onChange={e => updateRow(idx, 'duration', e.target.value)}
                    placeholder="e.g. 5 min"
                    style={inp}
                    onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                    onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                  />
                </td>

                {/* Location */}
                <td style={{ padding: '2px', verticalAlign: 'top' }}>
                  <input value={row.location}
                    onChange={e => updateRow(idx, 'location', e.target.value)}
                    placeholder="Venue area..."
                    style={inp}
                    onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                    onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                  />
                </td>

                {/* Activity */}
                <td style={{ padding: '2px', verticalAlign: 'top' }}>
                  <textarea value={row.activity}
                    onChange={e => updateRow(idx, 'activity', e.target.value)}
                    placeholder="Activity or script note..."
                    rows={row.activity?.split('\n').length > 1 ? row.activity.split('\n').length : 1}
                    style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
                    onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                    onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                  />
                </td>

                {/* Screen cues */}
                {screens.map(s => (
                  <td key={s} style={{ padding: '2px', verticalAlign: 'top', borderLeft: '0.5px solid var(--border)' }}>
                    <input value={row.screenCues?.[s] || ''}
                      onChange={e => updateScreenCue(idx, s, e.target.value)}
                      placeholder="Cue..."
                      style={inp}
                      onFocus={e => Object.assign(e.target.style, { border: '0.5px solid var(--border-strong)', background: 'var(--bg)' })}
                      onBlur={e => Object.assign(e.target.style, { border: '0.5px solid transparent', background: 'transparent' })}
                    />
                  </td>
                ))}

                {/* Actions */}
                <td style={{ padding: '4px 4px', verticalAlign: 'top', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <button onClick={() => addRow(idx)} title="Add row below"
                      style={{ padding: '2px 5px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', lineHeight: 1 }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                      +
                    </button>
                    {rows.length > 1 && (
                      <button onClick={() => deleteRow(idx)} title="Delete row"
                        style={{ padding: '2px 5px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', lineHeight: 1 }}
                        onMouseOver={e => e.currentTarget.style.color = '#DC2626'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row at bottom */}
      <button onClick={() => addRow(rows.length - 1)}
        style={{ marginTop: '8px', padding: '6px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        + Add row
      </button>
    </div>
  )
}

// ─── Main CueSheet Component ──────────────────────────────
export default function CueSheet({ event }) {
  const [sheets, setSheets] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCity, setActiveCity] = useState(event.cities?.[0] || '')
  const [exporting, setExporting] = useState(false)

  const cities = event.cities || []

  useEffect(() => { loadSheets() }, [event.id])

  async function loadSheets() {
    setLoading(true)
    const { data } = await supabase.from('cue_sheets').select('*').eq('event_id', event.id)
    const map = {}
    ;(data || []).forEach(s => { map[s.city] = s })
    setSheets(map)
    setLoading(false)
  }

  async function saveSheet({ city, screens, rows }) {
    setSaving(true)
    const existing = sheets[city]
    const payload = {
      event_id: event.id,
      city,
      screens,
      rows,
      updated_at: new Date().toISOString(),
    }
    if (existing?.id) {
      await supabase.from('cue_sheets').update(payload).eq('id', existing.id)
      setSheets(prev => ({ ...prev, [city]: { ...existing, ...payload } }))
    } else {
      const { data } = await supabase.from('cue_sheets').insert(payload).select().single()
      if (data) setSheets(prev => ({ ...prev, [city]: data }))
    }
    setSaving(false)
  }

  async function exportCueSheet() {
    setExporting(true)
    try {
      const { exportCueSheetExcel } = await import('../utils/excelExport')
      await exportCueSheetExcel(event, sheets)
    } catch (e) {
      console.error(e)
      alert('Export failed. Please try again.')
    }
    setExporting(false)
  }

  if (loading) return <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading...</p>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
            Cue sheet / Show flow
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Minute-by-minute flow with technical cues. Add screens for each technical department.
          </p>
        </div>
        <button onClick={exportCueSheet} disabled={exporting}
          style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.7 : 1 }}>
          {exporting ? 'Exporting...' : '↓ Export Excel'}
        </button>
      </div>

      {/* City tabs */}
      {cities.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', borderBottom: '0.5px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
          {cities.map(city => (
            <button key={city} onClick={() => setActiveCity(city)}
              style={{
                padding: '8px 16px', fontSize: '13px', fontFamily: 'var(--font-body)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeCity === city ? 'var(--text)' : 'var(--text-tertiary)',
                fontWeight: activeCity === city ? 500 : 400,
                borderBottom: activeCity === city ? '2px solid var(--text)' : '2px solid transparent',
                marginBottom: '-1px', whiteSpace: 'nowrap',
              }}>
              {city}
              {sheets[city]?.rows?.length > 0 && (
                <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', background: 'var(--bg-secondary)', borderRadius: '10px', color: 'var(--text-tertiary)' }}>
                  {sheets[city].rows.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Active city sheet */}
      {cities.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            No cities defined for this event. Add cities in the event settings first.
          </p>
        </div>
      ) : (
        <CityCueSheet
          key={activeCity}
          event={event}
          city={activeCity}
          sheetData={sheets[activeCity]}
          onSave={saveSheet}
          saving={saving}
        />
      )}

      {/* Help */}
      <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
        💡 <strong>Time tip:</strong> Set start time on first row. Enter duration — end time fills automatically. Each new row inherits the end time of the previous row as its start.
        · <strong>Screens:</strong> Add one for each technical department — Sound, Light, LED Wall, Main Screen, Left Panel, etc.
      </div>
    </div>
  )
}
