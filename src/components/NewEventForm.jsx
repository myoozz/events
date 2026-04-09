import { useState } from 'react'
import { supabase } from '../supabase'

const eventTypes = {
  corporate: {
    label: 'Corporate Events',
    subs: ['Conference', 'Seminar & Workshop', 'Internal Conference', 'Award Ceremony', 'Annual Day & Celebration', 'Dealer & Distributor Meet', 'Sales Conference', 'Product Launch', 'Press Conference & Media Event', 'Gala Dinner & Corporate Banquet']
  },
  activation: {
    label: 'Brand Activations',
    subs: ['Society & CHS Activation', 'Mall & Retail Activation', 'Mobile Van & Roadshow', 'On-ground Sampling', 'Rural Activation', 'Brand Experience Zone', 'Pop-up Event', 'Contractor & Channel Partner Meet']
  },
  mice: {
    label: 'MICE',
    subs: ['Incentive Travel — Domestic', 'Incentive Travel — International', 'Corporate Offsite & Retreat', 'Dealer Incentive Program', 'R&R Program', 'Board & Leadership Meet']
  },
  exhibition: {
    label: 'Exhibitions & Trade Shows',
    subs: ['Trade Show — B2B', 'Public Exhibition — B2C', 'Expo & Fair', 'Product Showcase', 'Roadshow']
  },
  govt: {
    label: 'Government & Public Events',
    subs: ['Government Function & Ceremony', 'Inauguration & Flag-off', 'Public Awareness Drive', 'Skill Development Event', 'National / State Day Celebration', 'Large Format Public Concert & Show', 'Religious & Cultural Event']
  }
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,25,21,0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 100,
    padding: '40px 24px',
    overflowY: 'auto',
  },
  modal: {
    background: 'var(--bg)',
    borderRadius: 'var(--radius)',
    border: '0.5px solid var(--border)',
    width: '100%',
    maxWidth: '600px',
    padding: '32px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '26px',
    fontWeight: 500,
    color: 'var(--text)',
    letterSpacing: '-0.3px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  divider: {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-tertiary)',
    marginBottom: '16px',
    marginTop: '24px',
    paddingBottom: '8px',
    borderBottom: '0.5px solid var(--border)',
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-tertiary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    background: 'var(--bg)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    background: 'var(--bg)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  cityWrap: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  cityTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  cityTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    background: 'var(--blue-light)',
    color: 'var(--blue)',
    border: '0.5px solid var(--border)',
  },
  feeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  feeVal: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text)',
    minWidth: '36px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '0.5px solid var(--border)',
  },
  cancelBtn: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  submitBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    background: 'var(--text)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    letterSpacing: '0.2px',
  },
  error: {
    fontSize: '13px',
    color: '#A32D2D',
    background: '#FCEBEB',
    border: '0.5px solid #F09595',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    marginTop: '12px',
  },
}

function getTypeKey(label) {
  return Object.entries(eventTypes).find(([, v]) => v.label === label)?.[0] || ''
}

