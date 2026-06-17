/*
 * Eyebrow — mono uppercase section/kicker label.
 * Ported (design) from the me-app kit `Primitives.jsx`. Canonical §04 (.label/.eyebrow).
 */
export function Eyebrow({ children, color, style }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: color || 'var(--app-text-dim)',
      ...style,
    }}>{children}</div>
  )
}
