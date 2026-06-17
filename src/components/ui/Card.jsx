import { useState } from 'react'

/*
 * Card — shared primitive.
 * Ported (design) from the ME Design System me-app kit `Primitives.jsx`.
 * Canonical: Guidelines V2 §05 — radius-md + warm ink-tinted elevation (--elev-*).
 * `surface` = inset fill (no shadow); default = bordered card on --elev-1, lifting to
 * --elev-2 on hover when `hover` is set.
 */

export function Card({ children, padding = 16, surface = false, hover = false, onClick, style }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: surface ? 'var(--app-surface)' : 'var(--app-bg)',
        border: surface ? '1px solid transparent' : '1px solid var(--app-border)',
        borderRadius: 'var(--radius-md)',
        padding,
        boxShadow: surface ? 'none' : (hover && hov ? 'var(--elev-2)' : 'var(--elev-1)'),
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow var(--dur-quick) var(--ease-out)',
        ...style,
      }}
    >{children}</div>
  )
}
