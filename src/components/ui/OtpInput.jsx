import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp'

/*
 * OtpInput — shared primitive for the 6-digit email code on LoginPage.
 * Behaviour from input-otp 1.5.0 (MIT): one real <input> underneath, so paste,
 * iOS/Android one-time-code autofill, password managers and screen readers all work.
 * Boxes are drawn from ME tokens (.me-otp in me-ui.css).
 *
 *   <OtpInput value={code} onChange={setCode} onComplete={verify} error={!!err} autoFocus />
 */
export function OtpInput({
  value, onChange, onComplete, length = 6, error = false, disabled = false,
  autoFocus = false, id = 'me-otp', ariaLabel = 'Verification code', ...rest
}) {
  const half = Math.ceil(length / 2)
  return (
    <OTPInput
      id={id}
      aria-label={ariaLabel}
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      disabled={disabled}
      autoFocus={autoFocus}
      containerClassName="me-otp-container"
      render={({ slots }) => (
        <div
          className="me-otp"
          data-complete={(value || '').length === length && !error ? 'true' : 'false'}
          data-error={error ? 'true' : 'false'}
        >
          {slots.map((slot, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i === half && <span className="me-otp__gap" aria-hidden="true" />}
              <div
                className="me-otp__slot"
                data-active={slot.isActive ? 'true' : 'false'}
                data-filled={slot.char ? 'true' : 'false'}
              >
                {slot.char ?? (slot.hasFakeCaret ? <span className="me-otp__caret" /> : null)}
              </div>
            </span>
          ))}
        </div>
      )}
      {...rest}
    />
  )
}
