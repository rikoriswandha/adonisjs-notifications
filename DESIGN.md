# Design System

## Overview

A warm, light-first developer dashboard for the AdonisJS notifications package. The aesthetic is closer to a well-made desktop utility than a marketing site: tinted neutrals, a single earthy accent, compact tables, and SVG iconography that communicates status before color does. Dark mode exists for late-night incident response but is not the default.

Physical scene: a developer monitors notification deliveries while debugging in a bright workspace; dark mode is for late-night incident response.

## Color Strategy

**Restrained, with permission to commit.** Tinted sand neutrals carry 80% of the surface. One warm terracotta accent marks the active route, primary buttons, and focus rings. Semantic status colors are secondary and always paired with icons.

OKLCH is used throughout so chroma naturally falls as surfaces approach white or black.

### Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | `oklch(98.2% 0.004 80)` | `oklch(17% 0.01 80)` | Page background |
| `--surface` | `oklch(100% 0.002 80)` | `oklch(23% 0.012 80)` | Cards, panels, inputs |
| `--surface-2` | `oklch(96.5% 0.006 80)` | `oklch(28% 0.014 80)` | Hover, secondary rows |
| `--surface-3` | `oklch(92.5% 0.008 80)` | `oklch(34% 0.016 80)` | Code blocks, tertiary surfaces |
| `--text` | `oklch(24% 0.012 80)` | `oklch(93% 0.01 80)` | Primary text |
| `--muted` | `oklch(52% 0.01 80)` | `oklch(66% 0.012 80)` | Secondary text, placeholders |
| `--border` | `oklch(88% 0.012 80)` | `oklch(38% 0.014 80)` | Dividers, input borders |
| `--border-subtle` | `oklch(93% 0.01 80)` | `oklch(32% 0.012 80)` | Row separators, faint rules |
| `--accent` | `oklch(55% 0.13 55)` | `oklch(65% 0.14 60)` | Primary actions, active nav, focus rings |
| `--accent-contrast` | `oklch(22% 0.02 55)` | `oklch(22% 0.02 55)` | Text on accent |
| `--danger` | `oklch(52% 0.18 25)` | `oklch(60% 0.16 30)` | Failed / danger |
| `--warning` | `oklch(70% 0.13 85)` | `oklch(72% 0.12 85)` | Pending / warning |
| `--info` | `oklch(60% 0.12 250)` | `oklch(65% 0.11 250)` | Skipped / info, unread dot |

Pure `#000` and `#fff` are avoided. The light background is a warm off-white; the dark background is a deep warm charcoal, not black.

## Typography

- **Font family:** system-ui, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Inter`, `sans-serif`.
- **Scale ratio:** 1.125 (compact product scale).
  - `xs`: 0.75rem / label, timestamp, badge
  - `sm`: 0.875rem / body, table cell, button
  - `base`: 1rem / section title, input
  - `lg`: 1.125rem / page subtitle
  - `xl`: 1.25rem / page title
  - `2xl`: 1.5rem / brand mark (rare)
- **Weights:** 400 body, 500 emphasis, 600 headings/active.
- **Line height:** 1.5 body, 1.25 headings.
- **Body max width:** 70ch for prose; data tables may run wider.

## Layout

- **App shell:** fixed top bar (56 px) + scrollable main area.
- **Main container:** max-width 1200 px, centered, padding 24 px.
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48 px.
- **Radius scale:** 6 px (sm), 10 px (md), 14 px (lg).
- **Shadows:** one subtle shadow for the top bar only: `0 1px 0 var(--border), 0 2px 6px oklch(0% 0 0 / 0.03)`.
- **Cards:** used sparingly for grouped settings or filters; data is not automatically wrapped in cards.

## Components

### Buttons

- **Primary:** solid accent background, white text, 10 px radius, padding 8 px 14 px.
- **Secondary:** transparent background, 1 px border, text color, 10 px radius.
- **Ghost:** no border, text/muted text, hover surface-2.
- **Icon button:** 32 px square, centered SVG, ghost style.
- **Disabled:** 0.4 opacity, `cursor: not-allowed`.

### Inputs

- 1 px border, 10 px radius, 8 px 12 px padding.
- Focus: 2 px accent ring with 2 px offset.
- Background matches `--surface`.

### Badges / Pills

- 6 px radius, 4 px 8 px padding, `xs` type.
- Outline style with semantic color border and muted text.

### Tables

- No outer border.
- Row separators only (`border-subtle`).
- Hover on rows (`surface-2`).
- Right-aligned numbers, left-aligned text.

### Notification rows

- Full-width row, not a card.
- Leading status icon + type label + timestamp + actions.
- Unread row gets a subtle left dot (background tint, not a thick border stripe) and semibold type.
- Expanded payload rendered in a surface-3 code block with 6 px radius.

## Motion

- **Default easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart).
- **Durations:** 150 ms (micro), 200 ms (standard), 250 ms (reveal).
- **Properties animated:** color, background-color, border-color, opacity, transform (only for delete slide-out and chevron rotation).
- **Reduced motion:** all transitions disabled when `prefers-reduced-motion: reduce` is active.

## Iconography

- Custom 16 px SVG icons drawn for this dashboard.
- Icons: metrics, inbox, sent, failed, pending, skipped, channel, type, chevron, sun, moon, check, arrow-back, trash, envelope-open, envelope-closed, external-link.
- All icons use `currentColor` and inherit text/semantic color.
- Stroke width 1.5 px, 2 px round caps, 24 x 24 viewBox scaled to 16 x 16.
