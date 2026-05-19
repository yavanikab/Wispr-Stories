# Version History

## v0.7.0 — Mobile UI Refinements + Wave Animation Fix
- Mobile bar: theme-aware backgrounds, stronger shadow, backdrop-filter blur, thicker border
- Rewrite text: vertical stacking with .rewrite-count (18px/900/red) + .rewrite-label (9px/uppercase)
- Hidden inline .actions on mobile (sticky bar handles all actions)
- Share modal: hidden redundant download/copy-image buttons, margin-bottom 80px
- Toast: lifted above mobile bar
- Wave animation: resize re-bind fix (desktop hover works after mobile→desktop resize)
- "Your voice, beautifully shared" wave animation added
- Wispr Flow research docs created (improvement areas, HTML versions)
- Web Speech API audit completed (Whisper-only migration planned)

## v0.6.0 — Layout Hierarchy Redesign + Unified Mobile Bar
- Removed language dropdown → auto-detect from navigator.language
- Headline rewritten: "Tap the mic and say something lovely"
- .input-hero: record + textarea + "or type" as single visual zone
- Examples moved up to follow input zone (safety net for stuck users)
- Name field compacted to inline "From" row
- "Customize" → "Make it yours", <details> removed, steps renumbered 3-5
- "Corner style" → "Shape"
- Create card button: full-width, prominent
- Unified mobile bar: replaced competing .actions-sticky + .rewrite-bar with single .mobile-bar
- Mobile: tone buttons 11px→13px, shape buttons 11px→13px
- Mobile: scroll targets fixed (#card → .card-wrap, #dlBtn → .card-wrap)
- Disabled auto-demo animation on page load
- Design spec and backup snapshot saved

## v0.5.0 — Sharing Infrastructure + Security + New Features
- WhatsApp share: sends URL instead of PNG file (OG meta preview)
- Vercel Blob: exact card PNG upload, 5-day auto-expire
- Short share URLs: /c/xyz123 with fast raw PNG upload (~1.5s)
- OG images: 1080×1080 → 1200×630 landscape, padded, proxy endpoint /api/og-image/:id
- Dynamic /api/og rebuilt with sharp + SVG overlay (fallback)
- Security: /api/card hardened — tone/palette validation, text/name caps, HTML escaping
- Mixed-script font engine: splitByScript() / applyScriptFonts() in fonts.js
- Click debounce: 400ms on Create button
- Input-source card labels: "Voice Original", "Voice Styled", "Story Original", "Story Styled"
- Source icons: mic for voice, fountain pen for story
- Footer trust copy: removed inaccurate "No uploads" claim
- Mixed-script font coverage: Bengali, Gujarati, Punabi/Gurmukhi, Thai fix
- "Copy image" button in share modal

## v0.4.0 — Performance + Testing + Card Export Fixes
- Mobile testing: serve.js, PowerShell scripts, ADB + scrcpy, WiFi-direct phone testing
- Keyboard avoidance: visualViewport.resize listener
- Loading skeleton for examples grid (ec-skeleton shimmer)
- Occasion images → WebP: birthday 1.6MB→174KB, mothers-day 1.4MB→124KB
- Spiral background: replaced CSS mix-blend-mode: screen with pre-baked WebP images (80 files)
- Export fixes: offscreen spiral compositing, no live spiral mutation, export-scale rendering
- Refresh state: saved drafts no longer mark card as created, restored waveforms not cleared
- Create button animation: restores actual label instead of hard-coded text
- Removed automatic filled-card entrance animation (glitch fix)
- Auto-scroll to card preview on tone/palette/size/corner selection
- Palette sync: /api/card and /api/og aligned with 10-color UI palette
- Right column: scrollbar hidden, centering restored, max-height: 750px breakpoint
- Intermediate breakpoint at 1024px with reduced padding

## v0.3.0 — Mobile Foundation + Dark Mode
- Mobile CSS: viewport-fit=cover, safe-area-inset padding, 100dvh fallback, 44px touch targets, 480px breakpoint
- Dark mode: transitions (0.35s→0.4s), backdrop-filter, color-scheme dynamic update
- Wave animation: killed on mobile (width-based media query), JS skips on touch devices
- Typography iterations: heading clamp sizing, label reduced, intro text sizing/spacing
- Nav: tagline hidden on mobile, brand text 14px, logo 18px
- Footer: centered column layout, copyright © 2026 Wispr Flow
- Examples: limited to 8 on mobile, 2-column grid, hidden .left-closing quote
- Dark mode transition: transition: all with class timeout for cross-element sync

## v0.2.0 — SEO + Security hardening
- Full SEO meta tags, OG/Twitter Cards, JSON-LD
- Security headers via vercel.json
- Self-hosted flag-icons and html2canvas (no CDN)
- Dark mode support groundwork

## v0.1.0 — Initial Prototype
- wisprstories_v15.html (latest)
- wispr_stories_v14.html (previous iteration)
