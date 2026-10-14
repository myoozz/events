import { useState, useSyncExternalStore } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

/*
 * ConfirmDialog — shared primitive. Focus trap, Esc, aria roles from Radix AlertDialog
 * 1.1.23 (MIT); look matches ui/Modal (warm-ink blurred backdrop, radius-lg, elev-3).
 * Replaces window.confirm() (28 call sites, Oct 2026) and the hand-rolled typed-delete
 * confirm in Dashboard. Destructive confirms use state-danger, never app-accent (§07).
 *
 * Mount <ConfirmHost /> once (App.jsx). Then, anywhere, in place of window.confirm:
 *   if (!(await confirmAction({ title: 'Archive this event?', body: '…', confirmLabel: 'Archive', destructive: true }))) return
 *   // typed confirmation for irreversible actions:
 *   await confirmAction({ title: 'Delete workspace?', destructive: true, requireText: 'Acme Events' })
 */

let state = null            // { opts, resolve }
const listeners = new Set()
const emit = () => listeners.forEach(l => l())
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

export function confirmAction(opts) {
  return new Promise((resolve) => {
    if (state) state.resolve(false)      // only one confirm at a time
    state = { opts, resolve }
    emit()
  })
}

function settle(value) {
  if (!state) return
  state.resolve(value)
  state = null
  emit()
}

export function ConfirmDialog({
  open, onOpenChange, onConfirm,
  eyebrow, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, requireText,
}) {
  const [typed, setTyped] = useState('')
  const blocked = requireText ? typed.trim() !== requireText : false
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => { if (!o) setTyped(''); onOpenChange?.(o) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="me-confirm__overlay" />
        <AlertDialog.Content className="me-confirm" data-destructive={destructive ? 'true' : 'false'}>
          <div className="me-confirm__eyebrow">{eyebrow || (destructive ? 'Please confirm' : 'Confirm')}</div>
          <AlertDialog.Title className="me-confirm__title">{title}</AlertDialog.Title>
          {body
            ? <AlertDialog.Description className="me-confirm__body">{body}</AlertDialog.Description>
            : <AlertDialog.Description className="me-confirm__body" style={{ display: 'none' }}>{title}</AlertDialog.Description>}
          {requireText && (
            <div className="me-confirm__type">
              <label htmlFor="me-confirm-type">Type <b>{requireText}</b> to confirm</label>
              <input id="me-confirm-type" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
          )}
          <div className="me-confirm__actions">
            <AlertDialog.Cancel className="me-btn me-btn--ghost" style={{ height: 44, padding: '0 16px', fontSize: 14 }}>
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={`me-btn ${destructive ? 'me-btn--danger' : 'me-btn--primary'}`}
              style={{ height: 44, padding: '0 18px', fontSize: 14 }}
              disabled={blocked}
              onClick={(e) => { if (blocked) { e.preventDefault(); return } onConfirm?.() }}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => state, () => null)
  const opts = current?.opts || {}
  return (
    <ConfirmDialog
      {...opts}
      open={!!current}
      onConfirm={() => settle(true)}
      onOpenChange={(o) => { if (!o) settle(false) }}
    />
  )
}
