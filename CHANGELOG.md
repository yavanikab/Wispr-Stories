# Changelog

## [Unreleased] — 2026-05-23

### Fixed
- **Rewrite API: all non-English languages returned English** — `openai/gpt-oss-120b:free` was the primary model and reliably ignored LANGUAGE RULE instructions for non-Latin scripts, translating Korean, Tamil, Telugu, Arabic, Japanese, Hindi, etc. into English regardless of how the prompt was worded. Root cause: the model's multilingual instruction-following is too weak. Fix:
  1. Switched primary model to `qwen/qwen3-14b:free` — a purpose-built multilingual model that correctly follows language-preservation instructions.
  2. Added `isLanguageMismatch()` output validator: after each model responds, the API checks whether a non-Latin input produced a Latin-only output (i.e., the model translated instead of rewrote). If it detects a mismatch, it falls through to the paid fallback rather than returning the bad translation.
  3. Enabled `inclusionai/ling-2.6-flash` as paid fallback, triggering on **both** HTTP 429 (rate-limit) and language mismatch (not just 429 as before).
  4. Bumped `PROMPT_VERSION` to `v3` so any wrong-language responses that were cached under `v2` are bypassed immediately — no manual Redis flush needed.

---

## [Unreleased] — 2026-05-22

### Added
- **i18n loader: synchronous lookup helper** — Added `window.getI18nSync(key)` in `assets/i18n/i18n.js`. Returns the current-language string for a dot-path key, falls back to English when a key is missing from the active locale, returns `undefined` when neither cache has loaded yet. Used by call sites that need to insert a localized value into freshly-created elements outside the `data-i18n` flow (Style chip summary, record-button status text, rewrite/generate spinner labels, `actions.createTone` interpolation, `record.status` / `record.sub` reset).
- **Unified notice system** — New `showNotice(type)` / `dismissNotice()` in `wisprstories.js`. One DOM slot (`#notice` / `#noticeText` / `#noticeDismiss`), one message at a time, priority order: `firefox` (functional/blocking) beats `shared` (informational CTA). Dismissal persists per-type in `localStorage` under `noticeDismissed:<type>` so users don't see the same banner twice across sessions. Re-localizes on `languagesReady` event. Replaces the prior unconditional `.ffNotice` element and the inline shared-link banner.
- **Style chip summary** — New `updateStyleChipSummary()` in `wisprstories.js` populates `#czChipTone` / `#czChipSwatch` / `#czChipColorName` / `#czChipShape` so the collapsed Style accordion header reflects the user's current tone / color / shape selections. Wired into `applyTone()`, `applyPal()`, the roundness click handler, and the language-change handler so it re-localizes when the page language changes. Removing this function plus its four call sites restores the prior static "Tone · color · shape" hint.
- **Theme toggle screen-reader state** — `setTheme()` now sets `aria-pressed="true"` on `#themeToggle` when dark mode is on, `"false"` when light. Assistive tech now announces the toggle state correctly.
- **`assets/i18n/NATIVE-REVIEW.md`** — Per-locale review doc for Thai / Korean / Japanese (and a documented systematic-issue note for other locales) listing English source, current translation, my confidence, and the specific question to ask a native speaker. Designed to be handed to a HelloTalk / r/learnthai / r/Korean / r/LearnJapanese contact whole.

