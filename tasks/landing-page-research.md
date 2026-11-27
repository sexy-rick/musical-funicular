# Landing page research — video-feed-inspired catalog

**Date:** 27 November 2026
**Status:** Research/design proposal only. No site implementation or deployment.
**Request:** A professional landing page where mobile shows **one large add-on card per row** and desktop shows **four cards per row**, inspired by the way video sites present thumbnails. These are add-on listings, not videos; no play icons, fake duration, views or YouTube branding.

## 1. The big idea

Make the catalog itself the star. A visitor should recognize the site, search or choose a category, see the first real add-on quickly, and open its details. Aim for the familiar rhythm of a video feed—large landscape image above a concise title—while keeping Marketplace Trader's own identity and honest Telegram download flow.

Keep Material 3 Expressive influence in clear typography, color roles, friendly shape contrast and subtle interaction feedback, using **solid colors only**. No gradients, glow or AI button. Content and accessibility matter more than decoration. [Material adaptive layout](https://m3.material.io/foundations/adaptive-design/overview), [Material cards](https://m3.material.io/components/cards/guidelines).

## 2. What we observed in the current project

- The current PHP home page has a prominent hero, category chips, a live catalog count and browser-fetched listing results.
- Its stylesheet uses an automatically sized desktop grid and **two columns at widths of 700 CSS pixels and below**, rather than the requested one-column mobile layout. Images use fixed heights, including 125 px on mobile and 105 px at the smallest breakpoint.
- Catalog cards contain an image, category, title, creator, file size and multiple links to the same detail page. Search is in the shared header.
- The public catalog response checked during research includes actual thumbnail URLs, item titles, creators and categories; some version/extension fields are empty. The current client does not reliably handle a URL that exists but fails to load. Do not assume every thumbnail or metadata field is present or usable.
- The catalog uses a browser-to-Worker request. Real item thumbnails are discovered after that fetch, which can delay their loading; rendering everything in the initial HTML is not currently available via the blocked InfinityFree server-to-Worker route.

These are source/response observations, not a visual/device audit or a claim that every listed file is downloadable. Actual Telegram delivery and full catalog import remain unverified.

## 3. Recommended page hierarchy

1. **Header:** compact brand + clearly labeled search + Browse/Help navigation. On mobile, place search in a visible second row if needed instead of shrinking it to an icon.
2. **Compact introduction:** short heading such as “Discover Minecraft Bedrock add-ons” and a one-line explanation that downloads continue in Telegram. Avoid a large decorative hero that pushes the listings far below the first screen.
3. **Category controls:** All, Add-ons, Texture Packs, Worlds, etc., matching actual supported categories. Clear active state, keyboard support, wrapping if necessary. Avoid introducing categories that aren't available.
4. **Feed heading:** “Browse the collection” with a truthful count where available. Do not label listings “Trending,” “Most downloaded,” or “New” without data supporting that meaning; a sync timestamp is not necessarily a release date.
5. **Main listing grid:** requested one-per-row mobile / four-per-row desktop, with suitable intermediate layouts.
6. **Pagination:** keep the existing accessible previous/next model, with current page and query/category carried forward. A Load More control may be considered later if it preserves navigation and accessibility; no need to implement infinite scrolling just to resemble a video website. [web.dev pagination/infinite scroll tradeoffs](https://web.dev/patterns/web-vitals-patterns/infinite-scroll/infinite-scroll).
7. **Footer:** About, FAQ/Help and browsing links when those pages exist. Do not link to unfinished pages or invent contact information.

Why this hierarchy? Nielsen Norman Group recommends assigning visual emphasis according to user goals, and notes that informative, consistent images help people scan listings. Video-like thumbnails are an inspiration, not evidence that copying YouTube's interface is best for this catalog. [Image-focused design](https://www.nngroup.com/articles/image-focused-design/), [product images](https://www.nngroup.com/articles/product-photos-listing-pages/).

## 4. Responsive layout specification

Proposed starting breakpoints; tune after real device testing and account for browser zoom and actual available content width. Values are **CSS pixels**, not physical device pixels.

| Available viewport | Columns | Intended layout |
|---|---:|---|
| Under 600 px | **1** | One large card per row, full content width with comfortable edge padding |
| 600–899 px | 2 | Roomier phones/tablets and split-screen windows |
| 900–1023 px | 3 | Narrow desktop/tablet landscape |
| 1024 px and above | **4** | Desktop grid, up to four items per line |

At 1024 px, with 32 px outer padding on each side and 18 px gaps, four equal cards would be about 226.5 px wide. A 1240 px maximum container with 32 px padding and 18 px gaps yields cards of about 280.5 px. These are estimates for testing, not rigid requirements. Very large displays stay at four rather than automatically adding a fifth card. In split-screen or at zoom, the layout follows available width, so a desktop browser can correctly show fewer columns when the window is narrow.

**Mobile (illustrative, not a screenshot):**

    [ Brand                    Help ]
    [ Search add-ons               ]
    Discover Bedrock add-ons
    Browse the collection
    [ All ] [ Add-ons ] [ Worlds ]
    ┌─────────────────────────────┐
    │     LARGE THUMBNAIL         │
    └─────────────────────────────┘
    Add-on title
    Creator · Category

    ┌─────────────────────────────┐
    │     LARGE THUMBNAIL         │
    └─────────────────────────────┘
    Next add-on title

**Desktop (illustrative):**

    Brand      [ Search add-ons          ]     Browse   Help
    Discover Bedrock add-ons
    [ All ] [ Add-ons ] [ Worlds ] [ Textures ]
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Thumbnail │ │Thumbnail │ │Thumbnail │ │Thumbnail │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
    Title        Title        Title        Title
    Creator      Creator      Creator      Creator

A single-column mobile feed uses more vertical space and shows fewer items per screen than a two-column grid. That's a deliberate tradeoff to match the user's preference for larger imagery. Keep the intro compact and consider findability/search carefully. NN/g's mobile research notes that image size and the number of items visible must be balanced. [Mobile image layouts](https://www.nngroup.com/articles/image-vs-list-mobile-navigation/).

## 5. Card anatomy and image behavior

- **Landscape media frame:** start with a 16:9 frame for the video-feed feeling. Reserve the frame's space before the image loads to reduce movement. Real catalog thumbnails may have different aspect ratios; test them before settling on `cover` (which crops) versus `contain` (which preserves the full image with solid padding). Never stretch images. [web.dev responsive images](https://web.dev/learn/design/responsive-images), [aspect ratio and layout shift](https://web.dev/articles/aspect-ratio).
- **Real title:** strong, left-aligned text. Let long titles wrap; avoid silently hiding important identifying words. Break unbroken text safely.
- **Metadata:** creator and category when known, displayed in a consistent place. Optional file size only if known and useful; no fake views, ratings, playback length, tags or download counts.
- **One clear destination:** the thumbnail and title should take the user to the same detail page. Prefer one clear accessible link for the card where feasible; avoid three duplicate keyboard stops for the same destination and avoid nested links.
- **Fallback:** if a thumbnail is absent, blocked or fails, keep the same frame size with a neutral, non-misleading placeholder and visible title. Do not imply it is a video.
- **Accessible images:** when the image is decorative inside a link already named by the title, an empty alt can prevent repeated speech. If the image conveys unique information, use appropriate actual alternative text. Don't invent descriptions from filenames.
- **Touch and focus:** generous targets, visible keyboard focus, no hover-only functionality. Indicate interaction on desktop without moving layout or depending only on color.

Cards are good for visual browsing; they can be less efficient for scanning specific structured data. Keep the title/metadata position predictable and retain search, rather than assuming a card feed serves every job equally. [NN/g cards](https://www.nngroup.com/articles/cards-component/), [mobile thumbnails](https://www.nngroup.com/articles/mobile-list-thumbnail/).

## 6. Motion and loading

- On supported desktop pointers, use a subtle thumbnail/card response to hover; on touch, acknowledge presses without requiring hover. Do not add continuous autoplay, parallax or flashing.
- Respect reduced-motion preferences; stop decorative movement, while preserving focus and state cues. Motion should never block navigation.
- Show short loading text and stable placeholder space; announce meaningful loading/results/error updates politely without forcing a screen reader to read every card.
- Do not lazily load the likely first above-the-fold/LCP thumbnail by default; lazy-load truly off-screen images as appropriate. Current code sets all thumbnails to lazy, so this deserves measurement rather than assuming all should be eager. [web.dev image loading](https://web.dev/learn/design/responsive-images), [LCP discoverability](https://web.dev/articles/top-cwv).
- Because card URLs arrive via browser fetch, image discovery begins later. Reserve slots and keep requests efficient; measure before redesigning the architecture. No promise of a specific score on free hosting.

## 7. Empty, error and browsing states

- **Loading:** “Loading add-ons…” with fixed-size placeholders and a usable page shell.
- **Empty catalog/category:** explain that nothing is listed in the chosen category; offer All categories.
- **No search results:** echo the query safely and suggest a shorter term or clearing the category filter.
- **Network/Worker failure:** say the catalog could not be loaded; provide Retry while preserving the selection. Do not say “no add-ons” or mislabel the failure as a missing item.
- **JS disabled:** explain that the current catalog needs JavaScript; navigation/help can still be readable. A fully functional non-JS catalog would require separate architecture work.
- **Missing image:** keep layout stable and provide a neutral placeholder.
- **After visiting a detail page:** check that Back restores the intended page, category, search and position; avoid forcing the visitor to start again.

## 8. Accessibility and usability test plan

- Test real phone widths 320, 360, 390 and 430 CSS px, and windows 600, 900, 1024, 1280 and 1440 px; also test transitions just below/above each breakpoint.
- Check one item per row on compact widths and four per row at desktop widths ≥1024 px, without horizontal overflow, overlap or tiny card text.
- Test zoom/reflow, including 320 CSS px-equivalent width; W3C's reflow criterion describes a 320 CSS px layout with exceptions. [W3C reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html).
- Navigate entirely with keyboard: labeled search, filter state, cards, page navigation and footer; verify visible focus and predictable order.
- Try screen readers and reduced-motion mode; test image failure, no images, slow network, unavailable Worker, zero results and long titles/creator names.
- Compare image crop/contain with actual catalog thumbnails and verify no misleading or clipped identifying content. Check that thumbnail use rights are appropriate before public deployment.
- Run browse → item → Telegram link and verify a real file is delivered; this delivery is not yet verified. Confirm no secrets or changed bot behavior.
- Measure loading, layout stability and responsiveness on a real low-end phone/connection when possible; do not claim full accessibility compliance or particular speed without testing.

## 9. Open decisions before implementation

- Exact solid color palette and level of rounding.
- Whether every category chip should wrap or whether a clearly accessible overflow pattern is necessary on small phones.
- Whether image crops preserve enough important information across real listings; choose between cover and contain after testing.
- Whether the header should remain static or sticky; if sticky, verify it doesn't obscure keyboard focus or take too much phone screen space.

**Bottom line:** use the one-column mobile and four-column desktop feed exactly as requested, with responsive middle widths, real artwork and titles, concise controls and honest error/loading states. This is a design plan, not a completed website.
