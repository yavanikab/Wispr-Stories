# Pending Tasks — Wispr Stories

> Created: 2026-05-19  
> Status: In Progress  
> Delete this file when all items are checked.

---

## Phase 0: Documentation

- [x] Create `docs/cost-architecture.md` — Cost math, Deepgram pricing, scaling scenarios, 99-user cap rationale, Pro tier limits
- [x] Create `docs/upgrade-system-design.md` — Upstash Redis architecture, key generation via BuyMeACoffee webhook, key format, Pro tier limits, validation flow
- [x] Create `docs/stt-provider-migration.md` — Deepgram Nova-3 migration plan, API changes from OpenRouter Whisper, fallback chain, benchmark comparison
- [x] Update `docs/interview-quick-reference.md` — Add cost limits, abuse prevention, Pro vs Free rationale, Deepgram decision, 99-user cap explanation
- [x] Update `docs/INTERVIEW_GUIDE.md` — Add cost-awareness narrative, "why limits exist" answers, sustainable scaling section
- [x] Update `AGENTS.md` — Update "Deferred features," "Known bugs," "Key files" sections with new architecture decisions
- [x] Update `CHANGELOG.md` — Add today's session entry with all decisions made
- [x] Update `WISPR_STORIES_CANONICAL_BLUEPRINT.md` — Update Sections 8 (Technical Architecture), 15 (Open Questions) to reflect Deepgram, Upstash Redis, tone rewriting, i18n, user caps

## Phase 1: STT Provider Switch — Deepgram Nova-3 Multilingual (Batch)

- [x] Create `api/stt.js` with Deepgram Nova-3 Multilingual batch endpoint
- [ ] Add `DEEPGRAM_API_KEY` to Vercel env vars (user will input)
- [x] Remove OpenRouter Whisper-1 dependency from `api/stt.js`
- [x] Remove all AssemblyAI references from codebase (done — switched to Deepgram)
- [ ] Test Deepgram transcription with 15s audio sample (requires DEEPGRAM_API_KEY)
- [x] Update fallback chain: Web Speech API → Deepgram → Paste (already wired in wisprstories.js)
- [x] Update `serve.cjs` — local Deepgram proxy with mock mode

## Phase 2: Upstash Redis Setup

- [ ] Create Upstash Redis database (Vercel integration)
- [ ] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars
- [ ] Install `@upstash/redis` package
- [x] Create `lib/redis.js` — shared Redis client

## Phase 3: Daily User Cap (99 Users)

- [x] Create `api/usage.js` — server-side counter using Upstash Redis
- [x] Implement daily reset at midnight UTC (key: `wispr:daily:YYYY-MM-DD`)
- [x] Build graceful capacity page (playful tone: "We're overwhelmed with love!")
- [x] Grandfather existing sessions on limit hit (check only on new session)
- [x] Add "Resets in X minutes" countdown if near midnight
- [x] Wire capacity page to app load flow
- [x] Bypass cap for Pro users (validate key first)

## Phase 4: Recording Limits

- [x] Create `api/limits.js` — server-side limit enforcement
- [x] Wire client-side limit checks before recording (calls /api/limits)
- [x] Enforce 5 rec/day free, 50 rec/day Pro (server-side via Redis)
- [ ] Enforce 15s max recording length (client + server)
- [ ] Pro tier: 50 recordings/day, 30s max, 15 min cumulative
- [ ] Show remaining recordings counter on UI

## Phase 5: Silence Detection

- [x] Implement client-side Web Audio API RMS energy check
- [x] Show "We didn't catch that — try again" for silent recordings
- [x] Prevent silent audio from hitting Deepgram
- [x] Threshold: RMS < 0.01 over 2 seconds = silence

## Phase 6: Tone Rewriting

- [x] Create `api/rewrite.js` with DeepSeek V4 Flash Free (OpenRouter)
- [x] Wire client-side tone rewrite flow
- [x] Client-side preview on card, preserve original in textarea (Accept/Cancel bar)
- [x] Enforce 150-char limit with sentence-boundary truncation
- [x] Add 10 rewrites/user/day limit (free), unlimited (Pro) — server-side via Redis

## Phase 7: i18n (23 Languages)

- [x] Create `assets/i18n/` directory
- [x] Build `i18n.js` loader with `data-i18n` attribute system
- [x] Create `en.json` source translation file
- [x] Translate UI strings to all 23 languages (zh, en, hi, es, ar, fr, pt, ru, ur, id, de, ja, pa, ko, te, ta, tr, it, th, gu, kn, ml, sv)
- [x] Add RTL support for Arabic/Urdu (`dir="rtl"` on `<html>`)
- [x] Wire language selector to nav (auto-calls `applyI18n()` on language change)
- [x] Exclude card content from translation (card content stays English)

## Phase 8: Onboarding Banner

- [x] Build first-launch detection (localStorage flag)
- [x] Design banner UI with dismiss animation
- [x] Add help icon trigger for re-access
- [x] Wire banner to app load flow

## Phase 9: Upgrade System

- [x] Create `api/validate-key.js` — POST endpoint to validate keys against Upstash Redis
- [x] Store keys in Redis: `wispr:keys:{key}` → `{ email, tier, date }`
- [x] Email lookup: `wispr:emails:{email}` → key value
- [x] Create `api/webhook/bmc.js` — BuyMeACoffee webhook handler for auto key generation
- [x] Key format: `WS-{OCCASION}-{YEAR}-{XXXX}` (e.g., `WS-BDAY-2026-A7K2`)
- [x] Wire key validation to upgrade modal (replace stub)
- [x] Pro badge shows ∞ icon on tone buttons
- [x] Pro users bypass daily user cap (server-side via /api/pro-status)

## Phase 10: UI Fixes

- [x] "Wispr Flow" in heading → bold/italic + clickable link to `https://wisprflow.ai?ref=wispr-stories`

## Phase 11: Final Verification

- [ ] Test all limits (free + Pro)
- [ ] Test capacity page at 99 users
- [ ] Test Deepgram transcription end-to-end
- [ ] Test tone rewriting end-to-end
- [ ] Test i18n switching + RTL
- [ ] Test onboarding banner flow
- [ ] Test upgrade key validation
- [ ] Run `@agsync`
- [ ] Delete `PENDING.md` when all items checked
