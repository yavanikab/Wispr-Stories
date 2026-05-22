# Version History

## [Unreleased] — i18n cleanup + UI refinements + Remotion demo

### 2026-05-22 — i18n English-leak cleanup + UI refinements
- Removed English leaks (`tone.tip` prefix, `tone.rewriting`, `actions.createTone`, `record.generating`) in all 20 non-English locales: `de, es, fr, gu, hi, id, it, ja, kn, ko, ml, pa, pt, ru, sv, ta, te, th, tr, zh`
- Brought `tone.tip` in sync with new English wording ("Original preserves your exact words — unlimited, no daily cap. Other tones rewrite via AI: ...")
- Added `assets/i18n/NATIVE-REVIEW.md` — per-locale review checklist with confidence levels and per-string questions for native speakers
- Decision: Arabic (`ar.json`) and Urdu (`ur.json`) intentionally excluded; total UI locales = 20 (older docs claiming 23 are stale)
- Surfaced (not fixed): `shareModal.generating` vs `record.generating` key mismatch at `wisprstories.js:1845` causes silent English fallback on share-button spinner in all locales

### 2026-05-21 — UI refinements + i18n loader sync helper
- Added `getI18nSync()` in `i18n.js` for synchronous translation lookups outside the `data-i18n` flow
- Removed page-hide-during-translation-load (3-second reveal timeout); English renders on first paint and swaps in when translations load
- Unified notice system: one DOM slot, priority firefox > shared, per-type localStorage dismissal, re-localized on language change
- Style chip summary in collapsed Style accordion header (live tone/color/shape display, re-localized on language change)
- Name input: regex allows spaces / hyphens / underscores; max length raised 10 → 18 ("Lola Maria", "Mary-Anne" now valid)
- Theme toggle: added `aria-pressed` for screen-reader state announcement
- Record button labels (`recSt`, `recSub`) now read from i18n via `getI18nSync()` instead of hardcoded English
- ~700 lines of CSS added across 11 style modules (largest: `inputs.css` +253, `card.css` +181) supporting the above

### 2026-05-21 — Remotion promo demo
- Isolated `remotion-demo/` React/Remotion project with `WisprStoriesPromo` composition (24s, 1080×1080)
- Two audio-led variants: `WisprStoriesPromoSocial` (19.5s, `electronic-bass.mp3`) and `WisprStoriesPromoWarm` (26s, `warm-vinyl.mp3`); default `WisprStoriesPromo` points at warm
- Editable variant config at `remotion-demo/src/demoVariants.js` (durations, scene timing, audio start trims, fade-outs, background glow intensity, brand display rules, final CTA copy)
- Final exports at `remotion-demo/out/wispr-stories-promo-social.mp4` (4.0 MB) and `wispr-stories-promo-warm.mp4` (4.7 MB), both H.264/AAC 1080×1080
- Visual direction: compact card-forward concept with Wispr Stories cream/ink/amber palette, real logo, logo-first intro, final CTA screen
- Verified with 11 passing tests (`node --test test/storyPlan.test.mjs`) and visual stills checked at key frames

## v0.9.3 — Rewrite language fidelity + UI-language decoupling (2026-05-22)
- Rewrite API (`api/rewrite.js`) now classifies the input script (`detectScript()` returns one of `Japanese`, `Korean`, `Chinese`, `Devanagari (Hindi/Marathi)`, `Bengali`, `Gurmukhi (Punjabi)`, `Gujarati`, `Oriya`, `Tamil`, `Telugu`, `Kannada`, `Malayalam`, `Thai`, `Arabic`, `Cyrillic`, `Greek`, or `Latin`) and embeds the name into a positive `LANGUAGE RULE` so Tamil/Telugu/etc. inputs stay in their native script and English inputs stay in English. System message hardened with "ALWAYS respond in the exact same language and script as the input. You never translate or transliterate."
- Replaced the legacy `hasNonLatinScript()` one-sided guard ("don't convert Hinglish to Devanagari") that gave the LLM no positive instruction when input was already in a native script. Japanese is checked before Chinese so pure-Kanji Japanese isn't misclassified.
- Redis cache key now includes `PROMPT_VERSION = 'v2'` (`wispr:rewrites:cache:v2:${tone}:${hash}`). Any future prompt change just bumps the constant; orphaned old entries expire on their own 24h TTL with no manual flush.
- Client abort timeout in `wisprstories.js` raised 15s → 25s so the server's own 20s OpenRouter response (success or error) always reaches the client. Eliminates `AbortError: signal is aborted without reason` for slow free-model responses.
- Decoupled card-display language from page-UI language. `autoDetectLangFromText()` no longer writes `localStorage.wsLang`, and `loadDraft()` no longer calls `setLanguageByCode(draft.lang)`. Picking a Telugu/Tamil/etc. example sentence updates the card font + label but no longer flips the entire page UI on reload. `wsLang` is now exclusively owned by the language dropdown / `loadLanguages` initial read.
- `tryAutoDetectLang` draft early-return at `wisprstories.js:1454` intentionally preserved — removing it would resurrect a pre-existing dormant bug where `navigator.language` clobbers the user's manual dropdown choice.
- Script cache-buster in `wisprstories.html` bumped `v=20260521-v0.9.2` → `v=20260522-v0.9.3`.
- Paid fallback model (`inclusionai/ling-2.6-flash`) remains commented at `api/rewrite.js:175` per existing "uncomment before Vercel deploy" convention.

## v0.8.0 — Silence Detection + Tone Rewriting Preview + i18n (23 Languages)
- Silence detection: Web Audio API RMS check on Deepgram fallback recordings
- RMS < 0.01 over 2s = silence; prevents silent audio from hitting API (~20% savings)
- Proper analyser cleanup on recording stop
- Tone rewriting preview: Accept/Cancel bar after rewrite
- Original text preserved in textarea; rewritten text shown on card preview only
- Responsive CSS for preview bar (stacks on mobile)
- i18n system: `assets/i18n/i18n.js` loader with `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`
- 23 translation JSON files (en, zh, hi, es, ar, fr, pt, ru, ur, id, de, ja, pa, ko, te, ta, tr, it, th, gu, kn, ml, sv)
- RTL support for Arabic/Urdu (auto-sets `dir="rtl"` on `<html>`)
- Language selector wired to call `applyI18n()` on change
- Card content excluded from translation (stays English)

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
