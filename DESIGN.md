# DESIGN.md — Marketplace Trader

## Product and visual direction

A mobile-first Minecraft Bedrock catalog. Primary journey: browse/search → item → open in Telegram. Use Material 3 Expressive as inspiration: bold typography, friendly rounded shapes, strong contrast and subtle feedback. Flat solid colors only: **no gradients, glow, background glow, purple/pink AI treatment or AI button**. Do not imitate YouTube branding or present add-ons as videos.

## Foundation

- System font stack; body approximately 16px; readable headings and metadata. One meaningful H1 per page.
- Solid deep green-gray surfaces, pale green emphasis, clear contrast, generous spacing, and local/system assets. Never fabricate popularity, reviews, claims, ratings, video durations or compatibility.
- Search is visible, labeled and keyboard-operable. Keep Browse and Help easy to find on phones; navigation must not rely on a JavaScript-only menu.
- Cards use real thumbnails where available, consistent landscape framing, an accessible fallback, real item name and available creator/category. Whole card is a single link; long titles wrap safely.
- Available width under 600 CSS px: 1 column; 600–899: 2; 900–1023: 3; 1024 and above: 4. Use available viewport, so zoom/split-screen can lower column count.
- About/FAQ copy should explain Telegram and Bedrock accurately. Never invent contact, legal, affiliation or download guarantees.

## Accessibility and motion

- Semantic landmarks, skip link, labeled search, visible focus, clear status/empty/error messages and a practical touch target around 44px. Do not use color alone for state.
- Motion is short, optional and purposeful; prefer subtle transform/opacity feedback and remove nonessential movement for `prefers-reduced-motion`. Avoid autoplay, flashing and scroll hijacking.
- Check 320px reflow, 200–400% zoom, keyboard, reduced motion and screen readers where available. No full WCAG compliance claim without audit.
- Static error pages should explain recovery while preserving actual server status where hosting allows. Provider/proxy errors may bypass them.
