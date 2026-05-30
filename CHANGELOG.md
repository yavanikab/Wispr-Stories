# Changelog

## [v0.10.1] — 2026-05-27

### Fixed
- **WebM generation: caching + 30 FPS + frame readiness** — `generateWebm()` now caches the generated WebM blob with a 24-hour expiry using a memory cache keyed by audio size, text, palette, and tone. Subsequent downloads return instantly. Frame rate increased from 1 FPS to 30 FPS for proper video player compatibility. Frame capture uses `requestAnimationFrame` before starting the recorder to guarantee the first frame is present. Cache automatically invalidates on re-record, text change, palette change, or tone change.
- **Download WebM no longer triggers PNG download** — `_downloadWebmWithAudio()` now generates and downloads only the `.webm` file, eliminating the browser's multi-download warning. Clicking "Download WebM with Voice" no longer also saves a PNG.
- **WebM dark overlay eliminated** — `generateWebm()` now uses a two-layer compositing approach: the card background is drawn via `createExportBackground()` at 2x resolution, then foreground content (text, labels) is composited on top via html2canvas. This fixes the transparency→black issue in video codec YUV conversion.
- **Download choice modal hover contrast** — PNG and WebM buttons now have distinct, visible hover states in both light and dark modes (border color changes, background shifts instead of subtle opacity changes).
- **Syntax error crash** — Two `addEventListener` calls for `dlChoicePng` and `dlChoiceWebm` were missing their closing `});`, causing `Unexpected end of input` at page load. Fixed.

## [v0.10.0] — 2026-05-26

### Added
- **15 new speech languages** — Arabic (`ar`), Bengali (`bn`), Danish (`da`), Persian (`fa`), Finnish (`fi`), Hebrew (`he`), Hungarian (`hu`), Marathi (`mr`), Malay (`ms`), Dutch (`nl`), Polish (`pl`), Tagalog (`tl`), Ukrainian (`uk`), Urdu (`ur`), Vietnamese (`vi`) added to speech modal grid, STT routing (all via Deepgram Nova-3 Multilingual), Web Speech locale mappings, and Latin-script wave animation flag where applicable. Speech modal now covers all 44 languages from the stats page — no gap.
- **About page** — New `about.html` at root with descriptive About section and collapsible FAQ (7 questions covering language count, Native option, AI rewriting, card retention, privacy, Wispr Flow, support).
- **"How to Use" in footer menu** — Help button removed from nav bar and added to the footer support dropdown as "How to Use" with `fa-circle-question` icon, triggers the onboarding flow.
- **"About" link in footer menu** — New link with `fa-book-open` icon pointing to `about.html`.

### Changed
- **Speech modal sorting** — Languages now sorted: English first, Native second, then alphabetically by country flag code, then by label within each country. All Indian languages (`flag: in`) naturally group together.
- **Nav bar** — "Language" label shortened to "Lang". Help button removed from nav.
- **`assets/languages/languages.json`** — Expanded from 29 to 44 entries (added 15 languages).
- **`api/stt.js`** — `dgSupported` extended with 15 new languages (all routed to Deepgram Nova-3).
- **`wisprstories.js`** — `_wsLocales` extended with 15 locale mappings for Web Speech fallback.
- **`assets/languages/languages-loader.js`** — `LATIN_LANGS` extended with 8 Latin-script languages.
- **`global/footer-menu.js`** — Added "How to Use" and "About" menu items.
- **`sw.js`** — Service worker cache updated to use `ws-logo-blwbg.png`.

### Fixed
- **Main page nav logo** — Changed from `ws-logo-bl.png` (black on transparent, invisible in dark mode) to `ws-logo-blwbg.png` (black logo with white background, visible in both modes).

### Technical
- `about.html` — standalone page matching app design (cream/ink theme, same nav + footer). Collapsible FAQ with `fa-chevron-right` toggle. Theme toggle handler and dark-mode persistence included inline.
- All 44 languages now have STT routing — no gap between the language-stats page (44) and the speech language modal (was 29, now 44). The "Native" option makes 45 total entries in the modal.
- **Vercel Dev on Windows: Edge runtime required** — `api/stt.js` must remain on Edge runtime. The Node.js serverless runtime (`@vercel/node`) hangs indefinitely (>30s) on Windows. This affects other API routes too — all must use `runtime: 'edge'` for local development.

