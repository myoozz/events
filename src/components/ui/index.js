/*
 * Shared UI primitive layer — the single source every screen imports from.
 * No screen re-implements these. (Phase 0 of the app-screens redesign.)
 * Ported from the ME Design System me-app kit `Primitives.jsx`; gap pieces (Tabs,
 * EmptyState, LoadingSkeleton, ErrorState) built to Guidelines V2 §06/§07 — see each file.
 */
export { Button } from './Button'
export { Badge } from './Badge'
export { Avatar } from './Avatar'
export { Card } from './Card'
export { Input } from './Input'
export { Modal } from './Modal'
export { Eyebrow } from './Eyebrow'
export { PageTitle } from './PageTitle'
export { MeMark } from './MeMark'
export { Tabs } from './Tabs'
export { EmptyState } from './EmptyState'
export { LoadingSkeleton } from './LoadingSkeleton'
export { ErrorState } from './ErrorState'

/* Oct 2026 — behaviour from audited open-source packages (pinned, MIT), look from ME tokens.
   Styles for these live in me-ui.css (needs :hover / :focus-visible / [data-state]). */
import './me-ui.css'
export { toast, ToastHost } from './Toast'
export { ConfirmDialog, ConfirmHost, confirmAction } from './ConfirmDialog'
export { OtpInput } from './OtpInput'
export { HoldButton } from './HoldButton'
export { DeviceFrame } from './DeviceFrame'
