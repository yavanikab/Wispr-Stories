# Changelog

## [v0.8.0] — 2026-05-20

### Completed
- **Phase 5: Silence Detection** — Web Audio API RMS energy check on Deepgram fallback recordings. RMS < 0.01 over 2s = silence, prevents silent audio from hitting API (~20% savings). Toast: "We didn't catch that — try speaking louder". Proper analyser cleanup on recording stop.
- **Phase 6: Tone Rewriting Preview** — Accept/Cancel preview bar after tone rewrite. Rewritten text shown on card preview only, original preserved in textarea. Accept applies rewrite, Cancel restores original and resets to Original tone. Responsive CSS (stacks on mobile).
- **Phase 7: i18n (23 Languages)** — Created `assets/i18n/` with 23 translation JSON files (en, zh, hi, es, ar, fr, pt, ru, ur, id, de, ja, pa, ko, te, ta, tr, it, th, gu, kn, ml, sv). Built `i18n.js` loader with `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` support. Added `data-i18n` attributes to all translatable HTML elements. RTL support for Arabic/Urdu (auto-sets `dir="rtl"` on `<html>`). Wired language selector to call `applyI18n()` on language change. Card content excluded from translation (stays English).

### Documentation
- Updated `PENDING.md` — Marked Phase 0, Phase 5, Phase 6, Phase 7 as complete.
- Updated `AGENTS.md` — Updated "Deferred features," "Known bugs," "Key files" sections.
- Updated `WISPR_STORIES_CANONICAL_BLUEPRINT.md` — Rewrote Section 8 (Technical Architecture) with full serverless route table, usage limits, cost safeguards; rewrote Section 15 (Open Questions) to reflect current state.
- Updated `docs/INTERVIEW_GUIDE.md` — Added "Cost Awareness & Sustainable Scaling" section with 8 Q&A entries covering limits, Deepgram choice, abuse prevention, Pro tier, and scaling.

---

## [v0.8.0] — In Progress (pre-implementation)

### Planned
- **STT provider migration** — Switch from OpenRouter Whisper-1 to Deepgram Nova-3 Multilingual (Batch). Deepgram outperforms Whisper on accuracy (5.26% vs 6.2% WER), has no hallucination problem, 90% faster latency (200-400ms vs 2-4s), and $200 free credit (~555 hrs) vs no free tier. Cost: $0.26/hr vs $0.36/hr.
- **Daily user cap (99 users)** — Upstash Redis counter keyed by date (`wispr:daily:YYYY-MM-DD`). Graceful capacity page with playful tone ("We're overwhelmed with love!"). Existing sessions grandfathered. Pro users bypass cap.
- **Recording limits** — Free: 5 rec/day, 15s max, 75s cumulative. Pro: 50 rec/day, 30s max, 15 min cumulative. Server-side enforcement.
- **Silence detection** — Web Audio API RMS energy check before sending to Deepgram. Threshold: RMS < 0.01 over 2s = silence. Saves ~20% wasted API calls.
- **Tone rewriting** — `api/rewrite.js` with DeepSeek V4 Flash Free (OpenRouter). 150-char limit with sentence-boundary truncation. 10/day free, unlimited Pro.
- **i18n (23 languages)** — JSON translation files, `data-i18n` attribute system, RTL support for Arabic/Urdu, language selector in nav. Card content stays English.
- **Onboarding banner** — First-launch detection, localStorage persistence, help icon trigger, dismiss animation.
- **Upgrade system** — Upstash Redis key store, BuyMeACoffee webhook auto-generation, key format `WS-{OCCASION}-{YEAR}-{XXXX}`, server-side validation replaces localStorage stub.
- **UI fix** — "Wispr Flow" in heading → bold/italic + clickable link to `https://wisprflow.ai?ref=wispr-stories`.

### Documentation
- Created `docs/cost-architecture.md` — Complete cost math, Deepgram pricing, scaling scenarios, 7 cost safeguards, interview talking points.
- Created `docs/upgrade-system-design.md` — Upstash Redis architecture, key generation, BuyMeACoffee webhook, Pro tier limits, security considerations.
- Created `docs/stt-provider-migration.md` — Migration plan, API comparison, fallback chain, benchmark data, rollback plan.
- Updated `docs/interview-quick-reference.md` — Added cost & sustainability Q&A section (6 new questions), updated Pro system table, updated serverless function list.
- Created `PENDING.md` — Master implementation checklist (to be deleted when complete).

