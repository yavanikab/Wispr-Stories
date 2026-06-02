# Audit Checklist — June 3, 2026

## Status Key
- ✅ **DONE** — implemented this session
- 🔧 **NEEDS DECISION** — documented, ready to fix when you decide
- ❌ **RETRACTED** — initial finding was incorrect after re-verification
- ✔️ **RESOLVED** — no change needed after analysis

---

## ✅ DONE (implemented)

### Language count mismatch (29 → 44)
- **File**: `en.json` + all 10 locale files (`es, hi, it, ja, kn, ko, ta, te, th, zh`)
- **Issue**: Onboarding quick reference said "29 languages + auto-detect" but speech modal says "44 options"
- **Fix**: Updated `onboarding.refVoice` key in all 11 locale files from `29` → `44`

### btnS dead code removed
- **File**: `wisprstories.js:3166`
- **Issue**: `if (!cardReady) { document.getElementById("btnC").click(); return; }` is unreachable — btnS is HTML-disabled when `!cardReady`
- **Fix**: Removed the dead branch

### Creation Celebration
- **File**: `wisprstories.js:2939` (Create button handler) + inline CSS keyframes
- **What changed**:
  - Card now scales to 1.025 (up from 1.018)
  - Golden glow pulse added (`0 0 60px rgba(245,158,11,0.35)`) with 0.7s fade
  - Button text briefly switches to "✨ Created!" for 1.2s
  - `_vibrate()` haptic (already present) preserved
  - Added `@keyframes celebrateGlow` / `.celebration-glow` for the glow animation

---

## 🔧 NEEDS DECISION

### 1. resetBtn async race (documented in AGENTS.md)
- **File**: `wisprstories.js:2472-2500`
- **Issue**: `stopDeepgramRecording().then(finishRec)` runs async; UI resets synchronously before `.then()` fires
- **Known**: AGENTS.md already documents this as "correct behavior but visual flicker possible"
- **Recommendation**: Move UI state reset (`isRec = false`, `recBtn.classList.remove("on")`, etc.) into the `.then()` callback

### 2. Spacebar duplicates stop-recording logic
- **File**: `wisprstories.js:3702-3728`
- **Issue**: Spacebar handler has its own copy of stop logic instead of calling `_stopAndTranscribe()`
- **Fix**: Refactor to call `_stopAndTranscribe()` — but needs care since spacebar has a `return` after Deepgram path that skips the WSA fallback

### 3. Tone badge fetch-failure gap
- **File**: `wisprstories.js:2618-2626`
- **Issue**: When `syncToneCountsFromServer()` fetch fails, `.catch()` silently ignores and never calls `applyTone()`, so non-original tone badges don't render
- **Fix**: Add `applyTone(curTone)` in the `.catch()` handler (mirrors the `.then()` behavior)

### 4. Brand contradiction — RESOLVED
- **File**: `en.json:123-124`, `wisprstories.html:758`
- **Analysis**: Footer says both "made for Wispr Flow" AND "Not affiliated." Card footer shows `wisprflow.ai`
- **Decision**: Keep as-is. Both statements are true — the project IS independent and it IS made to support Flow. The `wisprflow.ai` domain on the card is intentional distribution. Documented in `docs/every-design-decision-explained.md`

### 5. Flow CTA fragmentation
- **File**: `api/c/[id].js`, `wisprstories.html:763`, `wisprstories.html:758`
- **Issue**: Flow CTAs appear in 4 places inconsistently: hero (above fold), WCTA (below fold, scroll-required), card footer (non-clickable `wisprflow.ai`), missing from landing page
- **Decision deferred**: Add Flow CTA to landing page `api/c/[id].js`? Keep `wisprflow.ai` on card? Discuss.

---

## ❌ RETRACTED

### Card ghost / empty-state conflict
- **WRONG**: `.card-empty .card-ghost { display: none; }` correctly hides ghost when empty. No conflict exists.

### Voice detach on delete
- **WRONG**: `e.data` is `null` on delete, so `(e.data || "").length > 0` evaluates to `false`. Voice only detaches on character insertion.

### Dual-scroll layout
- **WRONG**: This is intentional. Left column scrolls form, right column keeps preview fixed. User confirmed this is the correct design.