### Changed
- **i18n: page is no longer hidden during translation load** — Removed the 3-second `_showTimeout` reveal in `assets/i18n/i18n.js` and the matching post-`applyI18n` reveal. English defaults render on first paint; translations swap in when ready. Eliminates the white-flash + delayed-reveal that affected slow connections.
- **Name input: accepts spaces, hyphens, underscores; cap raised 10 → 18** — `wisprstories.js` regex changed from `/[^\p{L}]/gu` (letters-only) to `/[^\p{L} _-]/gu` across the input handler, the `loadDraft` restorer, and the `location.hash` shared-link parser. Names like "Lola Maria", "Mary-Anne", and "lola_maria" now pass through; digits, punctuation, and symbols are still stripped. Maximum length raised from 10 to 18 characters.
- **Record-button status text is now translatable** — `finishRec()` and the reset handler now read `record.status` / `record.sub` from i18n via `getI18nSync()` instead of hardcoded English ("Tap to speak" / "Your words appear live as you talk"). English remains the fallback when i18n hasn't loaded.
- **Style/inputs/card CSS refresh** — ~700 lines added across `global/styles/{actions,base,card,components,inputs,layout,main,responsive,tooltips,typography}.css` supporting the unified notice slot, the Style chip summary header, and the expanded name input. Largest deltas: `inputs.css` (+253), `card.css` (+181), `typography.css` (+64), `actions.css` (+53). `wisprstories.html` updated with 168 lines of corresponding markup changes (notice slot, Style chip header, name input width).
- **README structure path** — Project-structure block corrected from `fonts.js` to `global/fonts.js` (matches the move done in commit `23d46ba`).

### Fixed
- **i18n: removed English leaks in 20 non-English locales** — Every non-English locale file had four strings still in English:
  - `tone.tip` started with the literal prefix `"Original: your exact words, unlimited."` *and* the surrounding wording was out of sync with the new English description ("Original preserves your exact words — unlimited, no daily cap. Other tones rewrite via AI: ...")
  - `tone.rewriting`: `"Rewriting..."` (visible on the card during AI rewrite — `wisprstories.js:1170`)
  - `actions.createTone`: `"Create {tone} card"` (interpolated into the Create button label — `wisprstories.js:503`)
  - `record.generating`: `"Generating…"` (defined per-locale but currently dead — see Known issues below)
  All four strings translated across `de, es, fr, gu, hi, id, it, ja, kn, ko, ml, pa, pt, ru, sv, ta, te, th, tr, zh` and `tone.tip` brought in sync with the new English wording in every locale. JSON parse-validated. CJK / Indic / Thai / Korean / Indonesian locales additionally tracked in `assets/i18n/NATIVE-REVIEW.md` with confidence levels and per-string review questions.
- **`actions.createTone` placeholder grammar** — Picked a phrasing per locale that produces grammatically-safe output when the localized tone label is interpolated: `{tone}e Karte erstellen` (DE, exploits feminine `-e` declension); `Skapa {tone}-kort` (SV, native hyphenated compound); `Создать карточку в тоне «{tone}»` (RU, sidesteps adjective case agreement); `{tone}トーンのカード` (JA) and `{tone} 톤으로 카드 만들기` (KO) using "tone" as a noun connector so noun-form labels don't clash with the noun.

### Fixed
- **Remotion demo: WebP alpha-channel card backgrounds caused frame flicker in social variant** — Card background images (`card-bgs/*.webp`) had `yuva420p` alpha channels, causing Remotion to decode them as video streams and produce inconsistent output on alternating frames. YAVG brightness jumped 15-28 points between consecutive frames in the card scene. Converted all three files to PNG (`rgba`). PSNR between consecutive card-scene frames improved from 12.99 to 47.08.
- **FinalFrame transition: instant cut replaces 18-frame fade** — The final CTA panel previously used an 18-frame fade-in over the share scene, creating a cream wash. Reduced to a 1-frame instant cut (`[revealStart - 1, revealStart] → [0, 1]`) so the FinalFrame transitions cleanly.

### Rendering artifacts
- `remotion-demo/out/wispr-stories-promo-social-v2.mp4` — Re-rendered after PNG fix (3.7 MB, no flicker)

### Known issues (discovered, not fixed)
- **`shareModal.generating` vs `record.generating` key mismatch** — `wisprstories.js:1845` looks up the share-button spinner label via `getI18nSync("shareModal.generating")`, but every locale defines the key as `record.generating`. The lookup always misses and falls back to the hardcoded English `"Generating…"` in all 21 locales including English. Two-line fix: either rename the i18n key everywhere to `shareModal.generating`, or change the JS lookup to `record.generating`. Documented in `assets/i18n/NATIVE-REVIEW.md`. Deferred from this pass to avoid mixing schema changes into a translation fix.