---

## [v0.7.0]

### Added
- **Real blob cleanup, wired up via Vercel Cron.** New `api/cleanup.js` endpoint runs daily at 03:00 UTC (scheduled by the `crons` block in `vercel.json`); it lists every blob in `cards/` and `og/`, deletes anything older than 36 hours, and returns a JSON summary. Effective lifetime for shared cards: ~1–2 days. The endpoint rejects any request whose `Authorization` header is not `Bearer ${CRON_SECRET}` (env var set in Vercel dashboard), so only the scheduled cron can invoke it. Closes a real bug: prior CHANGELOG / VERSION_HISTORY claimed "5-day Blob TTL" but no such mechanism existed — `cacheControlMaxAge` only set the CDN `Cache-Control` header, never deleted the underlying blob, so every card ever shared was accumulating in storage indefinitely.

### Fixed
- **WhatsApp link preview now renders as a large hero image on both desktop and mobile.** Root cause: the OG image was a ~198 KB padded 1200×630 PNG served through a Node serverless proxy (`/api/og-image/:id`). Mobile WhatsApp silently dropped the preview because the file size sits in the "too large" band for the on-device crawler; desktop WhatsApp downgraded it to the compact thumbnail layout for the same reason and because of the proxy's ~1.3 s cold-start TTFB. Plus the square card sat inside ~325 px of background padding bars inside the 1.91:1 frame, so the visible card was only ~46 % of the preview width even when shown large.
  - `api/upload.js` no longer builds a padded 1200×630 PNG. It re-encodes the original square card as JPEG (`sharp.jpeg({ quality: 82, mozjpeg: true })`) and uploads it as `og/<shortId>.jpg`. Typical output ~30–60 KB — well under every known WhatsApp mobile threshold, and the card fills 100 % of the preview frame.
  - `api/c/[id].js` now points `og:image` at the direct Vercel Blob CDN URL (`https://<blob>/og/<id>.jpg`) instead of the serverless proxy. Removes ~1 s of cold-start latency per crawler region. Added `og:image:secure_url` and `og:image:alt`; removed stale `og:image:width`/`height` (card aspect ratio varies — crawlers read actual dimensions from JPEG headers); set `og:image:type` to `image/jpeg`.
  - Deleted `api/og-image/[id].js` proxy endpoint and its `vercel.json` rewrite (no longer used). The "cross-domain issue" it was meant to work around does not actually affect WhatsApp / facebookexternalhit, which fetch `*.public.blob.vercel-storage.com` without complaint (same pattern Spotify / YouTube / Instagram use).
  - Cache busting: WhatsApp caches link previews per URL for days. Each Copy Link generates a fresh `shortId`, so new shares pick up the fix immediately. To re-test an existing URL, run it through https://developers.facebook.com/tools/debug/ and click "Scrape Again".

### Changed
- **Mobile bar theme-aware backgrounds** — Enhanced `.mobile-bar` with stronger shadow (`0 -8px 24px`), `backdrop-filter: blur(8px)`, and thicker border (`2px`). Uses CSS variables (`--cream`, `--rule`) which auto-swap in dark mode.
- **Rewrite text vertical stacking** — Changed `.mobile-bar-rewrite-text` from single-line text to flex column with `.rewrite-count` (18px/900 weight/red `#dc2626`) and `.rewrite-label` (9px/uppercase). Updated JS in `updateMobileBar()` to inject the new HTML structure instead of flat textContent.
- **Hidden inline actions on mobile** — `.actions { display: none; }` at `@media (max-width: 720px)` since the sticky bar now handles all actions (was previously stacking columns).
- **Share modal mobile fix** — Added `margin-bottom: 80px` and `max-height` constraints to `.share-modal-content` so it clears the mobile bar. Toast lifted to `bottom: max(80px, env(safe-area-inset-bottom) + 70px)` to appear above sticky bar.
- **Wave animation resize re-bind** — Added resize listener to re-bind wave animations when transitioning from mobile to desktop width. Previously, if page loaded at ≤720px, `bindHoverWave` exited early and never ran again.
- **Light/dark mode validation** — All changes use CSS variables (`--cream`, `--ink`, `--rule`) that auto-swap between themes. Red `#dc2626` is visible on both light and dark backgrounds.

