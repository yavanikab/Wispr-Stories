<p align="center">
  <img src="assets/ws-logo-blwbg.png" alt="Wispr Stories logo" width="64" height="64">
</p>

<h1 align="center">Wispr Stories</h1>

<p align="center">
  <em>Speak your words. Share your story.</em>
</p>

<p align="center">
  Independent project &middot; Not affiliated with Wispr Flow
</p>

<p align="center">
  A zero-friction, browser-based app that turns your voice into beautiful, shareable cards.
  <br>
  No account · No install · 42 languages
</p>

<p align="center">
  <a href="https://wisprstories.vercel.app"><strong>Live Demo →</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vanilla-HTML%2FCSS%2FJS-blue?style=flat-square" alt="Vanilla HTML/CSS/JS">
  <img src="https://img.shields.io/badge/Deployed-Vercel-000?style=flat-square&logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/42-Languages-orange?style=flat-square" alt="42 Languages">
  <img src="https://img.shields.io/badge/Zero-Backend-green?style=flat-square" alt="Zero Backend">
</p>

---

<!-- TODO: Add screenshot of the card UI here -->

## What Is Wispr Stories?

Wispr Stories is a browser-based tool that turns voice into a shareable card. Anyone — a grandparent, a student, a founder — opens the app, speaks or types something meaningful, and receives a beautiful visual card they can download and share on WhatsApp, Instagram, Twitter, or anywhere.

**The core insight:** Wispr Flow is powerful but invisible. People dictate emails, recipes, and memories every day — but none of it is shareable. Wispr Stories is the social layer that was missing.

