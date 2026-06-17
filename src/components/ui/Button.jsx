import { useState } from 'react'

/*
 * Button — shared primitive.
 * Ported verbatim (design) from the ME Design System me-app kit `Primitives.jsx`.
 * Canonical: Guidelines V2 §07 Components — "radius-md, 44px tap targets … the single
 * accent. Destructive is the only place state-danger appears as a fill." "Brand (teal)
 * is for marketing only. One primary per view."
 */

const SIZES = {
  sm: { h: 36, px: 12, fs: 13 },
  md: { h: 44, px: 16, fs: 14 }, // 44px = canonical tap target
  lg: { h: 52, px: 22, fs: 15 },
}

const VARIANTS = {
  primary:     { bg: 'var(--app-accent)',   color: '#fff',                hoverBg: 'var(--app-accent-hover)', border: '1px solid transparent' },
  secondary:   { bg: 'transparent',         color: 'var(--app-ink)',      hoverBg: 'var(--app-surface)',      border: '1px solid var(--app-ink)' },
  destructive: { bg: 'var(--state-danger)', color: '#fff',                hoverBg: '#A8311F',                 border: '1px solid transparent' },
  ghost:       { bg: 'transparent',         color: 'var(--app-text-dim)', hoverBg: 'var(--app-surface)',      border: '1px solid transparent' },
  brand:       { bg: 'var(--brand-teal)',   color: '#fff',                hoverBg: 'var(--brand-teal-deep)',  border: '1px solid transparent' }, // marketing only
}

export function Button({ variant = 'primary', size = 'md', children, onClick, type = 'button', disabled, icon, full, style, ...rest }) {
  const s = SIZES[size] || SIZES.md
  const v = VARIANTS[variant] || VARIANTS.primary
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: s.fs,
        lineHeight: 1,
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: 'var(--radius-md)',
        background: hover && !disabled ? v.hoverBg : v.bg,
        color: v.color,
        border: v.border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: pressed && !disabled ? 'scale(0.98)' : 'scale(1)', // §06 press 0.98
        transition: 'background var(--dur-quick) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-quick) var(--ease-out)',
        boxShadow: hover && !disabled && variant === 'primary' ? 'var(--elev-1)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
