import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { generateAgentTemplate, exportTravelPlan, exportMICEItinerary } from '../utils/excelExport'
import {
  Plane, Building2, Car, Plus, Trash2, ChevronDown, ChevronRight,
  Download, Upload, Sparkles, CheckCircle2, Clock, Users,
  MapPin, CalendarDays, FileText, AlertCircle, Edit3, X, Save,
  ArrowRight, Star, List, Grid3x3
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

const SEAT_CLASS_LABELS = {
  economy: 'Economy', premium_economy: 'Premium Economy',
  business: 'Business', first: 'First'
}
const MEAL_PLAN_LABELS = {
  CP: 'CP — Bed & Breakfast', MAP: 'MAP — Half Board',
  AP: 'AP — Full Board', EP: 'EP — Room Only',
  AI: 'AI — All Inclusive'
}
const RESPONSIBILITY_LABELS = {
  internal: 'Internal', local: 'Local DMC', client: 'Client'
}
const PURPOSE_LABELS = {
  incentive: 'Incentive', conference: 'Conference',
  leisure: 'Leisure', mixed: 'Mixed'
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '32px 16px', color: 'var(--text-tertiary)'
    }}>
      <Icon size={28} strokeWidth={1.2} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{message}</p>
      {sub && <p style={{ margin: 0, fontSize: 12 }}>{sub}</p>}
    </div>
  )
}

// ─── inline add forms ────────────────────────────────────────────────────────

const FLIGHT_BLANK = {
  entry_type: 'flight', from_location: '', to_location: '', travel_date: '',
  time_start: '', airline: '', flight_no: '', pnr: '',
  seat_class: 'economy', pax_count: '', notes: '', source: 'internal'
}
const STAY_BLANK = {
  entry_type: 'stay', hotel_name: '', check_in: '', check_out: '',
  rooms: '', room_type: '', budget_per_night: '', notes: '', source: 'internal'
}
const GROUND_BLANK = {
  entry_type: 'ground', from_location: '', to_location: '', travel_date: '',
  time_start: '', vehicle_type: '', vehicle_count: '', purpose: '',
  pax_count: '', notes: '', source: 'internal'
}

function FieldRow({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
  )
}

function Field({ label, value, onChange, type = 'text', options, half, third, full, placeholder }) {
  const width = full ? '100%' : third ? 'calc(33% - 6px)' : half ? 'calc(50% - 4px)' : 'calc(25% - 6px)'
  const inputStyle = {
    width: '100%', padding: '6px 10px', border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
    outline: 'none', boxSizing: 'border-box'
  }
  return (
    <div style={{ width, minWidth: 120 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">— select —</option>
          {Object.entries(options).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      ) : (
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  )
}

function FlightForm({ form, setForm, onSave, onCancel, saving }) {
  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border-strong)',
      borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <FieldRow>
        <Field label="From" value={form.from_location} onChange={s('from_location')} placeholder="Delhi (DEL)" third />
        <Field label="To" value={form.to_location} onChange={s('to_location')} placeholder="Mumbai (BOM)" third />
        <Field label="Date" value={form.travel_date} onChange={s('travel_date')} type="date" third />
      </FieldRow>
      <FieldRow>
        <Field label="Preferred Time" value={form.time_start} onChange={s('time_start')} placeholder="06:00" />
        <Field label="Airline" value={form.airline} onChange={s('airline')} placeholder="IndiGo" />
        <Field label="Flight No" value={form.flight_no} onChange={s('flight_no')} placeholder="6E 2142" />
        <Field label="PNR" value={form.pnr} onChange={s('pnr')} placeholder="XYZABC" />
      </FieldRow>
      <FieldRow>
        <Field label="Seat Class" value={form.seat_class} onChange={s('seat_class')} options={SEAT_CLASS_LABELS} half />
        <Field label="Pax Count" value={form.pax_count} onChange={s('pax_count')} type="number" half />
      </FieldRow>
      <Field label="Notes" value={form.notes} onChange={s('notes')} full placeholder="Any special requirements..." />
      <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function StayForm({ form, setForm, onSave, onCancel, saving }) {
  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border-strong)',
      borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <FieldRow>
        <Field label="Hotel Name" value={form.hotel_name} onChange={s('hotel_name')} placeholder="Taj Mahal Palace" half />
        <Field label="Room Type" value={form.room_type} onChange={s('room_type')} placeholder="Deluxe Twin" half />
      </FieldRow>
      <FieldRow>
        <Field label="Check In" value={form.check_in} onChange={s('check_in')} type="date" />
        <Field label="Check Out" value={form.check_out} onChange={s('check_out')} type="date" />
        <Field label="Rooms" value={form.rooms} onChange={s('rooms')} type="number" />
        <Field label="Budget / Night (₹)" value={form.budget_per_night} onChange={s('budget_per_night')} type="number" />
      </FieldRow>
      <Field label="Notes" value={form.notes} onChange={s('notes')} full placeholder="Pool view preferred, early check-in requested..." />
      <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function GroundForm({ form, setForm, onSave, onCancel, saving }) {
  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border-strong)',
      borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <FieldRow>
        <Field label="From" value={form.from_location} onChange={s('from_location')} placeholder="Airport T2" third />
        <Field label="To" value={form.to_location} onChange={s('to_location')} placeholder="Hotel" third />
        <Field label="Date" value={form.travel_date} onChange={s('travel_date')} type="date" third />
      </FieldRow>
      <FieldRow>
        <Field label="Time" value={form.time_start} onChange={s('time_start')} placeholder="09:30" />
        <Field label="Vehicle Type" value={form.vehicle_type} onChange={s('vehicle_type')} placeholder="Innova Crysta" />
        <Field label="Count" value={form.vehicle_count} onChange={s('vehicle_count')} type="number" />
        <Field label="Pax Count" value={form.pax_count} onChange={s('pax_count')} type="number" />
      </FieldRow>
      <Field label="Purpose" value={form.purpose} onChange={s('purpose')} full placeholder="Airport pickup — Day 1 arrivals" />
      <Field label="Notes" value={form.notes} onChange={s('notes')} full placeholder="Driver: Rajesh +91..." />
      <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
    </div>
  )
}

function FormActions({ onSave, onCancel, saving }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
      <button onClick={onCancel} style={{
        padding: '7px 14px', border: '0.5px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)', background: 'transparent',
        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
        fontFamily: 'var(--font-body)'
      }}>Cancel</button>
      <button onClick={onSave} disabled={saving} style={{
        padding: '7px 14px', border: 'none', borderRadius: 'var(--radius-sm)',
        background: 'var(--brand-red, #bc1723)', color: '#fff', cursor: 'pointer',
        fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
        opacity: saving ? 0.7 : 1
      }}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  )
}