Every shared card carries "Wispr Stories — made for Wispr Flow" and links to [wisprflow.ai](https://wisprflow.ai?ref=wispr-stories). The card itself is the advertisement.

## The Grandparent Test

> If a 70-year-old who only uses WhatsApp can open the app, speak a birthday message, and share the card in under 60 seconds — the app passes. If they cannot, it fails.

## How It Works

1. **Open the app** — no login, no install, no account required
2. **Speak or type** — tap Record and speak naturally, or type/paste text
3. **Choose your style** — pick a tone, card colour, and aspect ratio
4. **Create your card** — one tap to render a beautiful visual card
5. **Share anywhere** — download as PNG and share on WhatsApp, Instagram, Twitter

## Features

- 🎙️ **Voice recording** — Web Speech API with live transcription in 42 languages
- 🎨 **6 card palettes** — Violet, Amber, Crimson, Emerald, Ocean, Rose
- ✍️ **6 tones** — Warm, Bold, Poetic, Playful, Reflective, Honest (changes font style + glyph)
- 📐 **4 aspect ratios** — 4:5 Instagram, 16:9 widescreen, 3:4 universal, 9:16 Stories
- 🌍 **42 languages** — English, Hindi, Hinglish, Spanish, French, Arabic, Mandarin, Japanese, Korean, Tamil, Telugu, Bengali, and more
- 🔤 **RTL support** — Arabic, Hebrew, Farsi, and Urdu render right-to-left automatically
- 📱 **Mobile-first** — responsive design with 44px tap targets, fluid typography
- 📤 **Native sharing** — Web Share API sends PNG + app link together on iOS/Android
- 🖼️ **OG image generation** — Vercel Edge function for rich link previews
- 🌙 **Dark mode** — respects system preference with manual toggle
- 🔒 **Privacy-first** — no backend, no database, no audio storage, everything stays in browser memory

## Quick Start

No build step. Open `wisprstories.html` in any browser, or run `node serve.js` for local development. Deploy to Vercel with `vercel --prod`.

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Voice transcription | Web Speech API (browser-native) | Free |
| Card rendering | HTML + CSS | Free |
| PNG export | html2canvas (local) | Free |
| Mobile sharing | Web Share API | Free |
| Fonts | Google Fonts CDN | Free |
| OG images | `@vercel/og` (Edge function) | Free |
| Hosting | Vercel | Free |

**Zero dependencies for the core app.** No build step, no bundler, no framework. Just open the HTML file.

## Project Structure

```
wispr-stories/
├── wisprstories.html          # Main HTML entry point
├── wisprstories.js            # App logic
├── fonts.js                   # Script-detection font mapping
├── serve.js                   # Zero-dependency Node dev server
├── vercel.json                # Vercel deployment + security headers
├── package.json               # Minimal: only @vercel/og
│
├── api/
│   ├── card.js                # Edge handler: shared-card redirect + OG metadata
│   └── og.js                  # Edge OG image renderer
│
├── assets/
│   ├── ws-logo-bl.png         # Logo (black)
│   ├── ws-logo-wh.png         # Logo (white)
│   ├── ws-logo-blwbg.png      # Logo (with background)
│   ├── og-image.png           # 1200×630 OG preview
│   ├── html2canvas/           # Local html2canvas bundle
│   ├── languages/             # Language flag icons
│   └── fontawesome/           # Icon fonts
│
├── global/
│   ├── styles/
│   │   ├── main.css           # Style import aggregator
│   │   ├── base.css           # Reset styles
│   │   ├── components.css     # Card, buttons, nav, footer
│   │   ├── responsive.css     # Mobile breakpoints
│   │   └── fonts.css          # Tone font classes
│   └── occasions/             # Occasion-specific styles
│
├── docs/                      # Design specs, research notes
├── prototype-voice-cards.html # Voice attachment prototype (deferred)
├── prototype-waveform-play.html # Waveform playback prototype (deferred)
└── legacy/                    # Archived previous versions
```

## Browser Support

| Browser | Recording | Typing | Sharing |
|---|---|---|---|
| Chrome | ✅ Full | ✅ | ✅ |
| Edge | ✅ Full | ✅ | ✅ |
| Safari | ✅ Partial | ✅ | ✅ iOS |
| Firefox | ❌ (paste fallback) | ✅ | ❌ (download only) |

Firefox users see a notice directing them to paste text instead. All other features work normally.

## Roadmap

### ✅ Completed

- [x] Voice recording with live transcription (Web Speech API)
- [x] 42 language support with RTL text
- [x] 6 card palettes + 6 tones
- [x] 4 social media aspect ratios
- [x] PNG export via html2canvas
- [x] Web Share API (PNG + URL together)
- [x] OG image generation (`@vercel/og`)
- [x] Dark mode
- [x] Multi-script font support (Devanagari, Bengali, CJK, Arabic, etc.)
- [x] Input-source card labels (Voice Original / Story Styled)
- [x] OpenRouter Whisper fallback for unsupported browsers
- [x] Web Speech API stability fixes (restart loop, timeout, error handling)
- [x] Pre-baked WebP card backgrounds (no mix-blend-mode export issues)
- [x] Security: input validation, HTML escaping, JSON encoding

### 🚧 Deferred (designed, not built)

- [ ] **Voice-attached cards** — tap the waveform on a shared card to hear the original voice (prototypes exist: `prototype-voice-cards.html`, `prototype-waveform-play.html`)
- [ ] **LLM tone rewriting** — OpenRouter serverless function to genuinely reshape content per tone (not just visual styling)
- [ ] **Shareable link cards** — animated web-based view at `wisprstories.vercel.app/s/abc123` instead of static PNG

## Acknowledgments

- **[Wispr Flow](https://wisprflow.ai)** — the voice input product this project complements
- **[html2canvas](https://html2canvas.hertzen.com/)** — PNG export engine
- **[Google Fonts](https://fonts.google.com/)** — Playfair Display, Instrument Sans, and script-specific fonts
- **[Vercel](https://vercel.com/)** — hosting and Edge functions

---

<p align="center">
  Made with 🎙️ and ✨ · <a href="https://wisprstories.vercel.app">wisprstories.vercel.app</a>
</p>
