/*
 * LoadingSkeleton.
 * CANONICAL: Guidelines V2 §07 Components: "Loading — The shimmer skeleton — system-wide.
 * Never a bare spinner alone."
 *
 * ⚠ SCOPE NOTE (flagged in the Phase-0 PR): §07 specs the PATTERN (a shimmer skeleton in
 * the content's shape, not a spinner) but gives no pixel-level shimmer treatment. The
 * shimmer below is therefore built on canonical tokens only (--app-surface placeholders,
 * --ease-out sweep, reduced-motion off) — a standard skeleton, NOT an invented design.
 * If you want a specific shimmer look, say so and I'll match it.
 *
 * Render `lines` bars, or pass `children` shaped like the real content (each block gets
 * the `me-skel` class to inherit the shimmer).
 */
export function LoadingSkeleton({ lines = 3, height = 14, gap = 12, style, children }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      <style>{`
        .me-skel {
          position: relative; overflow: hidden;
          background: var(--app-surface);
          border-radius: var(--radius-sm);
        }
        .me-skel::after {
          content: ''; position: absolute; inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: me-shimmer 1.4s var(--ease-out) infinite;
        }
        @keyframes me-shimmer { 100% { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) { .me-skel::after { animation: none; } }
      `}</style>
      {children ?? Array.from({ length: lines }, (_, i) => (
        <div key={i} className="me-skel" style={{ height, width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}
