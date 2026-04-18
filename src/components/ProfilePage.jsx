import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { logActivity } from '../utils/activityLogger'

const db = (table) => supabase.from(table);

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', event_lead: 'Event Lead', team: 'Team' }
const ROLE_COLORS = {
  admin:      { bg: '#DCFCE7', color: '#166534' },
  manager:    { bg: '#EFF6FF', color: '#1D4ED8' },
  event_lead: { bg: '#FEF3C7', color: '#92400E' },
  team:       { bg: '#F3F4F6', color: '#374151' },
}
const STATUS_META = {
  active:    { label: 'Active',    color: '#059669', bg: '#ECFDF5' },
  pitch:     { label: 'Pitch',     color: '#D97706', bg: '#FFFBEB' },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
  won:       { label: 'Won',       color: '#7C3AED', bg: '#F5F3FF' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
}

const SOCIAL_DEFAULTS = [
  {
    key: 'linkedin', label: 'LinkedIn',
    placeholder: 'linkedin.com/in/yourname',
    benefit: 'Builds your professional presence across the industry.',
  },
  {
    key: 'instagram', label: 'Instagram',
    placeholder: 'instagram.com/yourhandle',
    benefit: 'Show your event work — great for creative recognition.',
  },
]

const NUDGE_FIELDS = [
  { key: 'phone',     label: 'Phone number', emoji: '📞', benefit: 'Get event alerts and last-minute coordination calls directly.' },
  { key: 'base_city', label: 'Your city',    emoji: '📍', benefit: 'Get assigned to events closest to you first.' },
  { key: 'bio',       label: 'A short bio',  emoji: '✏️', benefit: 'Help your team know who you are beyond your role.' },
]

const initials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

/* ─── ProfilePage ─────────────────────────────────────────── */
export default function ProfilePage({ profileUserId, session, userRole, onBack }) {
  const [profile,     setProfile]     = useState(null)
  const [events,      setEvents]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('details')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [openField,   setOpenField]   = useState(null)
  const [fieldVal,    setFieldVal]    = useState('')
  const [socials,     setSocials]     = useState([])
  const [addCustom,   setAddCustom]   = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [editName,    setEditName]    = useState(false)
  const [nameVal,     setNameVal]     = useState('')
  const [photoHover,  setPhotoHover]  = useState(false)

  const isOwn   = session?.user?.id === profileUserId
  const canEdit = isOwn || userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    if (!profileUserId) return
    fetchProfile()
    fetchEvents()
  }, [profileUserId])

  async function fetchProfile() {
    setLoading(true)
    const { data } = await db('users')
      .select('id, full_name, role, email, phone, bio, base_city, base_state, social_links')
      .eq('id', profileUserId).single()
    if (data) {
      setProfile(data)
      setNameVal(data.full_name || '')
      setSocials(Array.isArray(data.social_links) ? data.social_links : [])
    }
    setLoading(false)
  }

  async function fetchEvents() {
    const { data } = await db('events')
      .select('id, name, status, start_date, cities')
      .contains('assigned_to', [profileUserId])
      .order('created_at', { ascending: false })
    setEvents(data || [])
  }

  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 2200) }

  async function saveField(field, value) {
    if (!canEdit) return
    setSaving(true)
    const { error } = await db('users').update({ [field]: value || null }).eq('id', profileUserId)
    if (!error) {
      await logActivity({
        action: 'profile_updated', entity_type: 'user',
        entity_name: profile.full_name,
        details: { field, updated_by: session?.user?.email },
        session,
      })
      await fetchProfile()
      setOpenField(null)
      flashSaved()
    }
    setSaving(false)
  }

  async function saveName() {
    if (!nameVal.trim()) return
    setSaving(true)
    const { error } = await db('users').update({ full_name: nameVal.trim() }).eq('id', profileUserId)
    if (!error) { await fetchProfile(); setEditName(false); flashSaved() }
    setSaving(false)
  }

  async function saveSocials(updated) {
    setSaving(true)
    const { error } = await db('users').update({ social_links: updated }).eq('id', profileUserId)
    if (!error) {
      await fetchProfile()
      setSocials(updated)
      setOpenField(null)
      setAddCustom(false)
      setCustomLabel('')
      setFieldVal('')
      flashSaved()
    }
    setSaving(false)
  }

  function openNudge(key) {
    setFieldVal(profile?.[key] || '')
    setOpenField(key)
  }

  function openSocial(key) {
    const existing = socials.find(s => s.key === key)
    setFieldVal(existing?.url || '')
    setOpenField(key)
  }

  /* ── loading / not found ── */
  if (loading) return <div style={S.centerMsg}>Loading profile…</div>
  if (!profile) return <div style={S.centerMsg}>Profile not found.</div>

  const ini      = initials(profile.full_name)
  const rc       = ROLE_COLORS[profile.role] || ROLE_COLORS.team
  const rlbl     = ROLE_LABELS[profile.role] || profile.role
  const socialMap = socials.reduce((acc, s) => { acc[s.key] = s.url; return acc }, {})
  const customSocials = socials.filter(s => !['linkedin', 'instagram'].includes(s.key))

  return (
    <div style={S.root}>

      {/* back */}
      <button style={S.back} onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      {/* ── hero ── */}
      <div style={S.heroCard}>

        {/* photo placeholder */}
        <div
          style={S.photoWrap}
          onMouseEnter={() => setPhotoHover(true)}
          onMouseLeave={() => setPhotoHover(false)}
          title="Photo upload — coming soon"
        >
          <div style={S.avatarCircle}>{ini}</div>
          {photoHover && (
            <div style={S.cameraOverlay}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1 5.5A1.5 1.5 0 012.5 4h1l1-2h9l1 2h1A1.5 1.5 0 0117 5.5v9A1.5 1.5 0 0115.5 16h-13A1.5 1.5 0 011 14.5v-9z"
                  stroke="rgba(255,255,255,0.9)" strokeWidth="1.3" fill="none"/>
                <circle cx="9" cy="10" r="2.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.3"/>
              </svg>
              <span style={S.comingSoonLabel}>Coming soon</span>
            </div>
          )}
        </div>

        {/* name + meta */}
        <div style={S.heroText}>
          {editName && canEdit ? (
            <div style={S.nameEditRow}>
              <input
                style={S.nameInput}
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
              />
              <button style={S.miniSaveBtn} onClick={saveName} disabled={saving}>{saving ? '…' : '✓'}</button>
              <button style={S.miniCancelBtn} onClick={() => { setEditName(false); setNameVal(profile.full_name) }}>✕</button>
            </div>
          ) : (
            <div style={S.nameRow}>
              <h1 style={S.name}>{profile.full_name}</h1>
              {canEdit && (
                <button style={S.nameEditBtn} onClick={() => setEditName(true)} title="Edit name">
                  <PencilIcon size={13} />
                </button>
              )}
            </div>
          )}

          <div style={S.metaRow}>
            <span style={{ ...S.roleBadge, background: rc.bg, color: rc.color }}>{rlbl}</span>
            {profile.base_city && (
              <span style={S.locationChip}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5.5 1C3.84 1 2.5 2.34 2.5 4c0 2.25 3 6 3 6s3-3.75 3-6c0-1.66-1.34-3-3-3z"
                    stroke="#9CA3AF" strokeWidth="1.1" fill="none"/>
                  <circle cx="5.5" cy="4" r="1" fill="#9CA3AF"/>
                </svg>
                {[profile.base_city, profile.base_state].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          <p style={S.email}>{profile.email}</p>
        </div>

        {saved && <span style={S.savedBadge}>Saved ✓</span>}
      </div>

      {/* ── tabs ── */}
      <div style={S.tabRow}>
        {['details', 'events'].map(t => (
          <button
            key={t}
            style={{ ...S.tabBtn, ...(tab === t ? S.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'details' ? 'Details' : `Events${events.length ? ` (${events.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ══ DETAILS TAB ══ */}
      {tab === 'details' && (
        <div style={S.detailsWrap}>

          {/* nudge fields */}
          {NUDGE_FIELDS.map(nf => {
            const val    = profile[nf.key]
            const isOpen = openField === nf.key
            return (
              <div key={nf.key} style={S.fieldBlock}>
                <div style={S.fieldLabel}>{nf.emoji}&nbsp;&nbsp;{nf.label}</div>

                {/* filled */}
                {val && !isOpen && (
                  <div style={S.filledRow}>
                    <span style={nf.key === 'bio' ? S.bioVal : S.filledVal}>{val}</span>
                    {canEdit && (
                      <button style={S.editIconBtn} onClick={() => openNudge(nf.key)} title="Edit">
                        <PencilIcon size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* empty + canEdit → nudge */}
                {!val && !isOpen && canEdit && (
                  <div style={S.nudgeCard}>
                    <span style={S.nudgeBenefit}>{nf.benefit}</span>
                    <button style={S.nudgeAddBtn} onClick={() => openNudge(nf.key)}>+ Add</button>
                  </div>
                )}

                {/* empty + cannot edit */}
                {!val && !isOpen && !canEdit && <span style={S.emptyVal}>—</span>}

                {/* inline edit */}
                {isOpen && (
                  <InlineEdit
                    multiline={nf.key === 'bio'}
                    value={fieldVal}
                    onChange={setFieldVal}
                    placeholder={nf.key === 'phone' ? '+91 XXXXX XXXXX' : nf.key === 'base_city' ? 'e.g. Mumbai' : 'Write a short note about yourself…'}
                    type={nf.key === 'phone' ? 'tel' : 'text'}
                    saving={saving}
                    onSave={() => saveField(nf.key, fieldVal)}
                    onCancel={() => setOpenField(null)}
                  />
                )}
              </div>
            )
          })}

          {/* social links */}
          <div style={{ marginTop: 4 }}>
            <div style={S.sectionHeading}>Social &amp; Links</div>

            {SOCIAL_DEFAULTS.map(sd => {
              const url    = socialMap[sd.key]
              const isOpen = openField === sd.key
              const icon   = sd.key === 'linkedin' ? <LinkedInIcon /> : <InstagramIcon />

              return (
                <div key={sd.key} style={S.fieldBlock}>
                  <div style={S.fieldLabel}>{icon}&nbsp;{sd.label}</div>

                  {url && !isOpen && (
                    <div style={S.filledRow}>
                      <a href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank" rel="noopener noreferrer" style={S.socialLink}>{url}</a>
                      {canEdit && (
                        <button style={S.editIconBtn} onClick={() => openSocial(sd.key)} title="Edit">
                          <PencilIcon size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {!url && !isOpen && canEdit && (
                    <div style={S.nudgeCard}>
                      <span style={S.nudgeBenefit}>{sd.benefit}</span>
                      <button style={S.nudgeAddBtn} onClick={() => openSocial(sd.key)}>+ Add</button>
                    </div>
                  )}

                  {!url && !isOpen && !canEdit && <span style={S.emptyVal}>—</span>}

                  {isOpen && (
                    <InlineEdit
                      value={fieldVal}
                      onChange={setFieldVal}
                      placeholder={sd.placeholder}
                      saving={saving}
                      onSave={() => {
                        const updated = socials.filter(x => x.key !== sd.key)
                        if (fieldVal.trim()) updated.push({ key: sd.key, label: sd.label, url: fieldVal.trim() })
                        saveSocials(updated)
                      }}
                      onCancel={() => setOpenField(null)}
                    />
                  )}
                </div>
              )
            })}

            {/* custom links */}
            {customSocials.map((cs, idx) => {
              const fieldKey = `custom_${idx}`
              const isOpen   = openField === fieldKey
              return (
                <div key={cs.key} style={S.fieldBlock}>
                  <div style={S.fieldLabel}>🔗&nbsp;{cs.label}</div>
                  {!isOpen && (
                    <div style={S.filledRow}>
                      <a href={cs.url.startsWith('http') ? cs.url : `https://${cs.url}`}
                        target="_blank" rel="noopener noreferrer" style={S.socialLink}>{cs.url}</a>
                      {canEdit && (
                        <>
                          <button style={S.editIconBtn} title="Edit"
                            onClick={() => { setFieldVal(cs.url); setOpenField(fieldKey) }}>
                            <PencilIcon size={12} />
                          </button>
                          <button style={{ ...S.editIconBtn, color: '#DC2626' }} title="Remove"
                            onClick={() => saveSocials(socials.filter(x => x.key !== cs.key))}>
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {isOpen && (
                    <InlineEdit
                      value={fieldVal}
                      onChange={setFieldVal}
                      placeholder="URL"
                      saving={saving}
                      onSave={() => {
                        const updated = socials.map(x => x.key === cs.key ? { ...x, url: fieldVal.trim() } : x)
                        saveSocials(updated)
                      }}
                      onCancel={() => setOpenField(null)}
                    />
                  )}
                </div>
              )
            })}

            {/* add another */}
            {canEdit && !addCustom && (
              <button style={S.addMoreBtn} onClick={() => setAddCustom(true)}>
                + Add another link
              </button>
            )}

            {canEdit && addCustom && (
              <div style={{ ...S.fieldBlock, gap: 8, display: 'flex', flexDirection: 'column' }}>
                <div style={S.fieldLabel}>🔗&nbsp;New link</div>
                <input style={S.inlineInput} placeholder="Label (e.g. Portfolio, Twitter)"
                  value={customLabel} onChange={e => setCustomLabel(e.target.value)} autoFocus />
                <input style={S.inlineInput} placeholder="URL (e.g. behance.net/yourname)"
                  value={fieldVal} onChange={e => setFieldVal(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.inlineCancelBtn}
                    onClick={() => { setAddCustom(false); setCustomLabel(''); setFieldVal('') }}>
                    Cancel
                  </button>
                  <button style={S.inlineSaveBtn}
                    disabled={saving || !customLabel.trim() || !fieldVal.trim()}
                    onClick={() => saveSocials([...socials, {
                      key: `custom_${Date.now()}`,
                      label: customLabel.trim(),
                      url: fieldVal.trim(),
                    }])}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EVENTS TAB ══ */}
      {tab === 'events' && (
        <div style={S.card}>
          {events.length === 0 ? (
            <p style={S.emptyMsg}>No events assigned to {isOwn ? 'you' : profile.full_name} yet.</p>
          ) : (
            <div style={S.eventList}>
              {events.map(ev => {
                const sm     = STATUS_META[ev.status] || STATUS_META.active
                const cities = Array.isArray(ev.cities) ? ev.cities.join(', ') : (ev.cities || '')
                return (
                  <div key={ev.id} style={S.eventCard}>
                    <div style={S.eventLeft}>
                      <span style={{ ...S.statusDot, background: sm.color }} />
                      <div>
                        <div style={S.eventName}>{ev.name}</div>
                        {cities && <div style={S.eventCities}>{cities}</div>}
                      </div>
                    </div>
                    <div style={S.eventRight}>
                      <span style={{ ...S.statusPill, color: sm.color, background: sm.bg }}>{sm.label}</span>
                      {ev.start_date && (
                        <span style={S.eventDate}>
                          {new Date(ev.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Inline Edit widget ──────────────────────────────────── */
function InlineEdit({ value, onChange, placeholder, type = 'text', multiline, saving, onSave, onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {multiline ? (
        <textarea
          style={{ ...S.inlineInput, minHeight: 80, resize: 'vertical' }}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus
        />
      ) : (
        <input
          style={S.inlineInput}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} type={type} autoFocus
          onKeyDown={e => e.key === 'Enter' && onSave()}
        />
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={S.inlineCancelBtn} onClick={onCancel}>Cancel</button>
        <button style={S.inlineSaveBtn} onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────── */
function PencilIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <path d="M9 2l2 2-6.5 6.5H2.5V9L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="#0A66C2" strokeWidth="1.2" fill="none"/>
      <path d="M3.5 5V9.5M3.5 3.2v.3M5.8 9.5V7c0-1 .5-2 1.8-2s1.8 1 1.8 2v2.5"
        stroke="#0A66C2" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="11" height="11" rx="3" stroke="#E1306C" strokeWidth="1.2" fill="none"/>
      <circle cx="6.5" cy="6.5" r="2.2" stroke="#E1306C" strokeWidth="1.2"/>
      <circle cx="9.5" cy="3.5" r="0.6" fill="#E1306C"/>
    </svg>
  )
}

/* ─── Styles ──────────────────────────────────────────────── */
const S = {
  root:      { fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', maxWidth: 640 },
  centerMsg: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '60px 0', fontFamily: "'DM Sans', sans-serif" },

  back: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: '#6B7280', fontFamily: "'DM Sans', sans-serif",
    marginBottom: 20, padding: 0,
  },

  heroCard: {
    background: '#fff', border: '1px solid #EDE8E2', borderRadius: 14,
    padding: '24px 24px 20px', display: 'flex', gap: 20,
    alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20,
    position: 'relative',
  },
  photoWrap: {
    position: 'relative', width: 72, height: 72,
    borderRadius: '14px', overflow: 'hidden',
    cursor: 'default', flexShrink: 0,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: '14px',
    background: '#bc1723', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
    fontFamily: "'DM Sans', sans-serif",
  },
  cameraOverlay: {
    position: 'absolute', inset: 0, borderRadius: '14px',
    background: 'rgba(0,0,0,0.52)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  comingSoonLabel: {
    fontSize: 8, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.02em',
  },

  heroText: { flex: 1, minWidth: 0 },
  nameRow:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  name: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28, fontWeight: 600, margin: 0, color: '#1a1a1a', lineHeight: 1.1,
  },
  nameEditRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  nameInput: {
    flex: 1, padding: '6px 10px',
    border: '1.5px solid #bc1723', borderRadius: 7,
    fontSize: 18, fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', background: '#fff', outline: 'none',
  },
  nameEditBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#C4BDB6', padding: 2, display: 'flex', alignItems: 'center',
  },
  miniSaveBtn: {
    padding: '4px 10px', background: '#bc1723', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  miniCancelBtn: {
    padding: '4px 8px', background: 'none', border: '1px solid #E5E1DC',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6B7280',
  },

  metaRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  roleBadge: {
    padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  locationChip: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 12, color: '#9CA3AF',
  },
  email: { fontSize: 12, color: '#9CA3AF', margin: 0 },
  savedBadge: {
    position: 'absolute', top: 16, right: 16,
    padding: '5px 12px', background: '#ECFDF5', color: '#059669',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
  },

  tabRow: { display: 'flex', borderBottom: '1px solid #EDE8E2', marginBottom: 20 },
  tabBtn: {
    padding: '10px 20px', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    color: '#9CA3AF', fontWeight: 500, marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: '#bc1723', borderBottomColor: '#bc1723', fontWeight: 600 },

  detailsWrap: { display: 'flex', flexDirection: 'column', gap: 0 },
  fieldBlock: {
    background: '#fff', border: '1px solid #EDE8E2',
    borderRadius: 10, padding: '14px 16px', marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: 700, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
    display: 'flex', alignItems: 'center',
  },
  filledRow: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  filledVal: { fontSize: 14, color: '#1a1a1a', flex: 1 },
  bioVal:    { fontSize: 14, color: '#4B5563', flex: 1, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: 'italic' },
  emptyVal:  { fontSize: 13, color: '#D1D5DB' },
  editIconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#C4BDB6', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0,
  },

  nudgeCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, background: '#FAFAF8',
    borderRadius: 8, padding: '10px 14px',
    border: '1px dashed #E5E1DC',
  },
  nudgeBenefit: { fontSize: 13, color: '#6B7280', flex: 1, lineHeight: 1.4 },
  nudgeAddBtn: {
    padding: '6px 16px', border: 'none', borderRadius: 20,
    background: '#bc1723', color: '#fff', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0, whiteSpace: 'nowrap',
  },

  inlineInput: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #bc1723', borderRadius: 7,
    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    background: '#fff', color: '#1a1a1a', outline: 'none',
    boxSizing: 'border-box',
  },
  inlineCancelBtn: {
    padding: '7px 16px', border: '1.5px solid #E5E1DC',
    borderRadius: 7, background: 'transparent', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#6B7280',
  },
  inlineSaveBtn: {
    padding: '7px 20px', border: 'none', borderRadius: 7,
    background: '#bc1723', color: '#fff', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
  },

  sectionHeading: {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 8, paddingLeft: 2,
  },
  socialLink: {
    fontSize: 13, color: '#bc1723', textDecoration: 'none',
    flex: 1, wordBreak: 'break-all',
  },
  addMoreBtn: {
    background: 'none', border: '1px dashed #E5E1DC',
    borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
    fontSize: 13, color: '#9CA3AF', fontFamily: "'DM Sans', sans-serif",
    width: '100%', textAlign: 'left', marginTop: 4,
  },

  card: { background: '#fff', border: '1px solid #EDE8E2', borderRadius: 12, padding: 24 },

  eventList:   { display: 'flex', flexDirection: 'column', gap: 8 },
  eventCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '10px 14px',
    border: '1px solid #EDE8E2', borderRadius: 8, background: '#FAFAF8',
  },
  eventLeft:   { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  eventRight:  { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  statusDot:   { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  eventName:   { fontSize: 14, fontWeight: 500, color: '#1a1a1a' },
  eventCities: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusPill: {
    padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.03em',
  },
  eventDate: { fontSize: 12, color: '#9CA3AF' },
  emptyMsg:  { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '24px 0', margin: 0 },
}
