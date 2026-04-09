import { useState } from 'react'

const MODES = [
  {
    key: 'proposal',
    icon: '📋',
    title: 'Full proposal',
    desc: 'Build a complete cost sheet, export a formatted proposal for your client.',
    have: ['Element list or past cost sheet (Excel optional)', 'Client name and event details', 'City-wise scope if multi-city'],
    tab: 'elements',
    color: '#1A1917',
  },
  {
    key: 'estimate',
    icon: '₹',
    title: 'Quick cost estimate',
    desc: 'Fast estimate with elements and costs. Get totals with agency fee and GST.',
    have: ['List of elements with approximate costs', 'Agency fee and GST percentages'],
    tab: 'elements',
    color: '#1E40AF',
  },
  {
    key: 'elements',
    icon: '📄',
    title: 'Element master list',
    desc: 'Build a clean scope of work by category — no costs, just what is needed.',
    have: ['List of elements or past Excel sheet', 'Category breakdown if available'],
    tab: 'elements',
    color: '#065F46',
  },
  {
    key: 'execution',
    icon: '⚡',
    title: 'Execution checklist',
    desc: 'Assign every element to your team, set deadlines, track to completion.',
    have: ['Approved element list', 'Team member names and contact details', 'Event date and deadlines'],
    tab: 'tasks',
    color: '#92400E',
  },
  {
    key: 'production',
    icon: '🎨',
    title: 'Production & print tracker',
    desc: 'Track creative approvals, fabrication and print status for every element.',
    have: ['Element list with vendor names', 'Creative team contacts', 'Print vendor details'],
    tab: 'production',
    color: '#5B21B6',
  },
  {
    key: 'showflow',
    icon: '🎬',
    title: 'Show flow / Cue sheet',
    desc: 'Build a minute-by-minute show flow with technical cues per screen.',
    have: ['Programme schedule with approximate timings', 'Names of screens or technical departments', 'Script notes for MC or VO if available'],
    tab: 'cuesheet',
    color: '#9D174D',
  },
  {
    key: 'full',
    icon: '🗂',
    title: 'Full event management',
    desc: 'Manage the complete lifecycle — proposal, execution, production, delivery.',
    have: ['Everything — you\'re running the full show'],
    tab: 'elements',
    color: '#374151',
    featured: true,
  },
]

export default function ModeSelector({ event, onSelect, onDismiss }) {
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('pick') // 'pick' | 'prepare'

  const mode = MODES.find(m => m.key === selected)

  function handlePick(key) {
    if (key === 'full') { onSelect('elements'); return }
    setSelected(key)
    setStep('prepare')
  }

  function handleGo() {
    onSelect(mode.tab)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,25,21,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 600, padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        maxWidth: step === 'pick' ? '680px' : '440px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'fadeUp 0.2s ease',
      }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

        {step === 'pick' ? (
          <>
            {/* Header */}
            <div style={{ padding: '28px 28px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                What do you need today?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                Pick where you want to start. You can access everything else anytime.
              </p>
            </div>

            {/* Mode grid */}
            <div style={{ padding: '20px 28px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {MODES.filter(m => !m.featured).map(m => (
                <button key={m.key} onClick={() => handlePick(m.key)}
                  style={{
                    padding: '16px',
                    background: 'var(--bg)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseOver={e => { e.currentTarget.style.border = `0.5px solid ${m.color}`; e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseOut={e => { e.currentTarget.style.border = '0.5px solid var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{m.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{m.desc}</div>
                </button>
              ))}

              {/* Full event — spans full width */}
              <button onClick={() => handlePick('full')}
                style={{
                  gridColumn: '1 / -1',
                  padding: '14px 16px',
                  background: 'var(--text)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontFamily: 'var(--font-body)',
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                <span style={{ fontSize: '20px' }}>🗂</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--bg)' }}>Full event management</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Manage the complete lifecycle — proposal through delivery</div>
                </div>
              </button>
            </div>

            {/* Skip */}
            <div style={{ padding: '0 28px 20px', textAlign: 'center' }}>
              <button onClick={onDismiss}
                style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Skip — show me everything
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Have these ready */}
            <div style={{ padding: '28px' }}>
              <button onClick={() => setStep('pick')}
                style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '16px', padding: 0 }}>
                ← Back
              </button>

              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{mode.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                {mode.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                {mode.desc}
              </p>

              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Have these ready
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {mode.have.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '12px', color: mode.color, flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleGo}
                  style={{ flex: 2, padding: '12px', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Got it — let's go →
                </button>
                <button onClick={onDismiss}
                  style={{ flex: 1, padding: '12px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}>
                  Skip
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
