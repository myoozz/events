import { useState, useEffect, useRef } from 'react'
import { version } from '../../package.json'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import TeamView from './TeamView'
import AnalyticsDashboard from './AnalyticsDashboard'
import EarlyAccess from './EarlyAccess'
import RateCard from './RateCard'
import FeedbackButton from './FeedbackButton'
import FeedbackAdmin from './FeedbackAdmin'
import ActivityLog from './ActivityLog'
import ProfilePage from './ProfilePage'
import NotificationBell from './NotificationBell'
import { fetchUnreadCount, subscribeToNotifications } from '../utils/notificationService'

const NAV_ITEMS = [
  {
    key: 'events',
    label: 'Events',
    roles: ['admin', 'manager', 'event_lead', 'team'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} />
        <rect x="10" y="2" width="6" height="6" rx="1.5" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} opacity="0.5" />
        <rect x="2" y="10" width="6" height="6" rx="1.5" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} opacity="0.5" />
        <rect x="10" y="10" width="6" height="6" rx="1.5" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} opacity="0.3" />
      </svg>
    ),
  },
  {
    key: 'team',
    label: 'Team',
    roles: ['admin', 'manager'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="7" cy="6" r="3" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} />
        <circle cx="13" cy="7" r="2" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} opacity="0.5" />
        <path d="M1 15c0-3 2.7-5 6-5s6 2 6 5" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M13 10c2 0 4 1.5 4 4" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'activitylog',
    label: 'Activity log',
    roles: ['admin'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="2" width="12" height="14" rx="1.5" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" fill="none"/>
        <path d="M6 6h6M6 9h6M6 12h4" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" strokeLinecap="round" opacity={active ? 1 : 0.6}/>
      </svg>
    ),
  },
  {
    key: 'earlyaccess',
    label: 'Early access',
    roles: ['admin'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L11 7H16L12 10.5L13.5 16L9 13L4.5 16L6 10.5L2 7H7L9 2Z" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} />
      </svg>
    ),
  },
  {
    key: 'feedback',
    label: 'Feedback',
    roles: ['admin'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 3V4z" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'ratecard',
    label: 'Rate cards',
    roles: ['admin', 'manager', 'event_lead'],
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="1.5" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" fill="none"/>
        <path d="M6 9h6M6 12h4" stroke={active ? 'var(--text)' : 'var(--text-tertiary)'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill={active ? 'var(--text)' : 'var(--text-tertiary)'} opacity="0.6"/>
      </svg>
    ),
  },
]

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', event_lead: 'Event Lead', team: 'Team' }
const ROLE_COLORS = {
  admin:      { bg: 'var(--green-light)', color: 'var(--green)' },
  manager:    { bg: '#EFF6FF',            color: '#1D4ED8'      },
  event_lead: { bg: '#FEF3C7',            color: '#92400E'      },
  team:       { bg: 'var(--bg)',          color: 'var(--text-secondary)' },
}

const userInitials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

