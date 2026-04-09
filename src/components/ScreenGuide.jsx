import { useState, useEffect } from 'react'

// Guide content per screen
const GUIDES = {
  dashboard: {
    title: 'Your event dashboard',
    steps: [
      { icon: '＋', text: 'Click "New event" to create a proposal. Fill in client, event type, cities and dates.' },
      { icon: '⋯', text: 'Use the "···" menu on any event card to edit, archive, or assign it to a team member.' },
      { icon: '↗', text: 'Click any event card to open it and start building your cost sheet.' },
      { icon: '📋', text: 'Pending review tab shows events created by your team waiting for your approval.' },
    ]
  },
  elements: {
    title: 'Elements & Costs',
    steps: [
      { icon: '＋', text: 'Click "+ Add category" to choose from 21 standard categories. Each comes with suggested elements.' },
      { icon: '↑', text: 'Already have a cost sheet? Use "Import more" to upload your Excel or paste data directly.' },
      { icon: '✏️', text: 'Click any category name to rename it. Use "Merge →" to combine categories.' },
      { icon: '₹', text: 'Fill Client cost (what you charge) and Internal cost (what you pay vendor). Margin calculates automatically.' },
      { icon: '→', text: 'Use "Move to →" on any element to shift it between categories.' },
    ]
  },
  costs: {
    title: 'Cost Summary',
    steps: [
      { icon: '🏙', text: 'All categories are combined here. For multi-city events, click any category to see city-wise breakdown.' },
      { icon: '₹', text: 'Agency fee and GST are calculated automatically from the percentages set on the event.' },
      { icon: '📋', text: 'Select your Terms & Conditions here. They will appear at the bottom of every exported proposal.' },
      { icon: '✓', text: 'Margin shows only when you have entered internal (vendor) costs. ₹0 margin = no internal cost entered yet.' },
    ]
  },
  export: {
    title: 'Preview & Export',
    steps: [
      { icon: '👁', text: 'This is exactly what your client will see. Toggle sections on/off on the right panel.' },
      { icon: '📊', text: 'Choose "Estimate" or "Invoice" before downloading. Each city gets its own Excel sheet.' },
      { icon: '↓', text: 'Download Excel generates a fully formatted proposal with your brand colors, T&C, and all totals.' },
      { icon: '🔄', text: 'Made changes in Elements? Switch tabs — data refreshes automatically.' },
    ]
  },
}

const STORAGE_KEY = 'myoozz_guide_counts'

function getLoginCounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function incrementCount(screen) {
  const counts = getLoginCounts()
  counts[screen] = (counts[screen] || 0) + 1
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
  return counts[screen]
}

function getCount(screen) {
  return getLoginCounts()[screen] || 0
}

export default function ScreenGuide({ screen }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const guide = GUIDES[screen]

  useEffect(() => {
    if (!guide) return
    const count = getCount(screen)
    if (count < 10) {
      setVisible(true)
      setStep(0)
      incrementCount(screen)
    }
  }, [screen])

  if (!visible || !guide) return null

  const isLast = step === guide.steps.length - 1

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      width: '320px', zIndex: 500,
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(26,25,21,0.12)',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '1px' }}>
            Quick guide · {step + 1} of {guide.steps.length}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {guide.title}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-tertiary)', padding: '4px' }}
        >✕</button>
      </div>

      {/* Step content */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '20px', flexShrink: 0, width: '28px', textAlign: 'center' }}>
            {guide.steps[step].icon}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
            {guide.steps[step].text}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', margin: '14px 0 10px' }}>
          {guide.steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '18px' : '6px', height: '6px',
              borderRadius: '3px',
              background: i === step ? 'var(--text)' : 'var(--border-strong)',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }} onClick={() => setStep(i)} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '8px', fontSize: '12px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text)' }}
            >← Back</button>
          )}
          <button
            onClick={() => isLast ? setVisible(false) : setStep(s => s + 1)}
            style={{ flex: 2, padding: '8px', fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-body)', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            {isLast ? 'Got it ✓' : 'Next →'}
          </button>
          <button
            onClick={() => setVisible(false)}
            style={{ padding: '8px 10px', fontSize: '11px', fontFamily: 'var(--font-body)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            title="Skip for now — guide will show again next time"
          >Skip</button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '8px' }}>
          This guide shows for your first 10 sessions on this screen
        </div>
      </div>
    </div>
  )
}
