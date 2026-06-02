# Version History

## v0.10.4.2 — Stage 1 Recording Flow Bug Fixes (2026-06-02)

Stage 1 implements the 7 bug fixes + 4 deep sub-fixes (2.1 Promise.all + Cancel button, 2.2 one-tick 00:00, 2.3 retry state). Stages 2–4 (VAD, streaming STT, Wispr Flow learnings) are data-gated and not in this milestone. Design doc was deleted after Stage 1 reached 100% completion.

### Added
- **Onboarding Quick Reference** — collapsible `<details>` in onboarding modal footer with 7 tips. Replaces inline info-tooltip buttons for first-time users
- **`record.processing` i18n key** + **shorter textarea placeholder** in all 11 locales
- **`record.cancel` i18n key** (liveBox cancel button during mic-startup) in all 11 locales
- **`record.couldntRetry` i18n key** (liveBox retry state after STT failure) in all 11 locales
- **Module-level STT health-check cache** (10-min TTL, 1 retry on network error)
- **`_startRecTimer()` helper** — drift-corrected MM:SS countdown
- **STT health + getUserMedia in parallel (2.1)**: `_getMicStream()` helper, `Promise.all` in `startRec()`, mic-error toasts (NotAllowedError, NotFoundError, generic)
- **Cancel button during mic-startup (2.1)**: `_micStartCancelled` flag checked in 3 places (Promise.all continuation, startDeepgramRecording().then() continuation, 2 s watchdog); mic stream tracks stopped on cancel; liveBox renders "Starting…" + Cancel button
- **STT retry state (2.3)**: `_lastSttWav` + `_lastSttLang` + `_lastSttSessionId` saved in `stopDeepgramRecording()`; `_showSttRetryState()` shows clickable "↻ Couldn't transcribe. Tap to retry" in liveBox; `_retryLastStt()` re-sends same WAV to `/api/stt` with 15 s timeout; `_sttRetrying` flag prevents double-tap

### Fixed
- **Record button — double-fire on slow mic permission** (2.1): Synchronous `recBtn.disabled = true` + 2 s watchdog re-enable
- **Recording timer — drift over time** (2.2): `setTimeout` chain + `performance.now()` correction, MM:SS format
- **Timer — "00:00" lands for one tick before Processing (2.2)**: helper renders "00:00" then defers `onExpire` by 1000 ms so the browser repaints "00:00" before transitioning
- **Stop tap — silent wait during transcription** (2.3): "Processing your audio…" spinner in liveBox
- **WebM export — silent zero-byte upload** (2.7): Caller-level `blob.size > 0` check with user-visible "Voice didn't capture. Try again" toast
- **Orphaned `record.tip` i18n key in 10 non-English locales**: removed in lockstep with en.json

### Changed
- **Info tooltips removed from form** (2.5): 5 inline `?` icons gone, ~55 lines of JS removed, `tooltips.css` deleted
- **Duplicate `record` i18n key in 10 non-English locales** — merged into single object
- **Onboarding modal visual polish**: emoji tiles (🎙️ 🎨 🚀) on the 3 steps, full-ink + bold labels in Quick Reference with dimmer body text, 28px gap before CTA, hint rewritten to point at the real "How to Use" footer link in all 11 locales
- **Voice attach bar hides when tone is not "original"**: `updateVoiceBar()` checks `curTone === "original"`; non-original tones auto-detach voice (preserve audioBlob) and hide the toggle. `applyTone()` now calls `updateVoiceBar()`.
- **Tone counter UI sync from server** (`api/rewrite-status.js`): New read-only GET endpoint returns authoritative per-tone counts for a sessionId. Client fetches on page load and replaces the localStorage mirror, so clearing localStorage no longer makes the UI lie about remaining rewrites. Server still enforces the cap; this fix is display-only.

### Removed
- **`global/styles/tooltips.css`** (orphaned after 2.5) + its import in `main.css`

---

## v0.10.4.1 — Tone Counter & WhatsApp Share Fixes (2026-06-02)

