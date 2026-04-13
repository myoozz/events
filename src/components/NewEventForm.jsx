import { useState, useEffect } from 'react'
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

// Bug fix: added useWindowSize to drive responsive layouts
function useWindowSize() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

export default function NewEventForm({ onClose, onCreated, onUpdated, session, event, userRole }) {
  const isEdit = !!event
  const w = useWindowSize()
  const isMobile = w < 600

  const [form, setForm] = useState({
    groupName:      event?.clients?.group_name    || '',
    brandName:      event?.clients?.brand_name    || '',
    contactPerson:  event?.clients?.contact_person || '',
    contactInfo:    event?.clients?.contact_info   || '',
    eventName:      event?.event_name              || '',
    eventType:      event?.event_type              || '',
    eventSubtype:   event?.event_subtype           || '',
    eventDate:      event?.event_date              || '',
    proposalDueDate:event?.proposal_due_date       || '',
    agencyFee:      event?.agency_fee_percent      || 10,
    gst:            event?.gst_percent             || 18,
  })
  const [cities, setCities]       = useState(event?.cities     || [])
  const [cityInput, setCityInput] = useState('')
  const [cityDates, setCityDates] = useState(event?.city_dates || {})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function addCity() {
    const c = cityInput.trim()
    if (!c || cities.includes(c)) return
    setCities(prev => [...prev, c])
    setCityInput('')
  }
  function removeCity(c) { setCities(prev => prev.filter(x => x !== c)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        const { data, error: updateErr } = await supabase
          .from('events')
          .update({
            event_name:          form.eventName,
            event_type:          form.eventType,
            event_subtype:       form.eventSubtype,
            cities:              cities,
            city_dates:          cityDates,
            event_date:          form.eventDate          || null,
            proposal_due_date:   form.proposalDueDate    || null,
            agency_fee_percent:  form.agencyFee,
            gst_percent:         form.gst,
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
          .from('clients').select('id').eq('group_name', form.groupName).single()
        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({ group_name: form.groupName, brand_name: form.brandName, contact_person: form.contactPerson, contact_info: form.contactInfo })
            .select().single()
          if (clientErr) throw clientErr
          clientId = newClient.id
        }
        const { data: newEvent, error: eventErr } = await supabase
          .from('events')
          .insert({
            client_id:           clientId,
            event_name:          form.eventName,
            event_type:          form.eventType,
            event_subtype:       form.eventSubtype,
            cities:              cities,
            city_dates:          cityDates,
            event_date:          form.eventDate          || null,
            proposal_due_date:   form.proposalDueDate    || null,
            agency_fee_percent:  form.agencyFee,
            gst_percent:         form.gst,
            status:              'pitch',
            created_by:          session.user.email,
            created_by_role:     userRole || 'admin',
            review_status:       'approved',
          })
          .select('*, clients(group_name, brand_name)')
          .single()
        if (eventErr) throw eventErr
        onCreated(newEvent)
        onClose()
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const subs = form.eventType ? eventTypes[form.eventType]?.subs || [] : []

  // ── Styles ────────────────────────────────────────────────
  const st = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(26,25,21,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 100, padding: isMobile ? '0' : '40px 24px',
      overflowY: 'auto',
    },
    modal: {
      background: 'var(--bg)',
      borderRadius: isMobile ? '16px 16px 0 0' : 'var(--radius)',
      border: '0.5px solid var(--border)',
      width: '100%', maxWidth: '600px',
      padding: isMobile ? '24px 16px' : '32px',
      position: 'relative',
      // On mobile, modal slides up from bottom
      marginTop: isMobile ? 'auto' : undefined,
      alignSelf: isMobile ? 'flex-end' : undefined,
    },
    header: {
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: '24px',
    },
    title: {
      fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '26px',
      fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.3px',
    },
    closeBtn: {
      background: 'none', border: 'none', fontSize: '20px',
      color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
    },
    divider: {
      fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.8px', color: 'var(--text-tertiary)',
      marginBottom: '16px', marginTop: '24px',
      paddingBottom: '8px', borderBottom: '0.5px solid var(--border)',
    },
    field: { marginBottom: '16px' },
    label: {
      display: 'block', fontSize: '11px', fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.6px',
      color: 'var(--text-tertiary)', marginBottom: '6px',
    },
    input: {
      width: '100%', padding: '9px 12px', fontSize: '14px',
      fontFamily: 'var(--font-body)', background: 'var(--bg)',
      border: '0.5px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)', color: 'var(--text)',
      outline: 'none', boxSizing: 'border-box',
    },
    select: {
      width: '100%', padding: '9px 12px', fontSize: '14px',
      fontFamily: 'var(--font-body)', background: 'var(--bg)',
      border: '0.5px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)', color: 'var(--text)',
      outline: 'none', boxSizing: 'border-box',
    },
    // Bug fix: was always '1fr 1fr' — now single col on mobile
    row: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '12px',
    },
    cityWrap: { display: 'flex', gap: '8px', marginBottom: '8px' },
    cityTags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
    cityTag: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
      background: 'var(--blue-light)', color: 'var(--blue)',
      border: '0.5px solid var(--border)',
    },
    feeRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    feeVal: { fontSize: '15px', fontWeight: 500, color: 'var(--text)', minWidth: '36px' },
    footer: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: '28px', paddingTop: '20px',
      borderTop: '0.5px solid var(--border)',
      flexWrap: 'wrap', gap: '12px',
    },
    cancelBtn: {
      fontSize: '13px', color: 'var(--text-tertiary)',
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-body)',
    },
    submitBtn: {
      padding: isMobile ? '12px 24px' : '10px 24px',
      fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)',
      background: 'var(--text)', color: 'var(--bg)',
      border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      letterSpacing: '0.2px',
      width: isMobile ? '100%' : 'auto',
    },
    error: {
      fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
      border: '0.5px solid #F09595', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', marginTop: '12px',
    },
  }

  return (
    <div style={st.overlay}>
      <div style={st.modal}>
        <div style={st.header}>
          <h2 style={st.title}>{isEdit ? 'Edit event' : 'New event'}</h2>
          <button style={st.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Client & brand ── */}
          <div style={st.divider}>Client & brand</div>

          <div style={st.row}>
            <div style={st.field}>
              <label style={st.label}>Client / Group *</label>
              <input style={st.input} placeholder="e.g. Aditya Birla Group"
                value={form.groupName} onChange={e => set('groupName', e.target.value)}
                required disabled={isEdit} />
            </div>
            <div style={st.field}>
              <label style={st.label}>Brand / Division</label>
              <input style={st.input} placeholder="e.g. Birla Opus"
                value={form.brandName} onChange={e => set('brandName', e.target.value)}
                disabled={isEdit} />
            </div>
          </div>

          <div style={st.row}>
            <div style={st.field}>
              <label style={st.label}>Contact person</label>
              <input style={st.input} placeholder="Name"
                value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                disabled={isEdit} />
            </div>
            <div style={st.field}>
              <label style={st.label}>Phone / Email</label>
              <input style={st.input} placeholder="Phone or email"
                value={form.contactInfo} onChange={e => set('contactInfo', e.target.value)}
                disabled={isEdit} />
            </div>
          </div>

          {isEdit && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Client details cannot be edited here. Contact admin to update client info.
            </p>
          )}

          {/* ── Event details ── */}
          <div style={st.divider}>Event details</div>

          <div style={st.field}>
            <label style={st.label}>Event name *</label>
            <input style={st.input} placeholder="e.g. Udaan Contractor Meet 2026"
              value={form.eventName} onChange={e => set('eventName', e.target.value)} required />
          </div>

          <div style={st.row}>
            <div style={st.field}>
              <label style={st.label}>Event type *</label>
              <select style={st.select} value={form.eventType}
                onChange={e => { set('eventType', e.target.value); set('eventSubtype', '') }} required>
                <option value="">Select type</option>
                {Object.entries(eventTypes).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div style={st.field}>
              <label style={st.label}>Sub-category</label>
              <select style={st.select} value={form.eventSubtype}
                onChange={e => set('eventSubtype', e.target.value)} disabled={!form.eventType}>
                <option value="">Select sub-category</option>
                {subs.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          </div>

          {/* ── Cities ── */}
          <div style={st.field}>
            <label style={st.label}>Cities</label>
            <div style={st.cityWrap}>
              <input
                style={{ ...st.input, flex: 1 }}
                placeholder="Type city and press Add"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity())}
              />
              <button type="button" onClick={addCity}
                style={{ ...st.submitBtn, padding: '9px 16px', fontSize: '13px', width: 'auto' }}>
                + Add
              </button>
            </div>
            {cities.length > 0 && (
              <div style={st.cityTags}>
                {cities.map(c => (
                  <span key={c} style={st.cityTag}>
                    {c}
                    <span style={{ cursor: 'pointer', fontSize: '10px', opacity: 0.7 }} onClick={() => removeCity(c)}>✕</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── City dates ── */}
          {cities.length > 0 && (
            <div style={st.field}>
              <label style={st.label}>Event dates per city</label>
              {cities.map(city => (
                <div key={city} style={{ marginBottom: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>{city}</div>
                  {/* Bug fix: was '1fr 1fr' always — single col on mobile */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Start date</div>
                      <input style={st.input} type="date"
                        value={cityDates[city]?.start || ''}
                        onChange={e => setCityDates(prev => ({
                          ...prev,
                          [city]: { ...prev[city], start: e.target.value, end: prev[city]?.end || e.target.value }
                        }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        End date <span style={{ fontWeight: 400 }}>(if multi-day)</span>
                      </div>
                      <input style={st.input} type="date"
                        value={cityDates[city]?.end || ''}
                        onChange={e => setCityDates(prev => ({
                          ...prev,
                          [city]: { ...prev[city], end: e.target.value }
                        }))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proposal due date — single field, no grid needed */}
          <div style={st.field}>
            <label style={st.label}>Proposal due date</label>
            <input style={{ ...st.input, maxWidth: isMobile ? '100%' : '280px' }}
              type="date" value={form.proposalDueDate}
              onChange={e => set('proposalDueDate', e.target.value)} />
          </div>

          {/* ── Commercial ── */}
          <div style={st.divider}>Commercial</div>

          <div style={st.field}>
            <label style={st.label}>Agency fee — {form.agencyFee}%</label>
            <div style={st.feeRow}>
              <input type="range" min="5" max="25" step="1"
                value={form.agencyFee} onChange={e => set('agencyFee', +e.target.value)}
                style={{ flex: 1 }} />
              <span style={st.feeVal}>{form.agencyFee}%</span>
            </div>
          </div>

          <div style={st.field}>
            <label style={st.label}>GST</label>
            <select style={{ ...st.select, maxWidth: isMobile ? '100%' : '120px' }}
              value={form.gst} onChange={e => set('gst', +e.target.value)}>
              <option value={18}>18%</option>
              <option value={12}>12%</option>
              <option value={5}>5%</option>
              <option value={0}>Exempt</option>
            </select>
          </div>

          {error && <div style={st.error}>{error}</div>}

          <div style={st.footer}>
            <button type="button" style={st.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={st.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