### Added
- "Your voice, beautifully shared" wave animation — added `.wave-on-hover` class to `.left-closing-text`.
- Wispr Flow research docs: `docs/wispr_flow_improvement_areas.md` with strategic recommendations, HTML versions for visual reference (`research.html`, `intelligence.html`, `improvement_areas.html`).
- Web Speech API audit completed — full inventory of SpeechRecognition usage, Whisper fallback path, and migration plan to Whisper-only recording.

---

## [v0.6.0]

### Changed
- **Layout hierarchy redesign** to improve first-use clarity for elderly and non-technical users:
  - Removed language dropdown; language is now auto-detected from `navigator.language` on first load (saved drafts still restore their language)
  - Headline rewritten from poetic "Speak anything / Get something beautiful" to instructional "Tap the mic and say something lovely" with a guiding sub-line
  - Record button + textarea + "or type" divider wrapped in a single `.input-hero` visual zone to create one unmistakable starting point
  - Examples section moved up to immediately follow the input zone, serving as a safety net for users who feel stuck
  - Name field compacted from a full "Step 4 · Your name" block into a single inline "From" row
  - "Customize" section renamed to "Make it yours", `<details>` toggle removed (always open), and steps renumbered 3-5
  - "Corner style" renamed to "Shape" for brevity
  - "Create card" button is now full-width and more prominent; "Share card" sits directly below it
  - Mobile: replaced competing sticky bars (`.actions-sticky` + `.rewrite-bar`) with **single unified mobile bar** (`.mobile-bar`) — Create+Share buttons on left, rewrite count+Upgrade on right; no more z-index conflicts
  - Mobile: unified bar uses icon-first buttons (✨ Create, 📤 Share, ☕ Upgrade) with 44×44px minimum tap targets for accessibility
  - Mobile: tone buttons increased from `11px/8px 12px` to `13px/10px 14px`
  - Mobile: shape buttons increased from `11px/10px 14px` to `13px/12px 18px`
  - Mobile: example-click scroll target changed from `#card` to `.card-wrap` with `block: "center"`
  - Mobile: create-card scroll target changed from `#dlBtn` to `.card-wrap` with `block: "center"`
  - Backup snapshot saved to `backup/wisprstories_v15_pre_hierarchy.html`
  - Design spec saved to `docs/superpowers/specs/2026-05-18-layout-hierarchy-redesign-design.md`
- Disabled auto-demo animation on page load to allow ghost decoration to appear on fresh empty state. Original animation backed up to `backup/demo-auto-animation.js` for restoration.

---

## [v0.5.0]

### Added
- Vercel Blob upload for exact card PNG as WhatsApp OG preview. Cards auto-expire after 5 days via Blob TTL.
- Short share URLs (`/c/xyz123`) with fast raw PNG upload (~1.5s). Random 8-char alphanumeric IDs. Landing page shows card image + "Create Your Own" button.
- Padded OG images (1200×630) with card centered on background-matched padding for WhatsApp large preview.
- Proxy endpoint `/api/og-image/:id` serves OG images from our domain (avoids cross-domain issues with WhatsApp crawler).
- Added minimal og:title and og:description tags (required for WhatsApp large preview).
- "Copy image" button to share modal (copies PNG to clipboard).
- Mixed-script font engine: `splitByScript()` and `applyScriptFonts()` in `fonts.js` render multi-script text (e.g., "Happy जन्मदिन!") with per-character script detection and per-script font spans.
- Click debounce: Create card button disabled for 400ms after click to prevent accidental daily-limit overshoot.
- Mixed-script example ("Mixed Script" in examples grid) demonstrates per-script font rendering with Hindi + English text.
- Input-source-aware card labels: "Voice Original", "Voice Styled", "Story Original", and "Story Styled" now reflect whether content came from recording or text entry and whether a tone is applied.
- Source icons on card labels: mic for voice, fountain pen for story.

### Changed
- WhatsApp share now sends card URL instead of PNG file, triggering OG meta preview (Spotify-style rich card with image + text).
- OG images changed from 1080×1080 square (1:1) to 1200×630 landscape (1.91:1) — universal aspect ratio for WhatsApp large image preview.
- Dynamic `/api/og` endpoint rebuilt using `sharp` + SVG overlay (Node.js runtime) — renders user name, story text, and branding on palette backgrounds. (Kept as fallback for legacy shares.)
- Synced `/api/card` and `/api/og` palette handling with the 10-color UI palette so shared links using Orange, Teal, Fuchsia, or Indigo generate matching metadata/OG previews.
- Simplified footer trust copy to "No account · Open source" by removing the inaccurate "No uploads" claim.

