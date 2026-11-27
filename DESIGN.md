# DESIGN.md — Marketplace Trader

## Product and visual direction

A mobile-first Minecraft Bedrock catalog. Primary journey: browse/search → item → open in Telegram. Use Material 3 Expressive as inspiration: bold typography, friendly rounded shapes, strong contrast and subtle feedback. Flat solid colors only: **no gradients, glow, background glow, purple/pink AI treatment or AI button**. Do not use decorative emoji, star/AI-like glyphs or arrow characters in the UI. Do not imitate YouTube branding or present add-ons as videos.

## Foundation

- System font stack; body approximately 16px; readable headings and metadata. One meaningful H1 per page.
- Solid warm neutral surfaces with #c88828 accents, clear contrast, generous spacing, and local/system assets. Never fabricate popularity, reviews, claims, ratings, video durations or compatibility.
- Search is visible, labeled and keyboard-operable. Keep Browse and Help easy to find on phones; navigation must not rely on a JavaScript-only menu.
- Cards use real thumbnails where available, consistent landscape framing, an accessible fallback, real item name and available creator/category. Whole card is a single link; long titles wrap safely.
- Available width under 600 CSS px: 1 column; 600–899: 2; 900–1023: 3; 1024 and above: 4. Use available viewport, so zoom/split-screen can lower column count.
- About/FAQ copy should explain Telegram and Bedrock accurately. Never invent contact, legal, affiliation or download guarantees.

## Accessibility and motion

- Semantic landmarks, skip link, labeled search, visible focus, clear status/empty/error messages and a practical touch target around 44px. Do not use color alone for state.
- Motion is short, optional and purposeful; prefer subtle transform/opacity feedback and remove nonessential movement for `prefers-reduced-motion`. Avoid autoplay, flashing and scroll hijacking.
- Check 320px reflow, 200–400% zoom, keyboard, reduced motion and screen readers where available. No full WCAG compliance claim without audit.
- Static error pages should explain recovery while preserving actual server status where hosting allows. Provider/proxy errors may bypass them.

## v6 theme, sharing and return navigation

- Auto follows the operating system; Light and Dark are explicit preferences saved locally when possible. The static error pages also offer the selector. Flat semantic surface, text, action and focus colors adapt to theme. Selected interaction feedback is restrained and reduced-motion removes it.
- Download always retains the existing UUID bot deep link. Share opens a keyboard-accessible dialog with Telegram/WhatsApp link sharing, Discord copy, native More and copy/select fallback. A thumbnail is prepared only after opening, with CORS, HTTPS, image-type and 2 MiB checks. Native sharing can attach it only when the browser accepts it; neither target behavior nor rich previews are guaranteed. Generic Material icons avoid unverified use of third-party logos. Material icon license is included.
- When a listing is opened from a catalog/search page, the return link uses browser history when the recorded same-origin referrer matches. Browser restoration can preserve scroll and avoid another request when BFCache is available, but reloads and cache misses may still fetch. Direct visits fall back to the catalog. Only a navigation URL is temporarily stored; catalog responses are not cached or persisted, respecting the Worker's `no-store` policy.

## v7 direct sharing and search suggestions

- Browse-card Download opens `/addon.php?uuid=…`; the item page retains the Telegram UUID download. Share uses the device's native chooser directly when supported, with a copy fallback when it is not. It attempts to attach the same `thumbnail_url` used on the catalog card: eligible visible thumbnails are prepared in memory with CORS, supported format, streaming size limits and a short timeout. If still preparing, a second tap is needed to preserve browser user activation. Cross-origin hosts, browsers and receiving apps can prevent attachments; never promise an image was sent.
- Search suggestions are actual matching catalog titles and creators, not Google or YouTube queries. A minimum of two characters and 500 ms pause precede a request; obsolete requests are aborted and stale responses ignored. The search form remains usable without suggestions or JavaScript.


## v8 branding and search

- Display the owner-supplied Marketplace Trader logo and favicon set. Accent surfaces use #c88828 with dark text; readable dark/light theme text uses a contrasting companion color. The artwork is the supplied logo rather than a generated replacement.
- Desktop hero category shortcuts and detail discovery links make use of available space without fabricated content. Responsive grid thresholds remain unchanged.
- Search pages begin the existing Worker request in the document head and consume that same request once; there is no persistent metadata cache. Suggestions still wait 500 ms after typing. Performance depends on hosting, browser, network and Worker response time.

## v9 catalog controls

- Cards have transparent theme-aware borders around their content and actions; card Share is icon-only with an accessible label and native sharing/copy fallback. The hero uses “Browse DLCs”, and visible headings/count/category chips are replaced by a screen-reader heading and filter dialog beside the search field.
- The filter dialog combines category and honestly labeled Last updated, while exact studio names link to paginated catalog results. The Worker applies filters before pagination; no metadata caching. Unknown prices and file metadata are labeled, never fabricated. User-approved Worker deployment preserves the existing D1 binding and secret; no migration or bot update.
- The catalog starts its one metadata request early, renders four cards first and the rest in small chunks, and lazy-loads nonvisible images. Network and host latency can still prevent instant loading.
