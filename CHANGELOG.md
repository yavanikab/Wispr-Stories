# Changelog

## [Unreleased]

### Added

- Vercel Blob upload for exact card PNG as WhatsApp OG preview. When user clicks Share or Copy Link, the card PNG is uploaded to Vercel Blob storage and the share URL points to `/card?img=<blob-url>`. WhatsApp crawler fetches the exact card image — no regeneration, no text overlay. Cards auto-expire after 5 days via daily cron cleanup.
- Short share URLs (`/c/xyz123`) with fast raw PNG upload (~1.5s). Upload accepts raw bytes (no multipart parsing) for speed. Random 8-char alphanumeric IDs. Landing page shows card image + "Create Your Own" button. Silent loading with spinner icon (no "Uploading" text).
- Padded OG images (1200×630) with card centered on background-matched padding for WhatsApp large preview. Original card displayed at natural size on landing page. Removed title/description from OG meta tags.

### Fixed

- WhatsApp share now sends card URL instead of PNG file, triggering OG meta preview (Spotify-style rich card with image + text). `navigator.share()` no longer includes `files: [blob]` — shares only the `/card?text=...&name=...` URL so WhatsApp crawler reads OG tags.
- OG image endpoint switched from broken `/api/og` (500 errors on Vercel) to static PNG files.
- OG images changed from 1080×1080 square (1:1) to 1200×630 landscape (1.91:1) — the universal aspect ratio that triggers WhatsApp's large image-first preview format. All 20 palette+corner combos regenerated via sharp.
- Dynamic `/api/og` endpoint rebuilt using `sharp` + SVG overlay (Node.js runtime) — now renders user name, story text, and branding on top of palette backgrounds. All 20 palette+corner combos return HTTP 200. Background images fetched via HTTP to avoid Vercel filesystem path issues. (Kept as fallback for legacy shares.)

### Changed

