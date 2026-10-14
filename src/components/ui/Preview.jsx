import { useState } from 'react'
import {
  Button, Badge, Avatar, Card, Input, Modal, Eyebrow, PageTitle, MeMark,
  Tabs, EmptyState, LoadingSkeleton, ErrorState,
  toast, ToastHost, ConfirmHost, confirmAction, OtpInput, HoldButton, DeviceFrame,
} from './index.js'
import NotificationBell from '../NotificationBell.jsx'

/* Fictional sample data only (screenshot gate: no real clients). */
const ago = (m) => new Date(Date.now() - m * 60000).toISOString()
const SAMPLE = [
  { id: '1', type: 'approval_required', title: 'Event pending your approval', body: 'Northwind Annual Summit 2026 · Mumbai · ₹1.8Cr', is_read: false, created_at: ago(4), event_id: 'e1', entity_type: 'event' },
  { id: '2', type: 'task_assigned', title: 'New task assigned to you', body: 'Confirm hotel rooming list · Northwind Annual Summit 2026', is_read: false, created_at: ago(38), event_id: 'e1', entity_type: 'task' },
  { id: '3', type: 'rate_card_requested', title: 'Rate card requested', body: 'Riya Kapoor asked for rates · P3.9 LED wall 8×6ft · LED & Video', is_read: false, created_at: ago(95), entity_type: 'rate_card' },
  { id: '4', type: 'task_completed', title: 'Task completed', body: 'Stage carpentry sign-off → Done · Lumen Dealer Meet', is_read: true, created_at: ago(60 * 20), event_id: 'e2', entity_type: 'task' },
  { id: '5', type: 'event_assigned', title: 'You have been added to an event', body: 'Lumen Dealer Meet 2026', is_read: true, created_at: ago(60 * 30), event_id: 'e2', entity_type: 'event' },
  { id: '6', type: 'reminder', title: 'Reminder from Arjun Mehta', body: 'Reminder: You have elements assigned on Lumen Dealer Meet 2026.', is_read: true, created_at: ago(60 * 24 * 3), event_id: 'e2', entity_type: 'event' },
]
const loadSample = () => Promise.resolve(SAMPLE)

/* Dev-only preview of the Phase-0 shared primitives. Served via /ui-preview.html in dev;
   NOT part of the production build. Used to smoke-test the primitives against the design system. */

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 'var(--space-12)' }}>
      <Eyebrow style={{ marginBottom: 'var(--space-4)' }}>{title}</Eyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>{children}</div>
    </section>
  )
}