### Added
- **`api/rewrite-confirm.js`** — new commit endpoint for tone rewrites
- **Test scripts**: `scripts/stress-test-99-cap.mjs`, `scripts/verify-cron-cleanup.mjs` + markdown explainers in `docs/test-plans/`
- (Removed) **Recording flow redesign spec** (Stage 1–4) — local-only design doc, deleted after Stage 1 reached 100% completion

### Fixed
- **Tone rewrite counter** — preview-then-commit refactor (counter ticks on Accept/Create, not on tone pick). Server is source of truth
- **Tone counter live UI** — `applyTone(curTone)` after counter change in btnC handler
- **WhatsApp share preview** — OG image is now 1200×1200 native 1:1 (was 1200×630 padded). Meta tags updated. Share-apps uses `_shareBlob` (1:1) not `_shareSocialBlob` (9:16)

### Removed
- Dead `countCard()` function in `wisprstories.js` (server is now source of truth)

## v0.10.4 — About Page UI/UX Polish (2026-05-29)
### Added
- About page reveal animations (formerly broken — CSS rules were missing)
- Mosaic card stagger entrance (7 cards fade in sequentially)
- Count-up animation for stat numbers
- FAQ auto-scroll on open
- Wispr Flow auto-wave tagline in CTA (continuous letter-bounce, ~2s pause between cycles)

### Changed
- Hero heading: increased to 700 weight for more impact
- Feature stat numbers: enlarged (~1.4× previous size)
- "STT engines (Speech recognition)" → "Speech engines"
- CTA button hover: now scales up (1.03×) instead of shrinking
- FAQ max-height: 500px → 800px
- Step number circles: use lavender accent in dark mode

### Fixed
- Reveal animation CSS now properly defined in about.css
- Mosaic card entrance animation no longer conflicts with rotation transforms

## v0.10.3 — Language Stats Page Redesign (2026-05-29)

### Added
- Language Stats page major UI/UX overhaul to match Wispr Flow design aesthetic
- Hero section with larger typography, generous spacing, subtle gradient
- Insights section: visible "Top languages" label, 3-column card layout, clickable
- Region chips: visible filter buttons with language counts, grouped with heading
- Chart: Wispr Flow color palette, animation, hover cursor
- Table: search with row count, "no results" message, zero rows toggle, zebra striping, top-3 highlights
- Share button, back-to-top button, skeleton loading, count-up animation
- Disclaimer collapsed to single line, badge note explanation
- Dark mode support, mobile optimizations, print styles

### Changed
- Footer moved inside .main (scrolls with content)
- Chart region colors updated to Wispr Flow palette
- Hero typography scaled up (h1: 28-36px, section headings: 20-24px)
- Subtitle text improved for clarity
- Card borders increased to 1.5px
- Main padding increased for breathing room
- Section headings: italic emphasis on "Language"

### Fixed
- Region filter sync (chart ↔ chips)
- Insights clickable (filter table by language)
- Search "no results" message
- Zero rows toggle
- Chart hover cursor
- Table row count indicator
- Footer alignment (removed grid properties)
- Mobile insights layout (3-column compact)

## v0.10.2 — UI/UX Polish + Keyboard + Determinate Progress (2026-05-28)

### Added
- Determinate progress bar driven by ffmpeg.wasm callback
- File size and time estimates in download choice modal
- Green flash success animation on download button
- Toast queue (max 3, 250ms gap)
- ESC to close any modal; keyboard shortcuts popover (Space, Esc)
- Focus trapping + Tab cycling inside all modals; modal stack guard prevents overlap
- Cycling placeholder hints from language examples in empty textarea
- Haptic `navigator.vibrate()` on mic/create/share
- Full-width share preview at <=480px

### Changed
- OR divider text → `fa-keyboard` icon
- Name row hidden until textarea content or name focus
- `_vibrate()` helper for mobile tactile feedback
- ffmpeg URL: `core-st@0.12.6` → `core@0.12.6` (404 fix)
- i18n key: `shareModal.generating` → `record.generating`
- About page: separated HTML/CSS/JS into `about.html`, `global/styles/about.css`, `global/about.js`
- About page: clarity rewrite for 8 jargon strings (model names preserved)
- About page: hero card replaced with scattered mosaic showing 7 languages and colors