- Disabled auto-demo animation on page load to allow ghost decoration to appear on fresh empty state. Original animation backed up to `backup/demo-auto-animation.js` for restoration.
- Right column scrollbar hidden (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`) so the scrollbar doesn't appear in the middle of the page. Column remains scrollable via mouse wheel/touch/keyboard.
- Right column centering restored: `justify-content: center` on tall viewports, switches to `flex-start` at `max-height: 750px` for small laptop screens.
- Added intermediate breakpoint at 1024px with reduced column padding for smoother width responsiveness when resizing the viewport.
- Cache-bust version strings updated to `20260515-responsive` on CSS/JS references.

### Security

- Hardened `/api/card` shared-card HTML rendering: tone/palette inputs are validated, shared text/name lengths are capped, HTML/meta values are escaped, and the redirect script uses a JSON-encoded URL.

### Fixed

- Right column now auto-detects overflow on small laptops with independent scrollbar (`overflow-y: auto; justify-content: flex-start`), matching left column pattern. Shell no longer clips footer (`overflow: hidden` removed). Ghost decoration shifted from 20px→40px right to clear scrollbar. Grid cells use `min-height: 0` for proper internal scrolling.

### Changed

- Replaced CSS-rendered spiral overlay (`mix-blend-mode: screen` compositing) with pre-baked WebP card background images (`assets/card-bgs/` — 80 files: 4 ratios × 2 corner styles × 10 palette colors). Card rendering now uses a single `background-image` URL instead of layered solid color + spiral CSS. Export simplified: removed 45 lines of canvas pixel-inversion compositing (`createExportBackground`), replaced with direct `drawImage` of the WebP. `generateBlob` no longer creates a canvas dataURL for the spiral background. Removed `.card-spiral` from HTML, CSS, and JS. Ghost decoration, palette controls, size/corner controls, and share flow all untouched.
- Precomposited the card spiral background before `html2canvas` export so Share modal previews and downloaded PNGs match the live screen-blend preview instead of rendering the spiral too dark.
- Refreshing a saved draft no longer marks the card as created or shows the download/Wispr Flow CTA; users must click Create card again after reload, and restored preview waveforms are no longer cleared on startup.
- Create button hover/focus animation now restores the actual current button label instead of hard-coding "Create my card".
- Removed the automatic filled-card entrance animation that made the spiral/card appear to glitch during page refresh.
- Cache-busted the main stylesheet, card stylesheet import, and app script references so browsers pick up the refresh/export fixes immediately.
- Reworked PNG export again so spiral blending is composed entirely offscreen; clicking Download no longer stretches or mutates the live spiral layer, and the exported spiral is rendered at export scale instead of upscaling a low-resolution card-sized image.
- Synced `/api/card` and `/api/og` palette handling with the 10-color UI palette so shared links using Orange, Teal, Fuchsia, or Indigo generate matching metadata/OG previews.
- Added input-source-aware card labels: "Voice Original", "Voice Styled", "Story Original", and "Story Styled" now reflect whether the content came from recording or text entry and whether a tone is applied.
- Simplified footer trust copy to "No account · Open source" by removing the inaccurate "No uploads" claim.
- Added source icons to card labels: mic for voice labels and fountain pen for story labels.
- Fixed mixed-script font coverage for Bengali, Gujarati, and Punjabi/Gurmukhi, and replaced the unloaded Sarabun Thai mapping with the already-loaded Noto Sans Thai Looped font.

### Added

- Mixed-script font engine: `splitByScript()` and `applyScriptFonts()` in `fonts.js` render multi-script text (e.g., "Happy जन्मदिन!") with per-character script detection and per-script font spans. Single-script text uses fast textContent path with no overhead.
- Click debounce: Create card button disabled for 400ms after click to prevent accidental daily-limit overshoot from rapid taps.
- Mixed-script example ("Mixed Script" in examples grid) demonstrates per-script font rendering with Hindi + English text.

### Changed

- Mobile testing setup: zero-dependency Node.js server (`serve.js`), PowerShell launcher scripts (`mobile.ps1`, `start-mobile.ps1`), ADB + scrcpy integration, WiFi-direct phone testing at PC's local IP.
- Keyboard avoidance: `visualViewport.resize` listener on mobile scrolls the active input into view when keyboard opens.
- Loading skeleton state for examples grid (`ec-skeleton` shimmer animation).
- Occasion images converted to WebP: birthday 1.6MB→174KB, mothers-day 1.4MB→124KB (90% smaller each).
- Mobile CSS improvements: `viewport-fit=cover`, safe-area-inset padding, `100dvh` fallback, `color-scheme` dynamic update on dark mode toggle, 44px palette touch targets, 480px breakpoint, `@media (hover: none)` hover animation disable for touch devices.
- copyright notice in footer (`© 2026 Wispr Flow`).
- Auto-scroll to card preview on tone/palette/size/corner selection on mobile.

### Changed

- Examples: limited to 8 on mobile for clean 2-column grid.
- Nav: "Speak · Create · Share" tagline hidden on mobile; brand text reduced to 14px, logo to 18px.
- Typography: heading (`hl-h1`) bumped to `clamp(30px, 4vw, 48px)`, label (`hl-eye`) reduced to 10px, intro text to 13px with 1.6 line-height.
- Left panel: `padding-top` increased to 32px on mobile for nav-body distinction.
- Footer: centered layout (column direction, text-align center) on mobile.
- Dark mode transition: extended to 0.4s, added `backdrop-filter` and `opacity` to transitioned properties for smooth toggle.
- Wave animation: JS skips binding on touch devices (`hover: none && pointer: coarse`).

- Dark mode transition: uses `transition: all 0.35s ease !important` with 500ms class timeout for full cross-element sync.
- Wave animation: JS skips entirely on mobile (`window.innerWidth <= 720`), CSS kills via `@media (max-width:720px)`.
- All hover/transform/transition effects killed on mobile via width-based media query (not hover-based, which didn't match some Android browsers).

### Changed

- Typography: `hl-h1` (Speak Anything) enlarged to `clamp(36px, 5vw, 56px)`, `hl-eye` (label) reduced to 9px, `hl-h2` (subtitle) reduced to `clamp(18px, 2vw, 26px)`, intro reduced to 12px with 1.65 line-height and 16px top margin.
- Examples grid: 8 max on mobile via `examples-loader.js`, 2-column grid, hidden `.left-closing` quote on mobile.
- Header spacing: `padding-top: 8px` on first child div, `margin-bottom: 20px` on intro paragraph.
- Nav: `.nav-tag` hidden on mobile, brand text 14px, logo 18px.
- Left panel: padding-top 32px on mobile for nav-body separation.
- Footer: centered column layout on mobile with copyright `© 2026 Wispr Flow`.

## [0.2.0] — 2026-05-10

### Added
- Full SEO meta tags: description, robots, canonical URL
- Open Graph tags (og:*) for rich link previews on WhatsApp, Facebook, iMessage
- Twitter Card tags (twitter:*) for rich previews on X/Twitter
- JSON-LD structured data (WebApplication schema) for Google rich results
- PWA hints: theme-color, apple-mobile-web-app-capable, mobile-web-app-capable, apple-touch-icon
- Security: X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy via vercel.json
- SRI integrity check for html2canvas CDN script
- og-image.png (1200×630) for social previews
- Referrer-Policy meta tag (strict-origin-when-cross-origin)
- format-detection meta tag, color-scheme, application-name meta tags

### Changed
- Updated `<title>` to be SEO-optimized
- Upgraded AGENTS.md documentation to reflect new files and features

## [0.1.0] — 2026-05-10

### Added
- Initial prototype: voice-to-card single-page app
- 37 language support via Web Speech API
- 6 card palettes, 6 tones (visual only), 4 aspect ratios
- PNG export via html2canvas
- Mobile sharing via Web Share API
- RTL support for Arabic, Hebrew, Farsi, Urdu
