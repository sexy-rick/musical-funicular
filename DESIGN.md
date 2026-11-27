# DESIGN.md — Minecraft Add-on Website (Download-Only Catalog)

**Surface mode:** Operate — calm, scannable catalog. One job: find an add-on, download it.
**Audience:** Minecraft Bedrock players on Android / Windows, mostly mobile.
**Style:** Material 3 Expressive (clean, solid colors, rounded shapes). **No AI gradients, no glow, no background glow, no purple/pink.**

## Tokens (Material 3 dark, solid — no gradients)

| Token | Value | Use |
|---|---|---|
| `--md-sys-color-primary` | `#a8d8a8` | Primary buttons, active chips (soft green, Material You) |
| `--md-sys-color-on-primary` | `#0c390f` | Text on primary buttons |
| `--md-sys-color-primary-container` | `#2d4a2f` | Tonal buttons, selected chips |
| `--md-sys-color-on-primary-container` | `#c9e7c9` | Text on tonal |
| `--md-sys-color-secondary-container` | `#3a4a3d` | Badges, secondary surfaces |
| `--md-sys-color-surface` | `#141a12` | Page background (dark green-grey, not pure black) |
| `--md-sys-color-surface-container` | `#1e241d` | Cards, app bar |
| `--md-sys-color-surface-container-high` | `#2a322a` | Hover / raised cards |
| `--md-sys-color-on-surface` | `#e2e5dd` | Primary text |
| `--md-sys-color-on-surface-variant` | `#c2c9bd` | Secondary text, meta |
| `--md-sys-color-outline` | `#8b938a` | Borders, dividers |
| `--md-sys-color-outline-variant` | `#42493f` | Subtle borders |
| `--md-sys-color-error` | `#ffb4ab` | Errors only |
| `--radius` | `16px` | Cards (Material 3 medium) |
| `--radius-large` | `28px` | Buttons, search bar (Material 3 expressive pill) |
| `--radius-sm` | `8px` | Chips, badges |

**Banned:** gradients, `box-shadow` glow, backdrop blur glow, purple/pink AI colors, floating AI button. Flat solid colors only. Shadows: only subtle `0 1px 2px rgba(0,0,0,0.3)` for elevation, no colored glow.

## Typography (max 2 typefaces, system stack — no webfont download on $0)

- UI: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (Material 3 uses Roboto/system)
- Display / headings: same stack, weight 700. Material 3 expressive uses larger, rounded headings.
- Body ≥16px. Numbers/tables: `font-variant-numeric: tabular-nums`.
- Single `<h1>` per page. No skipped heading levels.

## Layout & spacing (Material 3)

- Scale: 4 / 8 / 12 / 16 / 24 / 32px.
- Max content width: 1100px, 16px side padding on mobile.
- Grid: `repeat(auto-fill, minmax(160px, 1fr))` for add-on cards — no fixed 3-card rows.
- **Top app bar:** solid surface, title left, search bar below (Material 3 search bar, pill shape). Sticky on mobile.
- Footer: channel links + Marketplace credit.
- Detail page: thumbnail left, meta right on desktop; stacked on mobile. Download is the only filled button.

## Components (Material 3)

- **Card (elevated, 16px radius):** thumbnail (16:9), title (2-line clamp), creator, category chip, version + size meta, Download button. No glow on hover — just surface color change.
- **Filter chips (Material 3):** pill outline, active = primary-container fill. `All`, `ADD-ON`, `TEXTURE PACK`, …
- **Buttons (Material 3):**
  - Filled: primary fill + on-primary text, pill shape, verb+noun ("Download .mcaddon")
  - Tonal: primary-container fill + on-primary-container text ("Download via Telegram")
  - Outlined: outline border, on-surface text
  - **No AI button, no gradient button, no glow button.**
- **Search bar (Material 3):** pill, surface-container-high fill, leading search icon, trailing search button.
- **States:** loading (button disabled + "Preparing…"), empty ("No add-ons found"), error (inline beside field, focus first invalid input).

## Accessibility

- WCAG AA: text contrast ≥4.5:1, UI ≥3:1. `color-scheme: dark` on `:root`.
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`. All interactive elements are real `<button>` / `<a href>`.
- Visible `:focus-visible` ring (2px primary outline). Icon buttons get `aria-label`.
- Hit targets ≥48px on mobile (Material 3), ≥24px on desktop. No hover layout shift.
- Motion: `transform`/`opacity` only, ≤200ms `ease-out`, `prefers-reduced-motion` disables it. `:active { transform: scale(0.97); }`.

## Copy rules

- Concrete, domain-grounded copy. No "elevate / unleash / Jane Doe / Acme".
- Standard hyphens in UI labels. No em-dashes.
- Every detail page links back to the official Marketplace URL ("View on Marketplace").

## Responsive checks (Slice 1 done-when)

- 375px: single column, search full-width, no horizontal scroll.
- 768px: 2–3 column grid.
- 1024px / 1440px: 4–5 column grid, max-width centered.
- Extreme inputs: 1-char title, 120-char unbroken title, 0/large file sizes, empty catalog, 1,000-item list (paginated, 24/page).
