# Wispr Stories — Tech Stack (Single Source of Truth)

This is the one place that lists **everything** the project uses: frameworks,
libraries, hosting, databases, and outside services — and, in plain language,
**what each one is** and **why we use it**.

> **Keep this updated.** Any time you add a library, an API, a database, or an
> environment variable, add a line here in the same turn. If it's not in this
> file, treat it as "we don't use it."

Last reviewed: 2026-06-01 · App version: see `package.json` (`version`)

---

## 1. The 30-second summary

Wispr Stories is a **plain web app** (no big front-end framework like React or
Vue — just HTML, CSS, and JavaScript) hosted on **Vercel**. The visitor speaks
or types a message, optionally has it rewritten by an AI, and gets a shareable
card image.

- **Front end:** hand-written HTML/CSS/JS + a few small open-source libraries
  (Chart.js for graphs, html2canvas + FFmpeg for exporting the card, FontAwesome
  for icons, flag-icons for flags, Google Fonts for typography).
- **Back end:** small serverless functions living in the `/api` folder, run by
  Vercel. No traditional always-on server.
- **Storage:** two Upstash Redis databases (counters/limits + language stats)
  and Vercel Blob (card images and voice clips).
- **Outside AI services:** OpenRouter (text rewriting + some speech-to-text),
  Deepgram (main speech-to-text), Brevo (sending emails), Buy Me a Coffee
  (supporter payments).

Everything is either our own code or a free/open-source library bundled into the
project. No paid front-end platform.

---

## 2. Hosting & platform — Vercel

**What it is:** the company that hosts the website and runs our back-end code.

We use these Vercel features:

| Feature | What it does for us |
|---|---|
| Static hosting | Serves the HTML/CSS/JS/images. |
| Serverless functions (`/api/*`) | Small pieces of back-end code that run on demand (rewrite text, transcribe audio, upload cards, etc.). |
| Edge runtime | Most of our functions run "on the edge" (close to the user, fast start). Set per file with `export const config = { runtime: 'edge' }`. The OG image function runs on the regular Node.js runtime because it needs `sharp`. |
| Rewrites (`vercel.json`) | Pretty URLs — e.g. `/c/abc` maps to the share-card function. |
| Cron job (`vercel.json`) | Runs `/api/cleanup` daily at 03:00 UTC to delete expired cards. |
| Vercel Blob | File storage for card images and voice clips (see §6). |
| Security headers (`vercel.json`) | Content-Security-Policy and related headers. |

---

## 3. Front-end libraries

We did **not** use a front-end framework. The UI is plain HTML/CSS/JS. On top of
that we load these small libraries:

| Library | Version | What it is | Where/why we use it |
|---|---|---|---|
| **Chart.js** | 4.4.4 | Free, open-source (MIT) charting library. | Draws the bar chart on the Language Stats page. We feed it the per-language counts; it renders bars, axes, tooltips, animation. File: `lib/chart.umd.min.js`. |
| **html2canvas** | 1.4.1 | Open-source (MIT) library that turns an HTML element into an image. | Captures the live card preview as a PNG for download/sharing. Used in `wisprstories.js`. |
| **FFmpeg (ffmpeg.wasm)** | core 0.12.6 / ffmpeg 0.12.10 / util 0.12.1 | Open-source video/audio toolkit compiled to run in the browser. | Exports the card as a WebM video (image + voice). Loaded on demand from the **unpkg** CDN (`https://unpkg.com`). This is why `unpkg.com` is allowed in the security policy. |
| **Font Awesome** | (bundled) | Icon set. | All the icons (microphone, info, arrows, etc.). Files under `assets/fontawesome/`. |
| **flag-icons** | (bundled) | Country/region flag images as CSS. | Flags next to language names. Files under `assets/flag-icons/`. |
| **Google Fonts** | n/a (web) | Free hosted fonts. | Typography across many languages/scripts. Loaded from `fonts.googleapis.com` / `fonts.gstatic.com`. The footer menu also pulls Space Grotesk / Space Mono. |

