import { useEffect, useRef, useState } from 'react'

/*
 * HoldButton — press-and-hold confirm for Admin-only destructive actions
 * (suspend user, archive event, remove from workspace). Pattern adapted from
 * opensourceui.in `hold-to-delete-button` (MIT); rebuilt without Tailwind in ME tokens.
 * Mouse, touch and keyboard (hold Space / Enter). Releasing early cancels.
 *
 *   <HoldButton onConfirm={suspendUser} doneLabel="User suspended">Hold to suspend</HoldButton>
 */
export function HoldButton({ children, onConfirm, duration = 1200, doneLabel, disabled, style, ...rest }) {
  const ref = useRef(null)
  const raf = useRef(0)
  const start = useRef(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  function tick(ts) {
    if (!start.current) start.current = ts
    const p = Math.min(1, (ts - start.current) / duration)
    setProgress(p)
    if (p >= 1) { setDone(true); onConfirm?.(); return }
    raf.current = requestAnimationFrame(tick)
  }
  function begin() {
    if (disabled || done) return
    start.current = 0
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
  }
  function cancel() {
    if (done) return
    cancelAnimationFrame(raf.current)
    setProgress(0)
  }

  return (
    <button
      ref={ref}
      type="button"
      className="me-hold"
      disabled={disabled}
      data-armed={progress > 0.5 ? 'true' : 'false'}
      data-done={done ? 'true' : 'false'}
      aria-label={typeof children === 'string' ? `${children}. Press and hold to confirm.` : undefined}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin() } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') cancel() }}
      style={{ '--p': done ? 1 : progress, ...style }}
      {...rest}
    >
      <span className="me-hold__fill" aria-hidden="true" />
      {done && doneLabel ? doneLabel : children}
    </button>
  )
}