### Decisions
- **No Arabic (`ar.json`) or Urdu (`ur.json`) UI locale files** — Confirmed not needed for this release despite earlier roadmap mentions. The RTL infrastructure (`dir="rtl"` auto-set in `i18n.js`, RTL-aware CSS) remains in place for future re-enablement, but no `ar.json` or `ur.json` ships and the language selector no longer offers them.
- **Total UI locales: 20** (was claimed as 23 in older docs). Source-of-truth: `assets/i18n/*.json` minus `en.json` = `de, es, fr, gu, hi, id, it, ja, kn, ko, ml, pa, pt, ru, sv, ta, te, th, tr, zh`.

---

## [Unreleased] — 2026-05-21

### Added
- **Remotion demo project** — Added isolated `remotion-demo/` React/Remotion project with `WisprStoriesPromo`, a 24-second 1080x1080 product-promo video showing voice capture, story rewrite, visual card creation, and share-ready closing.
- **Demo verification artifacts** — Rendered `remotion-demo/out/wispr-stories-promo-frame.png` and `remotion-demo/out/wispr-stories-promo.mp4` (H.264, scale 0.75, ~3.6 MB). Remotion Studio responds at `http://localhost:3001` when started.
- **Demo planning docs** — Added `docs/superpowers/specs/2026-05-21-remotion-wispr-stories-promo-design.md` and `docs/superpowers/plans/2026-05-21-remotion-wispr-stories-promo.md`.
- **Two audio-led Remotion variants** — Added editable variant config in `remotion-demo/src/demoVariants.js` with `WisprStoriesPromoSocial` (19.5s, `electronic-bass.mp3`) and `WisprStoriesPromoWarm` (26s, `warm-vinyl.mp3`). The default `WisprStoriesPromo` route now points at the warm variant for the existing Studio URL.
- **Final Remotion exports** — Rendered `remotion-demo/out/wispr-stories-promo-social.mp4` (H.264/AAC, 1080x1080, 19.5s, 4,016,343 bytes) and `remotion-demo/out/wispr-stories-promo-warm.mp4` (H.264/AAC, 1080x1080, 26s, 4,722,259 bytes).

### Changed
- **Git ignore exception** — Kept the existing broad `docs/` ignore behavior, but unignored the new Remotion demo spec and plan so they can be included in normal review/commit workflows.
- **Remotion brand mark** — Replaced the temporary gradient square in the promo header with a cropped Wispr Stories logo asset at `remotion-demo/public/brand/ws-logo-mark-dark.png`.
- **Remotion promo visual direction** — Reworked the demo from a generic promo layout into an app-faithful light-mode product walkthrough using the Wispr Stories cream/ink/amber palette, compact nav, left-side creation controls, right-side card preview, app-style CTA, and stronger final action frame.
- **Remotion scripts** — Added separate render/still scripts for social and warm variants while keeping `npm run render` pointed at the warm composition.
- **Remotion compact promo correction** — Reverted away from the full app-page walkthrough after review. The promo now returns to the earlier compact card-forward concept: a polished card visual, concise scene copy, Wispr Stories light-mode cream/ink/amber styling, real logo, and social/warm audio variants without trying to show every app control in a 1:1 frame.
- **Social audio start timing** — Updated `WisprStoriesPromoSocial` so `electronic-bass.mp3` starts at the audible section using a `1.60s` trim (48 frames at 30fps). Removed the music fade-in and kept the end fade-out.
- **Remotion final-frame polish** — Softened the background circles into heavily blurred glows, removed the variant label under the Wispr Stories logo, and added a clean final CTA screen with logo, closing headline, support line, and large action button.
- **Social share-scene hold** — Preserved the longer "Share ready" section while adding the intro. The social variant now runs 19.5s, the share scene remains 198 frames long, and the final CTA starts at frame 503 instead of interrupting the share scene too early.
- **Remotion audio config cleanup** — Removed a duplicate `trimBefore` line from the warm audio config; behavior is unchanged because the later `10.50s` trim was already the active value.
- **Remotion branded intro** — Added a short logo-first intro to the social and warm promo variants so the video no longer starts abruptly. Existing story scenes keep their duration, the social variant now runs 19.5s, and the fast scene fades are slightly smoother.

