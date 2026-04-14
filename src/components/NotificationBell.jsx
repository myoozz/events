// ============================================================
// NotificationBell.jsx
// Myoozz Events — Phase C
// Path: src/components/NotificationBell.jsx
// ============================================================
// Bell icon in AppShell header.
// Shows unread badge count.
// Click opens dropdown log (last 30 notifications).
// Mark individual or all as read.
// Realtime subscription handled in AppShell — this is display only.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIF_META,
  timeAgo,
} from '../utils/notificationService';

export default function NotificationBell({ userId, unreadCount, onMarkAllRead }) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState([]);
  const [loading, setLoading]         = useState(false);
  const dropdownRef                   = useRef(null);

  // ── Load notifications when dropdown opens ──────────────────
  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    fetchNotifications(userId, 30).then((data) => {
      setNotifs(data);
      setLoading(false);
    });
  }, [open, userId]);

  // ── Close on outside click ───────────────────────────────────
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // ── Mark single as read ──────────────────────────────────────
  async function handleMarkRead(notif) {
    if (notif.is_read) return;
    await markNotificationRead(notif.id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    if (onMarkAllRead) onMarkAllRead('single');
  }

  // ── Mark all as read ─────────────────────────────────────────
  async function handleMarkAll() {
    await markAllNotificationsRead(userId);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (onMarkAllRead) onMarkAllRead('all');
  }

  const hasUnread = unreadCount > 0;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>

      {/* ── Bell Button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          position:        'relative',
          background:      'none',
          border:          'none',
          cursor:          'pointer',
          padding:         '6px',
          borderRadius:    '8px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          transition:      'background 0.15s',
          backgroundColor: open ? '#f5f0ef' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = '#f5f0ef'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {/* Bell SVG */}
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke={hasUnread ? '#bc1723' : '#6b6b6b'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          {hasUnread && (
            <circle cx="18" cy="5" r="4" fill="#bc1723" stroke="#FAFAF8" strokeWidth="1.5" />
          )}
        </svg>

        {/* Badge */}
        {hasUnread && (
          <span style={{
            position:      'absolute',
            top:           '2px',
            right:         '2px',
            minWidth:      '16px',
            height:        '16px',
            borderRadius:  '8px',
            backgroundColor: '#bc1723',
            color:         '#fff',
            fontSize:      '10px',
            fontFamily:    'DM Sans, sans-serif',
            fontWeight:    '700',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            padding:       '0 3px',
            lineHeight:    1,
            border:        '1.5px solid #FAFAF8',
            pointerEvents: 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div style={{
          position:     'absolute',
          top:          'calc(100% + 8px)',
          right:        0,
          width:        '340px',
          maxHeight:    '480px',
          background:   '#FAFAF8',
          borderRadius: '12px',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
          border:       '1px solid #ede8e4',
          zIndex:       1000,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}>

          {/* Header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '14px 16px 10px',
            borderBottom:   '1px solid #ede8e4',
            flexShrink:     0,
          }}>
            <span style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize:   '17px',
              fontWeight: '600',
              color:      '#1a1a1a',
            }}>
              Notifications
            </span>
            {hasUnread && (
              <button
                onClick={handleMarkAll}
                style={{
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  fontSize:    '12px',
                  fontFamily:  'DM Sans, sans-serif',
                  color:       '#bc1723',
                  fontWeight:  '500',
                  padding:     '2px 6px',
                  borderRadius:'4px',
                  transition:  'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fdf0f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>

            {loading && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9a9a9a', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                Loading…
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9a9a9a' }}>
                  You're all caught up
                </div>
              </div>
            )}

            {!loading && notifications.map((notif) => {
              const meta = NOTIF_META[notif.type] || { icon: '📌', colour: '#6b6b6b', label: '' };
              return (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif)}
                  style={{
                    display:         'flex',
                    alignItems:      'flex-start',
                    gap:             '10px',
                    padding:         '12px 16px',
                    borderBottom:    '1px solid #f0ebe6',
                    cursor:          notif.is_read ? 'default' : 'pointer',
                    backgroundColor: notif.is_read ? 'transparent' : '#fff8f8',
                    transition:      'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!notif.is_read) e.currentTarget.style.backgroundColor = '#fdf0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : '#fff8f8';
                  }}
                >
                  {/* Icon circle */}
                  <div style={{
                    width:          '34px',
                    height:         '34px',
                    borderRadius:   '50%',
                    backgroundColor: `${meta.colour}15`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '15px',
                    flexShrink:     0,
                    marginTop:      '1px',
                  }}>
                    {meta.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily:  'DM Sans, sans-serif',
                      fontSize:    '13px',
                      fontWeight:  notif.is_read ? '400' : '600',
                      color:       '#1a1a1a',
                      lineHeight:  '1.35',
                      marginBottom:'2px',
                    }}>
                      {notif.title}
                    </div>
                    {notif.body && (
                      <div style={{
                        fontFamily:   'DM Sans, sans-serif',
                        fontSize:     '12px',
                        color:        '#6b6b6b',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '3px',
                      }}>
                        {notif.body}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize:   '11px',
                      color:      '#aaa',
                    }}>
                      {timeAgo(notif.created_at)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div style={{
                      width:           '7px',
                      height:          '7px',
                      borderRadius:    '50%',
                      backgroundColor: '#bc1723',
                      flexShrink:      0,
                      marginTop:       '5px',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding:       '10px 16px',
              borderTop:     '1px solid #ede8e4',
              textAlign:     'center',
              flexShrink:    0,
            }}>
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize:   '11px',
                color:      '#bbb',
              }}>
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
