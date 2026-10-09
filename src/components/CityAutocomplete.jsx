import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import { City, State, Country } from 'country-state-city'
import {
  hasPlacesKey, loadPlaces, newPlacesSession, fetchPlaceSuggestions, fetchPlaceLocation, MIN_PLACE_CHARS,
} from '../utils/googlePlaces'

// Built once at module level so repeated mounts share the same data
let _enrichedCache = null
function getEnrichedCities() {
  if (_enrichedCache) return _enrichedCache
  const countryMap = {}
  Country.getAllCountries().forEach(c => { countryMap[c.isoCode] = c.name })
  const stateMap = {}
  State.getAllStates().forEach(s => { stateMap[`${s.countryCode}_${s.isoCode}`] = s.name })
  _enrichedCache = City.getAllCities().map(c => ({
    city: c.name,
    state: stateMap[`${c.countryCode}_${c.stateCode}`] || '',
    country: countryMap[c.countryCode] || c.countryCode,
  }))
  return _enrichedCache
}

// Fuse index is cached at module level too: re-opening the New event form must not rebuild it
let _fuseCache = null
function getFuse() {
  if (_fuseCache) return _fuseCache
  _fuseCache = new Fuse(getEnrichedCities(), {
    keys: ['city'],
    threshold: 0.3,
    distance: 80,
    minMatchCharLength: 2,
    includeScore: true,
  })
  return _fuseCache
}

const MAX_RESULTS = 8
const PLACES_DEBOUNCE_MS = 300
const CANDIDATES = 50 // rank a wider Fuse pool, then keep the top MAX_RESULTS
// TODO: use the tenant's home country once tenants store it; India for now
const HOME_COUNTRY = 'India'

// Exact name match first, then home country, then Fuse score
function rankHits(hits, query) {
  const q = query.trim().toLowerCase()
  const rank = h => [
    h.item.city.toLowerCase() === q ? 0 : 1,
    h.item.country === HOME_COUNTRY ? 0 : 1,
    h.score ?? 1,
  ]
  return [...hits].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
  })
}

