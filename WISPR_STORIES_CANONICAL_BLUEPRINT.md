# Wispr Stories — Project Documentation (Final)

> Reflects the completed prototype. Suitable for handoff, interview presentation, and continued development.

---

## 1. What Is Wispr Stories?

Wispr Stories is a zero-friction, browser-based tool that turns voice into a shareable card. Anyone — a grandparent, a student, a founder — opens the app, speaks or types something meaningful, and receives a beautiful visual card they can download and share on WhatsApp, Instagram, Twitter, or anywhere.

**The core insight:** Wispr Flow is powerful but invisible. People dictate emails, recipes, and memories every day — but none of it is shareable. Wispr Stories is the social layer that was missing.

**The word-of-mouth engine:** Every shared card carries "Wispr Stories — made for Wispr Flow" and links to wisprflow.ai. The card itself is the advertisement. When someone receives a beautiful card and asks how it was made, that is a Wispr Flow discovery moment.

---

## 2. Problem Statement

Typing is slow and exhausting — especially on mobile. Wispr Flow solves this for power users, but the people who need it most have never heard of it:

- A grandmother hunting for keys on a phone keyboard
- A parent composing a birthday message one letter at a time
- A student in India who code-switches between Hindi and English mid-sentence

The gap is not technical. It is awareness. Nobody has shown ordinary people what speaking instead of typing produces.

Wispr Stories closes that gap by giving anyone — in your language, on any device — one effortless moment of proof. Speak naturally. Get something beautiful. Share it instantly.

---

## 3. Target Audience

The app prioritises non-technical users first.

| Audience | Primary use case | Device |
|---|---|---|
| Grandparents, older adults | Birthday wishes, recipes, memories | Mobile |
| Parents | Letters to children, anniversary messages | Mobile |
| Students | Study reflections, language practice | Mobile + laptop |
| Non-English speakers | Cards in Hindi, Spanish, Bengali, etc. | Mobile |
| Professionals (secondary) | Quick voice notes, board updates | Laptop |
| Developers and writers (secondary) | Showcasing Wispr Flow output | Laptop |

**The grandparent test:** If a 70-year-old who only uses WhatsApp can open the app, speak a birthday message, and share the card in under 60 seconds — the app passes. If they cannot, it fails.

---

## 4. How It Works

### User flow

1. Open the app — no login, no install, no account required
2. Select recording language from the dropdown (only needed for voice recording)
3. Tap **Record** and speak naturally — words appear live
4. On stopping, transcript moves into the text box automatically
5. Alternatively, type directly or paste from Wispr Flow
6. Choose a tone, card colour, and corner style (rounded/sharp)
7. Optionally click an **example card** from the inspiration grid to auto-fill text, tone, and colour
8. Tap **Create my card** — card locks in with a pulse animation
9. Rewrite via LLM tone button (optional, 5/tone/day free)
10. Tap **Share card** — share modal opens with 4 options: native share (image + URL), download PNG, copy link, copy image
11. Recipient receives either a PNG (via WhatsApp/Instagram) or a shareable link (`wisprstories.vercel.app/c/shortId`) with OG preview

### What the card contains

