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

Wispr Stories closes that gap by giving anyone — in any language, on any device — one effortless moment of proof. Speak naturally. Get something beautiful. Share it instantly.

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
6. Choose a tone, card colour, and aspect ratio
7. Tap **Create my card** — card locks in with a pulse animation
8. Tap **Share card** — downloads as a PNG image
9. Share the image on WhatsApp, Instagram, Twitter, or anywhere

### What the card contains

- A ghost display glyph (varies by tone) overlaid on the card background
- A spiral watermark matching Wispr Flow's own share card aesthetic
- A white inner panel with the user's text
- An audio waveform — signals this content was voice-created
- A **"🎙 Voice original" label** — confirms the content came from a real person's voice, not typed or AI-generated. This is intentionally kept on the shared card to preserve authenticity
- User name and Wispr Stories brand at the bottom
- "wisprflow.ai" as the attribution link

---

## 5. Design System

### Colours
- **Background:** `#ffffeb` (warm cream)
- **Ink:** `#1a1a1a`
- **Secondary text:** `#555548`, `#99998a`
- **Rules / borders:** `rgba(26,26,26,0.1)`

### Card palettes (6 options)

| Name | Colour |
|---|---|
| Violet | `#7c3aed` |
| Amber | `#f59e0b` |
| Crimson | `#dc2626` |
| Emerald | `#059669` |
| Ocean | `#0284c7` |
| Rose | `#db2777` |

### Typography
- **Display / brand:** Playfair Display (serif)
- **Body / UI:** Instrument Sans
- **Card text:** Instrument Sans, `13px`, `weight 400`, `line-height 1.45` — locked, never varies by tone

### Tone system
Tone changes **only** `font-style` and `letter-spacing`. Font size and weight never change.

| Tone | Font style | Letter spacing | Glyph |
|---|---|---|---|
| Warm | Normal | 0.01em | " |
| Bold | Normal | -0.2px | ! |
| Poetic | Italic | 0.02em | ~ |
| Playful | Normal | 0.02em | ♪ |
| Reflective | Normal | 0.01em | · |
| Honest | Normal | 0 | — |

### Aspect ratios

| Ratio | Best for |
|---|---|
| 4:5 | Instagram feed (default) |
| 16:9 | Twitter, YouTube (widescreen) |
| 3:4 | Universal |
| 9:16 | Instagram Stories, WhatsApp Stories |

### Spiral watermark
Embedded in CSS as `background-image`. Uses `mix-blend-mode: screen` and `filter: invert(1)` to appear as a soft white overlay on dark card backgrounds.

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

Language selection is a dropdown of 37 languages. It is **only relevant when recording** — typing and pasting work in any language without changing it.

Supported languages include English (US/UK), Hindi, Hinglish, Spanish (Spain/Mexico), French, Portuguese (Brazil/Portugal), Arabic, Mandarin (Simplified/Traditional), German, Japanese, Korean, Russian, Italian, Turkish, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Bahasa Indonesia, Bahasa Melayu, Vietnamese, Thai, Farsi, Dutch, Polish, Swedish, Hebrew, Ukrainian, Romanian, Hungarian, Danish, Finnish.

**Browser coverage:** Chrome supports the most languages (~70+). Safari and Edge support a subset. Firefox has no Web Speech API — a notice is shown directing Firefox users to paste instead.

**RTL support:** Arabic, Hebrew, Farsi, and Urdu trigger `dir="rtl"` on the card panel automatically.

**Multilingual examples:** Nine examples span English, Hindi, Hinglish, Spanish, Bengali, French, and German. Clicking an example automatically selects the correct recording language in the dropdown.

---

## 8. Technical Architecture

### Current stack (fully client-side, no backend)

| Layer | Technology | Cost |
|---|---|---|
| Voice transcription | Web Speech API (browser-native) | Free |
| Card rendering | HTML + CSS | Free |
| PNG export | html2canvas (CDN) | Free |
| Mobile sharing | Web Share API (native share sheet) | Free |
| Fonts | Google Fonts CDN | Free |
| Hosting | Vercel (wisprstories.vercel.app) | Free |

The prototype is a single self-contained HTML file. No build step, no server, no database. No audio is stored anywhere — everything stays in browser memory and clears on page refresh.