export default function AppShell({ session }) {
  const navigate = useNavigate()
  const [userRole,    setUserRole]    = useState(null)
  const [userName,    setUserName]    = useState('')
  const [userId,      setUserId]      = useState(null)   // ← own DB UUID
  const [userLoading, setUserLoading] = useState(true)
  const [activeTab,   setActiveTab]   = useState('events')
  const [profileUserId, setProfileUserId] = useState(null)  // whose profile is open
  const [prevTab,     setPrevTab]     = useState('events')  // to go back from profile
  const [collapsed,   setCollapsed]   = useState(false)
  const [isMobile,    setIsMobile]    = useState(typeof window !== 'undefined' && window.innerWidth < 768)

  // Phase C — Notifications
  const [unreadCount,  setUnreadCount]  = useState(0)
  const unsubNotifRef = useRef(null)  // holds realtime unsubscribe fn

  // Bug 10 — increment this to tell Dashboard to go back to events list
  const [dashboardResetKey, setDashboardResetKey] = useState(0)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function fetchUser() {
      const timeout = setTimeout(() => {
        setUserRole('admin')
        setUserName(session.user.email)
        setUserId(session.user.id)
        setUserLoading(false)
      }, 4000)
      try {
        const { data } = await supabase
          .from('users')
          .select('id, role, full_name')   // ← added id
          .eq('email', session.user.email)
          .single()
        clearTimeout(timeout)
        if (data) {
          setUserRole(data.role)
          setUserName(data.full_name || session.user.email)
          setUserId(data.id)               // ← store id
        } else {
          setUserRole('admin')
          setUserName(session.user.email)
          setUserId(session.user.id)
        }
      } catch (err) {
        clearTimeout(timeout)
        console.error('fetchUser error:', err)
        setUserRole('admin')
        setUserName(session.user.email)
        setUserId(session.user.id)
      } finally {
        setUserLoading(false)
      }
    }
    fetchUser()
  }, [session])

  // Phase C — fetch initial unread count + subscribe to realtime once userId is known
  useEffect(() => {
    if (!userId) return

    // Initial badge count
    fetchUnreadCount(userId).then(setUnreadCount)

    // Realtime — new notification → increment badge instantly
    unsubNotifRef.current = subscribeToNotifications(userId, () => {
      setUnreadCount(c => c + 1)
    })

    // Cleanup on unmount or userId change
    return () => {
      if (unsubNotifRef.current) unsubNotifRef.current()
    }
  }, [userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Phase C — called by NotificationBell when user marks read
  function handleMarkAllRead(type) {
    if (type === 'all') {
      setUnreadCount(0)
    } else {
      // single mark-read — decrement, floor at 0
      setUnreadCount(c => Math.max(0, c - 1))
    }
  }

  // Bug 10 — clicking 'Events' while already on events goes back to the list
  function handleNavClick(key) {
    if (key === 'events' && activeTab === 'events') {
      setDashboardResetKey(k => k + 1)
    }
    // leaving profile — clear profileUserId
    if (activeTab === 'profile' && key !== 'profile') {
      setProfileUserId(null)
    }
    setActiveTab(key)
  }

  // ← NEW: open any user's profile (own or another)
  function openProfile(targetUserId) {
    setPrevTab(activeTab === 'profile' ? prevTab : activeTab)
    setProfileUserId(targetUserId)
    setActiveTab('profile')
  }

  // ← NEW: back from profile → return to where they came from
  function closeProfile() {
    setProfileUserId(null)
    setActiveTab(prevTab)
  }

  const sidebarWidth  = collapsed ? '60px' : '220px'
  const visibleItems  = NAV_ITEMS.filter(item => item.roles.includes(userRole))
  const ini           = userInitials(userName)

  if (userLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF8', fontFamily: 'sans-serif', gap: '12px',
    }}>
      <div style={{
        width: '28px', height: '28px', background: '#bc1723', borderRadius: '7px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: '#fff',
      }}>ME</div>
      <p style={{ fontSize: '13px', color: '#9C9488' }}>Loading your workspace...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', fontFamily: 'var(--font-body)' }}>

      {/* ── Sidebar — desktop only ── */}
      {!isMobile && (
        <div style={{
          width: sidebarWidth,
          minHeight: '100vh',
          background: 'var(--bg)',
          borderRight: '0.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
        }}>

          {/* Logo area */}
          <div style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '0.5px solid var(--border)',
            flexShrink: 0,
          }}>
            {!collapsed && (
              <div
                onClick={() => handleNavClick('events')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <img
                  src="/myoozz-logo-light.png"
                  alt="Myoozz Events"
                  style={{ height: '26px', objectFit: 'contain', display: 'block' }}
                  onError={e => {
                    e.target.style.display = 'none'
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'
                  }}
                />
                <div style={{
                  display: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px', fontWeight: 500,
                  color: 'var(--text)', letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                }}>
                  events <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>by myoozz</span>
                </div>
              </div>
            )}
            {collapsed && (
              <div
                style={{
                  width: '28px', height: '28px',
                  background: '#bc1723', borderRadius: '7px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff',
                  cursor: 'pointer', flexShrink: 0,
                  fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.5px',
                }}
                onClick={() => handleNavClick('events')}
                title="Myoozz Events"
              >
                ME
              </div>
            )}
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            {visibleItems.map(item => {
              const active = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  title={collapsed ? item.label : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active ? 'var(--bg-secondary)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    marginBottom: '2px',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.background = 'none' }}
                >
                  {item.icon(active)}
                  {!collapsed && (
                    <span style={{
                      fontSize: '13px',
                      fontWeight: active ? 500 : 400,
                      color: active ? 'var(--text)' : 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Bottom section */}
          <div style={{ padding: '12px 8px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>

            {/* ── User pill — clickable → own profile ── */}
            {!collapsed && (
              <button
                onClick={() => openProfile(userId)}
                title="View your profile"
                style={{
                  width: '100%', padding: '10px 12px', marginBottom: '4px',
                  borderRadius: 'var(--radius-sm)', background: activeTab === 'profile' && profileUserId === userId
                    ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                  border: activeTab === 'profile' && profileUserId === userId
                    ? '1px solid #bc1723' : '1px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#bc1723' }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor =
                    (activeTab === 'profile' && profileUserId === userId) ? '#bc1723' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* initials circle */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#bc1723',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {ini || userName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userName}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {ROLE_LABELS[userRole] || userRole}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* collapsed state — initials circle only, clickable */}
            {collapsed && (
              <button
                onClick={() => openProfile(userId)}
                title="Your profile"
                style={{
                  width: '100%', padding: '8px 0', marginBottom: '4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#bc1723',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff',
                  outline: (activeTab === 'profile' && profileUserId === userId) ? '2px solid #bc1723' : 'none',
                  outlineOffset: '2px',
                }}>
                  {ini || userName.charAt(0).toUpperCase()}
                </div>
              </button>
            )}

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px', width: '100%',
                padding: collapsed ? '10px 0' : '10px 12px',
                background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', marginBottom: '2px',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                {collapsed
                  ? <path d="M6 4l5 5-5 5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : <path d="M12 4l-5 5 5 5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                }
              </svg>
              {!collapsed && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Collapse</span>}
            </button>

            {/* Version */}
            {!collapsed && (
              <div style={{
                padding: '8px 16px', fontSize: '10px',
                color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  padding: '1px 6px', border: '0.5px solid var(--border-strong)',
                  borderRadius: '3px', fontSize: '9px', fontWeight: 600,
                  letterSpacing: '0.5px', color: 'var(--text-tertiary)',
                }}>BETA</span>
                <span>v{version}</span>
              </div>
            )}

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title={collapsed ? 'Sign out' : ''}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px', width: '100%',
                padding: collapsed ? '10px 0' : '10px 12px',
                background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 3H4a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 12l3-3-3-3M15 9H7" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {!collapsed && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sign out</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '56px', background: 'var(--bg)',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {[
            { key: 'events', icon: '📋', label: 'Events' },
            ...((userRole === 'admin' || userRole === 'manager') ? [{ key: 'team', icon: '👥', label: 'Team' }] : []),
            ...(userRole === 'admin' ? [{ key: 'activitylog', icon: '📋', label: 'Log' }] : []),
            ...((userRole === 'admin' || userRole === 'manager' || userRole === 'event_lead') ? [{ key: 'ratecard', icon: '₹', label: 'Rates' }] : []),
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 12px',
                color: activeTab === item.key ? 'var(--text)' : 'var(--text-tertiary)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-body)', fontWeight: activeTab === item.key ? 500 : 400 }}>
                {item.label}
              </span>
            </button>
          ))}

          {/* Profile button — mobile */}
          <button
            onClick={() => openProfile(userId)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 12px', position: 'relative',
            }}
          >
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: activeTab === 'profile' ? '#bc1723' : 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, color: '#fff',
              position: 'relative',
            }}>
              {ini || userName.charAt(0).toUpperCase()}
              {/* Unread dot on mobile Me button */}
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#bc1723', border: '1.5px solid var(--bg)',
                }} />
              )}
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-body)', color: activeTab === 'profile' ? 'var(--text)' : 'var(--text-tertiary)', fontWeight: activeTab === 'profile' ? 500 : 400 }}>
              Me
            </span>
          </button>

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 12px', color: 'var(--text-tertiary)',
            }}
          >
            <span style={{ fontSize: '18px' }}>↩</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>Sign out</span>
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : sidebarWidth,
        transition: 'margin-left 0.2s ease',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* ── Notification top bar ── */}
        <div style={{
          height:          '48px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'flex-end',
          padding:         '0 32px',
          borderBottom:    '0.5px solid var(--border)',
          background:      'var(--bg)',
          position:        'sticky',
          top:             0,
          zIndex:          40,
          flexShrink:      0,
        }}>
          <NotificationBell
            userId={userId}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>

      <main style={{
          flex: 1,
          maxWidth: '960px', margin: '0 auto', width: '100%',
          padding: isMobile ? '16px' : '40px 32px',
        }}>
          {activeTab === 'events' && (
            <Dashboard
              userRole={userRole}
              session={session}
              userName={userName}
              resetKey={dashboardResetKey}
            />
          )}
          {activeTab === 'analytics' && (
        <AnalyticsDashboard userId={userId} userRole={userRole} />
      )}
      {activeTab === 'team' && (userRole === 'admin' || userRole === 'manager') && (
            <div>
              <TeamView
                userId={session?.user?.id}
                userRole={userRole}
                onViewProfile={openProfile}
              />
              <UserManagement
                session={session}
                userRole={userRole}
                onViewProfile={openProfile}
              />
            </div>
          )}
          {activeTab === 'activitylog' && userRole === 'admin' && (
            <ActivityLog />
          )}
          {activeTab === 'earlyaccess' && userRole === 'admin' && (
            <EarlyAccess />
          )}
          {activeTab === 'ratecard' && (userRole === 'admin' || userRole === 'manager' || userRole === 'event_lead') && (
            <RateCard session={session} />
          )}
          {activeTab === 'feedback' && userRole === 'admin' && (
            <FeedbackAdmin />
          )}

          {/* ── Profile screen ── */}
          {activeTab === 'profile' && profileUserId && (
            <ProfilePage
              profileUserId={profileUserId}
              session={session}
              userRole={userRole}
              onBack={closeProfile}
            />
          )}
        </main>

        {/* App footer */}
        {!isMobile && (
          <footer style={{
            maxWidth: '960px', margin: '0 auto', width: '100%',
            padding: '20px 32px 28px',
            borderTop: '0.5px solid var(--border)',
          }}>
            <p style={{
              fontSize: '11px', color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-body)', textAlign: 'center',
              lineHeight: 1.6,
            }}>
              Myoozz Events · Myoozz Consulting Pvt. Ltd. · Born in India · Built for the world
            </p>
          </footer>
        )}
      </div>

      {/* Feedback button — always visible */}
      <FeedbackButton session={session} />
    </div>
  )
}
