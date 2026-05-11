import { useEffect, useRef, useState } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(startDate, endDate) {
  if (!startDate) return null
  const toDate = (d) => new Date(d.includes('T') ? d : d + 'T00:00:00')
  const fmt = (d) =>
    toDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtShort = (d) =>
    toDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (!endDate || startDate === endDate) return fmt(startDate)
  return toDate(startDate).getFullYear() === toDate(endDate).getFullYear()
    ? `${fmtShort(startDate)} – ${fmt(endDate)}`
    : `${fmt(startDate)} – ${fmt(endDate)}`
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return null
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const mins  = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days  = Math.floor(diffMs / 86400000)
  if (mins  < 60) return `Updated ${mins}m ago`
  if (hours < 24) return `Updated ${hours}h ago`
  if (days  <  7) return `Updated ${days}d ago`
  return `Updated ${new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── StatusPill ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pitch:     { bg: '#fff4e6', color: '#c2410c', border: '#fed7aa' },
  won:       { bg: '#e6f4ea', color: '#166534', border: '#bbf7d0' },
  active:    { bg: '#e0ecff', color: '#1e40af', border: '#bfdbfe' },
  completed: { bg: '#fde8e8', color: '#991b1b', border: '#fecaca' },
  archived:  { bg: '#f1efea', color: '#6b6258', border: '#d8d2c8' },
}

function StatusPill({ status, isTest }) {
  const key = (status || '').toLowerCase()
  const { bg, color, border } = STATUS_STYLES[key] || STATUS_STYLES.archived
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    fontSize: '11px',
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  }
  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
      <span style={{ ...base, background: bg, color, border: `1px solid ${border}` }}>
        {key.toUpperCase()}
      </span>
      {isTest && (
        <span style={{ ...base, background: 'transparent', color: '#7a7060', border: '1px solid #d8d2c8' }}>
          TEST
        </span>
      )}
    </div>
  )
}

// ── MenuItem ──────────────────────────────────────────────────────────────────

function MenuItem({ item }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={item.action}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 14px',
        fontSize: '13px',
        fontFamily: 'DM Sans, sans-serif',
        color: item.danger ? '#bc1723' : '#1a1008',
        textAlign: 'left',
        background: hov ? (item.danger ? '#fdeaea' : '#f2efe9') : 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {item.label}
    </button>
  )
}

// ── EventCard ─────────────────────────────────────────────────────────────────

export default function EventCard({
  event,
  userRole,
  currentUserEmail,
  assignedUsers,
  hasOverdueTasks,
  isPendingApproval,
  onOpen,
  onArchive,
  onUnarchive,
  onDelete,
  onMarkTest,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovered, setHovered]   = useState(false)
  const [focused, setFocused]   = useState(false)
  const menuRef = useRef(null)

  // Mousedown outside menu → close
  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  // Esc → close menu
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Force close on unmount
  useEffect(() => () => { setMenuOpen(false) }, [])

  // ── Derived values ──────────────────────────────────────────────────────────

  const cities = event.cities?.length > 0
    ? event.cities
    : event.city_dates ? Object.keys(event.city_dates) : []
  const visibleCities = cities.slice(0, 3)
  const extraCities   = cities.length > 3 ? cities.length - 3 : 0

  const dateStr = event.start_date
    ? formatDateRange(event.start_date, event.end_date)
    : event.event_date
      ? formatDateRange(event.event_date, null)
      : null

  const clientStr = event.clients?.group_name
    ? event.clients.group_name +
      (event.clients?.brand_name ? ` · ${event.clients.brand_name}` : '')
    : null

  const users       = assignedUsers || []
  const avatarShow  = users.slice(0, 3)
  const avatarExtra = users.length > 3 ? users.length - 3 : 0

  const accentColor = isPendingApproval ? '#bc1723' : hasOverdueTasks ? '#991b1b' : null

  // ── Menu items ──────────────────────────────────────────────────────────────

  function buildMenuItems() {
    const items = []
    items.push({ label: 'Open event', action: () => { setMenuOpen(false); onOpen(event) } })
    if (userRole === 'admin') {
      items.push('separator')
      items.push({
        label: event.is_test ? 'Unmark as test event' : 'Mark as test event',
        action: () => { setMenuOpen(false); onMarkTest(event) },
      })
    }
    if (userRole === 'admin' || userRole === 'manager') {
      items.push({
        label: event.archived_at ? 'Restore event' : 'Archive event',
        action: () => {
          setMenuOpen(false)
          event.archived_at ? onUnarchive(event) : onArchive(event)
        },
      })
    }
    if (userRole === 'admin') {
      items.push('separator')
      items.push({
        label: 'Delete permanently',
        action: () => { setMenuOpen(false); onDelete(event) },
        danger: true,
      })
    }
    return items
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      tabIndex={0}
      onClick={() => { setMenuOpen(false); onOpen(event) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setMenuOpen(false); onOpen(event) } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: '#faf8f5',
        border: `1px solid ${hovered ? '#c8c2b8' : '#d8d2c8'}`,
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        zIndex: menuOpen ? 100 : 'auto',
        outline: focused ? '2px solid #bc1723' : 'none',
        outlineOffset: '2px',
        boxShadow: hovered ? '0 2px 8px rgba(26,16,8,0.06)' : 'none',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Left accent bar */}
      {accentColor && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: accentColor,
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      {/* Row 1: event name + status pill */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        paddingRight: '36px',
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '18px',
          fontWeight: 600,
          color: '#1a1008',
          lineHeight: 1.25,
        }}>
          {event.event_name}
        </p>
        <StatusPill status={event.status} isTest={event.is_test} />
      </div>

      {/* Row 2: client */}
      {clientStr && (
        <p style={{
          margin: 0,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: '#7a7060',
        }}>
          {clientStr}
        </p>
      )}

      {/* Row 3: city chips */}
      {visibleCities.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {visibleCities.map((city) => (
            <span key={city} style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#6b6258',
              background: '#f2efe9',
              border: '1px solid #e8e3da',
              borderRadius: '6px',
            }}>
              {city}
            </span>
          ))}
          {extraCities > 0 && (
            <span style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#6b6258',
              background: '#f2efe9',
              border: '1px solid #e8e3da',
              borderRadius: '6px',
            }}>
              +{extraCities}
            </span>
          )}
        </div>
      )}

      {/* Row 4: date */}
      {dateStr && (
        <p style={{
          margin: 0,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: '#7a7060',
        }}>
          {dateStr}
        </p>
      )}

      {/* Row 5: avatar stack + relative time */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
      }}>
        {avatarShow.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {avatarShow.map((user, i) => (
              <div key={user.id || i} style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: '#f2efe9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                color: '#7a7060',
                border: '2px solid #ffffff',
                marginLeft: i === 0 ? 0 : '-6px',
                zIndex: avatarShow.length - i,
                position: 'relative',
                flexShrink: 0,
              }}>
                {getInitials(user.full_name)}
              </div>
            ))}
            {avatarExtra > 0 && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: '#f2efe9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                color: '#7a7060',
                border: '2px solid #ffffff',
                marginLeft: '-6px',
                position: 'relative',
                zIndex: 0,
                flexShrink: 0,
              }}>
                +{avatarExtra}
              </div>
            )}
          </div>
        ) : <div />}

        {event.updated_at && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'DM Sans, sans-serif',
            color: '#7a7060',
          }}>
            {formatRelativeTime(event.updated_at)}
          </span>
        )}
      </div>

      {/* ⋮ menu */}
      <div
        ref={menuRef}
        style={{ position: 'absolute', top: '12px', right: '12px', zIndex: menuOpen ? 1000 : 50 }}
      >
        <button
          aria-label="Event options"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '18px',
            color: hovered || menuOpen ? '#1a1008' : '#7a7060',
            lineHeight: 1,
          }}
        >
          ⋮
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '36px',
            right: 0,
            background: '#faf8f5',
            border: '1px solid #d8d2c8',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(26,16,8,0.08)',
            minWidth: '180px',
            padding: '4px 0',
            zIndex: 1001,
          }}>
            {buildMenuItems().map((item, i) =>
              item === 'separator' ? (
                <div key={i} style={{ height: '1px', background: '#e8e3da', margin: '4px 0' }} />
              ) : (
                <MenuItem key={i} item={item} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
