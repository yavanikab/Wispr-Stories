# Version History

## [Unreleased] — WhatsApp share URL fix + OG image static files + agsync + mobile + testing infrastructure
- WhatsApp share sends card URL (OG meta preview) instead of PNG file attachment
- OG image endpoint switched from broken `/api/og` (500 errors) to static 1080×1080 PNG files
- agsync skill/subagent for AGENTS.md maintenance
- OpenRouter Whisper fallback
- Dark mode support
- Tone system with Original default + rate limiter
- Mobile testing setup (serve.js, mobile.ps1)
- Mobile CSS fixes for notched phones/safe areas
- Mobile testing workflow and ADB → WiFi direct fix

## v0.2.0 — SEO + Security hardening
- Full SEO meta tags, OG/Twitter Cards, JSON-LD
- Security headers via vercel.json
- Self-hosted flag-icons and html2canvas (no CDN)
- Dark mode support groundwork

## v0.1.0 — Current Prototype
- `wisprstories_v15.html` (latest)
- `wispr_stories_v14.html` (previous iteration)
