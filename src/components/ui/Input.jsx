/*
 * Input — shared primitive (label / error / helper / mono).
 * Ported (design) from the me-app kit `Primitives.jsx`. Canonical §07.
 * NOTE (flagged in the Phase-0 PR): the field background is pure #fff (from the kit),
 * which is technically against the guidelines' "never pure white" line — that line
 * targets page/card surfaces; kept here for input affordance pending Vikram's call.
 */
export function Input({ label, error, helper, mono = false, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--app-text-dim)',
        }}>{label}</label>
      )}
      <input
        {...rest}
        style={{
          background: '#fff',
          border: `1px solid ${error ? 'var(--state-danger)' : 'var(--app-border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
          fontSize: 14,
          color: 'var(--app-ink)',
          outline: 'none',
          fontFeatureSettings: mono ? "'tnum' 1" : undefined,
          ...style,
        }}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--state-danger)' }}>{error}</span>}
      {!error && helper && <span style={{ fontSize: 12, color: 'var(--app-text-dim)' }}>{helper}</span>}
    </div>
  )
}