- A ghost display glyph (varies by tone) overlaid on the card background
- A spiral watermark (pre-rendered into the background image, matching Wispr Flow's share card aesthetic)
- A white inner panel with the user's text
- An audio waveform — signals this content was voice-created
- A **"Voice original" / "Story card" label** — shows "Voice original" when recorded, "Story card" when typed/pasted
- User name and Wispr Stories brand at the bottom
- "wisprflow.ai" as the attribution link

---

## 5. Design System

### Colours
- **Background:** `#ffffeb` (warm cream)
- **Ink:** `#1a1a1a`
- **Secondary text:** `#555548`, `#99998a`
- **Rules / borders:** `rgba(26,26,26,0.1)`

### Card palettes (10 options) × 2 corner styles (rounded/sharp = 20 backgrounds)

| Name | Colour |
|---|---|
| Violet | `#7c3aed` |
| Amber | `#f59e0b` |
| Crimson | `#dc2626` |
| Emerald | `#059669` |
| Ocean | `#0284c7` |
| Rose | `#db2777` |
| Orange | `#ea580c` |
| Teal | `#0d9488` |
| Fuchsia | `#c026d3` |
| Indigo | `#4f46e5` |

Card backgrounds are pre-baked WebP images at native resolution (stored in `assets/card-bgs/`). The spiral watermark is pre-rendered into each image — no CSS `mix-blend-mode` compositing needed during export.

### Typography
- **Display / brand:** Instrument Serif (serif)
- **Body / UI:** Inter
- **Card text:** Instrument Sans, `13px`, `weight 400`, `line-height 1.45` — locked, never varies by tone

### Tone system
Tone changes **only** `font-style` and `letter-spacing`. Font size and weight never change.

| Tone | Font style | Letter spacing | Icon |
|---|---|---|---|---|
| Warm | Normal | -0.02em | `fa-heart` |
| Bold | Normal | -0.01em | `fa-bolt` |
| Poetic | Normal | -0.02em | `fa-feather` |
| Playful | Normal | -0.03em | `fa-face-smile` |
| Reflective | Normal | -0.01em | `fa-moon` |
| Honest | Normal | 0 | `fa-handshake` |

### Aspect ratios

| Ratio | Best for |
|---|---|
| 2:2 (square) | WhatsApp large preview (default and only current ratio; 4:5, 16:9, 3:4, 9:16 are designed but not built) |
| 4:5 | Instagram feed (designed) |
| 16:9 | Twitter, YouTube (designed) |
| 3:4 | Universal (designed) |
| 9:16 | Instagram Stories, WhatsApp Stories (designed) |

### Spiral watermark
Pre-rendered into each card background WebP image. No CSS `mix-blend-mode` compositing needed during html2canvas export.

---

## 6. Layout

### Desktop (≥ 720px)
- **Left column:** All inputs — scrollable
- **Right column:** Live card preview — sticky, always in viewport
- **Footer:** Spans both columns via `grid-column: 1 / -1`

### Mobile (< 720px)
Single column: inputs → preview → footer. The preview is not sticky on mobile; users scroll down to see it after filling in their story. A future improvement would be a "Preview" button that smoothly scrolls to the card, making the flow clearer for older users.

### Mobile responsiveness details
- Layout collapses to single column below 720px
- Example grid collapses from 3×3 to 2-column
- Palette dots have a 44px tap target via `::after` pseudo-element
- Font sizes use `clamp()` for fluid scaling
- `touch-action: manipulation` on all interactive elements prevents double-tap zoom delay
- Card max-width uses viewport units on mobile (`88vw`)

---

## 7. Language Support

Speech-language selection opens a modal with 44 languages (including auto-detect) in a 2-column grid. It is **only relevant when recording** — typing and pasting work in any language without changing it.

Supported languages for STT: English and 43 others, routed to Deepgram Nova-3 Multilingual (32 languages) or Whisper via OpenRouter (11 languages). See `assets/languages/languages.json` for the full list.

**UI translation locales (10 + English):** 10 non-English locale files cover Hindi, Spanish, Italian, Japanese, Kannada, Korean, Telugu, Tamil, Thai, and Chinese. Arabic and Urdu locale files were intentionally removed (RTL infrastructure remains for future re-enablement). See `assets/i18n/NATIVE-REVIEW.md` for per-locale review status.

**Browser coverage:** Chrome supports the most languages (~70+). Safari and Edge support a subset. Firefox has no Web Speech API — a notice is shown directing Firefox users to paste instead.

**RTL support:** Arabic, Hebrew, Farsi, and Urdu trigger `dir="rtl"` on the card panel automatically.

**Multilingual examples:** The inspiration grid offers example cards across multiple languages. Clicking an example automatically selects the correct recording language and fills the text.

---

## 8. Technical Architecture

### Current stack (client-side + serverless functions)

| Layer | Technology | Cost |
|---|---|---|
| Voice transcription (primary) | Web Speech API (browser-native) | Free |
| Voice transcription (fallback) | Deepgram Nova-3 Multilingual (Batch) via `api/stt.js` | $0.0043/min, $200 free credit (~555 hrs) |
| Card rendering | HTML + CSS + pre-baked WebP backgrounds | Free |
| PNG export | html2canvas (CDN) | Free |
| Mobile sharing | Web Share API (native share sheet) | Free |
| Fonts | Google Fonts CDN | Free |
| Hosting | Vercel (wisprstories.vercel.app) | Free |
| State / rate limiting | Upstash Redis (serverless) | Free tier (10K commands/day) |
| Tone rewriting | Qwen 3 14B Free via OpenRouter (`api/rewrite.js`) | $0 |
| Upgrade key validation | Upstash Redis (`api/validate-key.js`) | Free tier |
| BuyMeACoffee webhook | `api/webhook-bmac.js` — auto key generation, timing-safe HMAC, Brevo email, refund revocation | Free |
| Blob storage | Vercel Blob — card PNGs + OG images | Free tier (1GB) |
| Daily cleanup | `api/cleanup.js` — Vercel Cron (3 AM UTC, 36hr retention) | Free |

The app is no longer purely client-side. It uses Vercel serverless functions for STT fallback, tone rewriting, rate limiting, upgrade key validation, and blob storage. All serverless endpoints are stateless except Upstash Redis and Vercel Blob.

### Serverless API routes

| Route | Purpose | Auth |
|---|---|---|
| `api/stt.js` | Deepgram Nova-3 transcription fallback | `DEEPGRAM_API_KEY` env var |
| `api/rewrite.js` | LLM tone rewriting (Qwen 3 14B Free) | `OPENROUTER_API_KEY` env var |
| `api/usage.js` | Daily user cap counter (99 users/day) | `CRON_SECRET` for cron calls |
| `api/limits.js` | Per-user recording/rewrite limit enforcement | Session-based |
| `api/validate-key.js` | Pro upgrade key validation | None (POST with email + key) |
| `api/webhook-bmac.js` | BuyMeACoffee webhook → auto key generation, timing-safe HMAC, Brevo email, refund revocation | BMC webhook signature |
| `api/pro-status.js` | Check if user has Pro status | Session-based |
| `api/upload.js` | Upload card PNG + OG image to Vercel Blob | `BLOB_READ_WRITE_TOKEN` env var |
| `api/c/[id].js` | Shared card landing page + OG metadata | None (public) |
| `api/cleanup.js` | Delete blobs older than 36 hours | `CRON_SECRET` (Vercel Cron) |
| `lib/redis.js` | Shared Upstash Redis client | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

### Usage limits

| Limit | Free | Pro |
|---|---|---|
| Daily user cap | 99 users/day (shared pool) | Bypassed |
| Recordings/user/day | 5 | 50 |
| Max recording length | 15s | 30s |
| Cumulative audio/user/day | 75s | 15 min (900s) |
| Tone rewrites/tone/day | 5 (30 max across 6 tones) | Unlimited |

### Occasion system

The app has 13 built-in occasions that auto-detect from the user's text:

| Occasion | Detection method |
|---|---|
| Birthday | Regex triggers in 30+ languages |
| Diwali | Hindi, Tamil, Telugu, Bengali, Gujarati, and other Indian language triggers |
| Christmas | 20+ language triggers |
| Halloween | 10+ language triggers |
| New Year | Language triggers |
| Valentine's Day | Language triggers |
| Wedding Day | Language triggers |
| Friendship Day | Language triggers |
| Anniversary | Language triggers |
| Mother's Day | Language triggers |
| Father's Day | Language triggers |
| Siblings Day | Language triggers |
| Independence Day | Date-aware (based on user's country, 10 countries mapped) |

When a match is found, an occasion-themed WebP image appears in the card header and the card text examples auto-populate with relevant content. The detection logic (`global/occasions/occasions.js`) supports plain-string triggers and regex patterns.

### PWA / Service worker

The app is installable as a Progressive Web App:
- `site.webmanifest` — install prompt, shortcuts, share target, theme colour
- `sw.js` — service worker with three-tier caching:
  - **Same-origin dynamic** (`/api/*`, `/c/*`): network-only
  - **Cross-origin** (fonts, CDNs): stale-while-revalidate
  - **Same-origin static**: cache-first with offline navigation fallback
- Cache name: `wispr-stories-shell`
- Offline: manual typing still works; recording, fonts, and image export require connectivity

### Script-aware font system

Per-script font mapping via `global/fonts.js`. Each of the 7 tones has a distinct font family assigned to 16 script types:
- Latin, Cyrillic, Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Thai, Arabic, Chinese Simplified, Chinese Traditional, Japanese, Korean

Mixed-script text (e.g., "Happy जन्मदिन!") is handled by splitting text into script segments and wrapping each in a `<span>` with the appropriate font. CJK disambiguation uses Hiragana/Katakana (→ Japanese) and Hangul (→ Korean) pre-scanning.

### Cost safeguards (7 layers)

1. **15s max recording length** — caps per-recording cost
2. **5 recordings/user/day** — prevents single-user abuse
3. **75s cumulative audio/user/day** — catches "5 × 14.9s" edge case
4. **Silence detection (RMS < 0.01)** — prevents silent audio from hitting API (~20% savings)
5. **Duplicate cache** — avoids re-transcribing identical audio in same session
6. **10s request timeout** — prevents hanging requests from consuming quota
7. **99-user daily cap (Upstash Redis)** — controls total daily load

See `docs/cost-architecture.md` for full cost breakdown and scaling scenarios.

### Planned architecture changes (v0.8.0)

- **STT provider** — Migrate from OpenRouter Whisper-1 to Deepgram Nova-3 Multilingual (Batch). Better accuracy (5.26% vs 6.2% WER), $200 free credit (~555 hrs), no hallucination problem. See `docs/stt-provider-migration.md`.
- **Daily user cap** — 99 users/day via Upstash Redis (`wispr:daily:YYYY-MM-DD`). Playful capacity page, Pro users bypass.
- **Recording limits** — Free: 5 rec/day, 15s max, 75s cumulative. Pro: 50 rec/day, 30s max, 15 min cumulative.
- **Silence detection** — Web Audio API RMS check before STT. Threshold: RMS < 0.01 over 2s.
- **Tone rewriting** — DeepSeek V4 Flash Free (OpenRouter), 150-char limit, sentence-boundary truncation, 10/day free, unlimited Pro. See `docs/cost-architecture.md`.

---

## 9. Files

### Core app
| File | Description |
|---|---|
| `wisprstories.html` | Main HTML entry — SEO meta, OG/Twitter Cards, PWA manifest link, service-worker registration, style/script includes |
| `wisprstories.js` | App logic — recording, transcription, card render, palette/tone/rounded controls, share modal, rewrite preview, drafts, i18n wiring |
| `global/styles/` | 13 CSS modules: `base`, `layout`, `nav`, `inputs`, `actions`, `card`, `components`, `overlays`, `tooltips`, `typography`, `responsive`, `fonts`, `main` (aggregator) |
| `global/fonts.js` | Per-script font mapping — 16 script types × 7 tones, context-aware CJK detection, mixed-script text splitting |
| `global/footer-menu.js` | Collapsible footer support menu |
| `global/demo.js` | Optional page-load demo animation (backed up, disabled) |
| `global/occasions/` | Occasion auto-detection system (13 occasions, date-aware, regex pattern matching) |
| `assets/i18n/` | 21 locale JSON files (`en.json` + 20 UI translations) + `i18n.js` loader + `NATIVE-REVIEW.md` |
| `assets/i18n/i18n.js` | i18n loader with `data-i18n` attribute system |
| `assets/languages/` | Language support data: `languages.json`, `languages-loader.js`, `languages.css` |
| `assets/card-bgs/` | 20 pre-baked WebP card backgrounds (10 colours × 2 corner styles) |
| `assets/og-1080/` | 20 OG image templates at 1080×1080 (used as PNG fallback backgrounds) |
| `assets/og-1200x630/` | 20 OG image templates at 1200×630 (social preview fallbacks) |
| `assets/html2canvas/` | Vendored html2canvas bundle (loaded on demand, not from CDN) |
| `assets/occasions/` | 12 occasion-themed WebP images (birthday, Diwali, Christmas, etc.) |
| `sw.js` | Service worker — cache-first shell, network-only `/api/` and `/c/`, offline navigation fallback |
| `site.webmanifest` | PWA manifest — install prompt, shortcuts, share target, theming |
| `serve.cjs` | Zero-dependency Node dev server (built-ins only) |
| `vercel.json` | Deploy config — rewrites, security headers, cron schedule |
| `package.json` | Runtime deps: `@upstash/redis`, `@vercel/blob`, `@vercel/og`, `sharp` |

### Serverless API routes (12)
| File | Description |
|---|---|
| `api/stt.js` | Deepgram Nova-3 Multilingual transcription fallback |
| `api/rewrite.js` | OpenRouter LLM tone rewriting (DeepSeek V4 Flash Free) |
| `api/upload.js` | Upload card PNG + generate OG image via `sharp`, store in Vercel Blob |
| `api/c/[id].js` | Shared-card landing page — OG meta for bots, redirect for humans |
| `api/card.js` | Card data endpoint |
| `api/og.js` | Dynamic OG image renderer via `@vercel/og` |
| `api/cleanup.js` | Daily blob cleanup (Vercel Cron, 36h retention) |
| `api/usage.js` | Daily user-cap counter (Upstash Redis) |
| `api/limits.js` | Per-tone rate-limit lookup (Upstash Redis) |
| `api/pro-status.js` | Pro key validation against server-side allowlist |
| `api/validate-key.js` | Pro key validation (stub — always returns "Invalid key") |
| `api/webhook-bmac.js` | BuyMeACoffee webhook → auto key generation, timing-safe HMAC, Brevo email, refund revocation |
| `lib/redis.js` | Shared Upstash Redis client + key registry |

### Documentation
| File | Description |
|---|---|
| `WISPR_STORIES_CANONICAL_BLUEPRINT.md` | This document |
| `docs/interview-quick-reference.md` | Single source of truth for interview prep |
| `docs/project-structure.md` | Internal layout reference |
| `docs/cost-architecture.md` | Cost breakdown and scaling scenarios |
| `docs/stt-provider-migration.md` | Deepgram Nova-3 migration notes |
| `docs/upgrade-system-design.md` | Pro upgrade key system design |

### Isolated sub-project
| File | Description |
|---|---|
| `remotion-demo/` | Isolated React/Remotion promo video project — self-contained, not app runtime |

---

## 10. Edge Cases

| Edge case | Handling |
|---|---|
| Firefox (no Web Speech API) | Notice shown, record button disabled, paste fallback available |
| Microphone permission denied | Toast notification with clear instruction |
| Recording auto-stops (~60s limit) | Auto-restart loop concatenates segments |
| No speech detected | Toast notification |
| Arabic / Hebrew / Farsi / Urdu | Card panel gets `dir="rtl"` automatically |
| Text approaching limit | Counter turns red at 350 / 400 chars |
| Card text overflow in any ratio | CSS `line-clamp` prevents layout breaking |
| html2canvas not yet loaded | Toast tells user to try again |
| Offline | App opens, typing works; recording and fonts require connection |

---

## 11. What Tone Does Now

**Visual layer (always applied):**
Selecting a tone changes font-family, `font-style`, `font-weight`, and `letter-spacing` on card text, and changes the background glyph. Font size is locked — no awkward visual jumps between examples.

**Content rewriting layer (LLM, via OpenRouter DeepSeek V4 Flash Free):**
Raw transcript can be sent to the LLM with a tone-specific prompt via the Rewrite button. The LLM reshapes the content — Warm softens the language, Bold tightens to punchy sentences, Poetic restructures with rhythm. This makes tone a genuine content transformation, not just a visual modifier.

| Tone | Font style | Letter spacing | Glyph | LLM prompt style |
|---|---|---|---|---|
| Warm | Normal | 0.01em | ♥ | Softens, warms language |
| Bold | Normal | -0.2px | ! | Tightens, punchy sentences |
| Poetic | Italic | 0.02em | ~ | Restructures with rhythm |
| Playful | Normal | 0.02em | ♪ | Lightens, playful tone |
| Reflective | Normal | 0.01em | · | Deepens, contemplative |
| Honest | Normal | 0 | — | Strips to essentials |

**Limits:** Free users get 5 rewrites per tone per day (server-enforced via Redis). Pro users get unlimited. The 150-character limit with sentence-boundary truncation prevents runaway costs and ensures the LLM prompt stays focused.

---

## 12. Sharing Strategy

### How a card gets shared
The card is downloaded as a PNG image. The user forwards it on WhatsApp, posts it to Instagram, attaches it to a tweet, or sends it anywhere images are accepted. The "wisprflow.ai" text is baked into the card visually.

---

## 13. Share Link Pipeline

In addition to PNG sharing, the app generates shareable links via Vercel Blob:

1. User clicks "Share" → html2canvas captures card as PNG
2. `POST /api/upload` sends raw PNG bytes to Vercel Blob
3. Server generates a padded 1200×630 OG variant via `sharp`
4. Returns an 8-character alphanumeric `shortId`
5. Share modal opens with 4 actions: native share, download PNG, copy link (`wisprstories.vercel.app/c/<shortId>`), copy image
6. **Bot** (WhatsApp/Twitter preview scraper) → gets OG meta → shows large card preview
7. **Human** → gets landing page with full card image + "Create Your Own" CTA

Blobs in `cards/` and `og/` older than 36 hours are deleted daily by `api/cleanup.js` (Vercel Cron, 3 AM UTC, auth via `CRON_SECRET`).

---

> ⚠️ **CRITICAL IMPLEMENTATION NOTE — DO NOT SKIP**
>
> **Problem:** A PNG shared on WhatsApp or Instagram does not automatically include a clickable link. The recipient sees the image only.
>
> **Solution:** Use the Web Share API to share **both the PNG file AND the app URL together** in a single share action. On iOS and Android, WhatsApp accepts `navigator.share({ files: [pngFile], url: 'https://wisprstories.vercel.app', text: 'Make your own voice card:' })`. The recipient gets the image plus a tappable link in the same message.
>
> **Current state:** The codebase shares the PNG file only. The URL must be added to the share payload in the `navigator.share()` call in `wisprstories.html`.
>
> **Claude Code / coding agent instruction:** When implementing or modifying the share button, always include `url: 'https://wisprstories.vercel.app'` and `text: 'Make your own voice card:'` alongside `files: [file]` in the `navigator.share()` call. Never share the file alone.

---

### What happens when a new user sees the card
The shared PNG is a static image — tapping it has no built-in behaviour. What matters is the **message the sharer sends alongside it**.

**Recommended sharing message:**
> "Made this with my voice — try it yourself: wisprstories.vercel.app"

### Where the link should point: Wispr Stories, not Wispr Flow directly

When a new user feels inspired to create their own card, they should be sent to **wisprstories.vercel.app**, not wisprflow.ai. The reasoning:

- Wispr Flow requires a download and installation. For a grandparent or casual user, that is too much friction — most will drop off before experiencing the product.
- Wispr Stories opens instantly in any browser, no install. The new user can create and share their own card in under 60 seconds.
- After they create their card, the app shows the "Try Wispr Flow free" CTA at exactly the right moment — when they have already felt the value and want it everywhere.

**For existing Wispr Flow users** who receive a card, the "wisprflow.ai" branding on the card already makes the connection. They do not need a redirect.

### Two types of users who receive the card

| User type | What they see | Recommended action |
|---|---|---|
| New to both products | A beautiful card from someone they know | Follow the sharing message link to wisprstories.vercel.app — experience it themselves first |
| Existing Wispr Flow user | Recognises the brand, understands the tool | Already has the product — the card reinforces their choice |

---

## 14. Deployment

**URL:** `wisprstories.vercel.app`
**Host:** Vercel free tier
**Deploy method:** Run `vercel --prod` from project root (applies `vercel.json` config, security headers, and cron schedule). Drag-and-drop to Vercel dashboard works for static files but doesn't apply `vercel.json` headers.

The referral link on the card should include a tracking parameter:
`https://wisprflow.ai/r?BEST76`

This lets Wispr Flow's team see exactly how many visits and downloads originated from shared cards — direct evidence of the app's growth impact. Simple to implement, costs nothing, valuable for the interview conversation.

---

## 15. Interview Pitch

> "Wispr Flow is one of the most powerful voice tools available, but most people have never heard of it — not because the product is not good, but because it is invisible. You dictate privately and nothing you create is shareable.
>
> I built Wispr Stories to change that. It is a zero-friction app where anyone — a grandparent, a student, someone typing slowly in their second language — can speak or type something meaningful and receive a beautiful card to share. No account, no install, no friction.
>
> Every card links back to Wispr Flow. But the conversion does not happen by pushing new users to a download page. It happens by letting them experience the magic themselves first — in their browser, in 60 seconds. After they create their own card, they see the Wispr Flow CTA at exactly the right moment.
>
> The app works in 21 languages for STT (with 20+1 UI locales), exports a PNG or shareable link for WhatsApp or Instagram, and uses serverless functions for tone rewriting, STT fallback, and image upload. It is deployed at wisprstories.vercel.app. The tone system now reshapes your spoken words via LLM — not just the font."

---

## 16. Open Questions & Remaining Work

### ✅ Completed (since initial prototype)

| # | Item | Status |
|---|------|--------|
| 1 | **Deepgram STT integration** — `api/stt.js` with Nova-3 Multilingual batch endpoint | ✅ Built and deployed |
| 2 | **Recording limit enforcement** — 15s max (free) / 30s max (Pro), client timer + server-side Redis validation | ✅ Built and deployed |
| 3 | **Silence detection** — Web Audio API RMS < 0.01 over 2s, prevents silent audio from hitting API | ✅ Built and deployed |
| 4 | **Remaining recordings counter** — Server-side via `/api/limits`, shows remaining per session | ✅ Built |
| 5 | **Tone rewriting polish** — Client-side preview on card, original preserved in textarea, 150-char limit with sentence-boundary truncation, 5 rewrites/tone/day (free), unlimited (Pro) | ✅ Built and deployed |
| 6 | **i18n (20 UI locales + English)** — `assets/i18n/` with 21 JSON files, `i18n.js` loader, `data-i18n` attribute system, RTL support | ✅ Built and deployed |
| 8 | **Upgrade system (server-side)** — Redis validation, key format `WS-{OCCASION}-{YEAR}-{XXXX}`, BMC webhook, endpoints exist but `validate-key.js` is still a stub | ✅ Partially built |
| 11 | **PNG + shareable link** — Vercel Blob + `api/c/[id].js` with OG metadata, short URLs | ✅ Built and deployed |

### 🔄 Remaining Work

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 7 | **Onboarding banner** — First-launch detection, banner UI with dismiss animation | Medium | Designed, not built |
| 9 | **Wispr Flow API research** — Is there a documented API or OAuth for in-app dictation? | Medium | Would remove manual copy-paste step |
| 10 | **Mobile preview UX** — Floating "Preview" button on mobile so users don't scroll past the card | Medium | Currently card sits below inputs |
| 12 | **Voice-attached cards (DEFERRED)** — Waveform plays original voice via Vercel Blob | Low | Designed, 2 prototypes exist |
| — | **Upgrade key validation (server-side)** — Replace localStorage stub with real Redis | Medium | Stub always returns "Invalid key" |

### Voice-attached cards design details (for when resumed)

Two working prototypes capture the full UX and code patterns:
- [`prototype-voice-cards.html`](prototype-voice-cards.html) — upload/record tabs, voice toggle, recipient phone preview
- [`prototype-waveform-play.html`](prototype-waveform-play.html) — waveform-as-play-button, real-audio amplitude analysis via Web Audio API

**Implementation plan when resumed:**
- **Phase 1 (sender side, ~1 day):** Add Record/Upload tabs and "Attach my voice" toggle. Live preview waveform draws from real audio amplitudes and becomes clickable to play. Download still produces silent PNG.
- **Phase 2 (closing the loop, ~1 day):** Store audio in Vercel Blob. On share, upload audio and attach URL to shared-card link. Update `api/card.js` for playback.
- **Phase 3 (polish, ~half day):** "Voice attached" indicator, audio duration label, ~2MB / 60s cap, replace-audio control.

**Constraint:** Downloaded card stays PNG (no audio format supports embedded audio). Voice delivered via shared link only.

---

*All content reflects decisions made during development. Nothing has been invented or assumed.*

---

## 17. Pitches & Interview Preparation (Revised)

### Resume — 1–2 sentence project description
> **Wispr Stories** — A voice-to-card web app that lets anyone speak naturally and receive a beautifully designed shareable card, built as an open-source companion to Wispr Flow. Supports 21 languages for STT (20+1 UI locales), 10 palettes × 2 corner styles, and deploys via Vercel with serverless functions for tone rewriting, STT fallback, and image upload.

---

### Email / cover letter — 3–4 sentences when applying to Wispr Flow
> One thing I noticed while studying Wispr Flow is that it solves a genuinely hard problem — making voice as natural as typing — but the output stays invisible. Nobody outside the user ever sees what gets created. I built Wispr Stories to close that gap: it turns any voice transcript into a shareable, beautifully designed card that drives word-of-mouth discovery for Wispr Flow. It works in 21 languages, exports as both a PNG and shareable link for WhatsApp and Instagram, and opens in any browser with no installation — because the people who need it most are not developers.

---

### Interview — full pitch
> I built Wispr Stories because I noticed a gap that sits right at the edge of what Wispr Flow does. The product is exceptional at capturing voice — but once you dictate something, it disappears into wherever you sent it. An email, a note, a piece of code. Nobody outside sees it, and nobody discovers Wispr Flow because of it.
>
> So I asked: what if every piece of voice-created content could become something worth sharing? A beautiful card, like a Spotify share card or a Medium pull-quote — but for anything you say. A grandmother's recipe. A birthday message. A field note from a founder on a commute.
>
> The app works in 21 languages for STT (20+1 UI locales), exports as a PNG or shareable link on WhatsApp or Instagram, and opens in any browser with no installation. I designed it specifically for people who are not power users — older adults, non-English speakers, anyone who types slowly because nobody showed them there was a better way. When they share that card and someone asks how it was made, that is a Wispr Flow download that advertising cannot buy.
>
> What makes it unique is the direction of the funnel. Most companion tools assume users already know the product. Wispr Stories works for people who have never heard of Wispr Flow — and it introduces them through something emotional and personal, not a product page. The card earns the discovery.

---

### Interview Q&A — Challenging Questions

**"Why did you build this instead of something more technically impressive?"**
Because the goal was not to out-engineer Wispr Flow. Wispr Flow already does the technically hard part: fast, polished dictation across apps and devices.

I built Wispr Stories around a different problem: how do you make the value of voice creation visible and shareable? Dictation normally disappears into a text field, an email, or a document. This turns one voice-created moment into something another person can see, save, and ask about.

The technical choice was deliberate: keep the prototype lightweight so the product idea is clear. The challenge is not complexity for its own sake. It is creating a believable discovery loop around Wispr Flow.

---

**"This works without Wispr Flow installed. So what is actually the connection?"**
That is intentional. Wispr Stories is a gateway, not a replacement for Wispr Flow.

A new user can open it, speak or paste something meaningful, create a card, and then see the Wispr Flow CTA after they have felt the value of speaking instead of typing. That order matters. It introduces the behavior before asking for deeper commitment.

For existing Wispr Flow users, it gives them a shareable artifact that reinforces the habit they already love. For people who do not know Flow yet, it creates a low-friction first encounter with the broader idea: your voice can become polished, useful output.

Flow is the serious input layer. Wispr Stories is a lightweight social surface around that behavior.

---

**"Does this misunderstand Wispr Flow's audience? They already market to accessibility users, students, creators, teams, and professionals."**
No. That research actually makes the idea stronger.

Wispr Flow already has broad positioning: accessibility, students, creators, developers, sales, support, lawyers, leaders, and teams. Wispr Stories should not claim that Flow only serves power users. The more accurate point is that even a broad product can benefit from a more shareable discovery surface.

Flow's website explains what the product does. Wispr Stories would let users show what the behavior feels like through something personal. It is less about changing Wispr's audience and more about adding a lightweight word-of-mouth mechanism.

---

**"Wispr Flow already has a web demo. Why does Wispr Stories need to exist?"**
The web demo helps someone experience Flow's core mechanic: speak and watch polished text appear. Wispr Stories has a different job.

It is not just a demo. It creates an output people can share. That matters because the strongest growth loop here is not only "try dictation once." It is "I made something with my voice, sent it to someone, and now they want to try it too."

The web demo proves the product works. Wispr Stories gives the product a social object.

---

**"If Wispr Flow already turns messy speech into polished text, what extra value does a card generator add?"**
Flow creates polished text wherever you work. Wispr Stories packages one piece of that output into something visible, emotional, and shareable.

That is the difference. Flow is mostly private while you use it: emails, docs, prompts, messages, notes. Wispr Stories turns a selected voice-created moment into a public artifact. It does not replace Flow's core value. It makes Flow's value easier for other people to notice.

The card is not the product moat. The shareable proof is.

---

**"How does a shared PNG drive downloads? There is no clickable link."**
That is exactly the risk I would want to solve before treating this as a finished growth loop.

The card itself carries the Wispr Flow brand, but the stronger behavior is to share the image together with a short message and a tappable Wispr Stories link. The recipient should not have to guess where the card came from. They should receive the image and a clear "make your own" link in the same share.

The in-app CTA to Wispr Flow should use `https://wisprflow.ai/r?BEST76` so visits from the prototype can be attributed.

---

**"Web Speech API is far less accurate than Wispr Flow. Isn't that a problem?"**
It is a limitation, but not a fatal one for this prototype.

Wispr Stories is not trying to prove that browser speech is better than Wispr Flow. It is trying to create a fast, low-friction taste of voice creation. Browser speech is enough for the first moment, but the places where it falls short — accuracy, context, filler removal, formatting, editing, and consistency — make the case for Flow stronger.

That is the honest positioning: Wispr Stories can create the spark, but Wispr Flow is the serious tool.

---

**"Isn't Wispr Stories much weaker than Flow? Flow supports 100+ languages, AI edits, context, and works across apps."**
Yes, Flow is far more powerful. That is the point.

Wispr Stories should not pretend to be Flow. It should act as a small, memorable entry point into the behavior Flow is built around. It shows one simple use case: speak or paste something meaningful and turn it into something shareable. Flow handles the deeper, daily use case: dictating everywhere, editing as you speak, working across devices, learning your vocabulary, and fitting into real workflows.

So I would position Wispr Stories as a discovery and sharing layer, not a competing product.

---

**"Anyone can type into this. It is not really a voice app."**
Voice is the primary story, but typing and pasting are intentional fallbacks.

Some users will be in a browser that does not support recording. Some will have microphone permissions blocked. Some may paste text they already dictated in Wispr Flow. Removing text input would make the product less accessible, especially for older users and unsupported browsers.

The positioning should stay voice-first: the best path is speak -> card -> share. Typing and pasting exist so the experience does not collapse when voice is unavailable.

---

**"What about privacy? You are capturing someone's voice."**
Wispr Stories itself has no backend, no database, no accounts, and no audio storage. The transcript lives in the browser session and clears on refresh.

The important nuance is that browser speech recognition depends on the browser. Some browsers process speech through their own cloud recognition services. So the accurate claim is not "nothing ever leaves the device." The accurate claim is: Wispr Stories does not store audio or run its own backend, but the browser's speech system may process audio locally or remotely depending on the browser.

That also makes Wispr Flow stronger by comparison. Flow already has a serious privacy and security story: Privacy Mode, zero data retention options, and enterprise compliance positioning. If Wispr Stories became official, I would align the privacy copy with Flow's standards.

---

**"Isn't the 'Voice original' label misleading if someone typed or pasted the text?"**
Yes. If someone types the text manually, that label is too absolute.

The label is correct when the user records a message or pastes something that genuinely came from voice. It is not correct for ordinary typed text. The fix is straightforward: label the card based on input source. Recorded messages can say "Voice original." Typed messages can use a neutral label such as "Story card." Pasted messages can either use a neutral label or let the user mark whether the source was voice.

The product intent is authenticity, so the wording should be precise. It should not overclaim.

---

**"What happens if sharing fails, or WhatsApp/Instagram does not include the link?"**
The app should degrade gracefully.

If native sharing is unavailable, the app should still download the image and give the user an easy link to paste with it. On mobile, the ideal flow is image plus link in one share action. On platforms that strip or ignore the link, the card still works as a static image, but the growth loop is weaker.

That is why the fallback copy matters. Sharing should not depend on the image alone.

---

**"Why would people share these cards instead of just sending text?"**
Because the card gives the message emotional weight and makes the act of speaking visible.

A plain text message is disposable. A card feels intentional, visual, and forwardable. That matters for the target use cases: birthdays, memories, recipes, letters, reflections, and multilingual stories. The shareability is not just decoration; it is the distribution mechanism. The card turns a private voice-created message into something another person can receive, save, and ask about.

The product should still earn that share. The examples, visual polish, and output quality need to be strong enough that users feel proud sending the card.

---

**"Are you allowed to use Wispr Flow's brand this way?"**
For a public product, this would need permission from Wispr Flow.

For an interview or prototype, the branding is part of the pitch: it shows how the concept could serve Wispr Flow's growth loop. I would be clear that this is not an official Wispr Flow product unless they approve it. If they wanted to move forward, the next step would be aligning on naming, brand usage, referral tracking, and whether the app should live under a Wispr-owned domain.

The prototype demonstrates the opportunity; it does not assume brand rights.

---

**"Would this need to be an official Wispr campaign or product to be credible?"**
Yes, if it were public-facing under the Wispr name.

As a prototype, it is useful because it shows a clear product and growth idea. But for launch, it should be official or explicitly approved. That would let it use the right brand standards, privacy language, referral tracking, and product handoff into Flow.

Without official alignment, I would treat it as a pitch prototype, not a product pretending to be Wispr.

---

**"What if Wispr Flow does not expose an API?"**
The idea can still work without an API.

The simplest version can remain a standalone browser experience using recording or paste. That said, an official Flow integration would make it much stronger: better dictation quality, more accurate labeling, and a cleaner path from card creation into Flow's real product.

So the API is not a blocker for validating the idea. It is the path to making it feel first-party and production-grade.

---

**"How do you stop this from becoming a generic quote-card generator?"**
By keeping the product centered on voice-created moments, not generic design templates.

The differentiator is not "make pretty cards." The differentiator is: speak naturally, preserve something meaningful, and make the result shareable. The examples should stay grounded in voice-native use cases — memories, family messages, accessibility, language practice, and quick reflections. The UI should keep recording as the primary path, with typing as fallback.

If the product drifts into template selection and generic quote styling, it loses the Wispr connection.

---

**"What breaks on unsupported browsers or offline?"**
Recording is the fragile part. Typing and card editing still work.

Firefox does not support the browser speech-recognition path, so the app needs to fall back to paste or typing. Offline, manual typing can still work, but recording, fonts, and image export may fail or degrade depending on what has already loaded.

The honest answer is that this is a lightweight browser tool with graceful fallback, not a fully offline production app.

---

**"What would you do differently if you built this again?"**
Four things.

First, I would make sharing send the card image and the app link together from the beginning. Second, I would track input source so the card label is accurate when someone records, types, or pastes. Third, I would align the language more closely with Wispr Flow's real positioning: voice-to-text that works everywhere, cleans up speech, and becomes a daily input layer. Fourth, I would add tone rewriting earlier, because tone currently changes visual styling only, not the actual words.

After that, I would improve mobile preview navigation. On small screens the card sits below the inputs, so a floating Preview button or segmented input/preview view would make the flow clearer for older users.

---

**"How would you measure whether this is actually driving Wispr Flow adoption?"**
At minimum, I would track the funnel in three layers.

First: Wispr Stories usage — visits, card creation rate, share/download clicks, recording attempts, and completion rate. Second: referral behavior — clicks on `wisprflow.ai/r?BEST76` from the in-app CTA. Third: Wispr Flow conversion — installs, signups, or activation from that referral source, if Wispr Flow can share that data.

The prototype can prove engagement and CTA intent on its own. Proving actual Wispr Flow adoption requires referral conversion data from Wispr Flow.

---

**"This is a prototype. What is the path to a real product?"**
I would ship it in phases.

Phase one is the browser version, tightened: better sharing, accurate input-source labeling, stronger mobile preview, and clearer privacy/browser copy. Phase two adds tone rewriting so tone changes the content, not just the styling. Phase three, if Wispr Flow supports it, turns this into an official campaign or product surface connected to Flow's real onboarding and attribution.

Each phase is independently useful. The product does not need to wait for the full integration before it can validate demand.

---

**"Why should we care that you built this? Anyone could build a card generator."**
The card generator is not the insight. The funnel is the insight.

Wispr Flow's product is already strong: it makes voice useful across real workflows. Wispr Stories asks a different question: how do you make that behavior visible enough to spread?

Anyone can make a card generator. The specific idea here is turning private voice creation into visible word-of-mouth discovery for a voice input product. The card is the artifact; the real idea is making Flow's value travel from one person to another.