export function Preview() {
  const [tab, setTab] = useState('elements')
  const [modal, setModal] = useState(false)
  const [otp, setOtp] = useState('4829')
  const [confirmed, setConfirmed] = useState('')
  const [unread, setUnread] = useState(3)
  const [went, setWent] = useState('')
  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', padding: 'var(--space-12) var(--space-8)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <PageTitle sub="Phase 0 · shared primitives — dev preview (not shipped to prod). Smoke-test against the design system.">UI Primitives</PageTitle>

        <Section title="Buttons">
          <Button variant="primary">Save changes</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="destructive">Archive event</Button>
          <Button variant="ghost">More actions</Button>
          <Button variant="brand">Start free trial →</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
        </Section>

        <Section title="Badges (semantic states)">
          <Badge tone="success" dot>Done</Badge>
          <Badge tone="info" dot>In progress</Badge>
          <Badge tone="warning" dot>At risk</Badge>
          <Badge tone="danger" dot>Overdue</Badge>
          <Badge tone="neutral">Draft</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="brand">Vendor</Badge>
        </Section>

        <Section title="Avatars — rounded square, never circle">
          <Avatar name="Vikram Singh" tone="teal" />
          <Avatar name="Project Head" tone="accent" />
          <Avatar name="A B" tone="ink" />
          <Avatar name="Aqua Q" tone="aqua" size={44} />
          <Avatar name="Dim" tone="dim" size={24} />
        </Section>

        <Section title="Cards">
          <Card style={{ width: 220 }}><strong>Default</strong><p style={{ margin: '6px 0 0', color: 'var(--app-text-dim)', fontSize: 13 }}>Bordered · elev-1</p></Card>
          <Card hover style={{ width: 220 }}><strong>Hover</strong><p style={{ margin: '6px 0 0', color: 'var(--app-text-dim)', fontSize: 13 }}>Lifts to elev-2</p></Card>
          <Card surface style={{ width: 220 }}><strong>Surface</strong><p style={{ margin: '6px 0 0', color: 'var(--app-text-dim)', fontSize: 13 }}>Inset · no shadow</p></Card>
        </Section>

        <Section title="Inputs">
          <div style={{ width: 260 }}><Input label="Email" placeholder="you@agency.in" /></div>
          <div style={{ width: 260 }}><Input label="Rate" mono placeholder="2,40,000" helper="DM Mono · tabular" /></div>
          <div style={{ width: 260 }}><Input label="City" error="Required" placeholder="Mumbai" /></div>
        </Section>

        <Section title="Tabs — red underline draws L→R, never a filled pill">
          <div style={{ width: '100%' }}>
            <Tabs
              tabs={[{ id: 'elements', label: 'Elements' }, { id: 'tasks', label: 'Tasks' }, { id: 'cost', label: 'Cost' }, { id: 'documents', label: 'Documents' }]}
              active={tab}
              onChange={setTab}
            />
            <p style={{ color: 'var(--app-text-dim)', fontSize: 13, marginTop: 12 }}>Active: {tab}</p>
          </div>
        </Section>

        <Section title="Modal — blurred warm-ink backdrop · destructive confirm">
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Modal
            open={modal} onClose={() => setModal(false)}
            eyebrow="Confirm" title="Archive this event?" destructive
            actions={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button variant="destructive" onClick={() => setModal(false)}>Archive</Button></>}
          >
            Archiving moves it out of the active list. Nothing is deleted — soft archive only.
          </Modal>
        </Section>

        <Section title="States — empty / loading / error">
          <Card style={{ width: 300 }}><EmptyState icon="events" line="No events yet. Your first one starts here." cta="Create event" onCta={() => {}} /></Card>
          <Card style={{ width: 300 }}><LoadingSkeleton lines={4} /></Card>
          <div style={{ width: 300 }}><ErrorState line="Couldn't load events." onRetry={() => {}} /></div>
        </Section>

        <Section title="Notification centre — Radix Popover · filters · grouped · every item opens its target">
          <div id="notif-demo" style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--app-border)', paddingBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--app-text-dim)' }}>{went ? `Would open → ${went}` : 'Header bar'}</span>
            <NotificationBell userId="preview" unreadCount={unread} load={loadSample}
              onMarkAllRead={(k) => setUnread(c => (k === 'all' ? 0 : Math.max(0, c - 1)))}
              onNavigate={(t) => setWent(JSON.stringify(t))} />
          </div>
        </Section>

        <Section title="Toasts — Sonner (unstyled) in ME tokens">
          <Button variant="secondary" onClick={() => toast.show({ title: 'New task assigned to you', body: 'Confirm hotel rooming list · Northwind Annual Summit 2026', tone: 'assign', icon: 'taskAssigned', action: { label: 'Open task', onClick: () => {} } })}>Live notification</Button>
          <Button variant="secondary" onClick={() => toast.success('Event archived', { body: 'Lumen Dealer Meet 2026 moved to Archived.' })}>Success</Button>
          <Button variant="secondary" onClick={() => toast.error("Couldn't save the element", { body: 'Check your connection and try again.' })}>Error</Button>
        </Section>

        <Section title="Confirm — Radix AlertDialog, replaces window.confirm()">
          <Button variant="secondary" onClick={async () => setConfirmed(String(await confirmAction({ title: 'Archive this event?', body: 'Lumen Dealer Meet 2026 moves out of the active list. Nothing is deleted.', confirmLabel: 'Archive', destructive: true })))}>Archive event…</Button>
          <Button variant="secondary" onClick={async () => setConfirmed(String(await confirmAction({ title: 'Remove workspace member?', body: 'They lose access to every event in this workspace.', confirmLabel: 'Remove', destructive: true, requireText: 'Riya Kapoor' })))}>Typed confirm…</Button>
          <span style={{ fontSize: 13, color: 'var(--app-text-dim)', alignSelf: 'center' }}>{confirmed && `Result: ${confirmed}`}</span>
        </Section>

        <Section title="OTP — input-otp · paste, autofill, screen readers">
          <OtpInput value={otp} onChange={setOtp} />
          <OtpInput value="482916" onChange={() => {}} />
          <OtpInput value="48" onChange={() => {}} error />
        </Section>

        <Section title="Hold to confirm — Admin destructive actions">
          <HoldButton doneLabel="User suspended" onConfirm={() => {}}>Hold to suspend user</HoldButton>
        </Section>

        <Section title="Device frames — landing only · mark until 2x recapture">
          <div style={{ background: 'var(--app-ratecard-dark)', padding: 24, borderRadius: 'var(--radius-lg)', display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}><DeviceFrame kind="browser" url="myoozz.events/app" caption="Your workspace" /></div>
            <DeviceFrame kind="tablet" caption="At the venue" style={{ width: 200 }} />
            <DeviceFrame kind="phone" caption="On ground" style={{ width: 120 }} />
          </div>
        </Section>

        <Section title="Logo — supplied mark, tints via currentColor (monochrome)">
          <div style={{ color: 'var(--app-ink)' }}><MeMark size={40} /></div>
          <div style={{ color: 'var(--brand-teal)' }}><MeMark size={40} /></div>
          <div style={{ background: 'linear-gradient(180deg,#00485A,#003D4D)', padding: 16, borderRadius: 'var(--radius-md)', color: '#fff' }}><MeMark size={40} /></div>
        </Section>
      </div>
      <ToastHost />
      <ConfirmHost />
    </div>
  )
}
