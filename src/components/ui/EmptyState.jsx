import { Icon } from '../../icons'
import { Button } from './Button'

/*
 * EmptyState.
 * CANONICAL: Guidelines V2 §07 Components ("Empty, loading & error — the missing states"):
 *   "Empty — Centred icon + one line in brand voice + a single primary CTA.
 *    'No events yet. Your first one starts here.'"
 * Icon is pulled from the shared Lucide module (decision D — restyled Lucide, not bespoke).
 * Exactly one primary CTA, per spec.
 */
export function EmptyState({ icon = 'events', line, cta, onCta, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 16,
      padding: 'var(--space-12) var(--space-6)',
      ...style,
    }}>
      <Icon name={icon} size={32} style={{ color: 'var(--app-text-dim)' }} />
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--t-body-size)',
        color: 'var(--app-text-dim)', margin: 0, maxWidth: 360, lineHeight: 1.6,
      }}>{line}</p>
      {cta && <Button variant="primary" onClick={onCta}>{cta}</Button>}
    </div>
  )
}
