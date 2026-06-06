import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { version } from '../../package.json'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import TeamView from './TeamView'
import AnalyticsDashboard from './AnalyticsDashboard'
import RateCard from './RateCard'
import CategoryManager from './CategoryManager'
import FeedbackButton from './FeedbackButton'
import FeedbackAdmin from './FeedbackAdmin'
import ActivityLog from './ActivityLog'
import ProfilePage from './ProfilePage'
import NotificationBell from './NotificationBell'
import { fetchUnreadCount, subscribeToNotifications } from '../utils/notificationService'
import { Icon } from '../icons'
import SuperAdminPanel from './SuperAdminPanel'
import OnboardingModal from './OnboardingModal'

// Nav icons resolve through the shared icon module (src/icons.jsx). On the teal
// rail the scoped --text override makes the active icon white via currentColor.
const NAV_ITEMS = [
  { key: 'events',      label: 'Events',       roles: ['admin', 'manager', 'event_lead', 'team'], icon: 'events' },
  { key: 'team',        label: 'Team',         roles: ['admin', 'manager'],                        icon: 'team' },
  { key: 'activitylog', label: 'Activity log', roles: ['admin'],                                   icon: 'activitylog' },
  { key: 'feedback',    label: 'Feedback',     roles: ['admin'],                                   icon: 'feedback' },
  { key: 'ratecard',    label: 'Rate cards',   roles: ['admin', 'manager', 'event_lead'],          icon: 'ratecard' },
  { key: 'categories',  label: 'Categories',   roles: ['admin'],                                   icon: 'categories' },
]

const ROLE_LABELS = { admin: 'Admin', manager: 'Project Head', event_lead: 'Manager', team: 'Project Team' }
const ROLE_COLORS = {
  admin:      { bg: 'var(--green-light)', color: 'var(--green)' },
  manager:    { bg: 'var(--state-info-bg)',            color: 'var(--state-info)'      },
  event_lead: { bg: 'var(--state-warning-bg)',            color: 'var(--state-warning)'      },
  team:       { bg: 'var(--bg)',          color: 'var(--text-secondary)' },
}

const userInitials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

