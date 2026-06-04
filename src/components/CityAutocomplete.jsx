import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import { City, State, Country } from 'country-state-city'

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

const MAX_RESULTS = 8

const S = {
  wrap: { position: 'relative', width: '100%' },
  input: {
    width: '100%', padding: '6px 12px',
    border: '1px solid var(--app-border)', borderRadius: '6px',
    fontSize: '14px', color: 'var(--app-ink)', background: '#fff',
    outline: 'none', fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  inputFocus: { borderColor: 'var(--app-accent)' },
  inputDisabled: { background: 'var(--app-surface)', color: 'var(--app-text-dim-lg)', cursor: 'not-allowed' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: '#fff', border: '1px solid var(--app-border)', borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(26,16,8,0.12)',
    zIndex: 9999, overflow: 'hidden',
    maxHeight: `${MAX_RESULTS * 46}px`, overflowY: 'auto',
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
}) {
  const [ready, setReady] = useState(false)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const [focused, setFocused] = useState(false)
  const fuseRef = useRef(null)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Build Fuse index once on mount (deferred so it doesn't block paint)
  useEffect(() => {
    const id = requestIdleCallback
      ? requestIdleCallback(build)
      : setTimeout(build, 0)
    function build() {
      const cities = getEnrichedCities()
      fuseRef.current = new Fuse(cities, {
        keys: ['city'],
        threshold: 0.3,
        distance: 80,
        minMatchCharLength: 2,
      })
      setReady(true)
    }
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id)
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
    const hits = fuseRef.current.search(query, { limit: MAX_RESULTS })
    setResults(hits.map(h => h.item))
    setOpen(true)
    setCursor(-1)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    search(val)
  }

  const handleSelect = (item) => {
    onChange(item.city)
    onSelect({ city: item.city, state: item.state, country: item.country })
    setOpen(false)
    setCursor(-1)
    setResults([])
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0 && results[cursor]) handleSelect(results[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || cursor < 0) return
    const el = listRef.current.children[cursor]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [cursor])

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
          if (results.length > 0) setOpen(true)
        }}
        onBlur={() => setFocused(false)}
        placeholder={!ready ? 'Loading cities...' : placeholder}
        disabled={disabled || !ready}
        autoComplete="off"
      />

      {open && (
        <div style={S.dropdown} ref={listRef}>
          {results.length === 0 ? (
            <div style={S.status}>No results found</div>
          ) : (
            results.map((item, i) => (
              <div
                key={`${item.city}-${item.state}-${item.country}-${i}`}
                style={{
                  ...S.item,
                  ...(i === cursor ? S.itemActive : {}),
                  ...(i === results.length - 1 ? { borderBottom: 'none' } : {}),
                }}
                onPointerEnter={() => setCursor(i)}
                onPointerDown={(e) => { e.preventDefault(); handleSelect(item) }}
              >
                <span style={S.cityName}>{item.city}</span>
                <span style={S.meta}>
                  {[item.state, item.country].filter(Boolean).join(' · ')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
