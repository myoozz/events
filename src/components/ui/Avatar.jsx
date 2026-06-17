/*
 * Avatar — shared primitive. ROUNDED SQUARE, never a circle.
 * Ported (design) from the ME Design System me-app kit `Primitives.jsx`.
 * Canonical: Guidelines V2 §09/§10 — "Avatars = rounded squares"; guardrail
 * "Never … circular avatars." Uses --radius-md (the rounded-square corner).
 */

const PALETTES = {
  teal:   { bg: 'var(--brand-teal)',  fg: '#fff' },
  accent: { bg: 'var(--app-accent)',  fg: '#fff' },
  ink:    { bg: 'var(--app-ink)',     fg: '#fff' },
  aqua:   { bg: 'var(--brand-aqua)',  fg: '#fff' },
  dim:    { bg: 'var(--app-surface)', fg: 'var(--app-text-dim)' },
}

export function Avatar({ name = '', size = 32, tone = 'teal' }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || '·'
  const p = PALETTES[tone] || PALETTES.teal
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 'var(--radius-md)', // SQUARE, never 50%
      background: p.bg,
      color: p.fg,
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: Math.max(10, Math.round(size * 0.36)),
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>{initials}</div>
  )
}