### Added
- **Language Stats page** — New `language-stats.html` standalone page with dynamic Chart.js bar chart and data table tracking card creation across 44 languages + Native, split by Voice vs Story input method. Header with stats banner and region-grouped listing. Zero-data state handled gracefully. Navbar with logo + dark/light toggle. Footer with support menu.
- **Global usage tracking** — Card creation now POSTs to `/api/track-usage` with detected language and input method (`inputSource`). Data stored in a separate Upstash Redis instance (new `UPSTASH_REDIS_LANG_STATS_URL` / `_TOKEN` env vars). New `GET /api/lang-stats` endpoint feeds the stats page.
- **8 new speech languages** — Greek (`el`), Catalan (`ca`), Czech (`cs`), Nepali (`ne`), Burmese (`my`), Sinhala (`si`), Javanese (`jw`), Uzbek (`uz`) added to speech modal grid, STT routing, Web Speech locale mappings, and Latin-script wave animation flag.
- **Documentation** — `docs/existing-redis.md` (existing Upstash Redis architecture) and `docs/language-stats-page.md` (stats page architecture + tracking data flow) created.

### Changed
- **`api/stt.js`** — Extended `whisperLanguages` with `ne, my, si, jw, uz`; extended `dgSupported` with `el, ca, cs`.
- **`assets/languages/languages.json`** — Added 8 new language entries (29 total).
- **`global/footer-menu.js`** — Added "Lang Stats" link in the support dropdown panel.
- **`assets/languages/languages-loader.js`** — Updated `LATIN_LANGS` with `el, ca, cs`.

### Technical
- New `lib/lang-stats-redis.js` — separate Redis client reading `UPSTASH_REDIS_LANG_STATS_URL` / `UPSTASH_REDIS_LANG_STATS_TOKEN`.
- `api/track-usage.js` — POST endpoint, increments `HINCRBY wispr:langstats "{source}:{lang}"`.
- `api/lang-stats.js` — GET endpoint, returns parsed `{ voice: {}, story: {} }` objects; gracefully returns empty data when Redis is not configured.
- `wisprstories.js` — `trackCardUsage()` fires on card creation (btnC click), sending `{ lang, source }` to `/api/track-usage`. Fails silently.
- `language-stats-mockup.html` deleted (replaced by `language-stats.html`).
- **Language Stats page refactored** — Inline `<style>` extracted to `global/styles/language-stats.css`; inline `<script>` extracted to `global/language-stats.js`. Page now a thin HTML shell. CSP-safe (no CDN JS at runtime). Favicon added.
- **Region-colored chart bars** — Chart bars color-coded by 5 regions (South Asia=amber, Europe=blue, SEA=green, MidEast+Central Asia=purple, East Asia=red). Uzbek (`uz`) merged into Middle East & Central Asia.
- **Cross-filter by region** — Click chart bar → table filters to that region; click same bar clears filter. Non-matching bars dimmed. Region badge with ✕ button shown above chart when filter active. Native row hidden during filter.
- **Three-state table sorting** — Language column: A→Z / Z→A / default. Numeric columns (Voice/Story/Total): desc / asc / default. Sort indicator arrows (▲/▼) on sorted column header.
- **6 missing flag SVGs downloaded** — `np.svg`, `mm.svg`, `lk.svg`, `gr.svg`, `cz.svg`, `uz.svg` to `assets/flag-icons/flags/4x3/`.
- **Theme toggle handler added** — `wisprstories.html` had a theme toggle button with no click handler. Added toggle logic: switches `.dark` class, persists `localStorage.theme`, swaps moon/sun icon. Initial icon state set via DOMContentLoaded listener. Stats page theme toggle shares the same `localStorage.theme` key.

## [v0.9.8] — 2026-05-26

### Added
- **Landing page sender name** — Shared card landing page (`/c/:id`) now displays the sender's name in the image alt text ("You have received a Wispr Story from {name}"), as a caption below the card ("{name} shared a Wispr Story with you."), and in OG meta tags. CTA link pre-populates the editor with the card's text, name, tone, palette, and corners via hash params.
- **Card metadata sidecar** — `api/upload.js` now stores `meta/<id>.json` alongside card images in Vercel Blob, containing `{ text, name, tone, p, r }`. Client sends metadata as custom HTTP headers during share upload.
- **Share URL metadata** — Both "Copy link" and native share now send the card's text, author name, tone, palette, and corners as headers to the upload API.

