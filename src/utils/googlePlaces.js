// Google Places (New) for the event form's "Areas & venues" group — Phase 0D.
// Silent by design (like activityLogger / notificationService): every function
// resolves to an empty/null result on failure and never throws. Without a key,
// nothing loads and no request is made to Google.
//
// Docs: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data
//       https://developers.google.com/maps/documentation/javascript/reference/autocomplete-data

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export const MAX_PLACE_RESULTS = 5
export const MIN_PLACE_CHARS = 3

export const hasPlacesKey = () => Boolean(API_KEY)

// Loaded once, lazily — the loader itself is a separate chunk, fetched on first focus
let _placesPromise = null
export function loadPlaces() {
  if (!API_KEY) return Promise.resolve(null)
  if (_placesPromise) return _placesPromise
  _placesPromise = import('@googlemaps/js-api-loader')
    .then(({ setOptions, importLibrary }) => {
      setOptions({ key: API_KEY, v: 'weekly', language: 'en', region: 'in' })
      return importLibrary('places')
    })
    .catch(err => {
      console.warn('Google Places unavailable — city search only:', err?.message || err)
      return null
    })
  return _placesPromise
}

export async function newPlacesSession() {
  const places = await loadPlaces()
  try { return places ? new places.AutocompleteSessionToken() : null } catch { return null }
}

// Cities come from the local list, so Google's city/state/country rows are dropped here
const CITY_LEVEL_TYPES = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country']
const AREA_TYPES = [
  'sublocality', 'sublocality_level_1', 'sublocality_level_2', 'sublocality_level_3',
  'neighborhood', 'colloquial_area', 'postal_code', 'route',
  'administrative_area_level_3', 'administrative_area_level_4', 'political',
]

export async function fetchPlaceSuggestions(input, sessionToken) {
  const places = await loadPlaces()
  if (!places || String(input).trim().length < MIN_PLACE_CHARS) return []
  try {
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionToken || undefined,
      region: 'in',     // bias to India, don't restrict — global places still work
      language: 'en',
    })
    return (suggestions || [])
      .map(s => s.placePrediction)
      .filter(p => p && !(p.types || []).some(t => CITY_LEVEL_TYPES.includes(t)))
      .slice(0, MAX_PLACE_RESULTS)
      .map(p => ({
        placeId: p.placeId,
        mainText: p.mainText?.text || p.text?.text || '',
        secondaryText: p.secondaryText?.text || '',
        types: p.types || [],
        prediction: p,
      }))
  } catch (err) {
    console.warn('Google Places suggestions failed:', err?.message || err)
    return []
  }
}

const titleCase = (str) => String(str || '').toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())

function component(components, type) {
  return (components || []).find(c => (c.types || []).includes(type))?.longText || ''
}

// One Place Details call per pick (the session token carries over from toPlace())
export async function fetchPlaceLocation(suggestion) {
  try {
    const place = suggestion.prediction.toPlace()
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'id', 'types'],
    })
    return toLocationEntry(place, suggestion)
  } catch (err) {
    console.warn('Google Place details failed:', err?.message || err)
    return null
  }
}

export function toLocationEntry(place, suggestion = {}) {
  const comps = place.addressComponents || []
  const city = titleCase(
    component(comps, 'locality') ||
    component(comps, 'administrative_area_level_2') ||
    component(comps, 'administrative_area_level_1')
  )
  if (!city) return null
  const types = place.types || suggestion.types || []
  const lat = typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat
  const lng = typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng
  return {
    level: types.some(t => AREA_TYPES.includes(t)) && !types.includes('establishment') ? 'area' : 'venue',
    label: place.displayName || suggestion.mainText || city,
    city,
    state: component(comps, 'administrative_area_level_1'),
    country: component(comps, 'country'),
    address: place.formattedAddress || '',
    lat: lat ?? null,
    lng: lng ?? null,
    place_id: place.id || suggestion.placeId || null,
    provider: 'google',
  }
}