// ─── Travel row cards ─────────────────────────────────────────────────────────

function FlightCard({ row, onDelete, isAdmin }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', background: 'var(--bg)',
      borderLeft: '3px solid #3b82f6',
      borderRadius: 'var(--radius-sm)',
      border: '0.5px solid var(--border)',
      borderLeftWidth: 3, borderLeftColor: '#3b82f6'
    }}>
      <Plane size={15} style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            {row.from_location || '—'} <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {row.to_location || '—'}
          </span>
          {row.flight_no && <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{row.flight_no}</span>}
          {row.source === 'agent_confirmed' && (
            <span style={{ fontSize: 11, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>Confirmed</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {row.travel_date && <span>{fmt(row.travel_date)}</span>}
          {row.time_start && <span>{row.time_start}</span>}
          {row.airline && <span>{row.airline}</span>}
          {row.pnr && <span>PNR: {row.pnr}</span>}
          {row.seat_class && <span>{SEAT_CLASS_LABELS[row.seat_class]}</span>}
          {row.pax_count && <span>{row.pax_count} pax</span>}
        </div>
        {row.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.notes}</p>}
      </div>
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)', padding: 4, flexShrink: 0
      }}><Trash2 size={14} /></button>
    </div>
  )
}

function StayCard({ row, onDelete, isAdmin }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', background: 'var(--bg)',
      border: '0.5px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#6b7280',
      borderRadius: 'var(--radius-sm)'
    }}>
      <Building2 size={15} style={{ color: '#6b7280', marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{row.hotel_name || '—'}</span>
          {row.room_type && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.room_type}</span>}
          {row.source === 'agent_confirmed' && (
            <span style={{ fontSize: 11, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>Confirmed</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {row.check_in && <span>In: {fmt(row.check_in)}</span>}
          {row.check_out && <span>Out: {fmt(row.check_out)}</span>}
          {row.rooms && <span>{row.rooms} room{row.rooms > 1 ? 's' : ''}</span>}
          {row.budget_per_night && isAdmin && <span>₹{Number(row.budget_per_night).toLocaleString('en-IN')}/night</span>}
        </div>
        {row.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.notes}</p>}
      </div>
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)', padding: 4, flexShrink: 0
      }}><Trash2 size={14} /></button>
    </div>
  )
}