### Planned backend (future, not required for prototype)
A single Vercel serverless function proxying an **OpenRouter free model** (e.g. Llama 3.3 70B) would enable tone reformatting: raw spoken text is sent to the LLM with a tone-specific prompt, and the reshaped text replaces the transcript on the card. OpenRouter was chosen for its generous free tier, no credit card requirement, and access to multiple strong open models.

Without this, tone changes visual style only. With it, tone would genuinely rewrite the content.

---

## 9. Files

| File | Description |
|---|---|
| `wispr_stories_final.html` | Complete working prototype — single self-contained file |
| `wispr_stories_docs_final.md` | This document |
| `flow-spiral.svg` | Spiral watermark asset (already embedded in final HTML) |

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

## 11. What Tone Does Now vs What It Will Do

**Current (visual only):**
Selecting a tone changes `font-style` and `letter-spacing` on card text, and changes the background glyph. Font size and weight are locked — no awkward visual jumps between examples.

**Planned (with OpenRouter LLM backend):**
Raw transcript is sent to the LLM with a tone-specific prompt. The LLM reshapes the content — Warm softens the language, Bold tightens to punchy sentences, Poetic restructures with rhythm. This makes tone a genuine content transformation, not just a visual modifier.

---

## 12. Sharing Strategy

### How a card gets shared
The card is downloaded as a PNG image. The user forwards it on WhatsApp, posts it to Instagram, attaches it to a tweet, or sends it anywhere images are accepted. The "wisprflow.ai" text is baked into the card visually.

---

> ⚠️ **CRITICAL IMPLEMENTATION NOTE — DO NOT SKIP**
>
> **Problem:** A PNG shared on WhatsApp or Instagram does not automatically include a clickable link. The recipient sees the image only.
>
> **Solution:** Use the Web Share API to share **both the PNG file AND the app URL together** in a single share action. On iOS and Android, WhatsApp accepts `navigator.share({ files: [pngFile], url: 'https://wisprstories.vercel.app', text: 'Make your own voice card:' })`. The recipient gets the image plus a tappable link in the same message.
>
> **Current state:** The codebase shares the PNG file only. The URL must be added to the share payload in the `navigator.share()` call in `wispr_stories_final.html`.
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

## 13. Deployment

**URL:** `wisprstories.vercel.app`
**Host:** Vercel free tier
**Deploy method:** Drag `wispr_stories_final.html` into Vercel dashboard, or run `vercel --prod` from the project folder. No configuration required.

The referral link on the card should include a tracking parameter:
`https://wisprflow.ai?ref=wispr-stories`

This lets Wispr Flow's team see exactly how many visits and downloads originated from shared cards — direct evidence of the app's growth impact. Simple to implement, costs nothing, valuable for the interview conversation.

---

## 14. Interview Pitch

> "Wispr Flow is one of the most powerful voice tools available, but most people have never heard of it — not because the product is not good, but because it is invisible. You dictate privately and nothing you create is shareable.
>
> I built Wispr Stories to change that. It is a zero-friction app where anyone — a grandparent, a student, someone typing slowly in their second language — can speak or type something meaningful and receive a beautiful card to share. No account, no install, no friction.
>
> Every card links back to Wispr Flow. But the conversion does not happen by pushing new users to a download page. It happens by letting them experience the magic themselves first — in their browser, in 60 seconds. After they create their own card, they see the Wispr Flow CTA at exactly the right moment.
>
> The app works in 37 languages, exports a PNG you can forward directly on WhatsApp or Instagram, and runs entirely in the browser with no backend. It is deployed at wisprstories.vercel.app. The next step is adding a single OpenRouter serverless function so tone actually reshapes your spoken words — not just the font."

---

## 15. Open Questions for Next Phase

1. **LLM tone reformatting:** Build the OpenRouter serverless function. What system prompt works best per tone — and should the reformatted text be shown alongside the original for the user to compare?

2. **Wispr Flow API:** Is there a documented API or OAuth that would allow in-app dictation instead of copy-paste? This would remove the manual step entirely and make the experience seamless. Worth researching before the next development phase.

3. **Mobile preview UX:** On mobile, the card preview sits below the inputs and requires scrolling. A floating "Preview" button or tab toggle would make the experience significantly better for older users who may not know to scroll down.

