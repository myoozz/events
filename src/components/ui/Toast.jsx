import { Toaster, toast as sonner } from 'sonner'
import { Icon } from '../../icons'

/*
 * Toast — shared primitive. Behaviour from Sonner 2.0.8 (MIT), look from ME tokens.
 * Sonner runs in `unstyled` mode; every pixel comes from .me-toast in me-ui.css.
 * Replaces the four hand-rolled toasts (Landing, ElementBuilder, Dashboard, SuperAdminPanel)
 * and carries live notifications from the realtime channel.
 *
 * Mount <ToastHost /> once (App.jsx). Call from anywhere:
 *   toast.success('Event archived')
 *   toast.error("Couldn't save the element", { body: 'Check your connection and try again.' })
 *   toast.show({ title, body, tone: 'assign', icon: 'taskAssigned', action: { label: 'Open', onClick } })
 */

const TONE_ICON = { done: 'taskCompleted', action: 'warning', info: 'bell', assign: 'bell', neutral: 'bell' }

function ToastCard({ id, title, body, tone = 'neutral', icon, action }) {
  return (
    <div className="me-toast" role="status">
      <span className={`me-tone me-tone--${tone}`} aria-hidden="true">
        <Icon name={icon || TONE_ICON[tone] || 'bell'} size={18} />
      </span>
      <div style={{ minWidth: 0 }}>
        <p className="me-toast__title">{title}</p>
        {body && <p className="me-toast__body">{body}</p>}
      </div>
      <div className="me-toast__actions">
        {action && (
          <button
            type="button"
            className="me-btn me-btn--secondary"
            style={{ height: 30, padding: '0 10px', fontSize: 12 }}
            onClick={() => { action.onClick?.(); sonner.dismiss(id) }}
          >
            {action.label}
          </button>
        )}
        <button type="button" className="me-toast__close" aria-label="Dismiss" onClick={() => sonner.dismiss(id)}>
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  )
}

function show({ title, body, tone, icon, action, duration } = {}) {
  return sonner.custom(
    (id) => <ToastCard id={id} title={title} body={body} tone={tone} icon={icon} action={action} />,
    { duration: duration ?? (action ? 8000 : 4000) },
  )
}

export const toast = {
  show,
  success: (title, opts = {}) => show({ title, tone: 'done', ...opts }),
  error:   (title, opts = {}) => show({ title, tone: 'action', icon: 'warning', duration: 7000, ...opts }),
  info:    (title, opts = {}) => show({ title, tone: 'info', ...opts }),
  dismiss: (id) => sonner.dismiss(id),
}

export function ToastHost() {
  return (
    <Toaster
      position="bottom-right"
      visibleToasts={3}
      gap={10}
      offset={20}
      mobileOffset={12}
      style={{ zIndex: 'var(--z-toast)' }}
      toastOptions={{ unstyled: true }}
    />
  )
}