**Service Worker / PWA:** `sw.js` makes the app installable and work offline by
caching the core files. Its cache name (`wispr-stories-shell-vN`) is bumped
whenever we change cached files so users get the latest version.

---

## 4. Back-end functions (`/api`)

These are small serverless functions run by Vercel. Each file = one endpoint.

| Endpoint | Runtime | What it does | Outside services it uses |
|---|---|---|---|
| `rewrite.js` | Edge | Rewrites the message in a chosen tone using AI. | OpenRouter (LLMs), Redis (rate limits, pro check) |
| `stt.js` | Edge | Speech-to-text: turns recorded audio into words. | Deepgram (main), OpenRouter Whisper (some languages), Redis |
| `upload.js` | Node | Saves the finished card image and returns a short share link. | Vercel Blob, `@vercel/og`, `sharp`, Redis |
| `voice.js` | Edge | Saves the card's voice clip. | Vercel Blob |
| `card.js` | Node | The share landing page (when someone opens a shared card). | Vercel Blob / OG image |
| `og.js` | Node | Generates the preview image shown when a card link is shared on social media. | `@vercel/og`, `sharp`, Redis |
| `c/[id].js` | Edge | Short URL handler — `/c/<id>` resolves a shared card. | Redis / Blob |
| `limits.js` | Edge | Tells the app how many free actions the user has left today. | Redis |
| `usage.js` | Edge | Daily usage counters. | Redis |
| `pro-status.js` | Edge | Checks whether the user is a paying supporter. | Redis |
| `validate-key.js` | Edge | Validates a supporter key. | Redis |
| `track-usage.js` | Node | Records which language a card was created in (for the stats page). | Redis (language-stats DB) |
| `lang-stats.js` | Edge | Returns the global language usage numbers for the stats page. | Redis (language-stats DB) |
| `cleanup.js` | Node | Daily cron job that deletes expired card files. | Vercel Blob, Redis |
| `webhook-bmac.js` | Edge | Receives "Buy Me a Coffee" payment events and unlocks Pro; can send the supporter their key by email. | Buy Me a Coffee, Brevo (email), Redis |

---

## 5. Databases — Upstash Redis (we use TWO separate ones)

**What Redis is:** a very fast key-value database (like a giant labelled
notebook of values). **Upstash** is the company that hosts it for us.

We run **two separate Upstash Redis databases** for separation of concerns:

| # | Purpose | Env variables |
|---|---|---|
| **Redis 1 — Main** | Daily usage counters, per-tone rewrite limits, supporter (Pro) keys, email lookups, recording counters. | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Redis 2 — Language stats** | Counts of cards created per language (voice vs story). Powers the Language Stats page. Kept separate so analytics never interferes with rate-limiting. | `UPSTASH_REDIS_LANG_STATS_URL`, `UPSTASH_REDIS_LANG_STATS_TOKEN` |

Client code: `lib/redis.js` (main) and `lib/lang-stats-redis.js` (stats).
The language-stats data lives in one Redis hash named `wispr:langstats`, with
fields like `voice:en` and `story:hi`.

---

## 6. File storage — Vercel Blob

**What it is:** Vercel's file storage service (for files, not database records).

We use it for:
- **Card images** — the finished PNG, so a shared link shows the card.
- **Voice clips** — the audio attached to a card.

Old files are deleted daily by the `cleanup.js` cron job. Library:
`@vercel/blob` (see §8).

---

## 7. Outside AI & service providers

