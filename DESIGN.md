# DESIGN.md — Minecraft Add-on Website (Download-Only Catalog)

**Surface mode:** Operate — calm, scannable catalog. One job: find an add-on, download it.
**Audience:** Minecraft Bedrock players on Android / Windows, mostly mobile.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f1115` | Page background (dark, Minecraft-night feel, not pure black) |
| `--surface` | `#1a1d24` | Cards, header |
| `--surface-2` | `#232732` | Hover / raised cards |
| `--ink` | `#f2f4f8` | Primary text |
| `--ink-muted` | `#9aa3b2` | Secondary text, meta |
| `--accent` | `#5ee06e` | Primary action (Download) — grass-green, one accent only |
| `--accent-ink` | `#0b1a0e` | Text on accent buttons |
| `--border` | `#2c3140` | Card borders, dividers |
| `--success` | `#5ee06e` | (same as accent) |
| `--error` | `#ff6b6b` | Errors only |
| `--radius` | `12px` | Cards, buttons, inputs (one system) |
| `--radius-sm` | `8px` | Chips, badges |

## Typography (max 2 typefaces, system stack — no webfont download on $0)

- UI: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- Display / headings: same stack, weight 700–800. No separate display font in v1.
- Body ≥16px. Numbers/tables: `font-variant-numeric: tabular-nums`.
- Single `<h1>` per page. No skipped heading levels.

## Layout & spacing

- Scale: 4 / 8 / 12 / 16 / 24 / 32px.
- Max content width: 1100px, 16px side padding on mobile.
- Grid: `repeat(auto-fill, minmax(160px, 1fr))` for add-on cards — no fixed 3-card rows.
- Header: site name + search box (sticky on mobile). Footer: channel links + Marketplace credit.
- Detail page: thumbnail left, meta right on desktop; stacked on mobile. Download button is the only filled primary button.

## Components

- **Card:** thumbnail (16:9, `object-fit: cover`), title (2-line clamp), creator, category chip, version + size meta, Download button.
- **Chips:** category filter (`All`, `ADD-ON`, `TEXTURE PACK`, …). Active chip = accent fill.
- **Buttons:** primary = accent fill + dark text, verb+noun label ("Download .mcaddon"). Secondary = outline ("Download via Telegram").
- **States:** loading (button disabled + "Preparing…"), empty ("No add-ons found"), error (inline beside field, focus first invalid input).

## Accessibility

- WCAG AA: text contrast ≥4.5:1, UI ≥3:1. `color-scheme: dark` on `:root`.
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`. All interactive elements are real `<button>` / `<a href>`.
- Visible `:focus-visible` ring (2px accent outline). Icon buttons get `aria-label`.
- Hit targets ≥44px on mobile, ≥24px on desktop. No hover layout shift.
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