export default function NewEventForm({ onClose, onCreated, onUpdated, session, event }) {
  const isEdit = !!event

  const [form, setForm] = useState({
    groupName: event?.clients?.group_name || '',
    brandName: event?.clients?.brand_name || '',
    contactPerson: event?.clients?.contact_person || '',
    contactInfo: event?.clients?.contact_info || '',
    eventName: event?.event_name || '',
    eventType: event?.event_type || '',
    eventSubtype: event?.event_subtype || '',
    eventDate: event?.event_date || '',
    proposalDueDate: event?.proposal_due_date || '',
    agencyFee: event?.agency_fee_percent || 10,
    gst: event?.gst_percent || 18,
  })
  const [cities, setCities] = useState(event?.cities || [])
  const [cityInput, setCityInput] = useState('')
  const [cityDates, setCityDates] = useState(event?.city_dates || {})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addCity() {
    const c = cityInput.trim()
    if (!c || cities.includes(c)) return
    setCities(prev => [...prev, c])
    setCityInput('')
  }

  function removeCity(c) {
    setCities(prev => prev.filter(x => x !== c))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isEdit) {
        const { data, error: updateErr } = await supabase
          .from('events')
          .update({
            event_name: form.eventName,
            event_type: form.eventType,
            event_subtype: form.eventSubtype,
            cities: cities,
            event_date: form.eventDate || null,
            proposal_due_date: form.proposalDueDate || null,
            agency_fee_percent: form.agencyFee,
            gst_percent: form.gst,
          })
          .eq('id', event.id)
          .select('*, clients(group_name, brand_name)')
          .single()
        if (updateErr) throw updateErr
        onUpdated(data)
        onClose()
      } else {
        let clientId = null
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('group_name', form.groupName)
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({
              group_name: form.groupName,
              brand_name: form.brandName,
              contact_person: form.contactPerson,
              contact_info: form.contactInfo,
            })
            .select()
            .single()
          if (clientErr) throw clientErr
          clientId = newClient.id
        }

        const { data: newEvent, error: eventErr } = await supabase
          .from('events')
          .insert({
            client_id: clientId,
            event_name: form.eventName,
            event_type: form.eventType,
            event_subtype: form.eventSubtype,
            cities: cities,
            event_date: form.eventDate || null,
            proposal_due_date: form.proposalDueDate || null,
            agency_fee_percent: form.agencyFee,
            gst_percent: form.gst,
            status: 'pitch',
            created_by: session.user.email,
          })
          .select('*, clients(group_name, brand_name)')
          .single()

        if (eventErr) throw eventErr
        onCreated(newEvent)
        onClose()
      }
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  const subs = form.eventType ? eventTypes[form.eventType]?.subs || [] : []

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>{isEdit ? 'Edit event' : 'New event'}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={s.divider}>Client & brand</div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Client / Group *</label>
              <input style={s.input} placeholder="e.g. Aditya Birla Group" value={form.groupName} onChange={e => set('groupName', e.target.value)} required disabled={isEdit} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Brand / Division</label>
              <input style={s.input} placeholder="e.g. Birla Opus" value={form.brandName} onChange={e => set('brandName', e.target.value)} disabled={isEdit} />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Contact person</label>
              <input style={s.input} placeholder="Name" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} disabled={isEdit} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone / Email</label>
              <input style={s.input} placeholder="Phone or email" value={form.contactInfo} onChange={e => set('contactInfo', e.target.value)} disabled={isEdit} />
            </div>
          </div>

          {isEdit && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Client details cannot be edited here. Contact admin to update client info.
            </p>
          )}

          <div style={s.divider}>Event details</div>

          <div style={s.field}>
            <label style={s.label}>Event name *</label>
            <input style={s.input} placeholder="e.g. Udaan Contractor Meet 2026" value={form.eventName} onChange={e => set('eventName', e.target.value)} required />
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Event type *</label>
              <select style={s.select} value={form.eventType} onChange={e => { set('eventType', e.target.value); set('eventSubtype', '') }} required>
                <option value="">Select type</option>
                {Object.entries(eventTypes).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Sub-category</label>
              <select style={s.select} value={form.eventSubtype} onChange={e => set('eventSubtype', e.target.value)} disabled={!form.eventType}>
                <option value="">Select sub-category</option>
                {subs.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Cities</label>
            <div style={s.cityWrap}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Type city and press Add"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity())}
              />
              <button type="button" onClick={addCity} style={{ ...s.submitBtn, padding: '9px 16px', fontSize: '13px' }}>+ Add</button>
            </div>
            {cities.length > 0 && (
              <div style={s.cityTags}>
                {cities.map(c => (
                  <span key={c} style={s.cityTag}>
                    {c}
                    <span style={{ cursor: 'pointer', fontSize: '10px', opacity: 0.7 }} onClick={() => removeCity(c)}>✕</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* City-specific dates */}
          {cities.length > 0 && (
            <div style={s.field}>
              <label style={s.label}>Event dates per city</label>
              {cities.map(city => (
                <div key={city} style={{ marginBottom: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>{city}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Start date</div>
                      <input
                        style={s.input} type="date"
                        value={cityDates[city]?.start || ''}
                        onChange={e => setCityDates(prev => ({
                          ...prev,
                          [city]: {
                            ...prev[city],
                            start: e.target.value,
                            // Auto-fill end date if not already set
                            end: prev[city]?.end || e.target.value,
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>End date <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(if multi-day)</span></div>
                      <input
                        style={s.input} type="date"
                        value={cityDates[city]?.end || ''}
                        onChange={e => setCityDates(prev => ({
                          ...prev,
                          [city]: { ...prev[city], end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Proposal due date</label>
              <input style={s.input} type="date" value={form.proposalDueDate} onChange={e => set('proposalDueDate', e.target.value)} />
            </div>
          </div>



          <div style={s.divider}>Commercial</div>

          <div style={s.field}>
            <label style={s.label}>Agency fee — {form.agencyFee}%</label>
            <div style={s.feeRow}>
              <input
                type="range" min="5" max="25" step="1"
                value={form.agencyFee}
                onChange={e => set('agencyFee', +e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={s.feeVal}>{form.agencyFee}%</span>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>GST</label>
            <select style={{ ...s.select, width: '120px' }} value={form.gst} onChange={e => set('gst', +e.target.value)}>
              <option value={18}>18%</option>
              <option value={12}>12%</option>
              <option value={5}>5%</option>
              <option value={0}>Exempt</option>
            </select>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.footer}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