### Changed
- **emailSend i18n** — Unified to `"Send"` in all 21 locale files (was `"Send recovery email"` in 20 non-English locales).
- **api/c/[id].js** — Handler changed from sync to `async` for metadata fetch. Landing page now personalizes OG title, description, image alt, and CTA link based on card metadata.
- **api/upload.js** — Added `safeTone()`, `safePalette()`, `safeCorners()` validation helpers. Now accepts `X-Card-*` headers for metadata sidecar storage.

### Fixed
- **Example sentence nudge** — Removed `updateSlNudge()` from example click handler (`wisprstories.js`). The nudge animation was redundant when examples populated the card; it now only fires on user input (typing, recording, draft restore).

## [v0.9.7] — 2026-05-25

### Added
- **"Native" speech language option** — White neutral flag (`fi-xx`) at the bottom of the speech language grid. For languages not in our supported list (Persian, Malaysian, Sri Lankan, Argentine Spanish, etc.). Card shows "Native" label instead of a wrong language name.
- **Auto-detect card label** — Card language label now uses auto-detected language from text content first, then falls back to speechLang, then curLang. Auto-detect handles 15+ non-Latin scripts (Hindi, Thai, Korean, Japanese, Chinese, Tamil, Telugu, etc.).
- **Auto-set Native** — When text is typed in a detectable script (Arabic, Bengali, etc.) and no speech language is selected, speechLang is automatically set to "Native".
- **Mic recording guard** — Mic button is blocked when no speech language is selected (toast: "Select a language first") or when "Native" is selected (toast: "This language isn't supported for speech yet. Type your words below."). Prevents wasted API calls.
- **Record tooltip** — Updated to mention selecting a speaking language first.

### Changed
- **`autoDetectLangFromText()`** — Now returns the detected language code (or null) instead of being void. Callers can use the return value directly.
- **`updateSlTrigger()`** — Added `__native__` sentinel branch showing the white neutral flag.
- **`populateSlGrid()`** — Appends "Native" item after the 21 supported languages.
- **Deepgram API call** — Filters out `__native__` sentinel (passes empty string, letting Deepgram auto-detect).
- **Web Speech restart** — Uses fallback chain (`_wsLocales[speechLang] || _wsLocales[curLang]`) instead of raw speechLang.

### Technical
- `__native__` sentinel value stored in `localStorage('wsSpeechLang')` for the "Native" meta-option.
- `SCRIPT_TO_LANG` entries for `beng` and `arab` remain `null` (these scripts auto-set speechLang to `__native__` instead of mapping to a non-existent language).

## [v0.9.6] — 2026-05-24

### Added
- **Hero subtitle i18n** — Updated all 21 locale files + HTML fallback to new copy: "Record with the mic or dictate with Wispr Flow. Style and share with love." Native-script translations for all 20 non-English locales.
- **Republic Day** — Added to `date-occasions.json` (India only, Jan 26, country-flag display matching Independence Day pattern).
- **Speech-lang modal i18n** — Added `data-i18n` attributes to modal title and subtitle, plus `speechLang.title`/`speechLang.sub` keys in `en.json`.
- **2026 & 2027 dates** — Added date tables to `C_occasions-list.md` for all date-specific occasions.
- **Missing env vars** — Documented `OPENROUTER_API_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` in `docs/admin-setup.md`.
- **Language filter** — Added `languages` field support to `occasions.js` for per-occasion language restrictions (India-only/country-specific festivals).

### Changed
- **Hero subtitle** — New text across all 21 locales: "Record with the mic or dictate with Wispr Flow. Style and share with love."
- **All occasion images removed** — 12 WebP files converted to PNG; 53 image files renamed to lowercase-with-hyphens convention; `occasions.json` paths updated to `.png`.
- **`country-mapping.json` normalization** — `getUserCountry()` now maps short language codes (e.g., "hi") to full locale keys (e.g., "hi-IN") for correct Independence Day country detection.