4. **PNG vs link sharing:** Currently the shared artefact is a PNG image. A future option is generating a shareable link (e.g. `wisprstories.vercel.app/s/abc123`) that opens the card in an animated, web-based view — more engaging than a static image and clickable through to the app. Requires a backend and database.

5. **Voice-attached cards (DEFERRED — designed, not built):** Today the recipient of a card can read it but not hear it. The design intent is that the existing on-card waveform becomes the play surface — tapping it plays the original voice, with the bars drawn from the real audio amplitude. The sender chooses per card whether to attach voice or keep it text-only via a toggle in the left column. Two working prototypes capture the full UX and code patterns:
   - [`prototype-voice-cards.html`](prototype-voice-cards.html) — the upload/record tabs, the voice toggle, and the recipient phone preview
   - [`prototype-waveform-play.html`](prototype-waveform-play.html) — the waveform-as-play-button integrated into the real card aesthetic, including real-audio amplitude analysis via Web Audio API

   **Implementation plan when resumed:**
   - **Phase 1 (sender side, ~1 day):** Add Record/Upload tabs and the "Attach my voice" toggle to the left column. Make the live preview's waveform draw from real audio amplitudes and become clickable to play. No sharing changes yet — download still produces a silent PNG.
   - **Phase 2 (closing the loop, ~1 day):** Store audio in Vercel Blob (free tier, ~1GB, generous bandwidth). On Share, upload audio and attach the URL to the shared-card link. Update `api/card.js` so the recipient's page plays the audio when the waveform is tapped.
   - **Phase 3 (polish, ~half day):** "Voice attached" indicator on the share button, audio duration label, ~2MB / 60s cap, replace-audio control.

   **Constraint:** the downloaded card stays a PNG (no audio embedded — no image format supports audio). Voice is delivered only via the shared link. The sender's own download is silent by design, matching today's behaviour. Optionally a small "Save voice file" link can let the sender keep the MP3 too.

   **Why deferred:** prioritised submission deadline. The two prototype files are the working spec — they should be referenced before any code is written in Phase 1.

---

*All content reflects decisions made during development. Nothing has been invented or assumed.*

---

## 14. Pitches & Interview Preparation (Revised)

### Resume — 1–2 sentence project description
> **Wispr Stories** — A voice-to-card web app that lets anyone speak naturally and receive a beautifully designed shareable card, built as an open-source companion to Wispr Flow. Supports 37 languages, four social media aspect ratios, and deploys as a single HTML file with no backend required.

---

### Email / cover letter — 3–4 sentences when applying to Wispr Flow
> One thing I noticed while studying Wispr Flow is that it solves a genuinely hard problem — making voice as natural as typing — but the output stays invisible. Nobody outside the user ever sees what gets created. I built Wispr Stories to close that gap: it turns any voice transcript into a shareable, beautifully designed card that drives word-of-mouth discovery for Wispr Flow. It works in 37 languages, exports directly to WhatsApp and Instagram, and runs entirely in the browser with no installation — because the people who need it most are not developers.

---

### Interview — full pitch
> I built Wispr Stories because I noticed a gap that sits right at the edge of what Wispr Flow does. The product is exceptional at capturing voice — but once you dictate something, it disappears into wherever you sent it. An email, a note, a piece of code. Nobody outside sees it, and nobody discovers Wispr Flow because of it.
>
> So I asked: what if every piece of voice-created content could become something worth sharing? A beautiful card, like a Spotify share card or a Medium pull-quote — but for anything you say. A grandmother's recipe. A birthday message. A field note from a founder on a commute.
>
> The app works in 37 languages, exports as a PNG you can forward directly on WhatsApp or Instagram, and opens in any browser with no installation. I designed it specifically for people who are not power users — older adults, non-English speakers, anyone who types slowly because nobody showed them there was a better way. When they share that card and someone asks how it was made, that is a Wispr Flow download that advertising cannot buy.
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

The in-app CTA to Wispr Flow should use `https://wisprflow.ai?ref=wispr-stories` so visits from the prototype can be attributed.

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

First: Wispr Stories usage — visits, card creation rate, share/download clicks, recording attempts, and completion rate. Second: referral behavior — clicks on `wisprflow.ai?ref=wispr-stories` from the in-app CTA. Third: Wispr Flow conversion — installs, signups, or activation from that referral source, if Wispr Flow can share that data.

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