## v0.10.1 — Bugfix: Download WebM, dark overlay, syntax error (2026-05-27)

### Fixed
- **WebM caching** — `generateWebm()` now caches the generated blob with a 24-hour expiry (keyed by audio size + text + palette + tone). Re-downloading returns instantly. Cache invalidates on re-record, text change, palette change, or tone change.
- **WebM frame rate** — Increased from 1 FPS to 30 FPS for proper video player compatibility. Frame capture uses `requestAnimationFrame` before `recorder.start()` to guarantee first frame presence.
- **WebM download no longer includes PNG** — `_downloadWebmWithAudio()` now only generates and downloads the `.webm` file. The old code downloaded a PNG first, then the WebM, triggering a browser multi-download warning.
- **WebM dark overlay** — `generateWebm()` rewritten to use compositing: card background rendered via `createExportBackground()` at 2x resolution, foreground via html2canvas, combined onto a single canvas. Eliminates transparency→black artifact from video codec YUV conversion.
- **Download choice modal hover contrast** — More visible hover states for both buttons in light and dark modes (border color changes, background shifts).
- **Syntax error** — `dlChoicePng` and `dlChoiceWebm` event listeners were missing closing `});`, causing `Unexpected end of input` on page load.

## v0.10.0 — Full 44-language STT + About page + Nav cleanup (2026-05-26)

### Features
- **15 new speech languages**: Arabic, Bengali, Danish, Persian, Finnish, Hebrew, Hungarian, Marathi, Malay, Dutch, Polish, Tagalog, Ukrainian, Urdu, Vietnamese added — all 44 languages now have STT support. No gap between the stats page and speech modal.
- **About page** (`about.html`): standalone page with app overview and 7-item collapsible FAQ covering languages, Native option, AI rewriting, card retention, privacy, Wispr Flow, and support.
- **About + How to Use links**: added to the footer support dropdown menu. Help button removed from nav bar and moved to footer menu.

### Changed
- Speech modal grid sorted by country flag (English first, Native second, then by flag code + label). Indian languages grouped together.
- Nav bar "Language" shortened to "Lang". Help icon removed from nav.
- `languages.json` expanded: 29 → 44 entries.
- STT routing: all 44 languages routed to Deepgram Nova-3 Multilingual (15 new in `dgSupported`).
- Main page logo swapped to `ws-logo-blwbg.png` (visible in dark mode).

### Technical
- `about.html`: standalone page with matching app theme, collapsible FAQ, inline theme toggle with dark-mode persistence.
- `footer-menu.js`: "How to Use" (triggers `showOnboarding()`) and "About" links added.
- `api/stt.js`: `dgSupported` expanded with `ar, bn, da, fa, fi, he, hu, mr, ms, nl, pl, tl, uk, ur, vi`.
- Discovery: Vercel Dev on Windows requires Edge runtime (`@vercel/edge`) for all API functions; Node.js serverless runtime hangs indefinitely.
- `wisprstories.js`: `_wsLocales` expanded; `populateSlGrid()` now sorts by flag code.
- `languages-loader.js`: `LATIN_LANGS` expanded with `nl, da, fi, pl, hu, vi, ms, tl`.

## v0.9.9 — Language Stats page + Speech expansion + Global usage tracking (2026-05-26)

### Features
- Language Stats page (`language-stats.html`): dynamic Chart.js bar chart + data table tracking 44 languages + Native card creation, split by Voice vs Story input method. Header with stats banner, region-grouped listing, zero-data state, dark/light toggle.
- Global usage tracking: card creation events tracked via separate Upstash Redis instance (`UPSTASH_REDIS_LANG_STATS_URL`), aggregated via `GET /api/lang-stats`.
- 8 new speech languages added: Greek, Catalan, Czech, Nepali, Burmese, Sinhala, Javanese, Uzbek — 44 total + Native supported.
- "Lang Stats" link added to the footer support dropdown menu.

