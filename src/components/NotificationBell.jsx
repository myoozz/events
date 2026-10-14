// ============================================================
// NotificationBell.jsx — notification centre in the AppShell header
// Rebuilt 12 Oct 2026 on Radix Popover 1.1.23 (focus, Esc, outside click,
// collision handling) with ME tokens (.me-notif* in ui/me-ui.css).
//
// What changed vs Phase C:
//   · every item opens what it is about (onNavigate) — action_url was never read before
//   · filters: All / Unread / Needs you (approvals, rate requests, reminders)
//   · grouped Today / Yesterday / Earlier, 2-line bodies, type label on each row
//   · panel re-fetches when a realtime insert arrives while it is open (refreshKey)
//   · semantic tone tokens instead of off-palette hex
// Data access still goes only through utils/notificationService.js.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifMeta,
  resolveNotificationTarget,
  dayBucket,
  timeAgo,
} from '../utils/notificationService'
import { Icon } from '../icons'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'action', label: 'Needs you' },
]
const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier']

// `load` is injectable for ui-preview only; the app always uses the service.
export default function NotificationBell({ userId, unreadCount = 0, onMarkAllRead, onNavigate, refreshKey = 0, load = fetchNotifications, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!open || !userId) return
    let live = true
    setLoading(true)
    load(userId, 50).then((data) => {
      if (!live) return
      setItems(data)
      setLoading(false)
    })
    return () => { live = false }
  }, [open, userId, refreshKey, load])

  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter(n => !n.is_read).length,
    action: items.filter(n => !n.is_read && notifMeta(n.type).needsAction).length,
  }), [items])

  const groups = useMemo(() => {
    const shown = items.filter(n =>
      filter === 'unread' ? !n.is_read :
      filter === 'action' ? !n.is_read && notifMeta(n.type).needsAction : true)
    const map = {}
    shown.forEach(n => { (map[dayBucket(n.created_at)] ||= []).push(n) })
    return GROUP_ORDER.filter(g => map[g]).map(g => [g, map[g]])
  }, [items, filter])

  async function openItem(n) {
    if (!n.is_read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)))
      onMarkAllRead?.('single')
      if (load === fetchNotifications) markNotificationRead(n.id)   // fire-and-forget; service never throws
    }
    const target = resolveNotificationTarget(n)
    if (target && onNavigate) {
      setOpen(false)
      onNavigate(target, n)
    }
  }

  async function markAll() {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    onMarkAllRead?.('all')
    if (load === fetchNotifications) await markAllNotificationsRead(userId)
  }

  const badge = unreadCount > 99 ? '99+' : unreadCount

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="me-bell"
        data-unread={unreadCount > 0 ? 'true' : 'false'}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Icon name="bell" size={20} />
        {unreadCount > 0 && <span className="me-bell__count" aria-hidden="true">{badge}</span>}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="me-notif" align="end" sideOffset={8} collisionPadding={12}>
          <div className="me-notif__head">
            <div className="me-notif__titlerow">
              <div>
                <h2 className="me-notif__title">Notifications</h2>
                <div className="me-notif__sub">
                  {counts.unread ? `${counts.unread} unread` : 'All caught up'}
                  {counts.action ? ` · ${counts.action} need you` : ''}
                </div>
              </div>
              {counts.unread > 0 && (
                <button type="button" className="me-textbtn" onClick={markAll}>Mark all read</button>
              )}
            </div>
            <div className="me-notif__tabs" role="tablist" aria-label="Filter notifications">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className="me-notif-tab"
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  {f.id !== 'all' && counts[f.id] > 0 && <span className="me-notif-tab__n">{counts[f.id]}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="me-notif__list" role="tabpanel">
            {loading && items.length === 0 && (
              <div className="me-notif__skeleton" aria-label="Loading notifications"><div /><div /><div /></div>
            )}

            {!loading && groups.length === 0 && (
              <div className="me-notif__empty">
                <span className="me-tone me-tone--neutral" aria-hidden="true"><Icon name="bell" size={18} /></span>
                <strong>{filter === 'action' ? 'Nothing waiting on you' : filter === 'unread' ? 'No unread notifications' : "You're all caught up"}</strong>
                <p>Assignments, approvals and rate requests appear here the moment they happen.</p>
              </div>
            )}

            {groups.map(([label, list]) => (
              <div key={label} role="group" aria-label={label}>
                <div className="me-notif__group">{label}</div>
                {list.map(n => {
                  const meta = notifMeta(n.type)
                  const unread = !n.is_read
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className="me-notif-item"
                      data-unread={unread ? 'true' : 'false'}
                      onClick={() => openItem(n)}
                    >
                      <span className={`me-tone me-tone--${meta.tone}`} aria-hidden="true">
                        <Icon name={meta.icon} size={18} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="me-notif-item__title">{n.title}</span>
                        {n.body && <span className="me-notif-item__body">{n.body}</span>}
                        <span className="me-notif-item__meta">
                          <i>{meta.label}</i><span aria-hidden="true">·</span><time dateTime={n.created_at}>{timeAgo(n.created_at)}</time>
                        </span>
                      </span>
                      <span className="me-notif-item__side">
                        {unread && <span className="me-notif-item__dot" aria-label="Unread" />}
                        {unread && meta.cta && <span className="me-notif-item__cta">{meta.cta}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="me-notif__foot">Latest {items.length} · select one to open it</div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
