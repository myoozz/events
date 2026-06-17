/*
 * Tabs — the signature active-tab underline that DRAWS left→right. Never a filled pill.
 * (The one micro-interaction the brand says "belongs to Me alone.")
 *
 * CANONICAL SOURCES (verbatim):
 *   • Guidelines V2 §06 Motion — "Tab underline draws L→R: A 2px App-Red underline draws
 *     left to right in 200ms. Reused everywhere tabs appear. Never a filled pill."
 *   • Guidelines V2 §10 Guardrails — "Make the active tab a red underline that draws L→R."
 *   • colors_and_type.css `.tab` / `.tab:hover` / `.tab::after` / `.tab.is-active::after`
 *     and its `@media (prefers-reduced-motion: reduce)` fallback (underline → static bar).
 * The CSS below is that `.tab` rule reproduced under a scoped `me-tab` class — no values invented.
 *
 * Props: tabs=[{ id, label }] · active=id · onChange=(id)=>void
 */
export function Tabs({ tabs = [], active, onChange, style }) {
  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--app-border)', ...style }}>
      <style>{`
        .me-tab {
          position: relative;
          padding: var(--space-3) var(--space-4);
          font-family: var(--font-body);
          font-weight: 500;
          font-size: var(--t-body-size);
          color: var(--app-text-dim);
          background: transparent;
          border: 0;
          cursor: pointer;
          transition: color var(--dur-quick) var(--ease-out);
        }
        .me-tab:hover { color: var(--app-ink); }
        .me-tab::after {
          content: '';
          position: absolute;
          left: var(--space-4);
          right: var(--space-4);
          bottom: 0;
          height: 2px;
          background: var(--app-accent);
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform var(--dur-signature) var(--ease-out);
        }
        .me-tab.is-active { color: var(--app-ink); }
        .me-tab.is-active::after { transform: scaleX(1); }
        @media (prefers-reduced-motion: reduce) {
          .me-tab::after { transition: opacity var(--dur-quick) var(--ease-out); transform: none; opacity: 0; }
          .me-tab.is-active::after { opacity: 1; }
        }
      `}</style>
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`me-tab${active === t.id ? ' is-active' : ''}`}
          onClick={() => onChange?.(t.id)}
        >{t.label}</button>
      ))}
    </div>
  )
}