### Technical
- `lib/lang-stats-redis.js`: separate Redis client for isolated stats storage (reads distinct env vars).
- `api/track-usage.js`: POST endpoint incrementing `HINCRBY wispr:langstats`.
- `api/lang-stats.js`: GET endpoint returning parsed `{ voice: {}, story: {} }`.
- `wisprstories.js`: `trackCardUsage()` fires on card creation, sending detected language + `inputSource`.
- `api/stt.js`: `whisperLanguages` extended with `ne, my, si, jw, uz`; `dgSupported` with `el, ca, cs`.
- `assets/languages/languages.json`: 8 new entries (29 total).
- `docs/existing-redis.md` and `docs/language-stats-page.md` created.
- `language-stats-mockup.html` deleted (replaced by `language-stats.html`).
- **Language Stats page refactored**: Inline CSS/JS extracted to `global/styles/language-stats.css` and `global/language-stats.js`. Thin HTML shell. Region-colored chart bars (5 regions), cross-filter by region click, three-state table sorting (A→Z/Z→A/default for Language, desc/asc/default for numbers). 6 missing flag SVGs downloaded (np, mm, lk, gr, cz, uz). Favicon added. Uzbek merged into Middle East & Central Asia region.
- **Theme toggle fixed**: Main app's theme toggle button was present but had no click handler. Now toggles `.dark` class + `localStorage.theme` + moon/sun icon. Stats page theme toggle shares `localStorage.theme` key.

## v0.9.8 — Landing page CTA + Share URL metadata + Nudge fix + i18n cleanup (2026-05-26)

### Features
- Landing page personalization: sender name appears in image alt, caption, and OG meta tags on shared card pages.
- Share URL metadata: card text, author, tone, palette, and corners are now stored as `meta/<id>.json` alongside card images in Vercel Blob.
- CTA pre-population: "Create your own" link on shared card pages now passes card content as hash params, pre-filling the editor.

### Bug fixes
- Example sentence click no longer triggers redundant speech language nudge animation.
- Upgrade modal "Send" button now shows "Send" consistently in all 21 locales (was "Send recovery email" in non-English).

### Technical
- `api/upload.js`: added `safeTone()`, `safePalette()`, `safeCorners()` validation; accepts `X-Card-*` headers for metadata; stores `meta/<id>.json` sidecar.
- `wisprstories.js`: both share handlers send `X-Card-Text`, `X-Card-Name`, `X-Card-Tone`, `X-Card-P`, `X-Card-R` headers on upload.
- `api/c/[id].js`: handler changed to async; fetches metadata from Blob and personalizes landing page; falls back gracefully for old cards without sidecar.

## v0.9.7 — Native language support + Card label auto-detect + Mic guard (2026-05-25)

### Features
- "Native" speech language option: white neutral flag for all unsupported languages (Persian, Malaysian, Sri Lankan, Argentine Spanish, etc.).
- Card language label auto-detection: detects script from text → labels correctly (Hindi, Thai, Korean, etc.) instead of relying on user's speechLang setting.
- Auto-set Native: when a detectable but unsupported script is entered with no speech language set, Native is auto-selected.
- Mic recording guard: blocks recording when no language or "Native" is selected — prevents wasted API calls.

### Bug fixes
- Card label no longer shows wrong language when speechLang doesn't match text content (auto-detect wins).
- Speech language trigger no longer shows "undefined" on page load (i18n cache timing fix from v0.9.6).

### Technical
- `autoDetectLangFromText()` now returns detected language code (callers can use return value).
- `__native__` sentinel for speechLang — filtered from Deepgram/Web Speech API calls.
- "Native" grid item uses `fi-xx` (white neutral flag) from flag-icons CSS library.

## v0.9.6 — Hero subtitle + Occasions cleanup + Audit fixes (2026-05-24)