export default function AppShell({ session }) {
  const navigate = useNavigate()
  const [userRole,           setUserRole]           = useState(null)
  const [userName,           setUserName]           = useState('')
  const [userId,             setUserId]             = useState(null)
  const [canManageRateCards, setCanManageRateCards] = useState(false)
  const [userLoading,        setUserLoading]        = useState(true)
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

  const [tenantInfo,    setTenantInfo]    = useState(null)
  const [tenantId,      setTenantId]      = useState(null)
  const [tenantLoading, setTenantLoading] = useState(true)
  const [platformRole,  setPlatformRole]  = useState(null)
  const [welcomedAt,    setWelcomedAt]    = useState(undefined)  // undefined = not yet fetched

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
          .select('id, role, full_name, can_manage_rate_cards, welcomed_at')
          .eq('email', session.user.email)
          .single()
        clearTimeout(timeout)
        if (data) {
          setUserRole(data.role)
          setUserName(data.full_name || session.user.email)
          setUserId(data.id)
          setCanManageRateCards(data.can_manage_rate_cards === true)
          setWelcomedAt(data.welcomed_at ?? null)
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

  // Tenant info + platform role — decoded from JWT on mount
  useEffect(() => {
    async function fetchTenant() {
      try {
        const { data: s } = await supabase.auth.getSession()
        const token = s?.session?.access_token
        if (!token) return
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.platform_role) setPlatformRole(payload.platform_role)
        const tid = payload.tenant_id
        if (!tid) return
        setTenantId(tid)
        const { data } = await supabase
          .from('tenants')
          .select('name, trial_ends_at, status, plan')
          .eq('id', tid)
          .single()
        if (data) setTenantInfo(data)
      } catch (err) {
        console.error('fetchTenant error:', err)
      } finally {
        setTenantLoading(false)
      }
    }
    fetchTenant()
  }, [])

  // Redirect super_admin to their tab once platformRole resolves from JWT — initial load only
  const initialRedirectDoneRef = useRef(false)
  useEffect(() => {
    if (initialRedirectDoneRef.current) return
    if (platformRole === 'super_admin' && activeTab === 'events') {
      initialRedirectDoneRef.current = true
      setActiveTab('super-admin')
    }
  }, [platformRole])

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

  function handleOnboardingComplete(action) {
    setWelcomedAt(new Date().toISOString())
    if (action === 'invite-team') setActiveTab('team')
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
  const visibleItems  = NAV_ITEMS.filter(item =>
    item.roles.includes(userRole) &&
    !(platformRole === 'super_admin' && (item.key === 'events' || item.key === 'team'))
  )
  const ini           = userInitials(userName)

  if (userLoading || tenantLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF8', fontFamily: 'sans-serif', gap: '12px',
    }}>
      <div style={{
        width: '28px', height: '28px', background: 'var(--app-accent)', borderRadius: '7px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: '#fff',
      }}>ME</div>
      <p style={{ fontSize: '13px', color: '#9C9488' }}>Loading your workspace...</p>
    </div>
  )

  // ── Tenant gate: pending_review / waitlisted ──────────────────────────────
  if (tenantInfo?.status === 'pending_review' || tenantInfo?.status === 'waitlisted') {
    const caps = [
      { icon: 'elements',  title: 'Event budgets', body: 'Build full budgets with categories, elements, and real-time margins.' },
      { icon: 'delivered', title: 'Task boards', body: 'Kanban-style task tracking with assignees, deadlines, and priorities.' },
      { icon: 'travel',    title: 'Travel planning', body: 'Flights, hotels, and rooming lists — all in one itinerary view.' },
      { icon: 'showflow',  title: 'Production & cue sheets', body: 'Run-of-show timelines and cue sheets, export-ready in seconds.' },
    ]
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', padding: '32px 16px',
      }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'var(--app-accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', fontWeight: 800,
            color: '#fff', margin: '0 auto 24px',
          }}>ME</div>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            Welcome to Myoozz Events.
          </p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '12px' }}>
            We're glad you're here.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '32px' }}>
            We're reviewing your registration and preparing your workspace.
            No auto-emails, no bots — you'll hear from us personally soon.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
            {caps.map(c => (
              <div key={c.title} style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                border: '0.5px solid var(--border)', padding: '16px', textAlign: 'left',
              }}>
                <div style={{ marginBottom: '8px' }}><Icon name={c.icon} size={22} color="var(--app-accent)" /></div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{c.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
          <a
            href="https://demo.myoozz.events"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', marginBottom: '24px',
              fontSize: '13px', color: 'var(--app-accent)', textDecoration: 'none',
              borderBottom: '1px solid rgba(188,23,35,0.4)',
              paddingBottom: '1px',
            }}
          >
            Explore demo data while you wait →
          </a>
          <br />
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px', fontSize: '13px', fontFamily: 'var(--font-body)',
              background: 'none', border: '0.5px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // ── Tenant gate: suspended / expired ─────────────────────────────────────
  if (tenantInfo?.status === 'suspended' || tenantInfo?.status === 'expired') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', padding: '32px 16px',
      }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'var(--bg-secondary)', border: '1.5px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}><Icon name="pause" size={22} color="var(--text-secondary)" /></div>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            Your workspace is paused.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '32px' }}>
            Access to this workspace has been suspended. If you believe this is
            an error, or to reactivate your account, reach out to us.
          </p>
          <a
            href="mailto:hello@myoozz.events"
            style={{
              display: 'inline-block', marginBottom: '16px',
              padding: '10px 24px', fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-body)', color: '#fff',
              background: 'var(--app-accent)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Contact us
          </a>
          <br />
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px', fontSize: '13px', fontFamily: 'var(--font-body)',
              background: 'none', border: '0.5px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', fontFamily: 'var(--font-body)' }}>

      {/* ── Sidebar — desktop only ── */}
      {!isMobile && (
        <div style={{
          width: sidebarWidth,
          minHeight: '100vh',
          /* ── Sanctioned in-app brand anchor: petrol-teal nav rail (per design kit).
             Scoped token overrides re-theme the var-based children for the dark surface. ── */
          background: 'linear-gradient(180deg, #00485A 0%, #003D4D 50%, #00303E 100%)',
          '--text': '#FFFFFF',
          '--text-tertiary': 'rgba(255,255,255,0.55)',
          '--border': 'rgba(255,255,255,0.10)',
          '--border-strong': 'rgba(255,255,255,0.20)',
          '--bg-secondary': 'rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
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
            minHeight: '56px',
            display: 'flex',
            alignItems: collapsed ? 'center' : 'flex-start',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '14px 0' : '14px 16px',
            borderBottom: '0.5px solid var(--border)',
            flexShrink: 0,
          }}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
                whileHover={{ scale: 1.03 }}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px' }}
                onClick={() => handleNavClick('events')}
              >
                {/* Typeset Me mark (locked): M = Poppins 900 white, e = Fraunces italic 900 aqua. Not a PNG. */}
                <span style={{ display: 'inline-flex', alignItems: 'baseline', lineHeight: 0.85 }}>
                  <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 900, fontSize: '26px', color: '#fff', letterSpacing: '-0.04em' }}>M</span>
                  <span style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', fontWeight: 900, fontSize: '26px', color: 'var(--brand-aqua)', marginLeft: '-3px' }}>e</span>
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '10px',
                  color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>Myoozz Events</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: '10px',
                  color: 'var(--brand-aqua)',
                }}>{version}</span>
              </motion.div>
            )}
            {collapsed && (
              <div
                style={{
                  display: 'inline-flex', alignItems: 'baseline', lineHeight: 0.85,
                  cursor: 'pointer', flexShrink: 0,
                }}
                onClick={() => handleNavClick('events')}
                title="Myoozz Events"
              >
                <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 900, fontSize: '20px', color: '#fff', letterSpacing: '-0.04em' }}>M</span>
                <span style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: 'var(--brand-aqua)', marginLeft: '-2px' }}>e</span>
              </div>
            )}
          </div>

          {/* Tenant + Trial strip */}
          {!collapsed && tenantInfo && (
            <div style={{
              padding: '8px 16px',
              borderBottom: '0.5px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: '11px', color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: (tenantInfo.plan === 'trial' && tenantInfo.status === 'active') ? '5px' : 0,
              }}>
                {tenantInfo.name}
              </div>
              {tenantInfo.plan === 'trial' && tenantInfo.status === 'active' && (() => {
                const daysLeft = Math.ceil((new Date(tenantInfo.trial_ends_at) - Date.now()) / 86400000)
                if (daysLeft <= 0) return (
                  <div style={{ fontSize: '11px', color: '#F08A7A', fontWeight: 500 }}>Trial expired</div>
                )
                const color = daysLeft > 7 ? '#5FD37F' : daysLeft >= 4 ? '#F0C040' : '#F08A7A'
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500 }}>
                      {daysLeft}d left
                    </span>
                    <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.14)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (daysLeft / 14) * 100)}%`, height: '100%', background: color, borderRadius: '2px' }} />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

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
                    borderLeft: active ? '2px solid var(--brand-aqua)' : '2px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    marginBottom: '2px',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.background = 'none' }}
                >
                  <Icon name={item.icon} size={18} color={active ? 'var(--text)' : 'var(--text-tertiary)'} />
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

            {/* Platform Admin — super_admin only */}
            {platformRole === 'super_admin' && (
              <div style={{ marginTop: '8px', borderTop: '0.5px solid var(--border)', paddingTop: '8px' }}>
                <button
                  onClick={() => handleNavClick('super-admin')}
                  title={collapsed ? 'Platform Admin' : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: activeTab === 'super-admin' ? 'var(--bg-secondary)' : 'none',
                    border: 'none',
                    borderLeft: activeTab === 'super-admin' ? '2px solid var(--brand-aqua)' : '2px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { if (activeTab !== 'super-admin') e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseOut={e => { if (activeTab !== 'super-admin') e.currentTarget.style.background = 'none' }}
                >
                  <Icon name="platformAdmin" size={16} color={activeTab === 'super-admin' ? 'var(--text)' : 'var(--text-tertiary)'} />
                  {!collapsed && (
                    <span style={{
                      fontSize: '13px',
                      fontWeight: activeTab === 'super-admin' ? 500 : 400,
                      color: activeTab === 'super-admin' ? 'var(--text)' : 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>
                      Platform Admin
                    </span>
                  )}
                </button>
              </div>
            )}
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
                    ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor =
                    (activeTab === 'profile' && profileUserId === userId) ? 'var(--border)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* initials circle */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '7px',
                    background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: 'var(--brand-teal-deep)',
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
                  width: '28px', height: '28px', borderRadius: '7px',
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: 'var(--brand-teal-deep)',
                  outline: (activeTab === 'profile' && profileUserId === userId) ? '2px solid var(--border)' : 'none',
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
              {collapsed
                ? <Icon name="collapse" size={18} color="var(--text-tertiary)" />
                : <Icon name="chevronLeft" size={18} color="var(--text-tertiary)" />}
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
              <Icon name="signOut" size={18} color="var(--text-tertiary)" />
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
            ...(platformRole !== 'super_admin' ? [{ key: 'events', icon: 'events', label: 'Events' }] : []),
            ...((userRole === 'admin' || userRole === 'manager') && platformRole !== 'super_admin' ? [{ key: 'team', icon: 'team', label: 'Team' }] : []),
            ...(userRole === 'admin' ? [{ key: 'activitylog', icon: 'activitylog', label: 'Log' }] : []),
            ...((userRole === 'admin' || canManageRateCards || platformRole === 'super_admin') ? [{ key: 'ratecard', glyph: '₹', label: 'Rates' }] : []),
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
              {item.icon ? <Icon name={item.icon} size={20} /> : <span style={{ fontSize: '18px' }}>{item.glyph}</span>}
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
              width: '22px', height: '22px', borderRadius: '6px',
              background: activeTab === 'profile' ? 'var(--app-accent)' : 'var(--text-tertiary)',
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
                  background: 'var(--app-accent)', border: '1.5px solid var(--bg)',
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
            <Icon name="signOut" size={18} />
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
          {activeTab === 'events' && platformRole !== 'super_admin' && (
            <Dashboard
              userRole={userRole}
              session={session}
              userName={userName}
              userId={userId}
              resetKey={dashboardResetKey}
            />
          )}
          {activeTab === 'analytics' && (
        <AnalyticsDashboard userId={userId} userRole={userRole} />
      )}
      {activeTab === 'team' && (userRole === 'admin' || userRole === 'manager') && platformRole !== 'super_admin' && (
            <div>
              <TeamView
                userId={session?.user?.id}
                userRole={userRole}
                onViewProfile={openProfile}
              />
              <UserManagement
                session={session}
                userRole={userRole}
                tenantId={tenantId}
                onViewProfile={openProfile}
              />
            </div>
          )}
          {activeTab === 'activitylog' && userRole === 'admin' && (
            <ActivityLog />
          )}
          {activeTab === 'ratecard' && (userRole === 'admin' || canManageRateCards || platformRole === 'super_admin') && (
            <RateCard session={session} userRole={userRole} canManageRateCards={canManageRateCards} />
          )}
          {activeTab === 'categories' && userRole === 'admin' && (
            <CategoryManager userRole={userRole} />
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

      {/* SuperAdminPanel — full-screen takeover overlay */}
      <AnimatePresence>
        {activeTab === 'super-admin' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1000,
              background: 'var(--app-bg)',
              overflow: 'hidden',
            }}
          >
            <SuperAdminPanel
              userId={userId}
              userRole={userRole}
              onClose={() => setActiveTab('events')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback button — always visible */}
      <FeedbackButton session={session} />

      {/* Onboarding — first login, admin only, welcomed_at IS NULL, tenant active */}
      {!userLoading && welcomedAt === null && tenantInfo?.status === 'active' && userRole === 'admin' && tenantId && userId && (
        <OnboardingModal
          userId={userId}
          tenantId={tenantId}
          tenantName={tenantInfo?.name}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  )
}