const S = {
  wrap: { position: 'relative', width: '100%' },
  input: {
    width: '100%', padding: '6px 12px',
    border: '1px solid var(--app-border)', borderRadius: '6px',
    fontSize: '14px', color: 'var(--app-ink)', background: 'var(--app-bg)',
    outline: 'none', fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  inputFocus: { borderColor: 'var(--app-accent)' },
  inputDisabled: { background: 'var(--app-bg)', color: 'var(--app-text-dim-lg)', cursor: 'not-allowed' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(26,16,8,0.12)',
    zIndex: 9999, overflow: 'hidden',
    maxHeight: `${MAX_RESULTS * 46}px`, overflowY: 'auto',
  },
  groupLabel: {
    padding: '8px 12px 4px', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--app-text-dim-lg)', fontFamily: "'DM Sans', sans-serif",
  },
  attribution: {
    padding: '6px 12px', fontSize: '10px', textAlign: 'right',
    color: 'var(--app-text-dim-lg)', fontFamily: "'DM Sans', sans-serif",
  },
  item: {
    padding: '9px 12px', cursor: 'pointer',
    borderBottom: '1px solid var(--app-surface)',
    display: 'flex', flexDirection: 'column', gap: '2px',
    transition: 'background 0.1s',
  },
  itemHover: { background: '#fef3e8' },
  itemActive: { background: '#fde8d0' },
  cityName: {
    fontSize: '14px', fontWeight: 500, color: 'var(--app-ink)',
    fontFamily: "'DM Sans', sans-serif",
  },
  meta: {
    fontSize: '11px', color: 'var(--app-text-dim-lg)',
    fontFamily: "'DM Sans', sans-serif",
  },
  status: {
    padding: '10px 12px', fontSize: '13px', color: 'var(--app-text-dim-lg)',
    fontFamily: "'DM Sans', sans-serif", textAlign: 'center',
  },
}

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search city...',
  disabled = false,
  inputStyle: inputStyleOverride = {},
  allowPlaces = false, // opt-in: adds the Google "Areas & venues" group (event form only)
}) {
  const [ready, setReady] = useState(() => _fuseCache !== null)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const [focused, setFocused] = useState(false)
  const fuseRef = useRef(null)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [placeResults, setPlaceResults] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const placesOn = allowPlaces && hasPlacesKey()
  const sessionRef = useRef(null)   // one session token: typing until a pick
  const debounceRef = useRef(null)
  const queryIdRef = useRef(0)      // drops stale responses
  const pickingRef = useRef(false)

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // Rows across both groups, in display order — the keyboard cursor indexes into this
  const rows = useMemo(() => [
    ...results.map(item => ({ kind: 'city', item })),
    ...placeResults.map(item => ({ kind: 'place', item })),
  ], [results, placeResults])

  // Fuse index: reuse the module cache if built; otherwise build deferred so it doesn't
  // block paint — with a timeout, because on a busy page the idle callback may never fire.
  // typeof check: Safari has no requestIdleCallback (a bare reference would throw).
  useEffect(() => {
    if (_fuseCache) { fuseRef.current = _fuseCache; setReady(true); return }
    const hasIdle = typeof window.requestIdleCallback === 'function'
    const id = hasIdle ? window.requestIdleCallback(build, { timeout: 500 }) : setTimeout(build, 0)
    function build() {
      fuseRef.current = getFuse()
      setReady(true)
    }
    return () => {
      if (hasIdle) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setCursor(-1)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const search = useCallback((query) => {
    if (!fuseRef.current || query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const hits = fuseRef.current.search(query, { limit: CANDIDATES })
    setResults(rankHits(hits, query).slice(0, MAX_RESULTS).map(h => h.item))
    setOpen(true)
    setCursor(-1)
  }, [])

  // Google is only asked after 3+ characters, 300 ms after the last keystroke
  const searchPlaces = useCallback((query) => {
    clearTimeout(debounceRef.current)
    const id = ++queryIdRef.current
    if (!placesOn || query.trim().length < MIN_PLACE_CHARS) {
      setPlaceResults([])
      setPlacesLoading(false)
      return
    }
    setPlacesLoading(true)
    debounceRef.current = setTimeout(async () => {
      if (!sessionRef.current) sessionRef.current = await newPlacesSession()
      const found = await fetchPlaceSuggestions(query, sessionRef.current)
      if (id !== queryIdRef.current) return
      setPlaceResults(found)
      setPlacesLoading(false)
      if (found.length) setOpen(true)
    }, PLACES_DEBOUNCE_MS)
  }, [placesOn])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    search(val)
    searchPlaces(val)
  }

  const closeList = () => {
    clearTimeout(debounceRef.current)
    queryIdRef.current++
    setOpen(false)
    setCursor(-1)
    setResults([])
    setPlaceResults([])
    setPlacesLoading(false)
  }

  const handleSelect = (item) => {
    onChange(item.city)
    onSelect({ level: 'city', city: item.city, state: item.state, country: item.country })
    closeList()
  }

  // One Place Details call per pick; the session ends with it
  const handlePlaceSelect = async (item) => {
    if (pickingRef.current) return
    pickingRef.current = true
    closeList()
    const loc = await fetchPlaceLocation(item)
    sessionRef.current = null
    pickingRef.current = false
    if (loc) onSelect(loc)
  }

  const pickRow = (row) => {
    if (row.kind === 'place') handlePlaceSelect(row.item)
    else handleSelect(row.item)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0 && rows[cursor]) pickRow(rows[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || cursor < 0) return
    const el = listRef.current.querySelector(`[data-row="${cursor}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function renderRow(row, i) {
    const { kind, item } = row
    const title = kind === 'city' ? item.city : item.mainText
    const meta = kind === 'city'
      ? [item.state, item.country].filter(Boolean).join(' · ')
      : item.secondaryText
    return (
      <div
        key={kind === 'city' ? `${item.city}-${item.state}-${item.country}-${i}` : `place-${item.placeId}`}
        data-row={i}
        style={{
          ...S.item,
          ...(i === cursor ? S.itemActive : {}),
          ...(i === rows.length - 1 ? { borderBottom: 'none' } : {}),
        }}
        onPointerEnter={() => setCursor(i)}
        onPointerDown={(e) => { e.preventDefault(); pickRow(row) }}
      >
        <span style={S.cityName}>{title}</span>
        {meta && <span style={S.meta}>{meta}</span>}
      </div>
    )
  }

  const inputStyle = {
    ...S.input,
    ...(focused ? S.inputFocus : {}),
    ...(disabled ? S.inputDisabled : {}),
    ...inputStyleOverride,
  }

  return (
    <div style={S.wrap} ref={wrapRef}>
      <input
        ref={inputRef}
        style={inputStyle}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setFocused(true)
          if (placesOn) loadPlaces() // lazy: Google loads on first focus, never on app start
          if (rows.length > 0) setOpen(true)
        }}
        onBlur={() => setFocused(false)}
        placeholder={!ready ? 'Loading cities...' : placeholder}
        disabled={disabled || !ready}
        autoComplete="off"
      />

      {open && (
        <div style={S.dropdown} ref={listRef}>
          {rows.length === 0 ? (
            <div style={S.status}>{placesLoading ? 'Searching…' : 'No results found'}</div>
          ) : (
            <>
              {placesOn && results.length > 0 && <div style={S.groupLabel}>Cities</div>}
              {results.map((item, i) => renderRow({ kind: 'city', item }, i))}
              {placesOn && placeResults.length > 0 && (
                <>
                  <div style={S.groupLabel}>Areas &amp; venues</div>
                  {placeResults.map((item, j) => renderRow({ kind: 'place', item }, results.length + j))}
                  <div style={S.attribution}>Powered by Google</div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
