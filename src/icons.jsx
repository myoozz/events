// src/icons.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all app icons (Phase 1 — default Lucide).
// Concept → Lucide component is defined ONCE here and reused on every surface.
// Do NOT scatter ad-hoc `lucide-react` imports across components, and never use
// emoji as icons — add/rename a concept here instead.
//
// House stroke spec (Phase 0): strokeWidth 1.5 + round caps/joins. Lucide's own
// default is 2, so we bake 1.5 in below.
//
// Colour is per-context via currentColor: the surface sets `color` (white on the
// teal nav rail, ink/dim in product, var(--state-*) for warnings) and the icon
// inherits it. Pass `color="…"` or `style={{ color: … }}` to override. Never flat
// black, never aqua (see the teal carve-out in CLAUDE.md).
// ─────────────────────────────────────────────────────────────────────────────
import {
  // workflow / domain
  ClipboardList, FileText, Upload, Zap, Palette, Plane, CheckCircle2, Clapperboard,
  FolderKanban, Trophy, LayoutDashboard, Hourglass, Building2, Users, CreditCard,
  Tags, TrendingUp, Landmark, Flag, MessageCircle, Pencil, Phone, CalendarDays,
  RefreshCw, PartyPopper, Banknote, Bell, Pin, CircleDashed,
  // controls
  X, Check, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronUp, ChevronDown,
  ChevronRight, RotateCw, ArrowUpRight, LayoutGrid, Settings, CornerDownLeft,
  Pause, Star, Trash2, Eye, BarChart3, Ruler, MapPin, Link2, AlertTriangle,
  Download, Menu, Plus, Car, Sparkles,
} from 'lucide-react'

// concept key → glyph. Several keys may share a glyph (same meaning reused) so
// each surface reads by its own concept while the mapping stays in one place.
export const ICONS = {
  // ── workflow / domain ──
  elements: ClipboardList,
  list: ClipboardList,
  proposal: ClipboardList,
  ratecards: ClipboardList,
  taskAssigned: ClipboardList,
  document: FileText,
  brief: FileText,
  export: Upload,
  execution: Zap,
  brandActivation: Zap,   // ⚡ reused for execution AND brand activation (no invented distinction)
  production: Palette,
  travel: Plane,
  mice: Plane,
  delivered: CheckCircle2,
  taskCompleted: CheckCircle2,
  showflow: Clapperboard,
  full: FolderKanban,
  won: Trophy,
  overview: LayoutDashboard,
  approvals: Hourglass,
  tenants: Building2,
  corporate: Building2,
  team: Users,
  users: Users,
  credits: CreditCard,
  categories: Tags,
  analytics: TrendingUp,
  exhibition: Landmark,
  government: Flag,        // 🎌 → Flag (Landmark is taken by Exhibitions)
  guided: MessageCircle,
  edit: Pencil,
  vendors: Phone,
  phone: Phone,
  timeline: CalendarDays,
  calendar: CalendarDays,
  statusChanged: RefreshCw,
  newEvent: PartyPopper,
  rateRequested: Banknote,
  bell: Bell,
  notifFallback: Pin,
  progressActive: CircleDashed,   // ◐ in-progress milestone state

  // ── controls ──
  close: X,
  check: Check,
  back: ArrowLeft,
  next: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
  sortUp: ChevronUp,
  sortDown: ChevronDown,
  expand: ChevronDown,
  collapse: ChevronRight,
  refresh: RotateCw,
  external: ArrowUpRight,
  cards: LayoutGrid,      // ☰ "Cards" view toggle → grid
  settings: Settings,
  return: CornerDownLeft,
  pause: Pause,
  master: Star,           // ✦ platform-master / featured
  delete: Trash2,
  view: Eye,
  chart: BarChart3,
  size: Ruler,
  location: MapPin,
  link: Link2,
  warning: AlertTriangle,
  upload: Upload,
  download: Download,
  menu: Menu,
  add: Plus,
  car: Car,
  sparkles: Sparkles,
}

// Default size keeps inline icons aligned with 14–16px body text.
export function Icon({ name, size = 16, strokeWidth = 1.5, ...rest }) {
  const Glyph = ICONS[name]
  if (!Glyph) {
    if (typeof console !== 'undefined') console.warn(`[icons] unknown icon "${name}"`)
    return null
  }
  return <Glyph size={size} strokeWidth={strokeWidth} {...rest} />
}

export default Icon
