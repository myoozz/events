/*
 * Badge — shared primitive.
 * Ported (design) from the ME Design System me-app kit `Primitives.jsx`.
 * Canonical: Guidelines V2 §07 — status badges are "bound to the semantic layer"
 * (Done / In progress / At risk / Overdue / Draft). radius-sm.
 * Tones map to the semantic-state tokens; `accent`/`brand` are the two non-state tones.
 */

const TONES = {
  success: { bg: 'var(--state-success-bg)', color: 'var(--state-success)' },
  info:    { bg: 'var(--state-info-bg)',    color: 'var(--state-info)' },
  warning: { bg: 'var(--state-warning-bg)', color: 'var(--state-warning)' },
  danger:  { bg: 'var(--state-danger-bg)',  color: 'var(--state-danger)' },
  neutral: { bg: 'var(--app-surface)',      color: 'var(--app-text-dim)' },
  accent:  { bg: 'rgba(188,23,35,0.10)',    color: 'var(--app-accent)' },
  brand:   { bg: 'var(--brand-teal-soft)',  color: 'var(--brand-teal)' },
}

export function Badge({ tone = 'neutral', children, dot = false }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12,
      lineHeight: 1,
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      background: t.bg,
      color: t.color,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }} />}
      {children}
    </span>
  )
}