### Fixed
- **3 stale `[Deepgram]` console labels** → `[STT]` at `wisprstories.js:815,818,823` (engine-agnostic diagnostics).
- **Web Speech restart `curLang`** → `speechLang` so restart honors speech language (not page display language).
- **`serve.cjs` Deepgram key check** — No longer blocks the Whisper path when `OPENROUTER_API_KEY` is set but `DEEPGRAM_API_KEY` is a placeholder.
- **`api/stt.js` health check** — Now validates placeholder keys (`YOUR_ACTUAL_KEY`) so dev environment correctly reports `available: false`.
- **Reset button resource leak** — Web Speech/Deepgram stop + timer + stream cleanup on reset; `reportRecordingDuration()` added to all stop paths (spacebar, reset button).
- **Duplicate font stack in `base.css`** — Removed; `fonts.css` is the single source. Hebrew dead fonts removed from font stacks.
- **`PENDING.md` typo** — `sankranthi` → `sankranti`.

### Known issues
- **`shareModal.generating` vs `record.generating` key mismatch** — Still unfixed. Tracks with existing entry.

## [v0.9.5] — 2026-05-24

### Added
- **Hybrid STT routing: Deepgram + OpenRouter Whisper** — Western + Indian languages (14) use Deepgram Nova-3 (free $200 credits). CJK/Thai + Malayalam/Punjabi (6 languages: `th, ja, ko, zh, ml, pa`) use OpenRouter `openai/whisper-large-v3-turbo` via `/api/v1/audio/transcriptions`. Health check returns `available: true` if either API key is configured. Format sanitizer strips MIME parameters (`audio/webm;codecs=opus` → `webm`) for OpenRouter compatibility.
- **Malayalam/Punjabi now server-transcribed** — Removed the Web Speech API bypass in `startRec()`. ml/pa audio is sent to the server and routed to OpenRouter Whisper like other languages. The ml/pa disclaimer toast is removed since there's nothing special about them anymore.
- **Initial recording timer display** — `recSub` now shows "15s remaining" (or "30s" for Pro) immediately when recording starts, instead of waiting 1 second for the first timer tick.

### Changed
- **Speech-language trigger border-radius** — Changed `20px` (full pill) → `6px` to match the nav language button styling for visual consistency.
- **Client STT error label** — Changed `[Deepgram] API error` → `[STT] API error` to avoid misleading logs when OpenRouter Whisper produces the error.

### Fixed
- **Recording timer started at 14s instead of 15s** — `setInterval(fn, 1000)` fires first after ~1s, so `elapsed = 1` on the first tick. Displayed "14s remaining" instead of "15s". Fixed by showing `recMaxDuration + "s remaining"` before the interval starts. Both Deepgram and Web Speech paths fixed.
- **OpenRouter Whisper 400 error** — `format` was sent as the full MIME type (`audio/webm;codecs=opus`) instead of the simple extension (`webm`). Added `(format || '').split(';')[0].split('/')[1] || 'webm'` sanitization in both `serve.cjs` and `api/stt.js`.

### Known issues
- **`shareModal.generating` vs `record.generating` key mismatch** — `wisprstories.js:1845` looks up `shareModal.generating` but every locale defines `record.generating`. Falls back to English "Generating…" in all locales. Two-line fix deferred.

---

## [v0.9.4] — 2026-05-23

### Added
- **i18n loader: synchronous lookup helper** — Added `window.getI18nSync(key)` in `assets/i18n/i18n.js`. Returns the current-language string for a dot-path key, falls back to English when a key is missing from the active locale, returns `undefined` when neither cache has loaded yet. Used by call sites that need to insert a localized value into freshly-created elements outside the `data-i18n` flow (Style chip summary, record-button status text, rewrite/generate spinner labels, `actions.createTone` interpolation, `record.status` / `record.sub` reset).
- **Unified notice system** — New `showNotice(type)` / `dismissNotice()` in `wisprstories.js`. One DOM slot (`#notice` / `#noticeText` / `#noticeDismiss`), one message at a time, priority order: `firefox` (functional/blocking) beats `shared` (informational CTA). Dismissal persists per-type in `localStorage` under `noticeDismissed:<type>` so users don't see the same banner twice across sessions. Re-localizes on `languagesReady` event. Replaces the prior unconditional `.ffNotice` element and the inline shared-link banner.
- **Style chip summary** — New `updateStyleChipSummary()` in `wisprstories.js` populates `#czChipTone` / `#czChipSwatch` / `#czChipColorName` / `#czChipShape` so the collapsed Style accordion header reflects the user's current tone / color / shape selections. Wired into `applyTone()`, `applyPal()`, the roundness click handler, and the language-change handler so it re-localizes when the page language changes.
- **Theme toggle screen-reader state** — `setTheme()` now sets `aria-pressed="true"` on `#themeToggle` when dark mode is on, `"false"` when light.
- **`assets/i18n/NATIVE-REVIEW.md`** — Per-locale review doc for Thai / Korean / Japanese with confidence levels and per-string questions for native speakers.
- **Remotion demo project** — Isolated `remotion-demo/` React/Remotion project with `WisprStoriesPromo` (24s, 1080×1080) and two audio-led variants: social (19.5s, `electronic-bass.mp3`) and warm (26s, `warm-vinyl.mp3`).