### Verified
- `node --test test/storyPlan.test.mjs` from `remotion-demo/` passes 11 tests.
- `node node_modules\@remotion\cli\remotion-cli.js versions` reports Remotion `4.0.464` and all Remotion packages on the correct version.
- `node node_modules\@remotion\cli\remotion-cli.js still src\index.jsx WisprStoriesPromo out\wispr-stories-promo-frame.png --frame=360 --scale=0.5` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js render src\index.jsx WisprStoriesPromo out\wispr-stories-promo.mp4 --scale=0.75` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js compositions src\index.jsx` lists `WisprStoriesPromo`, `WisprStoriesPromoSocial`, and `WisprStoriesPromoWarm`.
- `node node_modules\@remotion\cli\remotion-cli.js still src\index.jsx WisprStoriesPromoSocial out\wispr-stories-promo-social-frame.png --frame=300 --scale=0.5` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js still src\index.jsx WisprStoriesPromoWarm out\wispr-stories-promo-warm-frame.png --frame=450 --scale=0.5` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js still src\index.jsx WisprStoriesPromoSocial out\wispr-stories-promo-social-final.png --frame=430 --scale=0.5` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js still src\index.jsx WisprStoriesPromoWarm out\wispr-stories-promo-warm-final.png --frame=690 --scale=0.5` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js render src\index.jsx WisprStoriesPromoSocial out\wispr-stories-promo-social.mp4` succeeds.
- `node node_modules\@remotion\cli\remotion-cli.js render src\index.jsx WisprStoriesPromoWarm out\wispr-stories-promo-warm.mp4` succeeds.
- Updated `WisprStoriesPromoSocial` MP4 render completed at `out\wispr-stories-promo-social.mp4` with a 4,016,343-byte output file; updated `WisprStoriesPromoWarm` render completed at `out\wispr-stories-promo-warm.mp4` with a 4,722,259-byte output file.
- Social timing config check confirms duration `585` frames, intro scene `0-45`, share scene `387-585`, and final CTA start frame `503` (`16.77s`).
- `Invoke-WebRequest http://localhost:3001/WisprStoriesPromoSocial` returns HTTP 200 from Remotion Studio.
- Social audio config check confirms `trimBefore=48`, `fadeInFrames=0`, `fadeOutFrames=45`, start volume `0.50`, and end volume `0`.
- Audio trim/fade config was unchanged by the intro update; `ffprobe` is not available on PATH in this shell, so the updated social duration is verified from Remotion composition metadata (`585` frames at `30fps`).
- Corrected compact promo stills were visually checked at `out\wispr-stories-promo-social-frame.png`, `out\wispr-stories-promo-warm-frame.png`, `out\wispr-stories-promo-social-final.png`, and `out\wispr-stories-promo-warm-final.png` to avoid the previous app-page recreation and closing-frame overlap.
- Final polish stills were visually checked at `out\wispr-stories-promo-social-polish-frame.png` and `out\wispr-stories-promo-social-final-polish.png` to confirm the blurred glow treatment, removed variant label, and clean final CTA frame.
- Intro and updated social flow stills were visually checked at `out\wispr-stories-promo-social-intro.png` (frame 24), `out\wispr-stories-promo-social-voice-after-intro.png` (frame 72), `out\wispr-stories-promo-social-share-after-intro.png` (frame 475), and `out\wispr-stories-promo-social-final-after-intro.png` (frame 545). The final-frame layering issue found during this check was fixed by putting the final CTA above the story stage.

### Notes
- The normal `npm run` wrapper is broken in this shell because global npm points to a missing `npm-cli.js`; direct `node node_modules\@remotion\cli\remotion-cli.js ...` commands work.
- The first still render timed out while connecting to Chrome immediately after Remotion downloaded Chrome Headless Shell; rerunning the same render after the download succeeded.
- `agsync` / `@agsync` are not available in this shell, so `AGENTS.md` and `CHANGELOG.md` were updated manually for the Remotion intro session.

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
