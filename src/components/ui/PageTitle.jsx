/*
 * PageTitle — Cormorant in-app page title + optional subtitle.
 * Ported (design) from the me-app kit `Primitives.jsx`.
 * Canonical §04 — H1 is Cormorant Garamond 32/40 ("My Events Operating System").
 */
export function PageTitle({ children, sub, style }) {
  return (
    <div style={{ marginBottom: 24, ...style }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 500,
        fontSize: 'var(--t-h1-size)',
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
        color: 'var(--app-ink)',
        margin: 0,
        marginBottom: sub ? 6 : 0,
        whiteSpace: 'nowrap',
      }}>{children}</h1>
      {sub && (
        <p style={{ fontSize: 14, color: 'var(--app-text-dim)', margin: 0, lineHeight: 1.6 }}>{sub}</p>
      )}
    </div>
  )
}
