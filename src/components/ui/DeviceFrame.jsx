import { MeMark } from './MeMark'

/*
 * DeviceFrame — browser / tablet / phone shells for the landing page.
 * Frame geometry adapted from opensourceui.in mockups (MIT); rebuilt in plain CSS on
 * --device-* tokens. Landing / marketing surfaces only.
 *
 * Honesty law (D4): pass `src` only for a real 2x capture with fictional event names.
 * With no `src`, the screen shows the Me mark and a caption, never a fabricated UI.
 *
 *   <DeviceFrame kind="browser" url="myoozz.events/app" src={dashboard2x} alt="…" />
 *   <DeviceFrame kind="tablet" caption="At the venue" />
 */
export function DeviceFrame({ kind = 'browser', src, alt = '', url = 'myoozz.events', caption, className = '', style }) {
  const screen = (
    <div className="me-device__screen">
      {src
        ? <img src={src} alt={alt} loading="lazy" />
        : (
          <div className="me-device__placeholder" role="img" aria-label={caption ? `Myoozz Events — ${caption}` : 'Myoozz Events'}>
            <MeMark size={kind === 'phone' ? 30 : 40} />
            {caption && <small>{caption}</small>}
          </div>
        )}
    </div>
  )

  if (kind === 'browser') {
    return (
      <figure className={`me-device me-device--browser ${className}`} style={{ margin: 0, ...style }}>
        <div className="me-device__bar" aria-hidden="true">
          <div className="me-device__dots"><i /><i /><i /></div>
          <div className="me-device__url"><span className="me-device__lock" />{url}</div>
        </div>
        {screen}
      </figure>
    )
  }

  return (
    <figure className={`me-device me-device--${kind} ${className}`} style={{ margin: 0, ...style }}>
      {kind === 'phone' && (
        <>
          <span className="me-device__island" aria-hidden="true" />
          <span className="me-device__btn" style={{ left: -2, top: '22%', height: '6%' }} aria-hidden="true" />
          <span className="me-device__btn" style={{ left: -2, top: '31%', height: '9%' }} aria-hidden="true" />
          <span className="me-device__btn" style={{ right: -2, top: '27%', height: '12%', borderRadius: '0 2px 2px 0' }} aria-hidden="true" />
        </>
      )}
      {screen}
    </figure>
  )
}