### Changed
- **i18n: page is no longer hidden during translation load** — Removed the 3-second `_showTimeout` reveal. English defaults render on first paint; translations swap in when ready. Eliminates white-flash + delayed-reveal.
- **Name input: accepts spaces, hyphens, underscores; cap raised 10 → 18** — Regex changed from `/[^\p{L}]/gu` to `/[^\p{L} _-]/gu`. Names like "Lola Maria", "Mary-Anne" are now valid.
- **Record-button status text is now translatable** — `finishRec()` and reset handler read `record.status` / `record.sub` from i18n via `getI18nSync()` instead of hardcoded English.
- **Style/inputs/card CSS refresh** — ~700 lines added across 11 style modules supporting notice slot, Style chip header, expanded name input.
- **Remotion promo:** Compact card-forward visual direction, real logo, logo-first intro, blurred glow backgrounds, clean final CTA screen, social audio timing trim.
- **Doc audit and factual corrections** — All stale docs updated: `42`→`21` language count, tone icon mapping fixed, rewrite limit `10`→`5`, serverless functions status `Planned`→`Built`, "no backend" claims corrected, AssemblyAI references replaced with Deepgram, palette count `6`→`10`, section numbering deduplicated, `WISPR_STORIES_CANONICAL_BLUEPRINT.md` updated with current file structure and missing features (occasions, PWA, script fonts). Deleted 3 duplicate HTML doc files.

### Fixed
- **Rewrite API: all non-English languages returned English** — Switched primary model to `qwen/qwen3-14b:free` (multilingual); added `isLanguageMismatch()` output validator; enabled `inclusionai/ling-2.6-flash` as paid fallback on rate-limit OR language mismatch; bumped `PROMPT_VERSION` to `v3` to bypass cached wrong-language responses.
- **i18n: removed English leaks in 20 non-English locales** — `tone.tip`, `tone.rewriting`, `actions.createTone`, `record.generating` all translated. `tone.tip` synced with new English wording.
- **`actions.createTone` placeholder grammar** — Grammatically-safe phrasing per locale (DE: `{tone}e Karte erstellen`, RU: `Создать карточку в тоне «{tone}»`, etc.)
- **Remotion demo: WebP alpha-channel card backgrounds caused frame flicker** — Converted from WebP (`yuva420p`) to PNG (`rgba`); PSNR improved from 12.99 to 47.08.
- **FinalFrame transition: instant cut replaces 18-frame fade** — Eliminated cream-wash effect during CTA reveal.
- **Rewrite cache no longer replays bad outputs** — Added `PROMPT_VERSION` constant to Redis cache key; old entries expire on their own 24h TTL.
- **Rewrite no longer aborts on slow free-model responses** — Client timeout raised from 15s → 25s (server timeout is 20s).
- **Page UI no longer flips to example sentence's language** — Removed two leaks: `autoDetectLangFromText()` no longer writes `localStorage.wsLang`; `loadDraft()` no longer calls `setLanguageByCode()`.

### Decisions
- **No Arabic (`ar.json`) or Urdu (`ur.json`) UI locale files** — RTL infrastructure remains in place; 20 UI locales confirmed.
- **Total UI locales: 20** (`de, es, fr, gu, hi, id, it, ja, kn, ko, ml, pa, pt, ru, sv, ta, te, th, tr, zh`).