### Features
- Hero subtitle updated in all 21 i18n locales: "Record with the mic or dictate with Wispr Flow. Style and share with love." — native-script translations for all 20 non-English locales.
- Republic Day (India, Jan 26) added to date-aware occasions with country-flag display.
- Language-based festival filtering: occasions can restrict triggering to specific languages (India-only, country-specific).
- Speech-language modal now internationalized with `data-i18n` attributes.
- 2026 & 2027 date tables for all 54 occasions documented.

### Bug fixes
- 3 stale `[Deepgram]` console labels changed to `[STT]` for engine-agnostic diagnostics.
- Web Speech restart uses `speechLang` instead of `curLang` (restart honors speech language).
- `serve.cjs` Deepgram key check no longer blocks OpenRouter Whisper path.
- `api/stt.js` health check validates placeholder keys (`YOUR_ACTUAL_KEY`).
- Reset button properly cleans up MediaRecorder/stream tracks and reports recording duration on all stop paths.
- `getUserCountry()` normalizes short language codes to full COUNTRY_MAPPING keys.
- Duplicate font stacks removed from `base.css`; Hebrew dead fonts excised.

### Technical
- 12 WebP occasion images converted to PNG (fixes html2canvas rendering stability).
- 53 occasion image files renamed to lowercase-with-hyphens convention.
- `occasions.json` paths updated to `.png` format.
- `languages` field supported in occasion trigger entries for per-language filtering.
- `docs/admin-setup.md` now documents `OPENROUTER_API_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.

## v0.9.5 — Hybrid STT routing (Deepgram + Whisper) + UI fixes (2026-05-24)

### Features
- Hybrid STT engine routing: Western + Indian languages (14) use Deepgram Nova-3 (free $200 credits); CJK/Thai + Malayalam/Punjabi (6) use OpenRouter `openai/whisper-large-v3-turbo` (paid)
- Malayalam/Punjabi no longer forced to Web Speech API fallback — routed to Whisper via server
- All 20 speech-languages are now server-transcribed; Web Speech API is only used when server STT is unavailable

### Bug fixes
- Recording timer display now shows correct starting value ("15s remaining" instead of blinking "14s remaining" on first tick) in both Deepgram and Web Speech paths
- Speech-language trigger pill uses consistent border-radius (`6px`) matching the nav language button instead of full pill shape (`20px`)

### Technical
- `serve.cjs` and `api/stt.js`: dual-engine STT routing — health check returns `available: true` if EITHER Deepgram or OpenRouter key is configured; POST handler routes by `whisperLanguages = ['th','ja','ko','zh','ml','pa']` to OpenRouter `/v1/audio/transcriptions`, all others to Deepgram
- Format sanitizer strips MIME type parameters (`audio/webm;codecs=opus` → `webm`) for OpenRouter compatibility
- Client error label changed from `[Deepgram]` to `[STT]` for accurate diagnostics

## v0.9.4 — Doc audit + rewrite multilingual fix + version consolidation (2026-05-23)

### Bug fixes
- Rewrite API: switched to `qwen/qwen3-14b:free` (multilingual model) with `isLanguageMismatch()` output validator + `PROMPT_VERSION v3` cache bump
- Fixed "no backend" claims across interview docs; corrected language counts (42→21), tone icons, rewrite limits (10→5), serverless status, AssemblyAI→Deepgram references

### Documentation
- Consolidated CHANGELOG.md `[Unreleased]` entries into `v0.9.4`
- Updated `WISPR_STORIES_CANONICAL_BLUEPRINT.md`: palette count 6→10, file list, tone status, open questions, added occasion/PWA/font system docs, deduplicated section numbering
- Fixed `docs/interview-quick-reference.md`, `docs/INTERVIEW_GUIDE.md`, `docs/competitor-prep.md`, `docs/cost-architecture.md` factual errors
- Deleted 3 duplicate HTML doc files
- Bumped `sw.js` cache to `wispr-stories-v0.9.4`
- Updated README.md (6→10 palettes, clarified aspect ratios)

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
