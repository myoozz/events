// Event type code → display label. One map, reused by EventCard, EventPage and any filter.
// Stored codes stay as they are (master list is Phase 1); this is display only.
export const EVENT_TYPE_LABELS = {
  corporate:        'Corporate Events',
  brand_activation: 'Brand Activations',
  activation:       'Brand Activations', // legacy value on older rows
  mice:             'MICE',
  exhibition:       'Exhibitions & Trade Shows',
  government:       'Government & Public Events',
}

// Unknown codes are title-cased ("road_show" → "Road Show") — never shown raw.
export function eventTypeLabel(code) {
  if (!code) return ''
  return EVENT_TYPE_LABELS[code]
    || String(code).replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
}
