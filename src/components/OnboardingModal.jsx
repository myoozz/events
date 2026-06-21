import { useState, useEffect } from 'react'
import { Icon } from '../icons'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'

const RED = 'var(--app-accent)'
const RED_HOVER = '#8E0A1F'

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  background: 'var(--bg)',
  border: '0.5px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'rgba(10,10,10,0.55)',
  marginBottom: '6px',
}

function SolidBtn({ children, onClick, disabled }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '11px',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        background: disabled ? 'var(--bg-secondary)' : hover ? RED_HOVER : RED,
        color: disabled ? 'var(--text-secondary)' : '#fff',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        letterSpacing: '0.2px',
      }}
    >
      {children}
    </button>
  )
}

function OutlineBtn({ children, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '10px',
        fontSize: '14px',
        fontWeight: 400,
        fontFamily: 'var(--font-body)',
        background: hover ? 'var(--bg-secondary)' : 'transparent',
        color: 'var(--text-secondary)',
        border: '0.5px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export default function OnboardingModal({ userId, tenantId, tenantName, onComplete }) {
  const [step, setStep] = useState(1)
  const [agencyName, setAgencyName] = useState(tenantName || '')
  const [agencyFee, setAgencyFee] = useState('15')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (tenantName) setAgencyName(tenantName)
  }, [tenantName])

  async function markWelcomed() {
    await supabase
      .from('users')
      .update({ welcomed_at: new Date().toISOString() })
      .eq('id', userId)
  }

  async function handleSkip() {
    await markWelcomed()
    onComplete()
  }

  async function handleStep1Next() {
    setSaving(true)
    await supabase
      .from('tenants')
      .update({ name: agencyName.trim(), agency_fee_default: parseFloat(agencyFee) || 15 })
      .eq('id', tenantId)
    setSaving(false)
    setStep(2)
  }

  async function handleFinish(action) {
    await markWelcomed()
    onComplete(action)
  }

  const TOTAL_STEPS = 4

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--app-surface)',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Top row: progress dots + skip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const n = i + 1
              const isActive = n === step
              return (
                <div
                  key={n}
                  style={{
                    height: '6px',
                    width: isActive ? '20px' : '6px',
                    borderRadius: '99px',
                    background: isActive ? RED : 'var(--bg-surface-2)',
                    transition: 'width 0.2s, background 0.2s',
                  }}
                />
              )
            })}
          </div>
          <button
            onClick={handleSkip}
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              letterSpacing: '0.2px',
            }}
          >
            Skip setup
          </button>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            style={{ minHeight: '160px' }}
          >
            {step === 1 && (
              <Step1
                agencyName={agencyName}
                setAgencyName={setAgencyName}
                agencyFee={agencyFee}
                setAgencyFee={setAgencyFee}
                onNext={handleStep1Next}
                saving={saving}
              />
            )}
            {step === 2 && (
              <Step2
                onCreateEvent={() => handleFinish('create-event')}
                onLater={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3
                onInvite={() => handleFinish('invite-team')}
                onLater={() => setStep(4)}
              />
            )}
            {step === 4 && (
              <Step4 onFinish={() => handleFinish()} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <Icon name="back" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Back
            </button>
          ) : <span />}
          {step < 4 && step > 1 && (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              Next <Icon name="next" size={13} style={{ verticalAlign: '-2px', marginLeft: 5 }} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function Step1({ agencyName, setAgencyName, agencyFee, setAgencyFee, onNext, saving }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Your workspace, your documents.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.55 }}>
        Two things — they appear on every document you send clients.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Agency name</label>
        <input
          style={inputStyle}
          value={agencyName}
          onChange={e => setAgencyName(e.target.value)}
          placeholder="Your agency name"
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Default agency fee %</label>
        <input
          style={inputStyle}
          type="number"
          min="0"
          max="100"
          value={agencyFee}
          onChange={e => setAgencyFee(e.target.value)}
          placeholder="15"
        />
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.45)', margin: '0 0 24px', lineHeight: 1.5 }}>
        Margin added to every cost sheet. Change per event anytime.
      </p>

      <SolidBtn onClick={onNext} disabled={saving || !agencyName.trim()}>
        {saving ? 'Saving...' : <>Next <Icon name="next" size={13} style={{ verticalAlign: '-2px', marginLeft: 5 }} /></>}
      </SolidBtn>
    </div>
  )
}

function Step2({ onCreateEvent, onLater }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Create your first event.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.55 }}>
        Start real or test. Once an event exists, everything follows.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SolidBtn onClick={onCreateEvent}>+ Create an event</SolidBtn>
        <OutlineBtn onClick={onLater}>I'll do this later</OutlineBtn>
      </div>
    </div>
  )
}

function Step3({ onInvite, onLater }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Bring in your team.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.55 }}>
        Invite Managers and Event Leads. They get assigned events. Your team works in ME. You see everything.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SolidBtn onClick={onInvite}>Invite team members</SolidBtn>
        <OutlineBtn onClick={onLater}>I'll do this later</OutlineBtn>
      </div>
    </div>
  )
}

function Step4({ onFinish }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        We're here. Always.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.55 }}>
        ME is new and evolving fast. Hit a rough edge? Drop us a message — where and what. We fix it and update you. Promise.
      </p>

      <div style={{
        borderLeft: `3px solid ${RED}`,
        background: 'var(--bg-secondary)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        padding: '12px 14px',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
          You're among the first agencies on ME. Hands-on support — we'll walk you through, make sure it works for how you work.
        </p>
      </div>

      <SolidBtn onClick={onFinish}>Start using ME <Icon name="next" size={13} style={{ verticalAlign: '-2px', marginLeft: 5 }} /></SolidBtn>
    </div>
  )
}
