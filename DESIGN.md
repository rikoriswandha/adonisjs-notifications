# Design System

## Atmosphere

A quiet, focused workspace. Like a well-organized desk under dim ambient light. Paper-like surfaces with subtle warmth, restrained color for status, no gradients or glass.

## Color Strategy

**Restrained** — tinted neutrals + one accent ≤10%.

- **Background**: Light theme default (#f6f4f2, warm gray), dark theme (#121214, deep charcoal with slight blue tint)
- **Surface**: #ffffff (light), #1e1e20 (dark)
- **Text**: #1a1a1c (light primary, slight warm tint), #e8e6e3 (dark primary)
- **Muted text**: #6b6865 (light), #8a8680 (dark)
- **Accent**: #5a7d9a (dusty blue, for interactive elements and links)
- **Status colors** (chroma-reduced):
  - Sent: #4a7c59 (muted green)
  - Failed: #9a4a4a (muted red)
  - Pending: #8a7c3a (muted amber)
  - Skipped: #7a7a7a (neutral gray)
- **Border**: rgba(0,0,0,0.06) light, rgba(255,255,255,0.06) dark

## Typography

- System font stack (no external font loading for a utility dashboard)
- `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Scale: 14px base, 12px labels, 16px section headings, 20px page title
- Body max-width: none (tables span full container)

## Elevation

- No drop shadows. Use 1px borders for separation.
- Cards/surfaces: 1px border, no shadow, subtle border-radius (6px)

## Motion

- Subtle, fast transitions (150ms ease-out-quart)
- No layout animation on resize
- Progress/loading: prefer opacity fade over spinners

## Components

- Summary cards: clean bordered boxes with metric + label stacked, no icons
- Tables: minimal zebra striping via subtle background, no vertical borders
- Links: underline on hover, accent color, no color shift
- Buttons: filled accent background, white text, subtle hover darkening
- Charts: Inline SVG, no external library dependency