### Known issues
- **`shareModal.generating` vs `record.generating` key mismatch** — `wisprstories.js:1845` looks up `shareModal.generating` but every locale defines `record.generating`. Falls back to English "Generating…" in all locales. Two-line fix deferred.

---

## [v0.9.3] — 2026-05-22

### Fixed
- **Rewrite preserves the input's language and script** — `api/rewrite.js` previously emitted a one-sided guard that only fired for Latin input ("don't convert Hinglish to Devanagari") and gave the LLM no positive instruction when input was already in a native script. Telugu/Tamil/Kannada/etc. inputs frequently came back Romanized, and plain English inputs occasionally came back as Hinglish because the guard mentioned Hindi tokens even when no Indic content was present. Replaced `hasNonLatinScript()` with a `detectScript()` classifier that returns a named script (`Tamil`, `Telugu`, `Devanagari (Hindi/Marathi)`, `Japanese`, `Korean`, `Chinese`, `Bengali`, `Gurmukhi (Punjabi)`, `Gujarati`, `Oriya`, `Malayalam`, `Thai`, `Arabic`, `Cyrillic`, `Greek`, or `Latin`). Japanese is checked before Chinese so pure-Kanji Japanese isn't misclassified. The prompt now carries a positive, declarative `LANGUAGE RULE` ("Respond in the exact same language and script as the input. Do not translate.") plus a script-specific clause ("Respond in `${script}` script. Do NOT transliterate to Latin/Romanized form."), and the system message states "ALWAYS respond in the exact same language and script as the input. You never translate or transliterate."
- **Rewrite cache no longer replays bad outputs after a prompt fix** — Redis cache key in `api/rewrite.js` was keyed on `tone + text` with a 24-hour TTL, so any wrong-language output produced under the old prompt was served back for up to 24 hours after the fix shipped. Added a `PROMPT_VERSION = 'v2'` constant baked into the cache key (`wispr:rewrites:cache:v2:${tone}:${hash}`); old `v1:` entries are orphaned and expire on their own TTL with no manual Redis flush required. Bump `PROMPT_VERSION` on any future prompt change.
- **Rewrite no longer aborts on slow free-model responses** — `wisprstories.js:1199` client abort fired at 15s while `api/rewrite.js:156` server OpenRouter timeout was 20s, so slow rewrites surfaced `AbortError: signal is aborted without reason` in the console for requests the server would have answered. Client timeout raised to 25,000ms so the server's own success or error response always reaches the client before the abort.
- **Page UI no longer flips to the example sentence's language** — Two leaks were collapsing `curLang` (card-display language) into `wsLang` (page-UI language). First leak: `autoDetectLangFromText()` at `wisprstories.js:61` was calling `localStorage.setItem("wsLang", detectedCode)` every time text in a different script appeared, so picking a Telugu example sentence persisted `wsLang=te`, which then drove the language dropdown's initial read on the next page load. Removed that `setItem`. Second leak: `loadDraft()` at `wisprstories.js:190` was calling `window.setLanguageByCode(draft.lang)`, which runs `applyI18n()` and re-paints every `[data-i18n]` element on the page — so any reload after a non-default example pick flipped the entire UI to that example's language. Removed that `setLanguageByCode` call. `curLang` is still restored from the draft so the card's display language survives a reload, but the page UI now stays on whatever the language dropdown shows. The `tryAutoDetectLang` draft early-return at `wisprstories.js:1454` was intentionally left in place — removing it would resurrect a pre-existing dormant bug where `navigator.language` overrides the user's manual dropdown choice.

### Changed
- **Bumped script cache-buster** — `wisprstories.html` `?v=20260521-v0.9.2` → `?v=20260522-v0.9.3` so users pick up the new client timeout and language-decoupling logic without a hard refresh.

### Notes
- First rewrite per tone+text after deploy will be a fresh OpenRouter call (intended — `v1:` cache entries are orphaned). Expect a small one-day bump in OpenRouter usage; entries auto-expire within 24h.
- Paid fallback model (`inclusionai/ling-2.6-flash`) is still commented out at `api/rewrite.js:175`, matching the existing "uncomment before Vercel deploy" convention. The positive-prompt rewrite should largely eliminate small-model drift without it.

---

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
