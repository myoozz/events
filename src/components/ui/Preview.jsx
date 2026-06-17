import { useState } from 'react'
import {
  Button, Badge, Avatar, Card, Input, Modal, Eyebrow, PageTitle, MeMark,
  Tabs, EmptyState, LoadingSkeleton, ErrorState,
} from './index.js'

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

        <Section title="Logo — supplied mark, tints via currentColor (monochrome)">
          <div style={{ color: 'var(--app-ink)' }}><MeMark size={40} /></div>
          <div style={{ color: 'var(--brand-teal)' }}><MeMark size={40} /></div>
          <div style={{ background: 'linear-gradient(180deg,#00485A,#003D4D)', padding: 16, borderRadius: 'var(--radius-md)', color: '#fff' }}><MeMark size={40} /></div>
        </Section>
      </div>
    </div>
  )
}