function GroundCard({ row, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', background: 'var(--bg)',
      border: '0.5px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#d97706',
      borderRadius: 'var(--radius-sm)'
    }}>
      <Car size={15} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            {row.from_location || '—'} <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {row.to_location || '—'}
          </span>
          {row.vehicle_type && <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{row.vehicle_type}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {row.travel_date && <span>{fmt(row.travel_date)}</span>}
          {row.time_start && <span>{row.time_start}</span>}
          {row.vehicle_count && <span>{row.vehicle_count} vehicle{row.vehicle_count > 1 ? 's' : ''}</span>}
          {row.pax_count && <span>{row.pax_count} pax</span>}
          {row.purpose && <span>{row.purpose}</span>}
        </div>
        {row.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.notes}</p>}
      </div>
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)', padding: 4, flexShrink: 0
      }}><Trash2 size={14} /></button>
    </div>
  )
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function TravelSection({ title, icon: Icon, accent, count, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'var(--bg-secondary)',
          border: 'none', cursor: 'pointer', textAlign: 'left'
        }}
      >
        <Icon size={15} style={{ color: accent, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          {title}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 11, background: accent + '20', color: accent,
            padding: '2px 7px', borderRadius: 10, fontWeight: 600
          }}>{count}</span>
        )}
        {open ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
      </button>
      {open && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── AI Parse Modal ──────────────────────────────────────────────────────────

function AIPasteModal({ event, cityBlock, onClose, onImported }) {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  async function handleParse() {
    if (!text.trim()) return
    setParsing(true)
    setError('')
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a travel data parser for an event management system.
Parse the following text from a travel agent or WhatsApp message and extract structured travel rows.
Return ONLY a valid JSON array. No markdown, no explanation.
Each object must have these fields (use null if missing):
entry_type (flight|stay|ground), from_location, to_location, travel_date (YYYY-MM-DD or null),
time_start, airline, flight_no, pnr, seat_class (economy|premium_economy|business|first|null),
hotel_name, check_in (YYYY-MM-DD or null), check_out (YYYY-MM-DD or null),
rooms, room_type, vehicle_type, vehicle_count, purpose, pax_count, notes.

Agent text:
"""
${text}
"""`
          }]
        })
      })
      const data = await resp.json()
      const raw = data.content?.[0]?.text || '[]'
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setPreview(parsed)
    } catch (e) {
      setError('Could not parse — check the text and try again.')
    }
    setParsing(false)
  }

  async function handleImport() {
    if (!preview?.length) return
    const rows = preview.map((r, i) => ({
      ...r,
      event_id: event.id,
      city_block: cityBlock,
      sort_order: i,
      source: 'agent_confirmed'
    }))
    const { error: err } = await supabase.from('travel_plan').insert(rows)
    if (err) { setError(err.message); return }
    onImported()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--radius)',
        border: '0.5px solid var(--border-strong)',
        width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16,
        padding: 24, maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: 'var(--brand-red, #bc1723)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Paste Agent Reply
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
          Paste any email, WhatsApp, or message from your agent. AI will extract flight, hotel, and transport details automatically.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Hi Vikram, for Delhi team: IndiGo 6E 2142 DEL→BOM on 15 May, dep 06:30, PNR ABCXYZ, 8 pax economy. Hotel: Taj Land's End, check-in 15 May, check-out 17 May, 4 deluxe twins..."
          rows={7}
          style={{
            width: '100%', padding: '10px 12px', border: '0.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)',
            color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box'
          }}
        />
        {error && <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{error}</p>}
        {!preview && (
          <button onClick={handleParse} disabled={parsing || !text.trim()} style={{
            padding: '9px 18px', background: 'var(--brand-red, #bc1723)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            opacity: parsing ? 0.7 : 1, alignSelf: 'flex-start'
          }}>{parsing ? 'Parsing…' : 'Parse with AI'}</button>
        )}
        {preview && (
          <>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {preview.length} row{preview.length !== 1 ? 's' : ''} found — review before importing
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {preview.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '8px 10px', borderRadius: 4,
                    background: 'var(--bg-secondary)', color: 'var(--text)'
                  }}>
                    <strong>{r.entry_type?.toUpperCase()}</strong>{' '}
                    {r.entry_type === 'flight' && `${r.from_location} → ${r.to_location} · ${r.flight_no || ''} · ${r.pnr || ''}`}
                    {r.entry_type === 'stay' && `${r.hotel_name} · ${r.check_in || ''} – ${r.check_out || ''}`}
                    {r.entry_type === 'ground' && `${r.from_location} → ${r.to_location} · ${r.vehicle_type || ''}`}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPreview(null)} style={{
                padding: '8px 14px', border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13
              }}>Re-parse</button>
              <button onClick={handleImport} style={{
                padding: '8px 18px', background: 'var(--brand-red, #bc1723)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500
              }}>Import {preview.length} Row{preview.length !== 1 ? 's' : ''}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Event Travel Panel ───────────────────────────────────────────────────────

function EventTravel({ event, userRole }) {
  const isAdmin = userRole === 'admin'
  const cities = event.cities || []
  const [activeCity, setActiveCity] = useState(cities[0] || '')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingType, setAddingType] = useState(null) // 'flight'|'stay'|'ground'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('travel_plan')
      .select('*')
      .eq('event_id', event.id)
      .is('archived_at', null)
      .order('city_block').order('sort_order')
    setRows(data || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { load() }, [load])

  function handleExportTravelPlan() {
    exportTravelPlan(event, rows, null)
  }

  const cityRows = rows.filter(r => r.city_block === activeCity)
  const flights = cityRows.filter(r => r.entry_type === 'flight')
  const stays = cityRows.filter(r => r.entry_type === 'stay')
  const ground = cityRows.filter(r => r.entry_type === 'ground')

  function startAdd(type) {
    const blank = type === 'flight' ? FLIGHT_BLANK : type === 'stay' ? STAY_BLANK : GROUND_BLANK
    setForm({ ...blank })
    setAddingType(type)
  }

  async function saveRow() {
    setSaving(true)
    const payload = {
      ...form,
      event_id: event.id,
      city_block: activeCity,
      sort_order: cityRows.filter(r => r.entry_type === addingType).length
    }
    const { error } = await supabase.from('travel_plan').insert(payload)
    if (!error) { setAddingType(null); load() }
    setSaving(false)
  }

  async function deleteRow(id) {
    if (!window.confirm('Delete this entry?')) return
    await supabase.from('travel_plan').update({ archived_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  function downloadAgentTemplate() {
    generateAgentTemplate(event)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* City tabs + action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cities.map(c => (
            <button key={c} onClick={() => setActiveCity(c)} style={{
              padding: '6px 14px', border: '0.5px solid var(--border-strong)',
              borderRadius: 20, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
              background: activeCity === c ? 'var(--brand-red, #bc1723)' : 'var(--bg)',
              color: activeCity === c ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeCity === c ? 600 : 400
            }}>{c}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadAgentTemplate} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-body)'
          }}>
            <Download size={13} /> Agent Template
          </button>
          <button onClick={() => setShowAI(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-body)'
          }}>
            <Sparkles size={13} /> Paste Agent Reply
          </button>
          {isAdmin && (
            <button onClick={handleExportTravelPlan} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font-body)'
            }}>
              <Download size={13} /> Export Travel Plan
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : (
        <>
          {/* Flights */}
          <TravelSection title="Flights" icon={Plane} accent="#3b82f6" count={flights.length}>
            {flights.map(r => <FlightCard key={r.id} row={r} onDelete={() => deleteRow(r.id)} isAdmin={isAdmin} />)}
            {addingType === 'flight'
              ? <FlightForm form={form} setForm={setForm} onSave={saveRow} onCancel={() => setAddingType(null)} saving={saving} />
              : (
                <button onClick={() => startAdd('flight')} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
                }}>
                  <Plus size={14} /> Add Flight
                </button>
              )
            }
          </TravelSection>

          {/* Stay */}
          <TravelSection title="Stay" icon={Building2} accent="#6b7280" count={stays.length}>
            {stays.map(r => <StayCard key={r.id} row={r} onDelete={() => deleteRow(r.id)} isAdmin={isAdmin} />)}
            {addingType === 'stay'
              ? <StayForm form={form} setForm={setForm} onSave={saveRow} onCancel={() => setAddingType(null)} saving={saving} />
              : (
                <button onClick={() => startAdd('stay')} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
                }}>
                  <Plus size={14} /> Add Hotel Stay
                </button>
              )
            }
          </TravelSection>

          {/* Ground */}
          <TravelSection title="Ground Transport" icon={Car} accent="#d97706" count={ground.length}>
            {ground.map(r => <GroundCard key={r.id} row={r} onDelete={() => deleteRow(r.id)} />)}
            {addingType === 'ground'
              ? <GroundForm form={form} setForm={setForm} onSave={saveRow} onCancel={() => setAddingType(null)} saving={saving} />
              : (
                <button onClick={() => startAdd('ground')} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
                }}>
                  <Plus size={14} /> Add Ground Transport
                </button>
              )
            }
          </TravelSection>
        </>
      )}

      {showAI && (
        <AIPasteModal
          event={event}
          cityBlock={activeCity}
          onClose={() => setShowAI(false)}
          onImported={load}
        />
      )}
    </div>
  )
}

// ─── MICE: Header form ────────────────────────────────────────────────────────

function ItineraryHeader({ itinerary, onSave, saving }) {
  const [form, setForm] = useState(itinerary || {
    title: '', purpose: 'incentive', origin_city: '', destinations: [],
    start_date: '', end_date: '', pax_confirmed: 0, pax_tentative: 0,
    inclusions: [], exclusions: [], notes: ''
  })
  const [destInput, setDestInput] = useState('')
  const [incInput, setIncInput] = useState('')
  const [excInput, setExcInput] = useState('')

  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const addTag = (k, input, setInput) => {
    if (!input.trim()) return
    setForm(f => ({ ...f, [k]: [...(f[k] || []), input.trim()] }))
    setInput('')
  }
  const removeTag = (k, i) => setForm(f => ({ ...f, [k]: f[k].filter((_, idx) => idx !== i) }))

  function TagInput({ label, items, input, setInput, field }) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {(items || []).map((item, i) => (
            <span key={i} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)', borderRadius: 12, fontSize: 12
            }}>
              {item}
              <button onClick={() => removeTag(field, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={10} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(field, input, setInput)}
            placeholder="Type and press Enter"
            style={{
              flex: 1, padding: '6px 10px', border: '0.5px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: 13, outline: 'none'
            }}
          />
          <button onClick={() => addTag(field, input, setInput)} style={{
            padding: '6px 12px', background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)'
          }}>Add</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FieldRow>
        <Field label="Trip Title" value={form.title} onChange={s('title')} full placeholder="Goa Incentive Trip 2026" />
      </FieldRow>
      <FieldRow>
        <Field label="Purpose" value={form.purpose} onChange={s('purpose')} options={PURPOSE_LABELS} half />
        <Field label="Origin City" value={form.origin_city} onChange={s('origin_city')} placeholder="Delhi" half />
      </FieldRow>
      <FieldRow>
        <Field label="Start Date" value={form.start_date} onChange={s('start_date')} type="date" />
        <Field label="End Date" value={form.end_date} onChange={s('end_date')} type="date" />
        <Field label="Pax Confirmed" value={form.pax_confirmed} onChange={s('pax_confirmed')} type="number" />
        <Field label="Pax Tentative" value={form.pax_tentative} onChange={s('pax_tentative')} type="number" />
      </FieldRow>
      <TagInput label="Destinations" items={form.destinations} input={destInput} setInput={setDestInput} field="destinations" />
      <TagInput label="Inclusions" items={form.inclusions} input={incInput} setInput={setIncInput} field="inclusions" />
      <TagInput label="Exclusions" items={form.exclusions} input={excInput} setInput={setExcInput} field="exclusions" />
      <Field label="Internal Notes" value={form.notes} onChange={s('notes')} full />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => onSave(form)} disabled={saving} style={{
          padding: '9px 20px', background: 'var(--brand-red, #bc1723)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1
        }}>{saving ? 'Saving…' : 'Save Header'}</button>
      </div>
    </div>
  )
}

// ─── MICE: Day Program ────────────────────────────────────────────────────────

function DayProgram({ itineraryId, userRole }) {
  const isAdmin = userRole === 'admin'
  const [days, setDays] = useState([])
  const [sections, setSections] = useState({}) // dayId → []
  const [items, setItems] = useState({})        // sectionId → []
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState({})
  const [addingSection, setAddingSection] = useState(null)
  const [addingItem, setAddingItem] = useState(null)
  const [sectionForm, setSectionForm] = useState({})
  const [itemForm, setItemForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: daysData } = await supabase
      .from('itinerary_days').select('*')
      .eq('itinerary_id', itineraryId).order('day_number')

    const { data: sectData } = await supabase
      .from('itinerary_sections').select('*')
      .in('day_id', (daysData || []).map(d => d.id)).order('section_number')

    const { data: itemData } = await supabase
      .from('itinerary_items').select('*')
      .in('section_id', (sectData || []).map(s => s.id)).order('sort_order')

    setDays(daysData || [])
    const sMap = {}
    for (const d of daysData || []) sMap[d.id] = sectData?.filter(s => s.day_id === d.id) || []
    setSections(sMap)
    const iMap = {}
    for (const s of sectData || []) iMap[s.id] = itemData?.filter(i => i.section_id === s.id) || []
    setItems(iMap)
    setLoading(false)
  }, [itineraryId])

  useEffect(() => { load() }, [load])

  async function addDay() {
    const dayNum = days.length + 1
    const { error } = await supabase.from('itinerary_days').insert({
      itinerary_id: itineraryId,
      day_number: dayNum,
      title: `Day ${dayNum}`
    })
    if (!error) load()
  }

  async function saveSection(dayId) {
    setSaving(true)
    const sectCount = (sections[dayId] || []).length
    const { error } = await supabase.from('itinerary_sections').insert({
      day_id: dayId,
      section_number: sectCount + 1,
      ...sectionForm
    })
    if (!error) { setAddingSection(null); setSectionForm({}); load() }
    setSaving(false)
  }

  async function saveItem(sectionId) {
    setSaving(true)
    const itemCount = (items[sectionId] || []).length
    const { error } = await supabase.from('itinerary_items').insert({
      section_id: sectionId,
      sort_order: itemCount,
      ...itemForm
    })
    if (!error) { setAddingItem(null); setItemForm({}); load() }
    setSaving(false)
  }

  async function deleteDay(id) {
    if (!window.confirm('Delete this day and all its items?')) return
    await supabase.from('itinerary_days').delete().eq('id', id)
    load()
  }

  const toggleDay = (id) => setExpandedDays(e => ({ ...e, [id]: !e[id] }))

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 24, textAlign: 'center' }}>Loading program…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {days.map((day, di) => (
        <div key={day.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', background: 'var(--bg-secondary)',
            cursor: 'pointer'
          }} onClick={() => toggleDay(day.id)}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--brand-red, #bc1723)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0
            }}>{day.day_number}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{day.title || `Day ${day.day_number}`}</span>
            {day.date && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmt(day.date)}</span>}
            <button onClick={(e) => { e.stopPropagation(); deleteDay(day.id) }} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)'
            }}><Trash2 size={13} /></button>
            {expandedDays[day.id] ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </div>

          {expandedDays[day.id] && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(sections[day.id] || []).map((sect, si) => (
                <div key={sect.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {/* Section header */}
                  <div style={{
                    padding: '9px 14px', background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--border)', padding: '2px 6px', borderRadius: 4 }}>
                      §{sect.section_number}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sect.title || 'Untitled Section'}</span>
                    {sect.venue && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sect.venue}</span>}
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 10,
                      background: sect.responsibility === 'internal' ? '#dbeafe' : sect.responsibility === 'local' ? '#fef3c7' : '#f3f4f6',
                      color: sect.responsibility === 'internal' ? '#1d4ed8' : sect.responsibility === 'local' ? '#92400e' : '#374151'
                    }}>{RESPONSIBILITY_LABELS[sect.responsibility] || 'Internal'}</span>
                  </div>

                  {/* Items */}
                  <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(items[sect.id] || []).map((item, ii) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '8px 0', borderBottom: '0.5px solid var(--border)'
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 42, fontWeight: 500 }}>
                          {item.time_start || '--:--'}{item.time_end ? `\u2013${item.time_end}` : ''}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item.activity}</p>
                          {item.venue && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{item.venue}</p>}
                          {item.notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{item.notes}</p>}
                        </div>
                        {(item.cost_per_pax || item.cost_lump) && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                            {item.cost_per_pax ? `₹${Number(item.cost_per_pax).toLocaleString('en-IN')}/pax` : `₹${Number(item.cost_lump).toLocaleString('en-IN')}`}
                          </span>
                        )}
                      </div>
                    ))}

                    {addingItem === sect.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                        <FieldRow>
                          <Field label="Start Time" value={itemForm.time_start || ''} onChange={v => setItemForm(f => ({ ...f, time_start: v }))} placeholder="09:00" />
                          <Field label="End Time" value={itemForm.time_end || ''} onChange={v => setItemForm(f => ({ ...f, time_end: v }))} placeholder="10:30" />
                          <Field label="Activity" value={itemForm.activity || ''} onChange={v => setItemForm(f => ({ ...f, activity: v }))} placeholder="Welcome briefing" half />
                        </FieldRow>
                        <FieldRow>
                          <Field label="Venue" value={itemForm.venue || ''} onChange={v => setItemForm(f => ({ ...f, venue: v }))} half />
                          <Field label="Cost / Pax (₹)" value={itemForm.cost_per_pax || ''} onChange={v => setItemForm(f => ({ ...f, cost_per_pax: v }))} type="number" />
                          {isAdmin && <Field label="Internal Cost (₹)" value={itemForm.internal_cost || ''} onChange={v => setItemForm(f => ({ ...f, internal_cost: v }))} type="number" />}
                        </FieldRow>
                        <FormActions onSave={() => saveItem(sect.id)} onCancel={() => { setAddingItem(null); setItemForm({}) }} saving={saving} />
                      </div>
                    ) : (
                      <button onClick={() => { setAddingItem(sect.id); setItemForm({}) }} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
                      }}>
                        <Plus size={12} /> Add Item
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {addingSection === day.id ? (
                <div style={{
                  border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
                  padding: 14, display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <FieldRow>
                    <Field label="Section Title" value={sectionForm.title || ''} onChange={v => setSectionForm(f => ({ ...f, title: v }))} placeholder="Morning Activities" half />
                    <Field label="Venue" value={sectionForm.venue || ''} onChange={v => setSectionForm(f => ({ ...f, venue: v }))} half />
                  </FieldRow>
                  <Field label="Responsibility" value={sectionForm.responsibility || 'internal'} onChange={v => setSectionForm(f => ({ ...f, responsibility: v }))} options={RESPONSIBILITY_LABELS} half />
                  <FormActions onSave={() => saveSection(day.id)} onCancel={() => { setAddingSection(null); setSectionForm({}) }} saving={saving} />
                </div>
              ) : (
                <button onClick={() => { setAddingSection(day.id); setSectionForm({}) }} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                  background: 'var(--bg-secondary)', border: '0.5px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
                }}>
                  <Plus size={12} /> Add Section
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <button onClick={addDay} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        background: 'var(--bg)', border: '0.5px dashed var(--border-strong)',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
      }}>
        <Plus size={14} /> Add Day
      </button>
    </div>
  )
}

// ─── MICE: Rooming List ───────────────────────────────────────────────────────

function RoomingList({ itineraryId, userRole }) {
  const isAdmin = userRole === 'admin'
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    const { data } = await supabase
      .from('rooming_list').select('*')
      .eq('itinerary_id', itineraryId)
      .is('archived_at', null)
      .order('created_at')
    setRows(data || [])
  }

  useEffect(() => { load() }, [itineraryId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('rooming_list').insert({
      itinerary_id: itineraryId,
      ...form
    })
    if (!error) { setAdding(false); setForm({}); load() }
    setSaving(false)
  }

  async function deleteRow(id) {
    if (!window.confirm('Remove this guest?')) return
    await supabase.from('rooming_list').update({ archived_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const confirmed = rows.filter(r => r.status === 'confirmed').length
  const tentative = rows.filter(r => r.status === 'tentative').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary bar */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            padding: '8px 14px', background: '#dcfce7', borderRadius: 'var(--radius-sm)',
            fontSize: 13, color: '#15803d', fontWeight: 600
          }}>{confirmed} Confirmed</div>
          <div style={{
            padding: '8px 14px', background: '#fef3c7', borderRadius: 'var(--radius-sm)',
            fontSize: 13, color: '#92400e', fontWeight: 600
          }}>{tentative} Tentative</div>
          <div style={{
            padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
            fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600
          }}>{rows.length} Total</div>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                {['Name', 'Room Type', 'Check-in', 'Check-out', 'Meal', 'Status', 'Mobile', isAdmin && 'ID', ''].filter(Boolean).map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left', fontSize: 11,
                    color: 'var(--text-tertiary)', fontWeight: 600, fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.room_type || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.check_in ? fmt(r.check_in) : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.check_out ? fmt(r.check_out) : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.meal_plan || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600,
                      background: r.status === 'confirmed' ? '#dcfce7' : r.status === 'tentative' ? '#fef3c7' : '#fee2e2',
                      color: r.status === 'confirmed' ? '#15803d' : r.status === 'tentative' ? '#92400e' : '#dc2626'
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.mobile || '—'}</td>
                  {isAdmin && <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {r.id_type ? `${r.id_type}: ${r.id_number || '—'}` : '—'}
                  </td>}
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => deleteRow(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} message="No guests added yet" sub="Add pax one by one or import from a list" />
      )}

      {/* Add form */}
      {adding ? (
        <div style={{
          border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <FieldRow>
            <Field label="Guest Name *" value={form.name || ''} onChange={s('name')} placeholder="Abhishek Sharma" half />
            <Field label="Mobile" value={form.mobile || ''} onChange={s('mobile')} placeholder="+91 98765 43210" half />
          </FieldRow>
          <FieldRow>
            <Field label="Room Type" value={form.room_type || ''} onChange={s('room_type')} placeholder="Deluxe Twin" />
            <Field label="Check In" value={form.check_in || ''} onChange={s('check_in')} type="date" />
            <Field label="Check Out" value={form.check_out || ''} onChange={s('check_out')} type="date" />
            <Field label="Meal Plan" value={form.meal_plan || ''} onChange={s('meal_plan')} options={MEAL_PLAN_LABELS} />
          </FieldRow>
          <FieldRow>
            <Field label="Status" value={form.status || 'tentative'} onChange={s('status')} options={{ tentative: 'Tentative', confirmed: 'Confirmed' }} half />
            <Field label="Special Requests" value={form.special_requests || ''} onChange={s('special_requests')} half placeholder="High floor, no smoking" />
          </FieldRow>
          {isAdmin && (
            <FieldRow>
              <Field label="ID Type" value={form.id_type || ''} onChange={s('id_type')} options={{ passport: 'Passport', aadhaar: 'Aadhaar', pan: 'PAN', driving_license: 'Driving License', other: 'Other' }} half />
              <Field label="ID Number" value={form.id_number || ''} onChange={s('id_number')} half />
            </FieldRow>
          )}
          <FormActions onSave={save} onCancel={() => { setAdding(false); setForm({}) }} saving={saving} />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'var(--bg)', border: '0.5px dashed var(--border-strong)',
          borderRadius: 'var(--radius)', cursor: 'pointer',
          fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)'
        }}>
          <Plus size={14} /> Add Guest
        </button>
      )}
    </div>
  )
}

// ─── MICE Itinerary Panel ─────────────────────────────────────────────────────

function MICEItinerary({ event, userRole }) {
  const isAdmin = userRole === 'admin'
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('header') // header | program | rooming
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('itinerary').select('*')
      .eq('event_id', event.id).maybeSingle()
    setItinerary(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [event.id])

  async function saveHeader(form) {
    setSaving(true)
    if (itinerary) {
      const { error } = await supabase.from('itinerary').update(form).eq('id', itinerary.id)
      if (!error) load()
    } else {
      const { error } = await supabase.from('itinerary').insert({ ...form, event_id: event.id })
      if (!error) load()
    }
    setSaving(false)
  }

  async function handleExportMICE() {
    if (!itinerary) return
    const { data: days } = await supabase
      .from('itinerary_days').select('*')
      .eq('itinerary_id', itinerary.id).order('day_number')
    const dayIds = (days || []).map(d => d.id)
    const { data: sections } = dayIds.length
      ? await supabase.from('itinerary_sections').select('*').in('day_id', dayIds).order('section_number')
      : { data: [] }
    const sectionIds = (sections || []).map(s => s.id)
    const { data: items } = sectionIds.length
      ? await supabase.from('itinerary_items').select('*').in('section_id', sectionIds).order('time_start')
      : { data: [] }
    const { data: rooming } = await supabase
      .from('rooming_list').select('*').eq('itinerary_id', itinerary.id)
    exportMICEItinerary(event, itinerary, days || [], sections || [], items || [], rooming || [], null, userRole)
  }

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 24, textAlign: 'center' }}>Loading…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-tabs */}
    <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', gap: 0, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
        {[
          { id: 'header', label: 'Trip Header', icon: FileText },
          { id: 'program', label: 'Day Program', icon: CalendarDays, locked: !itinerary },
          { id: 'rooming', label: 'Rooming List', icon: Users, locked: !itinerary }
        ].map(tab => (
          <button key={tab.id} onClick={() => !tab.locked && setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', border: 'none', background: 'none', cursor: tab.locked ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: 'var(--font-body)',
              color: tab.locked ? 'var(--text-tertiary)' : activeTab === tab.id ? 'var(--brand-red, #bc1723)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-red, #bc1723)' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: -1
            }}>
            <tab.icon size={13} />
            {tab.label}
            {tab.locked && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>—</span>}
          </button>
        ))}
        </div>
        {isAdmin && itinerary && (
          <button onClick={handleExportMICE} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-body)', marginBottom: 4
          }}>
            <Download size={13} /> Export MICE Itinerary
          </button>
        )}
      </div>

      {!itinerary && activeTab === 'header' && (
        <div style={{
          padding: '12px 16px', background: '#fef3c7',
          border: '0.5px solid #fcd34d', borderRadius: 'var(--radius-sm)',
          fontSize: 13, color: '#92400e'
        }}>
          Fill in the trip header to unlock Day Program and Rooming List.
        </div>
      )}

      {activeTab === 'header' && (
        <ItineraryHeader itinerary={itinerary} onSave={saveHeader} saving={saving} />
      )}
      {activeTab === 'program' && itinerary && (
        <DayProgram itineraryId={itinerary.id} userRole={userRole} />
      )}
      {activeTab === 'rooming' && itinerary && (
        <RoomingList itineraryId={itinerary.id} userRole={userRole} />
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function TravelItinerary({ event, session, userRole }) {
  const [activeTab, setActiveTab] = useState('travel') // 'travel' | 'mice'
  const isAdmin = userRole === 'admin'

  const tabStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 20px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)',
    fontWeight: activeTab === id ? 600 : 400,
    color: activeTab === id ? 'var(--brand-red, #bc1723)' : 'var(--text-secondary)',
    borderBottom: activeTab === id ? '2px solid var(--brand-red, #bc1723)' : '2px solid transparent',
    marginBottom: -1
  })

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '0.5px solid var(--border)',
        marginBottom: 24
      }}>
        <button style={tabStyle('travel')} onClick={() => setActiveTab('travel')}>
          <Plane size={15} /> Event Travel
        </button>
        <button style={tabStyle('mice')} onClick={() => setActiveTab('mice')}>
          <Star size={15} /> MICE Itinerary
        </button>
      </div>

      {activeTab === 'travel' && (
        <EventTravel event={event} userRole={userRole} />
      )}
      {activeTab === 'mice' && (
        <MICEItinerary event={event} userRole={userRole} />
      )}
    </div>
  )
}
