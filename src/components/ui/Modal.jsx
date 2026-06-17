/*
 * Modal — shared primitive. Blurred, dimmed, WARM-ink backdrop.
 * Ported (design) from the me-app kit `Primitives.jsx`.
 * Canonical §07 — "All modals use a blurred, dimmed backdrop — backdrop-filter: blur(8px)
 * over rgba(26,16,8,0.40) (warm ink, not neutral black) … Panel: radius-lg, elev-3,
 * scale 0.98→1 + fade. Destructive confirms use the state-danger button, never app-accent."
 * (Reduced motion: neutralised by the global prefers-reduced-motion rule in index.css.)
 */
export function Modal({ open, onClose, title, eyebrow, children, actions, width = 480, destructive = false }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(var(--modal-blur))',
        WebkitBackdropFilter: 'blur(var(--modal-blur))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
        animation: 'me-modal-fade var(--dur-modal-in) var(--ease-out) forwards',
      }}
    >
      <style>{`
        @keyframes me-modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes me-modal-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          background: 'var(--app-bg)',
          border: '1px solid var(--app-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 24px 20px',
          boxShadow: 'var(--elev-3)',
          animation: 'me-modal-pop var(--dur-modal-in) var(--ease-out) forwards',
        }}
      >
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: destructive ? 'var(--state-danger)' : 'var(--app-text-dim)',
            marginBottom: 8,
          }}>{eyebrow}</div>
        )}
        {title && (
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--t-h2-size)',
            lineHeight: 1.2, color: 'var(--app-ink)', margin: 0, marginBottom: 8,
          }}>{title}</h2>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--app-text-dim)', marginBottom: 20 }}>
          {children}
        </div>
        {actions && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{actions}</div>
        )}
      </div>
    </div>
  )
}