| Service | What it is | What we use it for | Models / details | Env variable |
|---|---|---|---|---|
| **OpenRouter** | A gateway that gives access to many AI models through one account. | (a) Rewriting the message in a tone. (b) Speech-to-text for certain languages. | **Rewrite — free users:** `google/gemma-4-31b-it:free` → `moonshotai/kimi-k2.6:free` → `google/gemma-4-26b-a4b-it:free` (tries in order if one is busy/unavailable). **Rewrite — Pro users:** `inclusionai/ling-2.6-flash` → `sao10k/l3-lunaris-8b`. **Speech-to-text:** `openai/whisper-large-v3-turbo` (used for th, ja, ko, zh, ml, pa, ne, my, si, jw, uz). | `OPENROUTER_API_KEY` |
| **Deepgram** | A dedicated speech-to-text service. | Main speech-to-text for most languages (fast, accurate). | Model `nova-3`. | `DEEPGRAM_API_KEY`, `DEEPGRAM_API_KEY_ADMIN` |
| **Brevo** | An email-sending service. | Emails the supporter their Pro key (key recovery / delivery). | REST API `api.brevo.com`. | `BREVO_API_KEY` |
| **Buy Me a Coffee** | A donation/payment platform. | Supporters pay here; their webhook tells us to unlock Pro. | Webhook handled by `webhook-bmac.js`. | `BMAC_WEBHOOK_SECRET` |

**How speech-to-text decides which service:** Deepgram (`nova-3`) is used by
default. For a specific list of languages it doesn't handle as well, the request
goes to OpenRouter's Whisper model instead.

---

## 8. Installed npm packages (direct dependencies)

From `package.json`. These are the libraries our back-end installs.

| Package | What it is / why |
|---|---|
| `@upstash/redis` | Official client to talk to the Upstash Redis databases. |
| `@vercel/blob` | Client to read/write files in Vercel Blob storage. |
| `@vercel/og` | Generates social-share preview images (Open Graph images). |
| `sharp` | High-performance image processing (used when building card/OG images). Pulls in native image libraries automatically. |

> The front-end libraries (Chart.js, html2canvas, FFmpeg, FontAwesome,
> flag-icons) are **not** in `package.json` — they're bundled files in the repo
> or loaded from a CDN. See §3.

---

## 9. Environment variables (what each secret is for)

Set in the Vercel project settings. **Values are secret — never commit them.**

| Variable | Used by | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | rewrite, stt | Access to OpenRouter AI models. |
| `DEEPGRAM_API_KEY` | stt | Access to Deepgram speech-to-text. |
| `DEEPGRAM_API_KEY_ADMIN` | stt | Admin/elevated Deepgram key. |
| `UPSTASH_REDIS_REST_URL` | main Redis | Address of the main database. |
| `UPSTASH_REDIS_REST_TOKEN` | main Redis | Password for the main database. |
| `UPSTASH_REDIS_LANG_STATS_URL` | stats Redis | Address of the language-stats database. |
| `UPSTASH_REDIS_LANG_STATS_TOKEN` | stats Redis | Password for the language-stats database. |
| `BREVO_API_KEY` | webhook-bmac | Sending emails via Brevo. |
| `BMAC_WEBHOOK_SECRET` | webhook-bmac | Verifies Buy Me a Coffee webhook calls are genuine. |
| `CRON_SECRET` | cleanup | Protects the daily cleanup job from being triggered by outsiders. |
| `ADMIN_API_SECRET` | limits, stt, usage | Admin bypass for testing/maintenance. |

---

## 10. Security headers

Defined in `vercel.json`. The main one is the **Content-Security-Policy (CSP)**,
which whitelists exactly where the page may load things from:
- Scripts/connections: our own domain + `unpkg.com` (for FFmpeg).
- Fonts/styles: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`).
- Images: our domain, data URIs, and Vercel Blob storage.

If you add a new outside service the browser must reach, you must also add it to
the CSP `connect-src` (or the relevant directive) or the browser will block it.

---

## 11. If someone asks you "what is this built with?"

Plain answer you can give with confidence:

> "It's a plain web app — HTML, CSS, and JavaScript — hosted on Vercel, with no
> heavy front-end framework. The charts use Chart.js, a free open-source library.
> The back end is small serverless functions on Vercel. We store data in two
> Upstash Redis databases and files in Vercel Blob. For AI, text rewriting and
> some transcription go through OpenRouter, the main speech-to-text is Deepgram,
> emails go through Brevo, and supporter payments come from Buy Me a Coffee.
> Everything is either our own code or a free/open-source library — no paid
> front-end platform."
