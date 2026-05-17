# Version History

## [Unreleased] — WhatsApp share with short URLs + fast raw PNG upload + padded OG images + proxy endpoint + Vercel Blob exact card preview + OG 1200×630 landscape images + dynamic OG renderer + agsync + mobile + testing infrastructure
- Proxy endpoint `/api/og-image/:id` serves OG images from our domain (avoids cross-domain issues)
- Added minimal og:title and og:description tags (required for WhatsApp large preview)
- Added "Copy image" button to share modal (copies PNG to clipboard)
- Padded OG images (1200×630) with card centered on background-matched padding for WhatsApp large preview
- Short share URLs (`/c/xyz123`) with fast raw PNG upload (~1.5s)
- Vercel Blob upload for exact card PNG as WhatsApp OG preview (no regeneration)
- Cards auto-expire after 5 days via Blob TTL
- WhatsApp share sends card URL (OG meta preview) instead of PNG file attachment
- OG images changed from 1080×1080 square to 1200×630 landscape (1.91:1 ratio) for WhatsApp large preview
- Dynamic `/api/og` endpoint rebuilt with sharp + SVG overlay — renders user name/text/branding on palette backgrounds (fallback)
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
