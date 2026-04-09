export default function PageDescription({ icon, title, description, tip }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: '24px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
    }}>
      {icon && (
        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      )}
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: tip ? '3px' : '0' }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: tip ? '4px' : '0' }}>
            {description}
          </p>
        )}
        {tip && (
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            💡 {tip}
          </p>
        )}
      </div>
    </div>
  )
}