### Security
- Hardened `/api/card` shared-card HTML rendering: tone/palette inputs validated, shared text/name lengths capped, HTML/meta values escaped, redirect script uses JSON-encoded URL.

### Fixed
- Mixed-script font coverage for Bengali, Gujarati, and Punjabi/Gurmukhi, and replaced the unloaded Sarabun Thai mapping with the already-loaded Noto Sans Thai Looped font.

---

## [v0.4.0]

### Added
- Mobile testing setup: zero-dependency Node.js server (`serve.js`), PowerShell launcher scripts, ADB + scrcpy integration, WiFi-direct phone testing at PC's local IP.
- Keyboard avoidance: `visualViewport.resize` listener on mobile scrolls the active input into view when keyboard opens.
- Loading skeleton state for examples grid (`ec-skeleton` shimmer animation).
- Auto-scroll to card preview on tone/palette/size/corner selection on mobile.

### Changed
- Replaced CSS-rendered spiral overlay (`mix-blend-mode: screen` compositing) with pre-baked WebP card background images (`assets/card-bgs/` — 80 files: 4 ratios × 2 corner styles × 10 palette colors). Export simplified: removed canvas pixel-inversion compositing, replaced with direct `drawImage` of the WebP.
- Precomposited the card spiral background before `html2canvas` export so Share modal previews and downloaded PNGs match the live screen-blend preview.
- Refreshing a saved draft no longer marks the card as created or shows the download/Wispr Flow CTA; users must click Create card again after reload, and restored preview waveforms are no longer cleared on startup.
- Create button hover/focus animation now restores the actual current button label instead of hard-coding "Create my card".
- Removed the automatic filled-card entrance animation that made the spiral/card appear to glitch during page refresh.
- Reworked PNG export so spiral blending is composed entirely offscreen; clicking Download no longer stretches or mutates the live spiral layer.
- Occasion images converted to WebP: birthday 1.6MB→174KB, mothers-day 1.4MB→124KB (90% smaller each).
- Right column scrollbar hidden (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`). Column remains scrollable via mouse wheel/touch/keyboard.
- Right column centering restored: `justify-content: center` on tall viewports, switches to `flex-start` at `max-height: 750px` for small laptop screens.
- Added intermediate breakpoint at 1024px with reduced column padding for smoother width responsiveness.

### Fixed
- Right column now auto-detects overflow on small laptops with independent scrollbar, matching left column pattern. Shell no longer clips footer (`overflow: hidden` removed). Ghost decoration shifted from 20px→40px right to clear scrollbar. Grid cells use `min-height: 0` for proper internal scrolling.

---

## [v0.3.0]

### Changed
- Mobile CSS improvements: `viewport-fit=cover`, safe-area-inset padding, `100dvh` fallback, `color-scheme` dynamic update on dark mode toggle, 44px palette touch targets, 480px breakpoint, `@media (hover: none)` hover animation disable for touch devices.
- Dark mode transition: extended to 0.4s, added `backdrop-filter` and `opacity` to transitioned properties for smooth toggle. Uses `transition: all 0.35s ease !important` with 500ms class timeout for full cross-element sync.
- Wave animation: JS skips binding on touch devices (`hover: none && pointer: coarse`). JS skips entirely on mobile (`window.innerWidth <= 720`), CSS kills via `@media (max-width:720px)`. All hover/transform/transition effects killed on mobile via width-based media query.
- Typography iterations: heading (`hl-h1`) enlarged to `clamp(36px, 5vw, 56px)` → `clamp(30px, 4vw, 48px)`, label (`hl-eye`) reduced from 9px to 10px, intro text sizing and spacing refined.
- Examples: limited to 8 on mobile for clean 2-column grid. Hidden `.left-closing` quote on mobile.
- Nav: "Speak · Create · Share" tagline hidden on mobile; brand text reduced to 14px, logo to 18px.
- Left panel: `padding-top` increased to 32px on mobile for nav-body distinction.
- Footer: centered layout (column direction, text-align center) on mobile. Copyright notice added (`© 2026 Wispr Flow`).

---

## [v0.2.0]

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

---

## [v0.1.0]

### Added
- Initial prototype: voice-to-card single-page app
- 37 language support via Web Speech API
- 6 card palettes, 6 tones (visual only), 4 aspect ratios
- PNG export via html2canvas
- Mobile sharing via Web Share API
- RTL support for Arabic, Hebrew, Farsi, Urdu
