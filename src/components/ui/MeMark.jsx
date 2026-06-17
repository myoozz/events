import markRaw from '../../assets/brand/me-mark.svg?raw'

/*
 * MeMark — the Me logo lockup.
 * Decision C (Vikram, 17 Jun 2026): render the SUPPLIED mark asset
 * (src/assets/brand/me-mark.svg) — never a typeset / per-instance recoloured version.
 * Canonical §02: "Use the supplied marks … the seam separating the e from the M is part
 * of the logo." "Mark at root, never per-instance recolouring."
 *
 * The supplied SVG fills with `currentColor`, so the mark tints to the parent `color`
 * (white on the petrol sidebar, ink/teal on light surfaces) WITHOUT recolouring the asset.
 * NOTE: the supplied mark is MONOCHROME — a two-tone (white M / aqua e) lockup is not
 * available from it. Flagged in the Phase-0 PR for the sidebar (Phase 2).
 */

// Use the supplied asset verbatim; only strip its fixed pixel box so it scales to `size`.
const SVG = markRaw
  .replace(/\s(?:width|height)="[^"]*"/g, '')
  .replace('<svg ', '<svg style="height:100%;width:auto;display:block" ')

export function MeMark({ size = 28, color = 'currentColor', title = 'Me', style }) {
  return (
    <span
      role="img"
      aria-label={title}
      style={{ display: 'inline-flex', alignItems: 'center', height: size, color, lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  )
}
