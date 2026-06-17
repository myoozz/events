import { Button } from './Button'

/*
 * ErrorState.
 * CANONICAL: Guidelines V2 §07 Components: "Error — state-danger left-border, surface bg,
 * one plain line + retry. Never a raw error string."
 */
export function ErrorState({ line = 'Something went wrong.', onRetry, retryLabel = 'Retry', style }) {
  return (
    <div role="alert" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      background: 'var(--app-surface)',
      borderLeft: '3px solid var(--state-danger)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-3) var(--space-4)',
      ...style,
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--t-body-size)', color: 'var(--app-ink)' }}>{line}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  )
}
