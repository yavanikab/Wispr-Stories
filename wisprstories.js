console.log("%c[Build] Wispr Stories v0.11.0.2 (2026-06-04)", "color:#ec4899;font-weight:bold;font-size:14px");
const PALS = [
  "#7c3aed",
  "#f59e0b",
  "#dc2626",
  "#059669",
  "#0284c7",
  "#db2777",
  "#ea580c",
  "#0d9488",
  "#c026d3",
  "#4f46e5",
];
const PAL_NAMES = ['violet', 'amber', 'crimson', 'emerald', 'ocean', 'rose', 'orange', 'teal', 'fuchsia', 'indigo'];
// Card is standardized on 2:2 (square) so the share/OG image reliably
// triggers the large-preview format in WhatsApp/iMessage/etc. (Spotify uses
// the same square strategy for lyrics card shares.)
const CARD_RATIO = '2x2';
const CARD_CORNERS = ['rounded', 'sharp'];
function cardBgUrl(corners, palName) {
  return `assets/card-bgs/${CARD_RATIO}_${corners}_${palName}.webp`;
}
function getCardBgImage() {
  const corners = useRounded ? 'rounded' : 'sharp';
  return cardBgUrl(corners, PAL_NAMES[curP]);
}
// Cache for already-preloaded URLs so we don't re-fire Image() requests.
const _cardBgPreloaded = new Set();

function getAdminHeaders() {
  var _s;
  try { _s = localStorage.getItem('wsAdminSecret'); } catch (_e) {}
  return _s ? { 'X-Admin-Secret': _s } : {};
}

function preloadCardBgVariant(corners) {
  PAL_NAMES.forEach((name) => {
    const src = cardBgUrl(corners, name);
    if (_cardBgPreloaded.has(src)) return;
    _cardBgPreloaded.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}
function preloadAllCardBgs() {
  CARD_CORNERS.forEach((c) => preloadCardBgVariant(c));
}
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}
function hasCardContent() {
  const card = document.getElementById("card");
  return card && !card.classList.contains("card-empty");
}
function stripControls(str) {
  return str.replace(/[\x00-\x1F\x7F\u200B\u200C\u200D\uFEFF]/g, "");
}

// RTL intentionally disabled — page layout stays LTR always

// Map script codes (from fonts.js detectScript) to language codes (from languages.json)
const SCRIPT_TO_LANG = {
  deva: "hi", beng: null, guru: "pa", gujr: "gu",
  taml: "ta", telu: "te", kann: "kn", mlym: "ml",
  thai: "th", arab: null, zhs: "zh", zht: "zh",
  jpn: "ja", kor: "ko", cyr: "ru", dev: "en",
};

function autoDetectLangFromText(text) {
  if (!text || !text.trim()) return null;
  const script = typeof detectScript === "function" ? detectScript(text) : "dev";
  // Latin/default script covers English, Italian, Spanish, French, etc.
  // We can't distinguish them by script alone, so don't override the page language.
  if (script === "dev") return null;
  const detectedCode = SCRIPT_TO_LANG[script];
  if (!detectedCode) {
    // Script detected but language not in our supported list — auto-set to Native
    if (!speechLang) {
      speechLang = "__native__";
      try { localStorage.setItem('wsSpeechLang', '__native__'); } catch(_e){}
      updateSlTrigger();
    }
    return null;
  }
  if (detectedCode === curLang) return null;
  // Only update curLang for the card label — DO NOT change page UI language
  // and DO NOT persist to wsLang. wsLang is owned by the language dropdown;
  // writing here would cause the UI to flip to the example's language on the
  // next page load.
  curLang = detectedCode;
  return detectedCode;
}

function getLanguageName(code) {
  if (typeof allLanguages === "undefined" || !allLanguages) return "";
  const lang = allLanguages.find((l) => l.code === code);
  return lang ? lang.label : "";
}


var speechLang = localStorage.getItem('wsSpeechLang') || '';

let curP = 0,
  curTone = "original",
  curLang = localStorage.getItem("wsLang") || "en",
  isRTL = false,
  useRounded = true,
  inputSource = "story",
  userOverride = false;
let recog = null,
  isRec = false,
  fullTx = "";
let cardReady = false;
let recogTimeout = null,
  recogRestartCount = 0;
const RECOG_MAX_RESTARTS = 5;
const FREE_MAX_RECORDING_SEC = 15;
const PRO_MAX_RECORDING_SEC = 30;
let recStartTime = null,
_recTimerMaxSec = 0,
_recTimerExpire = null,
_recTimerStartTime = null,
_recTimerPausedAt = null,
_recTimerPausedRemaining = null,
_isRecPaused = false,
  recMaxDuration = FREE_MAX_RECORDING_SEC,
  recDurationTimer = null,
  recGraceTimer = null;
let _sttHealthCache = null;
const STT_HEALTH_TTL_MS = 10 * 60 * 1000;
let _lastSttWav = null;
let _lastSttLang = "";
let _lastSttSessionId = "";
let _lastKnownRecordingsUsed = -1;
let _lastKnownRecordingsDate = "";
let _lastKnownRecordingsSessionId = "";
let _sttRetrying = false;
const isSafari =
  navigator.vendor === "Apple Computer, Inc." &&
  !navigator.userAgent.includes("CriOS");

let usingDeepgram = false,
  mediaRec = null,
  audioChunks = [],
  deepgramStartTime = null;

let audioBlob = null;
let _skipDurationReport = false;
let voiceAttached = false;
var _webmCache = null;
var _pngCache = null;
let webmCodecString = null;
let audioDurationSec = 0;
var _cardWaveform = null; // [35] static bar heights (0-1) from actual audio, null = use sin/cos
var _generatingWebm = false; // guard to prevent concurrent WebM exports
// Manual card-text font-size bump (in px) added on top of the responsive base
// size. Enabled only for short card text (see FONT_SIZE_MAX_CHARS). 0 = base.
var cardFontBump = 0;
var FONT_BUMP_MAX = 3;          // largest increase allowed: base + 3px
var FONT_SIZE_MAX_CHARS = 85;   // control enabled only when shown text < this

function detectWebmCodec() {
  var codecs = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  for (var i = 0; i < codecs.length; i++) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(codecs[i])) return codecs[i];
  }
  return null;
}
webmCodecString = detectWebmCodec();

// Convert decoded AudioBuffer to 16kHz 16-bit mono WAV for universal STT compatibility.
// Resampling to 16kHz keeps the output ~470KB for 15s (vs ~1.4MB at 48kHz).
function _audioBufferToWav(audioBuffer) {
  var srcRate = audioBuffer.sampleRate;
  var dstRate = 16000;
  var srcData = audioBuffer.getChannelData(0);
  var srcLen = srcData.length;
  var ratio = srcRate / dstRate;
  var dstLen = Math.round(srcLen / ratio);
  // Linear resample
  var dstData = new Float32Array(dstLen);
  for (var i = 0; i < dstLen; i++) {
    var srcIdx = i * ratio;
    var lo = Math.floor(srcIdx);
    var hi = Math.min(lo + 1, srcLen - 1);
    var frac = srcIdx - lo;
    dstData[i] = srcData[lo] * (1 - frac) + srcData[hi] * frac;
  }
  // Encode as 16-bit PCM WAV
  var numChannels = 1, bitsPerSample = 16;
  var dataLength = dstLen * (bitsPerSample / 8);
  var buffer = new ArrayBuffer(44 + dataLength);
  var view = new DataView(buffer);
  function writeString(offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, dstRate, true);
  view.setUint32(28, dstRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  var offset = 44;
  for (var i = 0; i < dstLen; i++) {
    var s = Math.max(-1, Math.min(1, dstData[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, s, true);
    offset += 2;
  }
  return buffer;
}

// Decode audio blob and compute 35 static bar heights for the card waveform.
// Returns null (with console warning) on decode failure so callers fall back to sin/cos.
async function _computeWaveform(blob) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    var data = buf.getChannelData(0);
    var len = data.length;
    var heights = [];
    for (var i = 0; i < 35; i++) {
      var start = Math.floor((i / 35) * len);
      var end = Math.floor(((i + 1) / 35) * len);
      var sumSq = 0, count = 0;
      for (var j = start; j < end; j++) { sumSq += data[j] * data[j]; count++; }
      heights.push(Math.sqrt(sumSq / (count || 1)));
    }
    ctx.close();
    // Normalize so the loudest bar reaches full height. Raw RMS of speech is
    // small (often 0.02–0.1), which without scaling renders as tiny 2% "dashes".
    // Scaling to the peak bar makes the waveform read as an actual waveform at
    // any recording volume. If the audio is essentially silent (max ~0), leave
    // the values as-is so a flat line still signals "no sound captured".
    var maxH = 0;
    for (var k = 0; k < heights.length; k++) { if (heights[k] > maxH) maxH = heights[k]; }
    if (maxH > 0.001) {
      for (var m = 0; m < heights.length; m++) { heights[m] = heights[m] / maxH; }
    }
    return heights;
  } catch (e) {
    console.warn("[Waveform] Audio decode failed:", e);
    return null;
  }
}

// Unified notice system — one slot, one message at a time, dismissable.
// Priority: Firefox warning beats shared-link CTA (the functional/blocking
// notice wins over the informational one). Dismissal persists per-type
// in localStorage so users don't see the same banner twice.
function showNotice(type) {
  if (localStorage.getItem("noticeDismissed:" + type) === "1") return;
  const el = document.getElementById("notice");
  const txt = document.getElementById("noticeText");
  if (!el || !txt) return;
  const tr = (key) => (typeof getI18nSync === "function" ? getI18nSync(key) : null);
  let html = "";
  if (type === "shared") {
    html = tr("sharedCta") ||
      "✨ <strong>You received a Wispr Story!</strong> Tap <em>Create my card</em> to make your own.";
  } else {
    return;
  }
  txt.innerHTML = html;
  el.dataset.noticeType = type;
  el.hidden = false;
}
function dismissNotice() {
  const el = document.getElementById("notice");
  const type = el?.dataset.noticeType;
  if (type) localStorage.setItem("noticeDismissed:" + type, "1");
  if (el) el.hidden = true;
}
document.getElementById("noticeDismiss")?.addEventListener("click", dismissNotice);

// Pick the highest-priority notice for this session.
if (location.hash && location.hash.length > 1) {
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get("text")) showNotice("shared");
  } catch (e) {
    /* malformed hash — no notice */
  }
}
// Re-localize notice text when the user changes language.
document.addEventListener("languagesReady", function () {
  const el = document.getElementById("notice");
  if (el && !el.hidden && el.dataset.noticeType) showNotice(el.dataset.noticeType);
});

function saveDraft() {
  try {
    const draft = {
      text: document.getElementById("sta").value,
      name: document.getElementById("nin").value,
      tone: curTone,
      palette: curP,
      inputSource: inputSource,
      lang: curLang,
      isRTL: isRTL,
      rounded: useRounded,
      cardReady: cardReady,
      voiceAttached: voiceAttached,
      fontBump: cardFontBump,
    };
    sessionStorage.setItem("wisprDraft", JSON.stringify(draft));
  } catch (e) { /* storage unavailable */ }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem("wisprDraft");
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (draft.text) document.getElementById("sta").value = stripControls(String(draft.text)).slice(0, 150);
    if (draft.name) document.getElementById("nin").value = stripControls([...String(draft.name)].slice(0, 20).join(""));
    inputSource = draft.inputSource === "voice" ? "voice" : "story";
    if (draft.tone) applyTone(draft.tone);
    if (draft.palette != null) applyPal(draft.palette);
    if (draft.lang) {
      // Restore card-display language only. Do NOT call setLanguageByCode —
      // that runs applyI18n() and would flip the entire page UI to the
      // language of whatever example sentence the user last clicked.
      // Page UI language is owned by the dropdown / loadLanguages init.
      curLang = draft.lang;
      isRTL = draft.isRTL || false;
    }
    if (draft.rounded != null) {
      useRounded = draft.rounded;
      const card = document.getElementById("card");
      if (useRounded) {
        card.style.borderRadius = "32px";
        card.style.overflow = "hidden";
      } else {
        card.style.borderRadius = "0";
        card.style.overflow = "hidden";
      }
      document.querySelectorAll("#roundnessRow .sz").forEach(function(r) {
        r.classList.toggle("on", r.dataset.rounded === String(draft.rounded));
      });
    }
    // Restore voice toggle intent if previously ON (disabled since no audio blob)
    voiceAttached = draft.voiceAttached && inputSource === "voice" ? true : false;
    // Restore font bump (clamped). updateCard() below re-validates it against the
    // length limit, so a saved bump on now-too-long text is reset to base.
    var savedBump = typeof draft.fontBump === "number" ? draft.fontBump : 0;
    cardFontBump = Math.max(0, Math.min(FONT_BUMP_MAX, Math.round(savedBump)));
    updateCard();
    updateSlNudge();
    updateMicState();
    updateVoiceBar();
    return true;
  } catch (e) { return false; }
}

function wave(text) {
  const el = document.getElementById("cardWv");
  el.innerHTML = "";
  if (!(text || "").trim()) return;
  const len = Math.min((text || "").length, 150);
  const active = Math.floor((len / 150) * 35);
  const col = PALS[curP];
  if (_cardWaveform) {
    for (let i = 0; i < 35; i++) {
      var h = _cardWaveform[i] * 100;
      if (h < 2) h = 2;
      const b = document.createElement("div");
      b.className = "wb";
      b.style.height = Math.min(h, 100) + "%";
      if (i < active) {
        b.style.background = col;
        b.style.opacity = ".5";
      } else if (i < active + 4) {
        b.style.background = col;
        b.style.opacity = ".2";
      }
      el.appendChild(b);
    }
    return;
  }
  const seed = (text || "").split("").reduce((s, c) => s + c.charCodeAt(0), 7);
  if (!seed) return;
  for (let i = 0; i < 35; i++) {
    const h =
      10 +
      Math.abs(Math.sin(seed * 0.31 + i * 0.9) * 70) +
      Math.abs(Math.cos(seed * 0.19 + i * 1.1) * 10);
    const b = document.createElement("div");
    b.className = "wb";
    b.style.height = Math.min(h, 100) + "%";
    if (i < active) {
      b.style.background = col;
      b.style.opacity = ".5";
    } else if (i < active + 4) {
      b.style.background = col;
      b.style.opacity = ".2";
    }
    el.appendChild(b);
  }
}

// Update the live chip summary in the Style accordion's collapsed header.
// Reflects the user's current tone / color / shape selections so the
// collapsed state never feels like state-loss. Reversible: remove this
// function (and its three call sites in applyTone, applyPal, and the
// roundness click handler) to restore the prior static "Tone · color ·
// shape" hint.
function updateStyleChipSummary() {
  try {
    const tr = (key, fallback) => {
      if (typeof getI18nSync === 'function') {
        const v = getI18nSync(key);
        if (v) return v;
      }
      return fallback;
    };
    const tEl = document.getElementById('czChipTone');
    const swEl = document.getElementById('czChipSwatch');
    const cNameEl = document.getElementById('czChipColorName');
    const shEl = document.getElementById('czChipShape');
    if (tEl) tEl.textContent = tr('tone.' + curTone, curTone);
    if (swEl && PALS[curP]) swEl.style.background = PALS[curP];
    if (cNameEl && PAL_NAMES[curP]) {
      cNameEl.textContent = tr('color.' + PAL_NAMES[curP], PAL_NAMES[curP]);
    }
    if (shEl) shEl.textContent = tr(useRounded ? 'shape.rounded' : 'shape.sharp', useRounded ? 'Rounded' : 'Sharp');
  } catch (e) {
    /* silent — chip summary is cosmetic, must not break the form */
  }
}

function applyPal(idx) {
  if (isNaN(idx) || idx < 0 || idx >= PALS.length) return;
  curP = idx;
  _webmCache = null;
  _pngCache = null;
  const bg = document.getElementById("cardBg");
  const col = PALS[idx];
  // Solid color fallback first — prevents page-bg flash while the WebP loads.
  bg.style.backgroundColor = col;
  bg.style.backgroundImage = `url(${getCardBgImage()})`;
  bg.style.backgroundSize = '100% 100%';
  // Warm the cache for the rest of the palettes (current corner style) so
  // subsequent palette clicks are instant.
  preloadCardBgVariant(useRounded ? 'rounded' : 'sharp');
  document.querySelectorAll(".pd").forEach((d) => d.classList.remove("on"));
  document.querySelector('.pd[data-p="' + idx + '"]').classList.add("on");
  wave(document.getElementById("sta").value);
  checkOccasions();
  const light = isLightColor(col);
  document.getElementById("cardLabel").style.color = light ? "#1a1a1a" : "";
  document.getElementById("cardGhost").style.color = light
    ? "rgba(0,0,0,0.32)"
    : "";
  const lt = document.querySelector(".card-logo-text");
  if (lt) lt.style.color = light ? "#1a1a1a" : "";
  const dm = document.querySelector(".card-domain");
  if (dm) dm.style.color = light ? "#555548" : "";
  updateStyleChipSummary();
}

// Free-tier daily quota is enforced per tone (5 rewrites per tone per day).
// Mirror of the server-side FREE_MAX_PER_TONE constant in api/rewrite.js.
const FREE_MAX_PER_TONE = 5;
const REWRITE_TONES = ["warm", "bold", "poetic", "playful", "reflective", "honest"];
// In-memory cache of per-tone rewrite results to avoid redundant API calls.
// Keyed by tone; entry: { text, original }. Cleared when source text changes.
let rewriteCache = {};

function getToneCounts() {
  const today = new Date().toDateString();
  const raw = localStorage.getItem("wsToneCounts");
  if (!raw) return { date: today, counts: {} };
  try {
    const d = JSON.parse(raw);
    if (!d || d.date !== today) return { date: today, counts: {} };
    return { date: d.date, counts: d.counts || {} };
  } catch (e) {
    return { date: today, counts: {} };
  }
}

function getRewritesLeftForTone(tone) {
  if (!tone || tone === "original") return FREE_MAX_PER_TONE;
  const used = getToneCounts().counts[tone] || 0;
  return Math.max(0, FREE_MAX_PER_TONE - used);
}

function setToneUsed(tone, used) {
  if (!tone || tone === "original") return;
  const today = new Date().toDateString();
  const d = getToneCounts();
  if (d.date !== today) { d.date = today; d.counts = {}; }
  d.counts[tone] = used;
  localStorage.setItem("wsToneCounts", JSON.stringify(d));
}

function isAllTonesExhausted() {
  return REWRITE_TONES.every((t) => getRewritesLeftForTone(t) === 0);
}

// Backwards-compatible shim: returns the remaining count for the currently selected tone.
// Many callers use this as "remaining for what the user is doing right now".
function getCardsLeft() {
  return getRewritesLeftForTone(curTone);
}

function trackCardUsage() {
  var effectiveSpeechLang = (speechLang && speechLang !== "__native__") ? speechLang : null;
  var effectiveCurLang = (typeof curLang !== "undefined" && curLang) ? curLang : null;
  var source = inputSource || "story";
  // Voice cards: speechLang is authoritative (set by the mic language picker).
  // Story/example cards: curLang is authoritative (set explicitly from the example's
  // data-lang or from script detection on typed text). speechLang is the user's mic
  // preference and should not override the card's actual content language.
  var lang = source === "voice"
    ? (effectiveSpeechLang || effectiveCurLang || "en")
    : (effectiveCurLang || effectiveSpeechLang || "en");
  fetch("/api/track-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang: lang, source: source })
  }).catch(function(){});
}

function isSupporter() {
  return localStorage.getItem("wsSupporter") === "true";
}

function updateSupporterBadge() {
  const badge = document.getElementById("proBadge");
  if (badge) badge.style.display = isSupporter() ? "" : "none";
  if (curTone) applyTone(curTone);
  // When Pro status changes, the counter's max bounds (50 vs 5, 900s vs 75s)
  // also change. Force a re-fetch so the UI matches the new tier immediately,
  // not just on the next click of the mic.
  if (typeof _refreshLimitsFromServer === "function") _refreshLimitsFromServer();
}

function openUpgradeModal() {
  document.getElementById("upgradeModal").classList.add("open");
  document.body.classList.add("modal-open");
  _activateModal(document.getElementById("upgradeModal"));
}
function closeUpgradeModal() {
  _deactivateModal();
  document.getElementById("upgradeModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  document.getElementById("upgradeKeyMsg").textContent = "";
  document.getElementById("upgradeEmailMsg").textContent = "";
}
document.getElementById("upgradeClose")?.addEventListener("click", closeUpgradeModal);
document.getElementById("upgradeBackdrop")?.addEventListener("click", closeUpgradeModal);
document.getElementById("upgradeBtn")?.addEventListener("click", openUpgradeModal);
document.getElementById("mobileBtnUpgrade")?.addEventListener("click", openUpgradeModal);
async function handleUpgradeKey() {
  const input = document.getElementById("upgradeKeyInput");
  const msg = document.getElementById("upgradeKeyMsg");
  const key = input.value.trim();
  if (!key) { msg.textContent = "Enter your key"; msg.className = "upgrade-modal-msg err"; return; }

  msg.textContent = "Checking...";
  msg.className = "upgrade-modal-msg";

  try {
    const res = await fetch("/api/pro-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (data.isPro) {
      localStorage.setItem("wsSupporter", "true");
      sessionStorage.setItem("wsProKey", key);
      updateSupporterBadge();
      msg.textContent = "Pro unlocked! Enjoy unlimited everything.";
      msg.className = "upgrade-modal-msg ok";
      setTimeout(() => {
        closeUpgradeModal();
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.welcomePro")) || "Welcome to Pro 💛");
      }, 1500);
    } else {
      msg.textContent = "Invalid key. Try again or buy a coffee.";
      msg.className = "upgrade-modal-msg err";
    }
  } catch (e) {
    msg.textContent = "Could not verify key. Try again.";
    msg.className = "upgrade-modal-msg err";
  }
}
function handleUpgradeEmail() {
  const input = document.getElementById("upgradeEmailInput");
  const msg = document.getElementById("upgradeEmailMsg");
  const email = input.value.trim();
  if (!email || !email.includes("@")) {
    msg.textContent = "Please enter a valid email address.";
    msg.className = "upgrade-modal-msg err";
    return;
  }
  // Open a pre-filled email to the support address so the user can send
  // their recovery request directly. No backend email system needed.
  const subject = encodeURIComponent("Wispr Stories \u2014 Lost Supporter Key");
  const body = encodeURIComponent(
    "Hi,\n\nI lost my Wispr Stories supporter key.\nMy purchase email was: " + email + "\n\nPlease resend my key. Thank you!"
  );
  window.open("mailto:yellowgreenlabs@proton.me?subject=" + subject + "&body=" + body);
  msg.textContent = "Opening your email app \u2014 send the message and I\u2019ll reply with your key.";
  msg.className = "upgrade-modal-msg ok";
}

function canCreateCard() {
  if (curTone === "original") return { ok: true };
  if (isSupporter()) return { ok: true };
  const left = getCardsLeft();
  if (left > 0) return { ok: true };
  return {
    ok: false,
    msg:
      "Daily tone card limit reached. Use Original tone for unlimited cards.",
  };
}

function applyTone(tone) {
  curTone = tone;
  _webmCache = null;
  _pngCache = null;
  const t = TONES[tone] || TONES.original;
  document.getElementById("cardGhost").innerHTML =
    '<i class="' + t.g + '"></i>';
  const toneBtns = document.querySelectorAll(".tc");
  toneBtns.forEach((c) => c.classList.toggle("on", c.dataset.tone === tone));
  const tx = document.getElementById("cardText");
  if (!tx.classList.contains("mt")) {
    const rawText = tx.textContent;
    if (rawText) applyScriptFonts(tx, tone, rawText);
    tx.style.fontStyle = t.fi;
    tx.style.fontWeight = t.fw;
    tx.style.letterSpacing = t.ls;
  }
  const btn = document.getElementById("btnCTxt");
  const wrap = document.getElementById("tonePillWrap");
  const pill = document.getElementById("tonePill");
  const upgBtn = document.getElementById("upgradeBtn");
  const isMobile = window.innerWidth <= 720;
  // "limitReached" applies to the currently SELECTED tone, used for pill/UI text below.
  // Per-tone limits are now independent \u2014 disabling is decided per-button in the loop.
  const limitReached = !isSupporter() && getRewritesLeftForTone(tone) === 0;
  toneBtns.forEach((c) => {
    if (c.dataset.tone === "original") { c.disabled = false; return; }
    const btnTone = c.dataset.tone;
    const btnLeft = getRewritesLeftForTone(btnTone);
    // Each tone button is disabled independently when its own quota is exhausted.
    c.disabled = !isSupporter() && btnLeft === 0;
    // Update or create counter badge on non-original tones
    let badge = c.querySelector(".tone-badge-limited");
    if (isSupporter()) {
      // Pro users see infinity symbol
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "tone-badge tone-badge-limited tone-badge-pro";
        badge.setAttribute("aria-hidden", "true");
        c.appendChild(badge);
      }
      badge.textContent = "\u221E";
    } else {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "tone-badge tone-badge-limited";
        badge.setAttribute("aria-hidden", "true");
        c.appendChild(badge);
      }
      badge.textContent = String(btnLeft);
    }
  });

  function showPill() { wrap.style.display = ""; }
  function hidePill() { wrap.style.display = "none"; }

  if (tone === "original") {
    btn.textContent = typeof getI18nSync === "function" ? getI18nSync("actions.create") || "Create card" : "Create card";
    // Only show "0 rewrites remaining" pill when ALL tones are exhausted.
    if (!isSupporter() && isAllTonesExhausted()) {
      if (isMobile) {
        hidePill();
      } else {
        showPill();
        pill.textContent = "All tone rewrites used today \u2014 Original is unlimited";
        pill.className = "tone-pill exhausted";
        upgBtn.style.display = "";
      }
    } else {
      hidePill();
    }
  } else {
    const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + tone) || tone.charAt(0).toUpperCase() + tone.slice(1) : tone.charAt(0).toUpperCase() + tone.slice(1);
    const createToneTpl = typeof getI18nSync === "function" ? getI18nSync("actions.createTone") || "Create {tone} card" : "Create {tone} card";
    btn.textContent = createToneTpl.replace("{tone}", toneLabel);
    if (isSupporter()) {
      showPill();
      pill.textContent = "\u221E Unlimited \u2014 no daily cap";
      pill.className = "tone-pill supporter";
      upgBtn.style.display = "none";
    } else {
      const left = getRewritesLeftForTone(tone);
      if (isMobile) {
        hidePill();
      } else {
        showPill();
        if (left === 0) {
          pill.textContent = (getI18nSync("rewrite.exhausted") || "0 {tone} rewrites left today. Try another tone").replace("{tone}", toneLabel.toLowerCase());
          pill.className = "tone-pill exhausted";
        } else {
          var leftKey = left === 1 ? "rewrite.left" : "rewrite.plural";
          pill.textContent = (getI18nSync(leftKey) || "{n} {tone} rewrites left today").replace("{n}", left).replace("{tone}", toneLabel.toLowerCase());
          pill.className = "tone-pill";
        }
        upgBtn.style.display = "";
      }
    }
  }
  updateMobileBar();
  updateSourceLabel();
  updateStyleChipSummary();
  updateVoiceBar();
}

function updateSourceLabel() {
  const vl = document.getElementById("voiceLabel");
  if (!vl) return;
  const isVoice = inputSource === "voice";
  const isStyled = curTone !== "original";
  const voiceIcon = "\u{1F399}\uFE0F";
  const storyIcon = "\u{1F58B}\uFE0F";
  if (isVoice) {
    vl.textContent = voiceIcon + (isStyled ? " Voice Styled" : " Voice Original");
  } else {
    vl.textContent = storyIcon + (isStyled ? " Story Styled" : " Story Original");
  }
}
function formatDuration(sec) {
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return m > 0 ? m + ":" + String(s).padStart(2, "0") : "0:" + String(s).padStart(2, "0");
}
function updateVoiceBar() {
  var bar = document.getElementById("voiceBar");
  var toggle = document.getElementById("voiceToggle");
  var info = document.getElementById("voiceToggleInfo");
  var durLabel = document.getElementById("voiceDurationLabel");
  if (!bar || !toggle) return;
  // Voice can only be attached when tone is "original" — any other tone
  // rewrites the text, so the recorded voice no longer matches the words
  // on the card. Hide the bar and detach without losing the audioBlob.
  var toneAllowsVoice = curTone === "original";
  if (!toneAllowsVoice && voiceAttached) {
    voiceAttached = false;
    toggle.checked = false;
  }
  if (inputSource === "voice" && audioBlob && webmCodecString && toneAllowsVoice) {
    bar.style.display = "flex";
    toggle.disabled = false;
    info.style.display = audioDurationSec > 0 ? "flex" : "none";
    if (audioDurationSec > 0) durLabel.textContent = formatDuration(audioDurationSec);
  } else if (inputSource === "voice" && !audioBlob && toneAllowsVoice) {
    bar.style.display = "flex";
    toggle.disabled = true;
    toggle.checked = false;
    voiceAttached = false;
    info.style.display = "none";
  } else {
    bar.style.display = "none";
    toggle.checked = false;
    voiceAttached = false;
  }
}

// Rewrite preview bar — shows Accept/Cancel after tone rewrite
function showRewritePreview(originalText, rewrittenText, tone) {
  const bar = document.getElementById("rewritePreviewBar");
  if (!bar) return;
  const label = tone.charAt(0).toUpperCase() + tone.slice(1);
  bar.innerHTML =
    '<span class="rewrite-preview-label">' + label + ' preview</span>' +
    '<button class="rewrite-preview-btn rewrite-preview-accept" id="rewriteAccept"><i class="fas fa-check"></i> Accept</button>' +
    '<button class="rewrite-preview-btn rewrite-preview-cancel" id="rewriteCancel"><i class="fas fa-xmark"></i> Keep original</button>';
  bar.classList.add("show");

  document.getElementById("rewriteAccept").addEventListener("click", async () => {
    const acceptBtn = document.getElementById("rewriteAccept");
    if (acceptBtn.disabled) return; // Prevent double-click while confirm is in flight
    acceptBtn.disabled = true;
    setTimeout(() => (acceptBtn.disabled = false), 1500);

    // Confirm the rewrite server-side. This is the call that ticks the
    // per-tone counter. If it fails (e.g. 429, network), we roll back to
    // the original text and applyTone("original") so the user can try a
    // different tone.
    const result = await confirmRewrite(tone);
    if (!result.ok) {
      const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + tone) : tone;
      const msg = result.status === 429
        ? ((typeof getI18nSync === "function" && getI18nSync("toasts.dailyRewritesUsed").replace("{tone}", toneLabel.toLowerCase())) || "Out of " + toneLabel.toLowerCase() + " today")
        : ((typeof getI18nSync === "function" && getI18nSync("toasts.rewriteFailed")) || "Rewrite failed");
      showToast(msg);
      document.getElementById("sta").value = originalText;
      window._originalText = null;
      window._pendingRewrite = null;
      window._rewriteConfirmed = false;
      hideRewritePreview();
      applyTone("original");
      updateCard();
      saveDraft();
      return;
    }
    if (typeof result.used === "number") {
      setToneUsed(tone, result.used);
    }
    document.getElementById("sta").value = rewrittenText;
    window._originalText = null;
    window._pendingRewrite = null;
    window._rewriteConfirmed = true;
    hideRewritePreview();
    applyTone(tone);
    updateCard();
    saveDraft();
  });
  document.getElementById("rewriteCancel").addEventListener("click", () => {
    document.getElementById("sta").value = originalText;
    window._originalText = null;
    window._pendingRewrite = null;
    window._rewriteConfirmed = false;
    hideRewritePreview();
    applyTone("original");
    updateCard();
    saveDraft();
  });
}

// Posts to /api/rewrite-confirm. Returns { ok, used, status }.
// The server is the source of truth for the per-tone counter; this function
// makes that tick happen at the moment the user Accepts (or auto-accepts via
// Create). All error paths return ok:false so callers can roll back.
async function confirmRewrite(tone) {
  if (tone === "original") return { ok: true, used: 0 };
  try {
    let sessionId = localStorage.getItem("wsSessionId");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wsSessionId", sessionId);
    }
    const res = await fetch("/api/rewrite-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tone,
        sessionId,
        proKey: sessionStorage.getItem("wsProKey") || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        used: typeof err.used === "number" ? err.used : null,
        error: err.error || "Confirm failed",
      };
    }
    const data = await res.json();
    return { ok: true, used: data.used, status: 200 };
  } catch (e) {
    return { ok: false, status: 0, error: e.message || "Network error" };
  }
}

function hideRewritePreview() {
  const bar = document.getElementById("rewritePreviewBar");
  if (bar) {
    bar.classList.remove("show");
    bar.innerHTML = "";
  }
}

function updateCard(preserveText) {
  const raw = document.getElementById("sta").value;
  const name = document.getElementById("nin").value.trim();
  const tx = document.getElementById("cardText");
  const lbl = document.getElementById("cardLabel");
  const panel = document.getElementById("cardPanel");
  const cc = document.getElementById("charC");

  cc.textContent = raw.length + " / 150";
  cc.classList.toggle("warn", raw.length >= 120);
  cc.classList.toggle("grace", raw.length > 150);
  // No RTL — page layout stays LTR always

  cardReady = false;
  document.getElementById("btnS").disabled = true;
  document.getElementById("dlBtn").style.display = "none";
  document.getElementById("wcta").classList.remove("show");
  const card = document.getElementById("card");
  if (raw.trim()) {
    card.classList.remove("card-empty");
    document.querySelector('.shell')?.classList.add('has-card');
    const t = TONES[curTone];
    document.getElementById("cardGhost").innerHTML = '<i class="' + t.g + '"></i>';
    const displayText = raw.length > 150 ? raw.slice(0, 150) + "..." : raw;
    tx.classList.remove("mt");
    if (!preserveText) {
      applyScriptFonts(tx, curTone, displayText);
    }
    tx.style.fontStyle = t.fi;
    tx.style.fontWeight = t.fw;
    tx.style.letterSpacing = t.ls;
    // Auto-detect language from text content — always wins over speechLang
    var detected = autoDetectLangFromText(raw);
    var langName;
    if (detected) {
      langName = getLanguageName(detected) || detected;
    } else if (speechLang === "__native__") {
      langName = "Native";
    } else {
      langName = getLanguageName(speechLang || curLang);
    }
    lbl.textContent = name ? name + " \u00b7 " + langName : langName;
  } else {
    card.classList.add("card-empty");
    document.querySelector('.shell')?.classList.remove('has-card');
    document.getElementById("cardGhost").innerHTML = '\u201C';
    const placeholder = typeof getI18nSync === "function" ? getI18nSync("cardPlaceholder") : "Your story appears here as you speak or type.";
    tx.textContent = placeholder;
    tx.classList.add("mt");
    tx.style.fontFamily = "";
    tx.style.fontStyle = "";
    tx.style.fontWeight = "";
    tx.style.letterSpacing = "";
    lbl.textContent = "";
  }
  updateSourceLabel();
  wave(raw);
  checkOccasions();
  updateVoiceBar();

  // Font-size control: only for short, non-empty card text. The length checked
  // is what the card actually shows (capped at 150 + ellipsis). If the text is
  // empty or has grown past the limit, snap the size back to base and disable.
  var shownLen = raw.trim() ? (raw.length > 150 ? 153 : raw.length) : 0;
  var fontEligible = shownLen > 0 && shownLen < FONT_SIZE_MAX_CHARS;
  if (!fontEligible && cardFontBump !== 0) cardFontBump = 0;
  applyCardFontSize();
  updateFontSizeUI(fontEligible);
}

// Apply the current font bump to the card text. Uses calc() on top of the same
// responsive base from card.css so the text still flexes with screen size; the
// computed pixel value is what html2canvas bakes into PNG/WebM exports.
function applyCardFontSize() {
  var tx = document.getElementById("cardText");
  if (!tx) return;
  if (cardFontBump > 0) {
    tx.style.fontSize = "calc(clamp(14px, 0.25vw + 13.2px, 15px) + " + cardFontBump + "px)";
  } else {
    tx.style.fontSize = "";
  }
}

// Reflect font-control state in the UI: greyed-out + info label when disabled,
// per-button bounds (− off at base, + off at max), and the live size number.
function updateFontSizeUI(eligible) {
  var row = document.getElementById("fontSizeRow");
  if (!row) return;
  var minus = document.getElementById("fontMinus");
  var plus = document.getElementById("fontPlus");
  var valEl = document.getElementById("fontSizeVal");
  var info = document.getElementById("fontSizeInfo");
  row.classList.toggle("disabled", !eligible);
  // Always show the explanation so users understand the rule in BOTH states:
  // why it's available now, and why it's greyed out otherwise.
  if (info) {
    var key = eligible ? "fontSize.infoOn" : "fontSize.info";
    var fallback = eligible
      ? "Your card text is short: tap + or − to adjust the size."
      : "Available only when your card text is under 85 characters.";
    info.textContent = (typeof getI18nSync === "function" && getI18nSync(key)) || fallback;
    info.classList.toggle("on", !!eligible);
  }
  if (minus) minus.disabled = !eligible || cardFontBump <= 0;
  if (plus) plus.disabled = !eligible || cardFontBump >= FONT_BUMP_MAX;
  if (valEl) {
    var tx = document.getElementById("cardText");
    var px = tx ? Math.round(parseFloat(getComputedStyle(tx).fontSize)) : 0;
    valEl.textContent = px ? px + "px" : "";
  }
}

// − / + button wiring. Buttons carry a disabled attribute when out of range or
// when the control is disabled, so these handlers only act on valid clicks.
// We deliberately do NOT call updateCard() here — that resets cardReady and
// would un-create an already-built card. We update only the font + its UI.
document.getElementById("fontMinus")?.addEventListener("click", function () {
  if (cardFontBump <= 0) return;
  cardFontBump--;
  applyCardFontSize();
  updateFontSizeUI(true);
  saveDraft();
});
document.getElementById("fontPlus")?.addEventListener("click", function () {
  if (cardFontBump >= FONT_BUMP_MAX) return;
  cardFontBump++;
  applyCardFontSize();
  updateFontSizeUI(true);
  saveDraft();
});
// Safe default before the first updateCard runs (empty card = disabled).
updateFontSizeUI(false);

// Card is fixed at 2:2 (square) so the share preview reliably renders as the
// Spotify-style large image-first preview on WhatsApp/iMessage/etc. Kept as
// a no-op-ish helper so legacy callers (e.g. saved drafts) don't break.
function applySize() {
  const card = document.getElementById("card");
  card.style.aspectRatio = "2 / 2";
  card.setAttribute("data-ratio", "2/2");
  if (window.innerWidth > 720) {
    document.querySelector(".card-wrap").style.maxWidth = "360px";
    document.getElementById("wcta").style.maxWidth = "360px";
  }
  applyPal(curP);
}


// Populate the microphone picker from available input devices. Device labels are
// only exposed after mic permission is granted, so this runs after the first
// successful getUserMedia and whenever the device list changes (devicechange).
async function refreshMicList() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    var sel = document.getElementById("micSelect");
    var row = document.getElementById("micSelectRow");
    if (!sel || !row) return;
    var devices = await navigator.mediaDevices.enumerateDevices();
    var mics = devices.filter(function (d) { return d.kind === "audioinput"; });
    console.debug("[Mic] Available inputs: " + mics.map(function (m) { return m.label || "(unlabeled)"; }).join(" | "));
    // Labels are empty until permission is granted — without them the picker is useless.
    var labeled = mics.filter(function (m) { return m.label; });
    if (labeled.length === 0) { row.style.display = "none"; return; }
    var savedId = localStorage.getItem("wsMicDevice") || "";
    sel.innerHTML = "";
    var defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Default microphone";
    sel.appendChild(defaultOpt);
    labeled.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.deviceId;
      opt.textContent = m.label;
      if (m.deviceId === savedId) opt.selected = true;
      sel.appendChild(opt);
    });
    // Only show the picker when there's an actual choice to make.
    row.style.display = labeled.length > 1 ? "flex" : "none";
  } catch (e) {
    console.warn("[Mic] enumerateDevices failed:", e && e.message);
  }
}

// Wire up the mic picker: persist the choice and refresh on device hot-plug.
(function initMicPicker() {
  var sel = document.getElementById("micSelect");
  if (sel) {
    sel.addEventListener("change", function () {
      if (sel.value) {
        localStorage.setItem("wsMicDevice", sel.value);
      } else {
        localStorage.removeItem("wsMicDevice");
      }
    });
  }
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", function () { refreshMicList(); });
  }
  // Populate on load. If mic permission was granted in a previous session it
  // persists, so device labels are already available and the picker shows up
  // BEFORE the user records — instead of popping in mid-recording and eating
  // into the recording time (which matters on the 5-recordings/day free tier).
  refreshMicList();
})();

async function startDeepgramRecording(stream) {
  try {
    if (!stream) {
      stream = await _getMicStream();
    }
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      var settings = {};
      try { settings = audioTrack.getSettings(); } catch(e) {}
      console.debug("[Mic] Device label=" + audioTrack.label + " enabled=" + audioTrack.enabled + " settings=" + JSON.stringify(settings));
    } else {
      console.error("[Mic] No audio tracks in stream!");
    }
    // Populate the mic picker now that permission is granted (labels need it).
    refreshMicList();
    const mt = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mediaRec = new MediaRecorder(stream, { mimeType: mt });
    audioChunks = [];
    deepgramStartTime = Date.now();
    recMaxDuration = isSupporter() ? PRO_MAX_RECORDING_SEC : FREE_MAX_RECORDING_SEC;
    mediaRec.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    // Surface stream errors — without this, Bluetooth dropouts kill MediaRecorder silently
    mediaRec.onerror = (e) => {
      console.error("[Rec] MediaRecorder error:", e.error && e.error.message ? e.error.message : e);
      isRec = false;
      if (recDurationTimer) { clearTimeout(recDurationTimer); recDurationTimer = null; }
      stream.getTracks().forEach((t) => t.stop());
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.recordingStopped")) || "Recording stopped");
      finishRec();
    };

    _startRecTimer(recMaxDuration, function() {
      isRec = false;
      var _maxTimeMsg = (typeof getI18nSync === "function" && getI18nSync("toasts.maxTime")) || ("Max " + recMaxDuration + "s");
      showToast(_maxTimeMsg.replace("{max}", recMaxDuration));
      console.debug("[Rec] Timer expired, stopping, chunks=" + audioChunks.length + ", speechLang=" + speechLang);
      if (mediaRec && mediaRec.state !== "inactive") {
        stopDeepgramRecording().then(function(result) {
          fullTx = result.text ? result.text.trim().slice(0, 150) : "";
          var preview = (result.text || "").slice(0, 30) + ((result.text || "").length > 30 ? "..." : "");
          console.debug("[Rec] STT result: text='" + preview + "', duration=" + result.duration + ", fullTx='" + fullTx + "'");
          if (!fullTx) showToast((typeof getI18nSync === "function" && getI18nSync("toasts.silence")) || "Didn't catch that");
          if (audioBlob) {
            _computeWaveform(audioBlob).then(function(h) {
              _cardWaveform = h;
              if (document.getElementById("sta").value.trim()) {
                wave(document.getElementById("sta").value);
              }
            }).catch(function() { _cardWaveform = null; });
          }
          var actualDuration = finishRec();
          reportRecordingDuration(actualDuration || result.duration);
        });
      }
    });

    mediaRec.start(250);
    return true;
  } catch (e) {
    console.error("[Whisper] Start failed:", e);
    return false;
  }
}


function stopDeepgramRecording() {
  return new Promise((resolve) => {
    if (!mediaRec || mediaRec.state === "inactive") {
      if (recDurationTimer) {
        clearTimeout(recDurationTimer);
        recDurationTimer = null;
      }
      const duration = deepgramStartTime ? Math.floor((Date.now() - deepgramStartTime) / 1000) : 0;
      deepgramStartTime = null;
      resolve({ text: "", duration });
      return;
    }
      mediaRec.onstop = async () => {
        mediaRec.stream.getTracks().forEach((t) => t.stop());
        if (recDurationTimer) {
          clearTimeout(recDurationTimer);
          recDurationTimer = null;
        }
        const duration = deepgramStartTime ? Math.floor((Date.now() - deepgramStartTime) / 1000) : 0;
        deepgramStartTime = null;
        const blob = new Blob(audioChunks, { type: mediaRec.mimeType });
        console.debug("[Rec] Onstop: chunks=" + audioChunks.length + ", blobSize=" + blob.size + ", duration=" + duration);
        audioChunks = [];
        audioBlob = blob;
        audioDurationSec = duration;

        // Diagnostic: measure the actual loudness of the captured audio. Decodes
        // the already-finished blob offline (NOT the live stream, so it won't
        // re-trigger the Bluetooth HFP/silent-capture issue). A peak near 0 means
        // the mic captured silence (capture problem); a healthy peak means the
        // audio has sound and the empty transcript is a transcription-side issue.
        try {
          var _lvlCtx = new (window.AudioContext || window.webkitAudioContext)();
          var _lvlBuf = await _lvlCtx.decodeAudioData(await blob.arrayBuffer());
          var _lvlCh = _lvlBuf.getChannelData(0);
          var _lvlPeak = 0, _lvlSum = 0;
          for (var _lvlI = 0; _lvlI < _lvlCh.length; _lvlI++) {
            var _lvlAbs = Math.abs(_lvlCh[_lvlI]);
            if (_lvlAbs > _lvlPeak) _lvlPeak = _lvlAbs;
            _lvlSum += _lvlAbs;
          }
          _lvlCtx.close();
          console.debug("[Mic] Captured audio level: peak=" + _lvlPeak.toFixed(4) + " avg=" + (_lvlSum / (_lvlCh.length || 1)).toFixed(6) + " samples=" + _lvlCh.length);
        } catch (_lvlErr) {
          console.warn("[Mic] Level check failed:", _lvlErr && _lvlErr.message);
        }

        // Convert WebM Opus → 16kHz WAV for universal Deepgram compatibility.
        // Resampling to 16kHz keeps the output ~470KB for 15s (vs ~1.4MB at 48kHz).
        var _wavArrBuf = await (async function() {
          var _c = new (window.AudioContext || window.webkitAudioContext)();
          var _b = await _c.decodeAudioData(await blob.arrayBuffer());
          var _w = _audioBufferToWav(_b);
          _c.close();
          return _w;
        })();
        var fetchBlob = new Blob([_wavArrBuf], { type: "audio/wav" });
        _lastSttWav = fetchBlob;
        _lastSttLang = speechLang;
        _lastSttSessionId = localStorage.getItem("wsSessionId") || "";
        console.debug("[STT] Sending WAV: size=" + fetchBlob.size);
        var controller = new AbortController();
        var sttTimeout = setTimeout(function() { controller.abort(); }, 15000);
        try {
          const res = await fetch("/api/stt", {
            method: "POST",
            headers: Object.assign({
              "Content-Type": "audio/wav",
              "X-Language": speechLang === "__native__" ? "" : speechLang,
              "X-Session-Id": localStorage.getItem("wsSessionId") || "",
            }, getAdminHeaders()),
            body: fetchBlob,
            signal: controller.signal,
          });
          clearTimeout(sttTimeout);
          console.debug("[STT] Response status=" + res.status);
          if (!res.ok) {
            const err = await res.text();
            console.error("[STT] API error:", err);
            resolve({ text: "", duration });
            return;
          }
          const data = await res.json();
          if (!data.text) console.warn("[STT] Empty response, full data:", JSON.stringify(data));
          else _lastSttWav = null;
          resolve({ text: data.text || "", duration });
        } catch (e) {
          clearTimeout(sttTimeout);
          if (e.name === 'AbortError') {
            console.warn("[STT] Request timed out");
          } else {
            console.error("[STT] Error:", e);
          }
          resolve({ text: "", duration });
        }
      };
      mediaRec.stop();
    });
  }

function _showSttRetryState() {
  var recStEl = document.getElementById("recSt");
  if (!recStEl) return;
  var couldntMsg = (typeof getI18nSync === "function" && getI18nSync("record.couldntRetry")) || "Couldn't transcribe. Tap to retry";
  recStEl.textContent = couldntMsg;
  recStEl.classList.add("retry");
  recStEl.onclick = function() {
    if (_sttRetrying) return;
    _retryLastStt();
  };
}

async function _retryLastStt() {
  if (!_lastSttWav || _sttRetrying) return;
  _sttRetrying = true;
  var recStEl = document.getElementById("recSt");
  var processingMsg = (typeof getI18nSync === "function" && getI18nSync("record.processing")) || "Processing your audio…";
  if (recStEl) {
    recStEl.textContent = processingMsg;
    recStEl.classList.remove("retry");
    recStEl.onclick = null;
  }
  var controller = new AbortController();
  var sttTimeout = setTimeout(function() { controller.abort(); }, 15000);
  try {
    const res = await fetch("/api/stt", {
      method: "POST",
      headers: Object.assign({
        "Content-Type": "audio/wav",
        "X-Language": _lastSttLang === "__native__" ? "" : _lastSttLang,
        "X-Session-Id": _lastSttSessionId,
      }, getAdminHeaders()),
      body: _lastSttWav,
      signal: controller.signal,
    });
    clearTimeout(sttTimeout);
    if (!res.ok) {
      console.error("[STT retry] API error, status=" + res.status);
      _lastSttWav = null;
      _sttRetrying = false;
      if (recStEl) {
        recStEl.textContent = (typeof getI18nSync === "function" && getI18nSync("record.couldntRetry")) || "Couldn't transcribe. Tap to retry";
        recStEl.classList.add("retry");
      }
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.sttFailed")) || "Couldn't transcribe");
      return;
    }
    const data = await res.json();
    _sttRetrying = false;
    if (data.text) {
      fullTx = data.text.trim().slice(0, 150);
      _lastSttWav = null;
      if (recStEl) {
        recStEl.classList.remove("retry");
        recStEl.onclick = null;
      }
      const actualDuration = finishRec();
      await reportRecordingDuration(actualDuration);
    } else {
      console.warn("[STT retry] Empty text");
      _lastSttWav = null;
      if (recStEl) {
        recStEl.textContent = (typeof getI18nSync === "function" && getI18nSync("record.couldntRetry")) || "Couldn't transcribe. Tap to retry";
        recStEl.classList.add("retry");
      }
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.sttFailed")) || "Couldn't transcribe");
    }
  } catch (e) {
    clearTimeout(sttTimeout);
    console.error("[STT retry] Error:", e);
    _lastSttWav = null;
    _sttRetrying = false;
    if (recStEl) {
      recStEl.textContent = (typeof getI18nSync === "function" && getI18nSync("record.couldntRetry")) || "Couldn't transcribe. Tap to retry";
      recStEl.classList.add("retry");
    }
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.sttFailed")) || "Couldn't transcribe");
  }
}

function _getMicStream() {
  var savedMicId = localStorage.getItem("wsMicDevice") || "";
  return navigator.mediaDevices.getUserMedia({
    audio: savedMicId ? { deviceId: { exact: savedMicId } } : true,
  }).catch(function(err) {
    if (savedMicId) {
      console.warn("[Mic] Saved device unavailable, falling back to default:", err && err.name);
      localStorage.removeItem("wsMicDevice");
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw err;
  });
}

// Fallback to Web Speech API when Deepgram is unavailable or fails to start.
// Attempts to use the browser's built-in speech recognition. If that also fails,
// shows a toast and resets the UI.
function trySpeechFallback() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceUnavailable")) || "Voice off \u2014 type instead");
    var recBtnEl = document.getElementById("recBtn");
    recBtnEl.disabled = false;
    recBtnEl.classList.remove("on");
    document.getElementById("recSt").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
    document.getElementById("recSub").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
    document.getElementById("recSub").classList.remove("live");
    return;
  }
  try {
    usingDeepgram = false;
    startWebSpeechAPI();
  } catch (e) {
    console.error("[Speech] Fallback failed:", e);
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceUnavailable")) || "Voice off \u2014 type instead");
    var recBtnEl2 = document.getElementById("recBtn");
    recBtnEl2.disabled = false;
    recBtnEl2.classList.remove("on");
    document.getElementById("recSt").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
    document.getElementById("recSub").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
    document.getElementById("recSub").classList.remove("live");
  }
}

function startRec() {
  if (location.protocol === "file:") {
    return;
  }

  // Server STT health check — routes to Deepgram or Whisper based on language.
  // Cached for 10 minutes to avoid pinging the server on every record tap.
  function _runSttHealth() {
    if (_sttHealthCache && (Date.now() - _sttHealthCache.ts) < STT_HEALTH_TTL_MS) {
      return Promise.resolve(_sttHealthCache.value);
    }
    return fetch("/api/stt?check=1").then(function(r) { return r.json(); }).then(function(data) {
      _sttHealthCache = { value: data, ts: Date.now() };
      return data;
    }).catch(function() {
      // Network error — try one retry after 2s before falling back.
      return new Promise(function(resolve) {
        setTimeout(function() {
          fetch("/api/stt?check=1").then(function(r) { return r.json(); }).then(function(d) {
            _sttHealthCache = { value: d, ts: Date.now() };
            resolve(d);
          }).catch(function() { resolve(null); });
        }, 2000);
      });
    });
  }
  // Run STT health check and getUserMedia in parallel — the user may be
  // waiting up to ~2 s on a slow mic permission prompt, so don't make them
  // also wait for the health check to complete first.
  Promise.all([_runSttHealth(), _getMicStream().then(function(s) { return s; }).catch(function(e) { return { __micError: e }; })])
    .then(function(results) {
      var data = results[0];
      var streamOrErr = results[1];
      if (streamOrErr && streamOrErr.__micError) {
        var name = streamOrErr.__micError && streamOrErr.__micError.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micDenied")) || "Allow mic to record");
        } else if (name === "NotFoundError") {
          showToast((typeof getI18nSync === "function" && getI18nSync("toasts.noMicFound")) || "No mic found");
        } else {
          showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micUnavailable")) || "Mic unavailable");
        }
        var recBtnEl = document.getElementById("recBtn");
        recBtnEl.disabled = false;
        recBtnEl.classList.remove("on");
        return;
      }
      var stream = streamOrErr;
      if (data && data.available) {
        usingDeepgram = true;
        startDeepgramRecording(stream).then(function(ok) {
          if (ok) {
            isRec = true;
            _isRecPaused = false;
            var listeningMsg2 = (typeof getI18nSync === "function" && getI18nSync("record.listening")) || "Listening and processing your words";
            var recStEl2 = document.getElementById("recSt");
            recStEl2.textContent = listeningMsg2;
            document.getElementById("recSub").classList.add("live");
            document.getElementById("recBtn").classList.add("on");
            _showDoneButton(true);
          } else {
            if (stream) stream.getTracks().forEach(function(t) { t.stop(); });
            usingDeepgram = false;
            trySpeechFallback();
          }
        });
      } else {
        if (stream) stream.getTracks().forEach(function(t) { t.stop(); });
        trySpeechFallback();
      }
    });
}

function startWebSpeechAPI() {
  if (recogTimeout) {
    clearTimeout(recogTimeout);
    recogTimeout = null;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceUnavailable")) || "Voice off — type instead");
    finishRec();
    return;
  }
  fullTx = "";
  recogRestartCount = 0;
  recog = new SR();
  recog.continuous = false;
  recog.interimResults = true;
  var _wsLocales = { ca:'ca-ES', cs:'cs-CZ', de:'de-DE', el:'el-GR', es:'es-ES', fr:'fr-FR', gu:'gu-IN', hi:'hi-IN', id:'id-ID', it:'it-IT', ja:'ja-JP', jw:'jv-ID', kn:'kn-IN', ko:'ko-KR', ml:'ml-IN', my:'my-MM', ne:'ne-NP', pa:'pa-IN', pt:'pt-BR', ru:'ru-RU', si:'si-LK', sv:'sv-SE', ta:'ta-IN', te:'te-IN', th:'th-TH', tr:'tr-TR', uz:'uz-UZ', zh:'zh-CN', ar:'ar-SA', bn:'bn-BD', da:'da-DK', fa:'fa-IR', fi:'fi-FI', he:'he-IL', hu:'hu-HU', mr:'mr-IN', ms:'ms-MY', nl:'nl-NL', pl:'pl-PL', tl:'tl-PH', uk:'uk-UA', ur:'ur-PK', vi:'vi-VN' };
  recog.lang = _wsLocales[speechLang] || _wsLocales[curLang] || 'en-US';
  recog.onstart = () => {
    isRec = true;
    _isRecPaused = false;
    if (recStartTime === null) recStartTime = Date.now();
    recMaxDuration = isSupporter() ? PRO_MAX_RECORDING_SEC : FREE_MAX_RECORDING_SEC;
    document.getElementById("recBtn").classList.add("on");
    var listeningMsg3 = (typeof getI18nSync === "function" && getI18nSync("record.listening")) || "Listening and processing your words";
    document.getElementById("recSt").textContent = listeningMsg3;
    document.getElementById("recSub").classList.add("live");
    _showDoneButton(true);
    console.debug("[Speech] Started, lang=" + recog.lang + ", max=" + recMaxDuration + "s");
    _startRecTimer(recMaxDuration, function() {
      var _maxTimeMsgWS = (typeof getI18nSync === "function" && getI18nSync("toasts.maxTime")) || ("Max " + recMaxDuration + "s");
      showToast(_maxTimeMsgWS.replace("{max}", recMaxDuration));
      isRec = false;
      if (recog) recog.stop();
    });
    recogTimeout = setTimeout(() => {
      console.warn("[Speech] Timeout \u2014 no results after 8s");
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.speechNotResponding")) || "Speech off \u2014 type instead");
      isRec = false;
      recog.stop();
    }, 8000);
  };
  recog.onresult = (e) => {
    recogRestartCount = 0;
    let fi = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) fi += e.results[i][0].transcript;
    }
    if (fi) {
      fullTx += fi + " ";
      console.debug('[Speech] Final result: "' + fi.trim() + '"');
    }
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
  };
  recog.onend = () => {
    if (usingDeepgram) return;
    console.debug("[Speech] Ended, isRec=" + isRec);
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
_vibrate();
  if (isRec) {
      recogRestartCount++;
      if (recogRestartCount > RECOG_MAX_RESTARTS) {
        console.warn("[Speech] Max restarts reached");
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.speechUnavailable")) || "Speech off \u2014 try later");
        isRec = false;
        finishRec();
        return;
      }
      setTimeout(() => {
        if (!isRec) return;
        try {
          recog.lang = _wsLocales[speechLang] || _wsLocales[curLang] || 'en-US';
          recog.start();
          console.debug(
            "[Speech] Restarted (attempt " + recogRestartCount + ")"
          );
        } catch (e) {
          console.error("[Speech] Restart failed:", e);
          isRec = false;
          finishRec();
        }
      }, 500);
    } else {
      finishRec();
    }
  };
  recog.onerror = (e) => {
    console.warn("[Speech] Error: " + e.error + (e.message ? " \u2014 " + e.message : ""));
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
    if (e.error === "aborted") return;
    if (e.error === "not-allowed") {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micAccessDenied")) || "Allow mic in browser");
      isRec = false;
      return;
    }
    if (e.error === "network") {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.speechUnavailable")) || "Speech off — try later");
      isRec = false;
      return;
    }
    if (e.error === "no-speech")
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.noSpeech")) || "Speak louder");
    else showToast((typeof getI18nSync === "function" && getI18nSync("toasts.speechError")) || "Speech error");
    isRec = false;
  };
  recog.onnomatch = () => {
    console.warn("[Speech] No match");
    showToast(
      (typeof getI18nSync === "function" && getI18nSync("toasts.noMatch")) || "Speak more clearly"
    );
  };
  try {
    recog.start();
  } catch (e) {
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.couldNotStartMic")) || "Mic failed");
  }
}

function finishRec() {
  console.warn("[Rec] finishRec() called, fullTx='" + (fullTx || "").slice(0, 40) + "', recStartTime=" + recStartTime + ", usingDeepgram=" + usingDeepgram);
  if (recDurationTimer) {
    clearTimeout(recDurationTimer);
    recDurationTimer = null;
  }
  _stopRecTimer();
  _showDoneButton(false);
  _isRecPaused = false;
  const actualDuration = recStartTime ? Math.floor((Date.now() - recStartTime) / 1000) : 0;
  recStartTime = null;
  usingDeepgram = false;
  _sttRetrying = false;
  var recBtnFin = document.getElementById("recBtn");
  recBtnFin.classList.remove("on", "paused");
  recBtnFin.disabled = false;
  var recStElFinish = document.getElementById("recSt");
  if (recStElFinish) {
    recStElFinish.textContent = (typeof getI18nSync === "function" && getI18nSync("record.ended")) || "Recording ended";
    recStElFinish.classList.remove("retry");
    recStElFinish.onclick = null;
  }
  if (fullTx.trim()) {
    document.getElementById("sta").value = fullTx.trim().slice(0, 150);
    inputSource = "voice";
    userOverride = false;
    updateCard();
    saveDraft();
    fullTx = "";
  }
  updateSlNudge();
  updateMicState();
  updateVoiceBar();
  return actualDuration;
}

// Recording timer with drift correction. Renders "Ns" in the recSub element
// starting at the cap (e.g. "15s") and counting down to "0s". Uses a
// setTimeout chain (not setInterval) and performance.now() so each tick
// re-anchors to the start time, eliminating drift across long recordings.
// When remaining hits 0, onExpire is invoked and recDurationTimer is cleared.
// Supports pause/resume via _pauseRecTimer / _resumeRecTimer.
function _startRecTimer(maxSec, onExpire) {
  _recTimerMaxSec = maxSec;
  _recTimerExpire = onExpire;
  _recTimerStartTime = performance.now();
  _recTimerPausedAt = null;
  _recTimerPausedRemaining = null;
  var recSub = document.getElementById("recSub");
  recSub.textContent = _formatRecTimer(maxSec);
  function tick() {
    if (_recTimerPausedAt !== null) return;
    var elapsed = (performance.now() - _recTimerStartTime) / 1000;
    var remaining = _recTimerMaxSec - elapsed;
    if (remaining <= 0) {
      recSub.textContent = "0s";
      recDurationTimer = null;
      recDurationTimer = setTimeout(function() {
        recDurationTimer = null;
        if (_recTimerExpire) _recTimerExpire();
      }, 1000);
      return;
    }
    recSub.textContent = _formatRecTimer(remaining);
    var drift = (performance.now() - _recTimerStartTime) % 1000;
    recDurationTimer = setTimeout(tick, 1000 - drift);
  }
  recDurationTimer = setTimeout(tick, 1000);
}
function _formatRecTimer(s) {
  s = Math.max(0, Math.ceil(s));
  return s + "s";
}
function _pauseRecTimer() {
  if (_recTimerStartTime === null) return;
  if (_recTimerPausedAt !== null) return;
  _recTimerPausedAt = performance.now();
  if (recDurationTimer) { clearTimeout(recDurationTimer); recDurationTimer = null; }
  var elapsed = (_recTimerPausedAt - _recTimerStartTime) / 1000;
  _recTimerPausedRemaining = Math.max(0, _recTimerMaxSec - elapsed);
  var recSub = document.getElementById("recSub");
  if (recSub) recSub.textContent = _formatRecTimer(_recTimerPausedRemaining);
}
function _resumeRecTimer() {
  if (_recTimerPausedAt === null || _recTimerPausedRemaining === null) return;
  if (_recTimerPausedRemaining <= 0) {
    var recSub = document.getElementById("recSub");
    if (recSub) recSub.textContent = "0s";
    recDurationTimer = setTimeout(function() {
      recDurationTimer = null;
      if (_recTimerExpire) _recTimerExpire();
    }, 1000);
    _recTimerStartTime = null;
    _recTimerPausedAt = null;
    _recTimerPausedRemaining = null;
    return;
  }
  _recTimerStartTime = performance.now() - (_recTimerMaxSec - _recTimerPausedRemaining) * 1000;
  _recTimerPausedAt = null;
  _recTimerPausedRemaining = null;
  function tick() {
    if (_recTimerPausedAt !== null) return;
    var elapsed = (performance.now() - _recTimerStartTime) / 1000;
    var remaining = _recTimerMaxSec - elapsed;
    var recSub = document.getElementById("recSub");
    if (remaining <= 0) {
      recSub.textContent = "0s";
      recDurationTimer = null;
      recDurationTimer = setTimeout(function() {
        recDurationTimer = null;
        if (_recTimerExpire) _recTimerExpire();
      }, 1000);
      return;
    }
    recSub.textContent = _formatRecTimer(remaining);
    var drift = (performance.now() - _recTimerStartTime) % 1000;
    recDurationTimer = setTimeout(tick, 1000 - drift);
  }
  recDurationTimer = setTimeout(tick, 1000 - ((performance.now() - _recTimerStartTime) % 1000));
}
function _stopRecTimer() {
  if (recDurationTimer) { clearTimeout(recDurationTimer); recDurationTimer = null; }
  _recTimerStartTime = null;
  _recTimerPausedAt = null;
  _recTimerPausedRemaining = null;
  _recTimerMaxSec = 0;
  _recTimerExpire = null;
}

function _setPausedUI(paused) {
  var recStEl = document.getElementById("recSt");
  var recBtnEl = document.getElementById("recBtn");
  var doneBtnEl = document.getElementById("recDoneBtn");
  if (paused) {
    if (recStEl) recStEl.textContent = (typeof getI18nSync === "function" && getI18nSync("record.paused")) || "Paused \u2014 tap the mic to resume";
    if (recBtnEl) recBtnEl.classList.add("paused");
    if (doneBtnEl) doneBtnEl.disabled = false;
  } else {
    if (recBtnEl) recBtnEl.classList.remove("paused");
  }
}

function _pauseRecording() {
  if (!isRec || _isRecPaused) return;
  _isRecPaused = true;
  if (usingDeepgram && mediaRec && mediaRec.state === "recording") {
    try { mediaRec.pause(); } catch (e) { console.warn("[Rec] MediaRecorder.pause() failed:", e); }
  }
  _pauseRecTimer();
  _setPausedUI(true);
}

function _resumeRecording() {
  if (!isRec || !_isRecPaused) return;
  _isRecPaused = false;
  if (usingDeepgram && mediaRec && mediaRec.state === "paused") {
    try { mediaRec.resume(); } catch (e) { console.warn("[Rec] MediaRecorder.resume() failed:", e); }
  }
  document.getElementById("recSt").textContent = (typeof getI18nSync === "function" && getI18nSync("record.listening")) || "Listening and processing your words";
  _setPausedUI(false);
  _resumeRecTimer();
}

function _showDoneButton(show) {
  var doneBtnEl = document.getElementById("recDoneBtn");
  var resetBtnEl = document.getElementById("resetBtn");
  if (doneBtnEl) doneBtnEl.style.display = show ? "inline-flex" : "none";
  if (resetBtnEl) resetBtnEl.style.display = show ? "none" : "inline-flex";
}

// Smart Show: only show the Start Over button when there's something to clear.
// Inputs: textarea, name field, recorded audio. On blank load it's hidden —
// eliminates the "Start over" CTA on first-time visits (per friction principle).
function _updateResetBtnVisibility() {
  var resetBtnEl = document.getElementById("resetBtn");
  if (!resetBtnEl) return;
  // Don't fight the recording-flow override: while recording, the Done button
  // is shown instead and the reset button is hidden via _showDoneButton(true).
  if (isRec) return;
  var sta = document.getElementById("sta");
  var nin = document.getElementById("nin");
  var hasText = (sta && sta.value && sta.value.length > 0) || (nin && nin.value && nin.value.length > 0);
  var hasAudio = !!audioBlob;
  resetBtnEl.style.display = (hasText || hasAudio) ? "inline-flex" : "none";
}

// Haptic feedback helper
function _vibrate(duration) {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(duration || 12);
}

document.getElementById("recDoneBtn").addEventListener("click", async function() {
  if (!isRec) return;
  _vibrate();
  if (_isRecPaused) _resumeRecording();
  await _stopAndTranscribe();
});

async function _stopAndTranscribe() {
  if (!isRec) return;
  isRec = false;
  _isRecPaused = false;
  if (recDurationTimer) {
    clearTimeout(recDurationTimer);
    recDurationTimer = null;
  }
  if (recGraceTimer) {
    clearTimeout(recGraceTimer);
    recGraceTimer = null;
  }
  _stopRecTimer();
  _showDoneButton(false);
  var recBtnFin = document.getElementById("recBtn");
  recBtnFin.classList.remove("on", "paused");
  var processingMsg = (typeof getI18nSync === "function" && getI18nSync("record.processing")) || "Processing your audio…";
  var recStElStop = document.getElementById("recSt");
  if (recStElStop) {
    recStElStop.textContent = processingMsg;
    recStElStop.classList.remove("retry");
  }
  if (usingDeepgram) {
    const result = await stopDeepgramRecording();
    fullTx = result.text ? result.text.trim().slice(0, 150) : "";
    if (audioBlob) {
      _computeWaveform(audioBlob).then(function(h) {
        _cardWaveform = h;
        if (document.getElementById("sta").value.trim()) {
          wave(document.getElementById("sta").value);
        }
      }).catch(function() { _cardWaveform = null; });
    }
    if (!fullTx && _lastSttWav) {
      _showSttRetryState();
      return;
    }
    if (!fullTx) showToast((typeof getI18nSync === "function" && getI18nSync("toasts.silence")) || "Didn't catch that");
    const actualDuration = finishRec();
    await reportRecordingDuration(actualDuration || result.duration);
    return;
  }
  if (recogTimeout) {
    clearTimeout(recogTimeout);
    recogTimeout = null;
  }
  if (recog) recog.stop();
  const actualDuration = finishRec();
  await reportRecordingDuration(actualDuration);
}

document.getElementById("recBtn").addEventListener("click", async () => {
  _vibrate();
  if (isRec) {
    if (usingDeepgram) {
      if (_isRecPaused) {
        _resumeRecording();
      } else {
        _pauseRecording();
      }
      return;
    }
    await _stopAndTranscribe();
    return;
  }

  // Speech language guard — don't record when no valid speech language
  if (!speechLang) {
    return;
  }
  if (speechLang === "__native__") {
    return;
  }

  // Show immediate feedback before any async setup. Disable the button
  // synchronously so a double-tap can't fire two record starts in parallel.
  var recBtnEl = document.getElementById("recBtn");
  recBtnEl.classList.add("on");
  recBtnEl.disabled = true;
  document.getElementById("recSt").textContent = "Starting\u2026";
  document.getElementById("recSub").textContent = "Setting up mic\u2026";
  document.getElementById("recSub").classList.add("live");
  var recStElStart = document.getElementById("recSt");
  if (recStElStart) {
    recStElStart.classList.remove("retry");
    recStElStart.onclick = null;
  }
  _lastSttWav = null;
  _sttRetrying = false;

  var readyTimer;

  // Pre-flight: request mic permission and populate the mic picker before
  // the recording flow starts. This avoids the browser permission prompt
  // eating into the recording timer on first visit.
  try {
    var preflightStream = await _getMicStream();
    refreshMicList();
    if (preflightStream) preflightStream.getTracks().forEach(function(t) { t.stop(); });
  } catch (micErr) {
    recBtnEl.disabled = false;
    recBtnEl.classList.remove("on");
    document.getElementById("recSt").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
    document.getElementById("recSub").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
    document.getElementById("recSub").classList.remove("live");
    var errName = micErr && micErr.name;
    if (errName === "NotAllowedError" || errName === "SecurityError") {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micDenied")) || "Allow mic to record");
    } else if (errName === "NotFoundError") {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.noMicFound")) || "No mic found");
    } else {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micUnavailable")) || "Mic unavailable");
    }
    return;
  }

  // Server-side limit check before starting recording (check only, don't increment)
  const sessionId = localStorage.getItem("wsSessionId");
  if (!sessionId) {
    const newId = "sess_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("wsSessionId", newId);
  }
  const isPro = isSupporter();
  const maxDuration = isPro ? PRO_MAX_RECORDING_SEC : FREE_MAX_RECORDING_SEC;

  console.debug("[Limits] precheck:", JSON.stringify({ sessionId: localStorage.getItem("wsSessionId"), isPro, audioDuration: maxDuration }));
  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
      body: JSON.stringify({ sessionId: localStorage.getItem("wsSessionId"), isPro, audioDuration: maxDuration, checkOnly: true }),
    });
    const data = await res.json();
    console.debug("[Limits] precheck response:", JSON.stringify(data));

    if (!data.allowed) {
      clearTimeout(readyTimer);
      recBtnEl.disabled = false;
      recBtnEl.classList.remove("on");
      document.getElementById("recSt").textContent =
        (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
      document.getElementById("recSub").textContent =
        (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
      document.getElementById("recSub").classList.remove("live");
      if (data.reason === "too_many") {
        showToast(isPro
          ? (typeof getI18nSync === "function" && getI18nSync("toasts.proLimit")) || "More tomorrow 💛"
          : (typeof getI18nSync === "function" && getI18nSync("toasts.freeLimit")) || "Free limit hit 💛");
      } else if (data.reason === "cumulative_exceeded") {
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.cumulativeLimit")) || "More tomorrow 💛");
      } else if (data.reason === "too_long") {
        var _tooLongMsg = (typeof getI18nSync === "function" && getI18nSync("toasts.tooLong")) || ("Max " + data.maxSeconds + "s. Tap Done");
        showToast(_tooLongMsg.replace("{max}", data.maxSeconds));
      }
      return;
    }
    // Update counter with current usage
    updateRecCounter(data.recordingsUsed, data.recordingsMax, data.cumulativeUsed, data.cumulativeMax);
  } catch (e) {
    console.warn("[Limits] Check failed, allowing:", e.message);
  }

  // Clear the old readyTimer — it may have fired during the server check.
  // Restart it so it guards the mic setup phase (getUserMedia + startRec).
  clearTimeout(readyTimer);
  readyTimer = setTimeout(function() {
    if (!isRec) {
      recBtnEl.disabled = false;
      recBtnEl.classList.remove("on");
      document.getElementById("recSt").textContent =
        (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
      document.getElementById("recSub").textContent =
        (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
      document.getElementById("recSub").classList.remove("live");
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.micSlow")) || "Mic slow \u2014 try again");
    }
  }, 2000);

  startRec();
  // startRec() sets isRec=true synchronously on its first synchronous
  // branch (the Web Speech path) or asynchronously via startDeepgramRecording
  // (which polls audio tracks). If neither path sets isRec=true within the
  // 2 s readiness window, the timeout above resets the UI.
  // We don't clear readyTimer here because the timer self-checks isRec —
  // it'll no-op if startRec succeeded.
});

async function reportRecordingDuration(actualDuration) {
  if (_skipDurationReport) { _skipDurationReport = false; return; }
  const sessionId = localStorage.getItem("wsSessionId");
  const isPro = isSupporter();
  console.debug("[Limits] report:", JSON.stringify({ sessionId, actualDuration, isPro }));
  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
      body: JSON.stringify({ sessionId, isPro, audioDuration: actualDuration || 0, checkOnly: false }),
    });
    const data = await res.json();
    console.debug("[Limits] report response:", JSON.stringify(data));
    if (data.allowed) {
      updateRecCounter(data.recordingsUsed, data.recordingsMax, data.cumulativeUsed, data.cumulativeMax, sessionId);
    }
    // Safety net: always re-fetch the authoritative count from the server
    // after any report, so the UI mirrors the server's Redis state even if
    // the initial response was stale or the increment race produced a stale
    // value. checkOnly: true does not increment, so this is idempotent.
    // This auto-corrects the known "Counter stuck at 5/5" symptom in case
    // the root cause is a client-side caching issue.
    console.debug("[Limits] report post-verify (allowed=" + data.allowed + ")");
    await _refreshLimitsFromServer();
    if (!data.allowed && (data.reason === "too_many" || data.reason === "cumulative_exceeded")) {
      console.debug("[Limits] report returned cap:", data.reason);
    }
  } catch (e) {
    console.warn("[Limits] Report failed:", e.message);
  }
}

// Auto-heal: silent checkOnly against the server. Used on page load to
// reconcile any drift between localStorage mirror and the authoritative
// server state, and after any cap-returning report to recover the true
// counts. Never shows a toast or user-facing state change.
async function _refreshLimitsFromServer() {
  const sessionId = localStorage.getItem("wsSessionId");
  if (!sessionId) return;
  const isPro = isSupporter();
  console.debug("[Limits] refresh:", JSON.stringify({ sessionId, isPro }));
  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
      body: JSON.stringify({ sessionId, isPro, audioDuration: 0, checkOnly: true }),
    });
    const data = await res.json();
    console.debug("[Limits] refresh response:", JSON.stringify(data));
    if (data && data.recordingsMax) {
      updateRecCounter(data.recordingsUsed, data.recordingsMax, data.cumulativeUsed, data.cumulativeMax, sessionId);
    }
  } catch (e) {
    console.warn("[Limits] Refresh failed:", e.message);
  }
}

function updateRecCounter(used, max, cumulativeUsed, cumulativeMax, sessionId) {
  const el = document.getElementById("recCounter");
  if (!el) return;
  // Monotonically non-decreasing guard: ignore stale responses (e.g. a
  // safety-net refresh from a prior recording that arrives after a newer
  // report, or a response from a previous session that was in flight when
  // the user cleared localStorage). Used can only grow within a UTC day
  // for a given session, so any value < the last-known is by definition
  // older and must not overwrite the UI. Also auto-reset on a new UTC
  // day or a session change so the count can start over.
  var today = new Date().toISOString().slice(0, 10);
  if (sessionId && _lastKnownRecordingsSessionId && sessionId !== _lastKnownRecordingsSessionId) {
    _lastKnownRecordingsUsed = -1;
  }
  if (_lastKnownRecordingsDate && _lastKnownRecordingsDate !== today) {
    _lastKnownRecordingsUsed = -1;
  }
  if (used < _lastKnownRecordingsUsed) {
    console.debug("[Limits] updateRecCounter: ignoring stale used=" + used + " (last known=" + _lastKnownRecordingsUsed + ")");
    return;
  }
  _lastKnownRecordingsUsed = used;
  _lastKnownRecordingsDate = today;
  _lastKnownRecordingsSessionId = sessionId || _lastKnownRecordingsSessionId;
  console.debug("[Limits] updateRecCounter:", JSON.stringify({ used, max, cumulativeUsed, cumulativeMax }));
  const remaining = max - used;
  const cumRemaining = Math.max(0, cumulativeMax - cumulativeUsed);
  if (remaining <= 0) {
    el.textContent = (typeof getI18nSync === "function" && getI18nSync("record.softHintDone")) || "More tomorrow 💛";
    el.className = "rec-counter exhausted";
  } else if (remaining <= 2) {
    el.textContent = (typeof getI18nSync === "function" && getI18nSync("record.softHint")) || "A few more today 💛";
    el.className = "rec-counter warn";
  } else {
    el.textContent = "";
    el.className = "rec-counter";
  }
}
const langSelEl = document.getElementById("langSel");
if (langSelEl) {
  langSelEl.addEventListener("change", (e) => {
    curLang = e.target.value;
    isRTL = false;
    updateCard();
    saveDraft();
    // Re-localize the Style chip summary to the new page language.
    setTimeout(updateStyleChipSummary, 100);
  });
}
// Speech language selector
function updateSlTrigger() {
  var t = document.getElementById('speechLangTrigger');
  if (!t) return;
  if (!speechLang) {
    t.innerHTML = '<span class="sl-nudge-label">' + ((typeof getI18nSync === 'function' && getI18nSync('speechLang.triggerLabel')) || 'Set language') + '</span> <span class="sl-arr"></span>';
    updateSlNudge();
    updateMicState();
    return;
  }
  t.classList.remove('sl-nudge');
  if (speechLang === "__native__") {
    t.innerHTML = '<i class="fi fi-xx"></i> <span>Native</span> <span class="sl-arr"></span>';
    updateMicState();
    return;
  }
  var lang = allLanguages.find(function(l){ return l.code === speechLang; });
  if (lang) {
    t.innerHTML = '<i class="fi fi-' + lang.flagCode + '"></i> <span>' + lang.label + '</span> <span class="sl-arr"></span>';
  }
  updateMicState();
}
function updateSlNudge() {
  var t = document.getElementById('speechLangTrigger');
  var sta = document.getElementById('sta');
  if (!t) return;
  if (!speechLang && sta && sta.value.trim().length > 0) {
    t.classList.add('sl-nudge');
  } else {
    t.classList.remove('sl-nudge');
  }
}
function updateMicState() {
  var b = document.getElementById('recBtn');
  var r = document.getElementById('langReminder');
  var s = document.getElementById('recSt');
  var sub = document.getElementById('recSub');
  if (!b) return;
  if (!speechLang) {
    b.classList.add('disabled');
    b.title = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.tooltipNoLang')) || 'Select a language to enable the mic');
    if (s) s.textContent = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.micDisabledNoLang')) || 'Mic disabled');
    if (sub) sub.textContent = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.subNoLang')) || 'Select a language to enable the mic');
    if (r) {
      r.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + ((typeof getI18nSync === 'function' && getI18nSync('speechLang.reminderEmpty')) || 'Select a language for speech detection');
      r.classList.add('show');
    }
  } else if (speechLang === "__native__") {
    b.classList.add('disabled');
    b.title = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.tooltipNative')) || 'Mic is currently disabled for native language');
    if (s) s.textContent = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.micDisabledNative')) || 'Mic disabled');
    if (sub) sub.textContent = ((typeof getI18nSync === 'function' && getI18nSync('speechLang.subNative')) || 'Choose a different language to speak');
    if (r) {
      r.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + ((typeof getI18nSync === 'function' && getI18nSync('speechLang.reminderNative')) || 'Unsupported languages are treated as the native language');
      r.classList.add('show');
    }
  } else {
    b.classList.remove('disabled');
    b.title = '';
    if (s) s.textContent = (typeof getI18nSync === 'function' && getI18nSync('record.status')) || 'Tap to speak';
    if (sub) sub.textContent = '';
    if (r) {
      r.classList.remove('show');
    }
  }
}
function openSlModal() {
  var m = document.getElementById('slModal');
  if (!m) return;
  m.classList.add('open');
  document.body.classList.add('modal-open');
  _activateModal(m);
  populateSlGrid();
}
function closeSlModal() {
  var m = document.getElementById('slModal');
  if (!m) return;
  _deactivateModal();
  m.classList.remove('open');
  document.body.classList.remove('modal-open');
  // Clear filter and show all items
  var filter = document.getElementById('slFilter');
  if (filter) { filter.value = ''; }
  document.querySelectorAll('#slGrid .sl-modal-item').forEach(function(i) { i.style.display = ''; });
}
function populateSlGrid() {
  var g = document.getElementById('slGrid');
  if (!g) return;
  g.innerHTML = '';
  var items = [];
  allLanguages.forEach(function(l){ items.push(l); });
  // Sort: English first, then by flagCode + label
  var countryNames = {
    'br':'Brazil','cn':'China','cz':'Czechia','de':'Germany','dk':'Denmark',
    'es':'Spain','fi':'Finland','fr':'France','gr':'Greece','hu':'Hungary',
    'id':'Indonesia','il':'Israel','in':'India','ir':'Iran','it':'Italy',
    'jp':'Japan','kr':'South Korea','lk':'Sri Lanka','mm':'Myanmar',
    'my':'Malaysia','nl':'Netherlands','np':'Nepal','ph':'Philippines',
    'pk':'Pakistan','pl':'Poland','ru':'Russia','sa':'Saudi Arabia',
    'se':'Sweden','th':'Thailand','tr':'Turkey','ua':'Ukraine',
    'us':'United States','uz':'Uzbekistan','vn':'Vietnam'
  };
  items.sort(function(a, b) {
    if (a.code === 'en') return -1;
    if (b.code === 'en') return 1;
    var ca = countryNames[a.flagCode] || a.flagCode;
    var cb = countryNames[b.flagCode] || b.flagCode;
    var cc = ca.localeCompare(cb);
    if (cc !== 0) return cc;
    return a.label.localeCompare(b.label);
  });
  items.forEach(function(l){
    var d = document.createElement('div');
    d.className = 'sl-modal-item' + (speechLang === l.code ? ' selected' : '');
    d.dataset.code = l.code || '';
    var flag = (l.flagCode || 'us').toLowerCase();
    var nativeHtml = '';
    if (l.code === 'en') {
      nativeHtml = '<span class="sl-native">International</span>';
    } else if (l.code === 'tl' || (l.nativeName && l.nativeName !== l.label)) {
      nativeHtml = '<span class="sl-native">' + l.nativeName + '</span>';
    }
    d.innerHTML = '<span class="fi fi-' + flag + '"></span><span class="sl-label"><span class="sl-en">' + l.label + '</span>' + nativeHtml + '</span>';
    d.addEventListener('click', function(){
      if (this.dataset.code === speechLang) {
        speechLang = "";
        try { localStorage.removeItem('wsSpeechLang'); } catch(_e){}
        updateSlTrigger();
        closeSlModal();
        updateCard();
        saveDraft();
        return;
      }
      speechLang = this.dataset.code;
      try { localStorage.setItem('wsSpeechLang', speechLang); } catch(_e){}
      updateSlTrigger();
      closeSlModal();
      updateCard();
      saveDraft();
    });
    g.appendChild(d);
  });
  // Native (unsupported languages) item — insert after English (first child)
  var nd = document.createElement('div');
  nd.className = 'sl-modal-item' + (speechLang === '__native__' ? ' selected' : '');
  nd.dataset.code = '__native__';
  nd.innerHTML = '<i class="fi fi-xx"></i><span class="sl-label"><span class="sl-en">Native</span><span class="sl-native">Unsupported</span></span>';
  nd.addEventListener('click', function(){
    if (speechLang === '__native__') {
      speechLang = "";
      try { localStorage.removeItem('wsSpeechLang'); } catch(_e){}
      updateSlTrigger();
      closeSlModal();
      updateCard();
      saveDraft();
      return;
    }
    speechLang = '__native__';
    try { localStorage.setItem('wsSpeechLang', '__native__'); } catch(_e){}
    updateSlTrigger();
    closeSlModal();
    updateCard();
    saveDraft();
  });
  var first = g.firstChild;
  if (first && first.nextSibling) {
    g.insertBefore(nd, first.nextSibling);
  } else {
    g.appendChild(nd);
  }
}
document.getElementById('speechLangTrigger').addEventListener('click', function(){ openSlModal(); });
document.getElementById('slClose').addEventListener('click', function(){ closeSlModal(); });
document.getElementById('slBackdrop').addEventListener('click', function(){ closeSlModal(); });
// Speech-language modal live filter
var _slFilterTimer = null;
document.getElementById('slFilter').addEventListener('input', function() {
  clearTimeout(_slFilterTimer);
  var q = this.value.toLowerCase().trim();
  _slFilterTimer = setTimeout(function() {
    document.querySelectorAll('#slGrid .sl-modal-item').forEach(function(item) {
      var label = item.querySelector('.sl-en');
      var native = item.querySelector('.sl-native');
      var code = item.dataset.code || '';
      var matches = !q || (label && label.textContent.toLowerCase().indexOf(q) !== -1) ||
        (native && native.textContent.toLowerCase().indexOf(q) !== -1) || code.indexOf(q) !== -1;
      item.style.display = matches ? '' : 'none';
    });
  }, 150);
});
// init trigger
if (typeof allLanguages !== 'undefined' && allLanguages.length) { updateSlTrigger(); updateMicState(); }
document.addEventListener('languagesReady', function(){ updateSlTrigger(); updateMicState(); });

document.getElementById("toneRow").addEventListener("click", async (e) => {
  const c = e.target.closest(".tc");
  if (!c || c.disabled) return;
  if (!hasCardContent()) return;

  const tone = c.dataset.tone;

  // Original tone — restore original text if we had a pending rewrite
  if (tone === "original") {
    if (window._originalText) {
      document.getElementById("sta").value = window._originalText;
      window._originalText = null;
    }
    if (window._pendingRewrite) {
      window._pendingRewrite = null;
      window._rewriteConfirmed = false;
      hideRewritePreview();
    }
    applyTone(tone);
    updateCard();
    saveDraft();
    return;
  }

  // If there's a pending rewrite from a previous tone, clear it
  if (window._pendingRewrite) {
    window._pendingRewrite = null;
    window._rewriteConfirmed = false;
    hideRewritePreview();
  }

  // Non-original tone — call rewrite API
  const text = document.getElementById("sta").value.trim();
  if (!text) return;
  const cardText = document.getElementById("cardText");

  // Check if Pro user (skip limit check)
  const isPro = isSupporter();
  if (!isPro && getRewritesLeftForTone(tone) <= 0) {
    const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + tone) : tone;
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.dailyRewritesUsed").replace("{tone}", toneLabel.toLowerCase())) || "Out of " + toneLabel.toLowerCase() + " today");
    applyTone("original");
    updateCard();
    saveDraft();
    return;
  }

  // Return cached result if available for this tone with matching source text
  const cached = rewriteCache[tone];
  if (cached && cached.original === text) {
    cardText.textContent = cached.text;
    cardText.classList.remove("mt");
    applyTone(tone);
    updateCard(true);
    window._originalText = text;
    window._pendingRewrite = cached.text;
    window._rewriteConfirmed = false;
    showRewritePreview(text, cached.text, tone);
    return;
  }

  // Show loading state on card
  const prevText = cardText.textContent;
  const rewritingLabel = typeof getI18nSync === "function" ? getI18nSync("tone.rewriting") : "Rewriting...";
  cardText.textContent = rewritingLabel;
  cardText.classList.add("mt");

  try {
    let sessionId = localStorage.getItem("wsSessionId");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wsSessionId", sessionId);
    }
    const controller = new AbortController();
    // Client timeout must exceed the server's 20s OpenRouter timeout so the
    // server's own success/error response always reaches us before we abort.
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tone, sessionId, proKey: sessionStorage.getItem("wsProKey") || null }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json();
      if (res.status === 429) {
        // Server tells us which tone is exhausted and the authoritative count.
        const errTone = err.tone || tone;
        if (typeof err.used === "number") {
          setToneUsed(errTone, err.used);
        }
        const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + errTone) : errTone;
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.dailyRewritesUsed").replace("{tone}", toneLabel.toLowerCase())) || "Out of " + toneLabel.toLowerCase() + " today");
        applyTone("original");
      } else {
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.rewriteFailed")) || "Rewrite failed");
        applyTone(tone);
      }
      cardText.textContent = prevText;
      cardText.classList.remove("mt");
      updateCard();
      saveDraft();
      return;
    }

    const data = await res.json();
    // Preview-only: no counter change. The actual tick happens in
    // /api/rewrite-confirm when the user Accepts or Creates the card.
    // Store original text so we can restore it
    window._originalText = text;
    // Store the rewritten text as pending
    window._pendingRewrite = data.text;
    // The rewrite has NOT been confirmed yet — it will be confirmed on Accept
    // (or auto-confirmed on Create if the user skips Accept).
    window._rewriteConfirmed = false;
    // Show rewritten text on card preview only
    cardText.textContent = data.text;
    cardText.classList.remove("mt");
    applyTone(tone);
    updateCard(true);
    saveDraft();
    // Show accept/cancel preview bar
    showRewritePreview(text, data.text, tone);
    // Cache the result so returning to this tone skips the API
    rewriteCache[tone] = { text: data.text, original: text };
  } catch (err) {
    console.error("[Rewrite] Error:", err);
    if (err.name === "AbortError") {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.rewriteTimedOut")) || "Rewrite timed out");
    } else {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.rewriteFailed")) || "Rewrite failed");
    }
    cardText.textContent = prevText;
    cardText.classList.remove("mt");
    applyTone(tone);
    updateCard();
    saveDraft();
  }
});
document.getElementById("palRow").addEventListener("click", (e) => {
  const d = e.target.closest(".pd");
  if (!d) return;
  if (!hasCardContent()) return;
  applyPal(parseInt(d.dataset.p));
  saveDraft();
});
document.getElementById("palRow").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const d = e.target.closest(".pd");
  if (!d) return;
  e.preventDefault();
  if (!hasCardContent()) return;
  applyPal(parseInt(d.dataset.p));
  saveDraft();
});
document.getElementById("roundnessRow").addEventListener("click", (e) => {
  const b = e.target.closest(".sz");
  if (!b) return;
  if (!hasCardContent()) return;
  document
    .querySelectorAll("#roundnessRow .sz")
    .forEach((r) => r.classList.remove("on"));
  b.classList.add("on");
  useRounded = b.dataset.rounded === "true";
  const card = document.getElementById("card");
  if (useRounded) {
    card.style.borderRadius = "32px";
    card.style.overflow = "hidden";
  } else {
    card.style.borderRadius = "0";
    card.style.overflow = "hidden";
  }
  saveDraft();
  applyPal(curP);
});
// Start placeholder cycling after examples load
(function _initPhCycle() {
  var check = function() {
    if (window._examplePrompts && window._examplePrompts.length) { _startPlaceholderCycle(); return; }
    setTimeout(check, 1000);
  };
  setTimeout(check, 2000);
})();
// Cycling placeholder in textarea
var _phTimer = null;
function _startPlaceholderCycle() {
  _stopPlaceholderCycle();
  var sta = document.getElementById("sta");
  if (!sta || sta.value.length > 0 || !window._examplePrompts || !window._examplePrompts.length) return;
  var prompts = window._examplePrompts;
  var idx = Math.floor(Math.random() * prompts.length);
  sta.placeholder = prompts[idx];
  _phTimer = setInterval(function() {
    idx = (idx + 1) % prompts.length;
    sta.placeholder = prompts[idx];
  }, 5000);
}
function _stopPlaceholderCycle() {
  if (_phTimer) { clearInterval(_phTimer); _phTimer = null; }
}
let _dc;
document.getElementById("sta").addEventListener("input", (e) => {
  rewriteCache = {};
  // No auto-switch to "voice" for text input (paste, type, dictate).
  // Only the mic recording path in finishRec() sets inputSource = "voice".
  // User can manually toggle via the source label.
  if (voiceAttached && (e.data || "").length > 0) {
    voiceAttached = false;
    var vt = document.getElementById("voiceToggle");
    if (vt) vt.checked = false;
    showToast(typeof getI18nSync === "function" ? getI18nSync("voice.textChanged") : "Voice removed");
    updateVoiceBar();
  }
  _webmCache = null;
  _pngCache = null;
  const ta = e.target;
  const cleaned = stripControls(ta.value);
  if (cleaned !== ta.value) { const pos = ta.selectionStart; ta.value = cleaned; ta.setSelectionRange(pos, pos); }
  clearTimeout(_dc);
  _dc = setTimeout(function() { updateCard(); saveDraft(); updateSlNudge(); updateMicState(); _updateResetBtnVisibility(); }, 50);
  _stopPlaceholderCycle();
  _updateResetBtnVisibility();
});
document.getElementById("sta").addEventListener("paste", () => {
  rewriteCache = {};
  _webmCache = null;
  _pngCache = null;
  inputSource = "story";
  setTimeout(function() { updateCard(); saveDraft(); updateSlNudge(); updateMicState(); _updateResetBtnVisibility(); }, 50);
});
document.getElementById("nin").addEventListener("input", function() {
  this.value = stripControls(this.value)
    .replace(/[^\p{L}\p{M}\p{N}\s\-'.()À-ɏ]/gu, "")
    .slice(0, 20);
  saveDraft();
  _updateResetBtnVisibility();
});
document.getElementById("sta").addEventListener("paste", () => {
  rewriteCache = {};
  _webmCache = null;
  _pngCache = null;
  inputSource = "story";
  setTimeout(function() { updateCard(); saveDraft(); updateSlNudge(); updateMicState(); }, 50);
});
document.getElementById("nin").addEventListener("input", function() {
  this.value = stripControls(this.value)
    .replace(/[^\p{L}\p{M}\p{N}\s\-'.()À-ɏ]/gu, "")
    .slice(0, 20);
  updateCard();
  saveDraft();
});
document.getElementById("sta").addEventListener("focus", _stopPlaceholderCycle);
document.getElementById("sta").addEventListener("blur", function() { if (!this.value.length) setTimeout(_startPlaceholderCycle, 2000); });
document.getElementById("resetBtn").addEventListener("click", () => {
  rewriteCache = {};
  if (isRec) {
    isRec = false;
    if (usingDeepgram) {
      stopDeepgramRecording().then((result) => {
        fullTx = result.text ? result.text.trim().slice(0, 150) : "";
        if (!fullTx) showToast((typeof getI18nSync === "function" && getI18nSync("toasts.silence")) || "Didn't catch that");
        const actualDuration = finishRec();
        reportRecordingDuration(actualDuration || result.duration);
      });
    } else {
      if (recogTimeout) {
        clearTimeout(recogTimeout);
        recogTimeout = null;
      }
      if (recog) recog.stop();
      const actualDuration = finishRec();
      reportRecordingDuration(actualDuration);
    }
    fullTx = "";
    document.getElementById("recBtn").classList.remove("on");
    document.getElementById("recSt").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
    document.getElementById("recSub").textContent =
      (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
    document.getElementById("recSub").classList.remove("live");
  }
  document.getElementById("sta").value = "";
  document.getElementById("nin").value = "";
  inputSource = "story";
  userOverride = false;
  // Do NOT reset language — keep user's selection
  audioBlob = null;
  _cardWaveform = null;
  voiceAttached = false;
  audioDurationSec = 0;
  cardReady = false;
  sessionStorage.removeItem("wisprDraft");
  document.getElementById("btnS").disabled = true;
  document.getElementById("wcta").classList.remove("show");
  applyTone("original");
  useRounded = true;
  const card = document.getElementById("card");
  card.style.borderRadius = "32px";
  card.style.overflow = "hidden";
  document.querySelectorAll("#roundnessRow .sz").forEach(function(r) {
    r.classList.toggle("on", r.dataset.rounded === "true");
  });
  applyPal(0);
  applySize();
  document.getElementById("cardGhost").innerHTML = '\u201C';
  updateCard();
  updateSlNudge();
  updateMicState();
  updateMobileBar();
  updateVoiceBar();
  _updateResetBtnVisibility();
});
// Voice toggle
document.getElementById("voiceToggle").addEventListener("change", function() {
  voiceAttached = this.checked;
  updateCard();
  saveDraft();
  showToast(voiceAttached ? (typeof getI18nSync === "function" ? getI18nSync("voice.attached") : "Voice added") : (typeof getI18nSync === "function" ? getI18nSync("voice.detached") : "Voice removed"));
});
// Voice play button
document.getElementById("voicePlayBtn").addEventListener("click", function() {
  if (!audioBlob) return;
  if (this.classList.contains("playing")) {
    this.classList.remove("playing");
    this.textContent = "\u25B6";
    if (window._voiceAudio) { window._voiceAudio.pause(); window._voiceAudio = null; }
    return;
  }
  var url = URL.createObjectURL(audioBlob);
  var audio = new Audio(url);
  window._voiceAudio = audio;
  audio.onended = function() {
    this.classList.remove("playing");
    this.textContent = "\u25B6";
    URL.revokeObjectURL(url);
    window._voiceAudio = null;
  }.bind(this);
  audio.onerror = function() {
    this.classList.remove("playing");
    this.textContent = "\u25B6";
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.playbackFailed")) || "Can't play");
  }.bind(this);
  audio.play().then(function() {
    this.classList.add("playing");
    this.textContent = "\u23F8";
  }.bind(this)).catch(function() {
    this.classList.remove("playing");
    this.textContent = "\u25B6";
  }.bind(this));
});
// Re-record — re-triggers the mic without consuming a daily slot
document.getElementById("voiceReRecordBtn")?.addEventListener("click", () => {
  if (isRec) return;
  if (!audioBlob) return;
  _webmCache = null;
  _pngCache = null;
  _skipDurationReport = true;
  document.getElementById("recBtn").click();
});
// Restore card from draft or shared URL
var restored = false;
// Tap source label to toggle between Voice and Story
// voiceLabel is display-only — inputSource is set automatically:
// recording → "voice", typing/paste/examples → "story".
if (location.hash && location.hash.length > 1) {
  var params = new URLSearchParams(location.hash.slice(1));
  var hText = params.get("text");
  var hName = params.get("name");
  var hTone = params.get("tone");
  var hP = params.get("p");
  inputSource = "story";
  if (hText) document.getElementById("sta").value = stripControls([...hText].slice(0, 150).join(""));
  if (hName) document.getElementById("nin").value = stripControls([...hName].slice(0, 20).join(""));
  if (hTone) applyTone(hTone);
  if (hP != null) applyPal(parseInt(hP));
  if (hText) { updateCard(); cardReady = true; document.getElementById("btnS").disabled = false; document.getElementById("wcta").classList.add("show"); document.getElementById("dlBtn").style.display = "block"; restored = true; }
  updateSlNudge();
  updateMicState();
}
if (!restored) {
  if (loadDraft()) restored = true;
  if (!restored) {
    applyPal(curP);
    updateCard();
  }
}
// After all draft/URL restoration completes, sync Start Over visibility to
// whatever content is now in the form (Smart Show), and auto-heal the
// recording counter from the server so the UI matches the source of truth.
if (typeof _updateResetBtnVisibility === "function") _updateResetBtnVisibility();
// Reset monotonic counter guard on page load so a new session can start
// from 0. The auto-heal fetch below will set the real value.
_lastKnownRecordingsUsed = -1;
if (typeof _refreshLimitsFromServer === "function") _refreshLimitsFromServer();
updateSupporterBadge();
// Sync per-tone rewrite counts from the server on page load. Without this,
// a user who clears localStorage would see "5 left" for every tone even
// after actually using all 5. The server is the source of truth; this call
// just refreshes the localStorage mirror to match.
syncToneCountsFromServer();
function syncToneCountsFromServer() {
  var sessionId = localStorage.getItem("wsSessionId");
  if (!sessionId) return;
  var proKey = sessionStorage.getItem("wsProKey") || "";
  var url = "/api/rewrite-status?sessionId=" + encodeURIComponent(sessionId);
  if (proKey) url += "&proKey=" + encodeURIComponent(proKey);
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (!data || !data.counts) return;
    for (var tone in data.counts) {
      if (Object.prototype.hasOwnProperty.call(data.counts, tone)) {
        setToneUsed(tone, data.counts[tone]);
      }
    }
    if (typeof curTone === "string" && curTone) applyTone(curTone);
  }).catch(function() { /* ignore — fallback to localStorage mirror */ });
}
// Warm the full card-bg WebP cache during idle time so ratio/corner switches
// later in the session are instant. Falls back to setTimeout where requestIdleCallback
// isn't supported (e.g. older Safari).
(function schedulePreloadAll() {
  var run = function() { preloadAllCardBgs(); };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 1500);
  }
})();
try {
  var draft = JSON.parse(sessionStorage.getItem("wisprDraft") || "null");
  if (draft && draft.text && draft.text.trim()) {
    if (!cardReady) {
      cardReady = true;
      document.getElementById("btnS").disabled = false;
      document.getElementById("wcta").classList.add("show");
      document.getElementById("dlBtn").style.display = "";
    }
  }
} catch(e) {}
// Smart Show: after page load, reveal Start Over only if a draft has content.
if (typeof _updateResetBtnVisibility === "function") _updateResetBtnVisibility();

// Unified mobile sticky bar: Create+Share left, Rewrites+Upgrade right
function updateMobileBar() {
  var bar = document.getElementById("mobileBar");
  if (!bar) return;
  var isMobile = window.innerWidth <= 720;
  if (!isMobile) {
    bar.style.display = "none";
    document.body.classList.remove("has-mobile-bar");
    return;
  }
  bar.style.display = "flex";
  document.body.classList.add("has-mobile-bar");

  // Left group: always visible
  var shareBtn = document.getElementById("mobileBtnS");
  if (shareBtn) shareBtn.disabled = !cardReady;

  // Right group: show only when a styled tone is selected or limit reached
  var rightGroup = document.getElementById("mobileBarRight");
  var rewriteText = document.getElementById("mobileRewriteText");
  if (!rightGroup || !rewriteText) return;

  // Mobile bar reflects the currently selected tone's remaining count.
  var limitReached = !isSupporter() && curTone !== "original" && getRewritesLeftForTone(curTone) === 0;
  var isStyled = curTone !== "original";

  if (isStyled || limitReached) {
    rightGroup.style.display = "flex";
    if (isSupporter()) {
      rewriteText.innerHTML = '<span class="rewrite-count">\u221E</span><span class="rewrite-label">Unlimited</span>';
      rewriteText.className = "mobile-bar-rewrite-text";
    } else if (limitReached) {
      rewriteText.innerHTML = '<span class="rewrite-count">0</span><span class="rewrite-label">try another tone</span>';
      rewriteText.className = "mobile-bar-rewrite-text exhausted";
    } else {
      var left = getRewritesLeftForTone(curTone);
      rewriteText.innerHTML = '<span class="rewrite-count">' + left + '</span><span class="rewrite-label">rewrite' + (left === 1 ? "" : "s") + ' left</span>';
      rewriteText.className = "mobile-bar-rewrite-text";
    }
  } else {
    rightGroup.style.display = "none";
  }
}
window.addEventListener("resize", updateMobileBar);

// Auto-detect language from browser on first load (no UI dropdown).
// Only switches to a language we actually translate (I18N_DISPLAY_LANGS);
// any other browser language falls back to English so the page never loads
// in a half-translated state.
function tryAutoDetectLang() {
  const saved = sessionStorage.getItem("wisprDraft");
  if (saved) return; // respect saved draft language
  if (typeof allLanguages === "undefined" || !allLanguages.length) return; // not loaded yet
  const i18nList = window.I18N_DISPLAY_LANGS || ["en"];
  const navLang = navigator.language || "en";
  const tryCodes = [navLang, navLang.split("-")[0]];
  for (const code of tryCodes) {
    if (i18nList.indexOf(code) !== -1 && allLanguages.find((l) => l.code === code)) {
      curLang = code;
      isRTL = false;
      window.setLanguageByCode(code);
      return;
    }
  }
  curLang = "en";
  isRTL = false;
  window.setLanguageByCode("en");
}
tryAutoDetectLang();
document.addEventListener("languagesReady", tryAutoDetectLang);

// Re-validate Pro key on load
async function revalidateProKey() {
  const storedKey = sessionStorage.getItem("wsProKey");
  if (!storedKey) return;

  try {
    const res = await fetch("/api/pro-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storedKey }),
    });
    const data = await res.json();

    if (data.isPro) {
      localStorage.setItem("wsSupporter", "true");
      updateSupporterBadge();
    } else {
      localStorage.removeItem("wsSupporter");
      sessionStorage.removeItem("wsProKey");
      updateSupporterBadge();
    }
  } catch (e) {
    console.warn("[Pro] Re-validation failed:", e.message);
  }
}
revalidateProKey();

// Onboarding Banner — first-launch detection + help icon trigger
function showOnboarding() {
  document.getElementById("onboardingOverlay").classList.add("show");
  document.body.classList.add("modal-open");
}
function hideOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  overlay.classList.remove("show");
  document.body.classList.remove("modal-open");
  localStorage.setItem("wsOnboardingSeen", "true");
}

// Show onboarding on first launch
if (!localStorage.getItem("wsOnboardingSeen")) {
  // Delay slightly so page renders first
  setTimeout(showOnboarding, 800);
}



// Dismiss buttons
document.getElementById("onboardingClose")?.addEventListener("click", hideOnboarding);
document.getElementById("onboardingGotIt")?.addEventListener("click", hideOnboarding);

// Close on backdrop click
document.getElementById("onboardingOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideOnboarding();
});

// Update bar/pill display when crossing mobile breakpoint on resize
var _prevMobile = window.innerWidth <= 720;
window.addEventListener("resize", function() {
  var _nowMobile = window.innerWidth <= 720;
  if (_nowMobile !== _prevMobile) { _prevMobile = _nowMobile; applyTone(curTone); }
});

document.querySelector(".nav-brand")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (window.innerWidth <= 720) {
    document.querySelector(".card-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("card").scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
document.getElementById("themeToggle")?.addEventListener("click", function() {
  document.documentElement.classList.toggle("dark");
  var isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  this.setAttribute("aria-pressed", isDark ? "true" : "false");
  this.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function applyWaveText(textEl) {
  if (prefersReducedMotion) return;
  if (!textEl || textEl.dataset.waveInit) return;
  const text = textEl.textContent;
  // Disable wave animation for scripts that have consonant/vowel splitting issues
  // (Indic, CJK, Arabic, Hebrew, Thai, Myanmar, Korean, Japanese)
  // Allow em dashes, accented Latin, and other common punctuation to animate
  if (/[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text)) return;
  textEl.dataset.waveText = text;
  textEl.innerHTML = "";
  textEl.dataset.waveInit = "true";
  let charIdx = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      textEl.appendChild(document.createTextNode(" "));
    } else {
      const span = document.createElement("span");
      span.textContent = text[i];
      span.style.display = "inline-block";
      span.style.animation = "wave-letter 0.7s ease-in-out " + (charIdx * 0.05) + "s 1";
      textEl.appendChild(span);
      charIdx++;
    }
  }
}
function resetWaveText(textEl, fallback) {
  if (textEl && textEl.dataset.waveInit) {
    textEl.textContent = fallback || textEl.dataset.waveText || "";
    delete textEl.dataset.waveInit;
  }
}
function isMobile() {
  return window.innerWidth <= 720;
}
function bindHoverWave(root) {
  if (isMobile()) return;
  (root || document).querySelectorAll(".wave-on-hover").forEach((el) => {
    if (el.dataset.waveBound) return;
    el.dataset.waveBound = "true";
    el.dataset.waveText = el.textContent;
    el.addEventListener("mouseenter", () => applyWaveText(el));
    el.addEventListener("mouseleave", () => resetWaveText(el));
    el.addEventListener("focus", () => applyWaveText(el));
    el.addEventListener("blur", () => resetWaveText(el));
  });
  (root || document).querySelectorAll(".wave-trigger").forEach((el) => {
    if (el.dataset.waveTriggerBound) return;
    const target = el.querySelector("[data-wave-child]");
    if (!target) return;
    el.dataset.waveTriggerBound = "true";
    target.dataset.waveText = target.textContent;
    el.addEventListener("mouseenter", () => applyWaveText(target));
    el.addEventListener("mouseleave", () => resetWaveText(target));
    el.addEventListener("focusin", () => applyWaveText(target));
    el.addEventListener("focusout", () => resetWaveText(target));
  });
}
const style = document.createElement("style");
style.textContent = `@keyframes wave-letter{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@media (prefers-reduced-motion: reduce){.wave-on-hover span,[data-wave-child] span,.btn-c-text span{animation:none!important;transform:none!important}}@media (max-width:720px){.wave-on-hover span,[data-wave-child] span,.btn-c-text span{animation:none!important;transform:none!important}}`;
document.head.appendChild(style);
if (!isMobile()) {
  document.getElementById("btnC").addEventListener("mouseenter", () =>
    applyWaveText(document.querySelector(".btn-c-text")),
  );
  document.getElementById("btnC").addEventListener("mouseleave", () => {
    const textEl = document.querySelector(".btn-c-text");
    resetWaveText(textEl);
  });
  document.getElementById("btnC").addEventListener("focus", () =>
    applyWaveText(document.querySelector(".btn-c-text")),
  );
  document.getElementById("btnC").addEventListener("blur", () => {
    const textEl = document.querySelector(".btn-c-text");
    resetWaveText(textEl);
  });
}
bindHoverWave(document);

// Re-bind wave animations when resizing from mobile to desktop
let _wavePrevMobile = window.innerWidth <= 720;
window.addEventListener("resize", () => {
  const _nowMobile = window.innerWidth <= 720;
  if (_wavePrevMobile && !_nowMobile) {
    bindHoverWave(document);
  }
  _wavePrevMobile = _nowMobile;
});

// Re-localize dynamic speech-lang trigger + mic state when page language changes
window.addEventListener("i18nApplied", function() {
  updateSlTrigger();
  updateMicState();
});

// Examples
document.getElementById("exGrid").addEventListener("click", (e) => {
  const c = e.target.closest(".ec");
  if (!c) return;
  inputSource = "story";
  document.getElementById("sta").value = (c.dataset.text || "").slice(0, 150);
  document.getElementById("nin").value = [...(c.dataset.name || "")].slice(0, 18).join("");
  if (c.dataset.tone) {
    const tone = c.dataset.tone;
    if (tone !== "original" && !isSupporter() && getRewritesLeftForTone(tone) === 0) {
      applyTone("original");
      const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + tone) : tone;
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.dailyRewritesUsed").replace("{tone}", toneLabel.toLowerCase())) || "Out of " + toneLabel.toLowerCase() + " today");
    } else {
      applyTone(tone);
    }
  }
  if (c.dataset.p != null) applyPal(parseInt(c.dataset.p));
  if (c.dataset.lang) {
    // Set the CARD's content language (affects font selection and card label)
    // without touching the page UI language. The page language stays on the
    // user's chosen locale; only the card display language follows the example.
    curLang = c.dataset.lang;
    isRTL = false;
  }
  updateCard();
  updateMicState();
  cardReady = true;
  document.getElementById("btnS").disabled = false;
  document.getElementById("wcta").classList.add("show");
  document.getElementById("dlBtn").style.display = "";
  if (window.innerWidth <= 720) {
    document.querySelector(".card-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("card").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  updateMobileBar();
});

// Create card
document.getElementById("btnC").addEventListener("click", async () => {
  _vibrate();
  const btn = document.getElementById("btnC");
  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => btn.disabled = false, 400);
  const text = document.getElementById("sta").value.trim();
  if (text.replace(/\s/g, "").length < 2) {
    const ta = document.getElementById("sta");
    ta.style.borderColor = "rgba(26,26,26,.3)";
    ta.focus();
    setTimeout(() => (ta.style.borderColor = ""), 1400);
    /* removed: speak first toast */
    return;
  }
  const check = canCreateCard();
  if (!check.ok) {
    showToast(check.msg);
    return;
  }
  // If the user picked a tone and skipped Accept, auto-commit the rewrite
  // so the per-tone counter ticks. The rewrite is "used" the moment a
  // card is created with it — previewing then cancelling is free.
  if (window._pendingRewrite && !window._rewriteConfirmed && curTone !== "original") {
    const result = await confirmRewrite(curTone);
    if (!result.ok) {
      const toneLabel = typeof getI18nSync === "function" ? getI18nSync("tone." + curTone) : curTone;
      const msg = result.status === 429
        ? ((typeof getI18nSync === "function" && getI18nSync("toasts.dailyRewritesUsed").replace("{tone}", toneLabel.toLowerCase())) || "Out of " + toneLabel.toLowerCase() + " today")
        : ((typeof getI18nSync === "function" && getI18nSync("toasts.rewriteFailed")) || "Rewrite failed");
      showToast(msg);
      if (window._originalText) {
        document.getElementById("sta").value = window._originalText;
      }
      window._pendingRewrite = null;
      window._rewriteConfirmed = false;
      window._originalText = null;
      hideRewritePreview();
      applyTone("original");
      updateCard();
      saveDraft();
      btn.disabled = false;
      return;
    }
    if (typeof result.used === "number") {
      setToneUsed(curTone, result.used);
    }
    window._rewriteConfirmed = true;
  }
  // The per-tone counter is now authoritative on the server (via confirm
  // above for non-original tones, or unchanged for original). Mirror the
  // current state in localStorage so the UI reflects the same count.
  applyTone(curTone);
  trackCardUsage();
  updateCard();
  const card = document.getElementById("card");
  card.style.transition =
    "transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .7s";
  card.style.transform = "scale(1.025)";
  card.style.boxShadow = "0 32px 80px rgba(0,0,0,.22), 0 0 60px rgba(245,158,11,0.35)";
  setTimeout(() => {
    card.style.transform = "";
    card.style.boxShadow = "";
  }, 720);
  cardReady = true;
  document.getElementById("btnS").disabled = false;
  document.getElementById("wcta").classList.add("show");
  const dl = document.getElementById("dlBtn");
  dl.style.display = "";
  updateMobileBar();
  setTimeout(() => {
    if (window.innerWidth <= 720) {
      document.querySelector(".card-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 120);
  const btnCTxt = document.getElementById("btnCTxt");
  const origText = btnCTxt.textContent;
  const btnCEl = document.getElementById("btnC");
  btnCEl.classList.add("created");
  btnCTxt.textContent = "\ud83d\udc9b Beautiful!";
  setTimeout(() => {
    btnCEl.classList.remove("created");
    btnCTxt.textContent = origText;
  }, 1500);
});

// Download helpers -- PNG only
async function _downloadPngOnly() {
  await window.ensureHtml2canvas();
  await document.fonts.ready;
  const pngBlob = await generateBlobWithProgress();
  var a = document.createElement("a");
  a.download = "wispr-story.png";
  a.href = URL.createObjectURL(pngBlob);
  a.click();
  URL.revokeObjectURL(a.href);
  showToast((typeof getI18nSync === "function" && getI18nSync("toasts.downloaded")) || "Saved ✓");
}
// Download helpers -- WebM only (no PNG)
async function _downloadWebmWithAudio() {
  await window.ensureHtml2canvas();
  await document.fonts.ready;
  showExportProgress();
  try {
    _setExportStage("Rendering card…");
    var webmBlob = await generateWebm();
    if (!webmBlob || !webmBlob.size) {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceEmpty")) || "Voice empty");
      return;
    }
    var v = document.createElement("a");
    v.download = "wispr-story.webm";
    v.href = URL.createObjectURL(webmBlob);
    v.click();
    URL.revokeObjectURL(v.href);
    showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmDone") : "Voice saved ✓");
  } catch (webmErr) {
    console.error("[WebM]", webmErr);
    if (webmErr && /0 bytes/.test(webmErr.message || "")) {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceEmpty")) || "Voice empty");
    } else {
      showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmFailed") : "Voice export failed");
    }
  } finally {
    hideExportProgress();
  }
}
// Download choice modal
document.getElementById("dlChoicePng")?.addEventListener("click", async () => {
  hideDownloadChoice();
  const btn = document.getElementById("dlBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting\u2026';
  try { await _downloadPngOnly(); _flashDlBtn(btn); } catch(e) { btn.innerHTML = '<i class="fas fa-download"></i> Download card'; }
});
document.getElementById("dlChoiceWebm")?.addEventListener("click", async () => {
  hideDownloadChoice();
  const btn = document.getElementById("dlBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting\u2026';
  try { await _downloadWebmWithAudio(); _flashDlBtn(btn); } catch(e) { btn.innerHTML = '<i class="fas fa-download"></i> Download card'; }
});
document.getElementById("dlChoiceClose")?.addEventListener("click", hideDownloadChoice);
document.getElementById("dlChoiceBackdrop")?.addEventListener("click", hideDownloadChoice);
function _formatSize(bytes) {
  if (!bytes || bytes < 1) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
function _estPngSize() {
  if (_pngCache && _pngCache.blob) return _pngCache.blob.size;
  var txt = (document.getElementById("sta").value || "").length;
  return Math.round(150 + txt * 1.5); // rough estimate
}
function showDownloadChoice() {
  // Update size estimates
  var pngSize = _estPngSize();
  var pngEl = document.getElementById("dlChoicePng");
  var webmSize = audioBlob ? audioBlob.size + 80000 : 0; // 80KB video overhead
  pngEl.innerHTML = '&#128247; Download PNG <small class="dl-est">' + _formatSize(pngSize) + ' &middot; ~2s</small>';
  var webmEl = document.getElementById("dlChoiceWebm");
  webmEl.innerHTML = '&#127916; Download WebM <small class="dl-est">' + _formatSize(webmSize) + ' &middot; ~3-6s</small>';
  document.getElementById("dlChoice").classList.add("open");
  document.body.classList.add("modal-open");
  _activateModal(document.getElementById("dlChoice"));
}
function hideDownloadChoice() { _deactivateModal(); document.getElementById("dlChoice").classList.remove("open"); document.body.classList.remove("modal-open"); }
function _flashDlBtn(btn) {
  btn.classList.add("success");
  btn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
  setTimeout(function() {
    btn.classList.remove("success");
    btn.innerHTML = '<i class="fas fa-download"></i> Download card';
  }, 1500);
}

// Download
document.getElementById("dlBtn").addEventListener("click", async () => {
  if (!cardReady) { document.getElementById("btnC").click(); return; }
  if (voiceAttached && audioBlob && webmCodecString) {
    showDownloadChoice();
    return;
  }
  const btn = document.getElementById("dlBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting\u2026';
  try { await _downloadPngOnly(); _flashDlBtn(btn); } catch(e) { btn.innerHTML = '<i class="fas fa-download"></i> Download card'; }
});

// Unified mobile bar buttons mirror inline buttons
document.getElementById("mobileBtnC")?.addEventListener("click", () => {
  document.getElementById("btnC").click();
});
document.getElementById("mobileBtnS")?.addEventListener("click", () => {
  document.getElementById("btnS").click();
});

// Share modal
let _shareBlob = null;
let _shareSocialBlob = null;
let _shortId = null;

// Build a 1080×1920 (9:16) social image: the card centered on a solid
// background in its own palette colour. The raw card PNG has a transparent
// background and rounded corners; Instagram/WhatsApp fill transparency with
// black, which is the ugly black border the user sees. Flattening onto a
// solid 9:16 canvas removes the black entirely and gives a clean full-bleed
// Story background. Falls back to the original blob if anything fails.
async function _makeSocialBlob(srcBlob) {
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = URL.createObjectURL(srcBlob);
    });
    const CW = 1080, CH = 1920, margin = 96;
    const canvas = document.createElement("canvas");
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = (typeof PALS !== "undefined" && PALS[curP]) ? PALS[curP] : "#1a1a1a";
    ctx.fillRect(0, 0, CW, CH);
    const scale = Math.min((CW - margin * 2) / img.width, (CH - margin * 2) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (CW - w) / 2, (CH - h) / 2, w, h);
    URL.revokeObjectURL(img.src);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b || srcBlob), "image/png"));
  } catch (e) {
    return srcBlob;
  }
}

document.getElementById("btnS").addEventListener("click", async () => {
  _vibrate();
  const btn = document.getElementById("btnS");
  const generatingLabel = typeof getI18nSync === "function" ? getI18nSync("record.generating") : "Generating\u2026";
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + generatingLabel;
  btn.disabled = true;
  _shortId = null;
  _shareSocialBlob = null;
  try {
    await window.ensureHtml2canvas();
    if (!window.html2canvas) throw new Error("html2canvas not loaded");
    await document.fonts.ready;
    _shareBlob = await generateBlobWithProgress();
    _shareSocialBlob = await _makeSocialBlob(_shareBlob);
    btn.innerHTML = '<i class="fas fa-share-nodes"></i> Share card';
    btn.disabled = false;
    const preview = document.getElementById("sharePreview");
    preview.innerHTML = '<img src="' + URL.createObjectURL(_shareBlob) + '" alt="Card preview" />';
    const file = new File([_shareBlob], "wispr-story.png", { type: "image/png" });
    document.getElementById("shareNative").style.display =
      navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })
        ? "" : "none";
    document.getElementById("shareModal").classList.add("open");
    document.body.classList.add("modal-open");
    _activateModal(document.getElementById("shareModal"));
  } catch (e) {
    btn.innerHTML = '<i class="fas fa-share-nodes"></i> Share card';
    btn.disabled = false;
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.exportFailed")) || "Export failed");
  }
});
document.getElementById("shareClose").addEventListener("click", function () { _deactivateModal(); document.getElementById("shareModal").classList.remove("open"); document.body.classList.remove("modal-open"); });
document.getElementById("shareBackdrop").addEventListener("click", function () { _deactivateModal(); document.getElementById("shareModal").classList.remove("open"); document.body.classList.remove("modal-open"); });
document.getElementById("shareNative").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var btn = document.getElementById("shareNative");
  var origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    if (!_shortId) {
      var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png", "X-Card-Text": encodeURIComponent(document.getElementById("sta").value), "X-Card-Name": encodeURIComponent(document.getElementById("nin").value), "X-Card-Tone": curTone || "", "X-Card-P": String(curP), "X-Card-R": useRounded ? "rounded" : "sharp" } });
      if (!res.ok) throw new Error("Upload failed");
      var data = await res.json();
      _shortId = data.shortId;
      if (voiceAttached && audioBlob) {
        try { await fetch("/api/voice", { method: "POST", body: audioBlob, headers: { "Content-Type": audioBlob.type || "audio/webm", "X-Short-Id": _shortId } }); } catch (ve) { console.error("[Voice] Upload failed:", ve); }
      }
    }
    var shareUrl = "https://wisprstories.vercel.app/c/" + _shortId;
    var sharerName = document.getElementById("nin").value || "";
    var shareTitle = sharerName ? "A Wispr Story by " + sharerName : "A Wispr Story";
    // Auto-copy the link to the clipboard. A Story image cannot carry a
    // clickable link automatically (platform limit), so we pre-load the link
    // into the clipboard — the user taps Instagram's Link sticker and pastes
    // it in one step. Fire-and-forget so it never blocks the share gesture.
    try { if (navigator.clipboard) navigator.clipboard.writeText(shareUrl); } catch (ce) {}
    // Share the native 1:1 card, not the 9:16 social variant. The user-reported
    // bug was the 9:16 padded image being visibly wrong — they want the
    // shared image to match the card they created. The 9:16 social blob is
    // still generated (for future Instagram Story integration) but no longer
    // used in the default share path.
    var blobToShare = _shareBlob;
    var shareFile = new File([blobToShare], "wispr-story.png", { type: "image/png" });
    // Put the link in `text`, not `url`. When sharing an image file, WhatsApp
    // (and Telegram) attach the image and use `text` as the caption — and they
    // linkify URLs in captions, so the link rides along as a tappable link
    // beneath the big image. This is how Spotify's mobile share behaves.
    // The card image is a real attachment, so it always renders large — it is
    // NOT a scraped link preview, which is the flaky path.
    var shareCaption = shareTitle + "\n" + shareUrl;
    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      navigator.share({ files: [shareFile], text: shareCaption }).catch(function () {});
    } else {
      navigator.share({ text: shareCaption }).catch(function () {});
    }
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.shared")) || "Shared ✓");
  } catch (e) {
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.uploadFailed")) || "Upload failed");
  }
  btn.innerHTML = origHTML;
  btn.disabled = false;
});
document.getElementById("shareDownload").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var a = document.createElement("a");
  a.download = "wispr-story.png";
  a.href = URL.createObjectURL(_shareBlob);
  a.click();
  showToast((typeof getI18nSync === "function" && getI18nSync("toasts.downloaded")) || "Saved ✓");
  if (voiceAttached && audioBlob && webmCodecString) {
    try {
      var webmBlob = await generateWebm();
      if (!webmBlob || !webmBlob.size) {
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceEmpty")) || "Voice empty");
        return;
      }
      var v = document.createElement("a");
      v.download = "wispr-story.webm";
      v.href = URL.createObjectURL(webmBlob);
      v.click();
      URL.revokeObjectURL(v.href);
      showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmDone") : "Voice saved ✓");
    } catch (e) {
      console.error("[WebM] Share download failed:", e);
      if (e && /0 bytes/.test(e.message || "")) {
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.voiceEmpty")) || "Voice empty");
      }
    }
  }
});
document.getElementById("shareCopyLink").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var btn = document.getElementById("shareCopyLink");
  var origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    if (!_shortId) {
      var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png", "X-Card-Text": encodeURIComponent(document.getElementById("sta").value), "X-Card-Name": encodeURIComponent(document.getElementById("nin").value), "X-Card-Tone": curTone || "", "X-Card-P": String(curP), "X-Card-R": useRounded ? "rounded" : "sharp" } });
      if (!res.ok) throw new Error("Upload failed");
      var data = await res.json();
      _shortId = data.shortId;
      if (voiceAttached && audioBlob) {
        try { await fetch("/api/voice", { method: "POST", body: audioBlob, headers: { "Content-Type": audioBlob.type || "audio/webm", "X-Short-Id": _shortId } }); } catch (ve) { console.error("[Voice] Upload failed:", ve); }
      }
    }
    var url = "https://wisprstories.vercel.app/c/" + _shortId;
    navigator.clipboard.writeText(url).then(function () { showToast((typeof getI18nSync === "function" && getI18nSync("toasts.linkCopied")) || "Copied ✓"); }).catch(function () { showToast((typeof getI18nSync === "function" && getI18nSync("toasts.copyFailed")) || "Copy failed"); });
  } catch (e) {
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.uploadFailed")) || "Upload failed");
  }
  btn.innerHTML = origHTML;
  btn.disabled = false;
});
// Platform detection for mobile clipboard limitations
var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
var isAndroid = /Android/.test(navigator.userAgent);

document.getElementById("shareCopyImage").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var btn = document.getElementById("shareCopyImage");
  var origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  // iOS Safari does not support image clipboard — trigger download instead
  if (isIOS) {
    try {
      var a = document.createElement("a");
      a.download = "wispr-story.png";
      a.href = URL.createObjectURL(_shareBlob);
      a.click();
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.imageSaved")) || "Saved to Photos");
    } catch (e) {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.downloadFailed")) || "Save failed");
    }
    btn.innerHTML = origHTML;
    btn.disabled = false;
    return;
  }

  try {
    // Copy image to clipboard using Clipboard API
    var item = new ClipboardItem({ "image/png": _shareBlob });
    await navigator.clipboard.write([item]);
    showToast((typeof getI18nSync === "function" && getI18nSync("toasts.imageCopied")) || "Copied ✓");
  } catch (e) {
    // Android fallback: download to device
    if (isAndroid) {
      try {
        var a = document.createElement("a");
        a.download = "wispr-story.png";
        a.href = URL.createObjectURL(_shareBlob);
        a.click();
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.imageSavedDownloads")) || "Saved ✓");
      } catch (e2) {
        showToast((typeof getI18nSync === "function" && getI18nSync("toasts.downloadFailed")) || "Save failed");
      }
    } else {
      showToast((typeof getI18nSync === "function" && getI18nSync("toasts.copyNotSupported")) || "Copy unavailable");
    }
  }
  btn.innerHTML = origHTML;
  btn.disabled = false;
});

var _toastQueue = [], _toastShowing = false;
function showToast(msg) {
  if (_toastShowing) {
    if (_toastQueue.length < 3) _toastQueue.push(msg);
    return;
  }
  _toastShowing = true;
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(function() {
    t.classList.remove("show");
    _toastShowing = false;
    if (_toastQueue.length) setTimeout(function() { showToast(_toastQueue.shift()); }, 250);
  }, 3200);
}

// Export
const EXPORT_PROGRESS = document.getElementById("exportProgress");
function showExportProgress() {
  EXPORT_PROGRESS.classList.add("show");
  var bar = document.querySelector(".export-progress-bar");
  if (bar) { bar.style.width = "0%"; bar.classList.add("indeterminate"); }
}
function hideExportProgress() {
  EXPORT_PROGRESS.classList.remove("show");
}
function _setExportStage(msg) {
  var el = document.querySelector(".export-progress-text");
  if (el) el.textContent = msg;
  document.querySelector(".export-progress-bar")?.classList.add("indeterminate");
}
function _setExportProgress(pct) {
  var bar = document.querySelector(".export-progress-bar");
  if (!bar) return;
  bar.classList.remove("indeterminate");
  bar.style.width = Math.min(100, Math.max(0, pct * 100)) + "%";
}
async function generateBlobWithProgress() {
  showExportProgress();
  try {
    return await generateBlob();
  } finally {
    hideExportProgress();
  }
}

async function generateBlob() {
  if (!window.html2canvas) throw new Error("not loaded");
  var cacheKey = document.getElementById("sta").value + "|" + curP + "|" + curTone;
  if (_pngCache && _pngCache.key === cacheKey && Date.now() - _pngCache.ts < 86400000) {
    return _pngCache.blob;
  }
  const card = document.getElementById("card");
  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  const scale = 2;
  const bgUrl = getCardBgImage();
  const opt = {
    backgroundColor: null,
    scale: scale,
    logging: false,
    useCORS: true,
    x: 0,
    y: 0,
    width: cw,
    height: ch,
    onclone: function (doc) {
      const c = doc.getElementById("card");
      const bg = doc.getElementById("cardBg");
      if (c) {
        c.style.backgroundImage = "url(" + bgUrl + ")";
        c.style.backgroundSize = "100% 100%";
      }
      if (bg) bg.style.display = "none";
    },
  };
  const canvas = await html2canvas(card, opt);
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) {
        _pngCache = { blob: blob, key: cacheKey, ts: Date.now() };
        resolve(blob);
      } else {
        _pngCache = null;
        reject(new Error("blob"));
      }
    });
  });
}

// Animated WebM path: canvas.captureStream + MediaRecorder with frequency-driven waveform bars.
// Only used when _cardWaveform exists (built-in mic recording with audio data).
// Falls back to static ffmpeg path on any error.
async function _generateAnimatedWebm(blob, cacheKey) {
  _generatingWebm = true;
  _setExportStage("Preparing animation\u2026");
  try {
    await window.ensureHtml2canvas();
    if (!window.html2canvas) throw new Error("html2canvas not loaded");
    var card = document.getElementById("card");
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    var scale = 2;
    var bgUrl = getCardBgImage();

    // Capture card-wv position relative to card for canvas overlay.
    // Use the content box (subtract left/right padding) so the drawn bars match
    // the live DOM bars. When an occasion image is present, .card-wv gets a
    // right padding (occasions.css) that keeps the live bars clear of the image;
    // reading that same padding here stops the exported bars overlapping it.
    var cardWvEl = document.getElementById("cardWv");
    var cardRect = card.getBoundingClientRect();
    var wvRect = cardWvEl.getBoundingClientRect();
    var wvCs = getComputedStyle(cardWvEl);
    var wvPadL = parseFloat(wvCs.paddingLeft) || 0;
    var wvPadR = parseFloat(wvCs.paddingRight) || 0;
    var wvX = Math.round((wvRect.left - cardRect.left + wvPadL) * scale);
    var wvY = Math.round((wvRect.top - cardRect.top) * scale);
    var wvW = Math.round((wvRect.width - wvPadL - wvPadR) * scale);
    var wvH = Math.round(wvRect.height * scale);
    if (wvW < 10 || wvH < 4) throw new Error("Waveform container too small");

    // Capture card base WITHOUT waveform bars (opacity:0 in clone — keeps layout)
    var baseCanvas = await html2canvas(card, {
      backgroundColor: null, scale: scale, logging: false, useCORS: true,
      x: 0, y: 0, width: cw, height: ch,
      onclone: function(doc) {
        var c = doc.getElementById("card");
        var bg = doc.getElementById("cardBg");
        var wv = doc.getElementById("cardWv");
        if (c) { c.style.backgroundImage = "url(" + bgUrl + ")"; c.style.backgroundSize = "100% 100%"; }
        if (bg) bg.style.display = "none";
        if (wv) wv.style.opacity = "0";
      }
    });

    // Setup audio processing pipeline
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch(ce) {} }
    var audioBuffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
    var source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    var dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    // Animation canvas
    var animCanvas = document.createElement("canvas");
    animCanvas.width = baseCanvas.width;
    animCanvas.height = baseCanvas.height;
    var ctx = animCanvas.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);

    // Combine video + audio streams
    var videoStream = animCanvas.captureStream(30);
    var audioTrack = dest.stream.getAudioTracks()[0];
    if (!audioTrack) throw new Error("No audio track from destination");
    videoStream.addTrack(audioTrack);

    var duration = audioBuffer.duration;
    if (!duration || duration < 0.1) throw new Error("Audio too short");
    var barCount = 35;
    var col = PALS[curP];
    var freqData = new Uint8Array(analyser.frequencyBinCount);
    var gap = Math.round(1.5 * scale);
    var barTotalWidth = Math.max(1, (wvW - (barCount - 1) * gap) / barCount);
    var binSize = freqData.length / barCount;

    _setExportStage("Recording animation\u2026");
    source.start(0);

    return new Promise(function(resolve, reject) {
      var chunks = [];
      var rec = new MediaRecorder(videoStream, { mimeType: webmCodecString });
      rec.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = function() {
        clearInterval(_animTimer);
        var webmBlob = new Blob(chunks, { type: 'video/webm' });
        try { audioCtx.close(); } catch(ce) {}
        _generatingWebm = false;
        // If the recorder produced no data, don't cache or return an empty blob —
        // reject so generateWebm() falls back to the static ffmpeg path instead of
        // handing back a 0-byte file that downloads but won't open.
        if (!webmBlob.size) { reject(new Error("Animated WebM produced 0 bytes")); return; }
        _webmCache = { blob: webmBlob, key: cacheKey, ts: Date.now() };
        resolve(webmBlob);
      };
      rec.onerror = function(e) {
        clearInterval(_animTimer);
        try { audioCtx.close(); } catch(ce) {}
        _generatingWebm = false;
        reject(e);
      };
      rec.start(200);

      var animStartTime = performance.now();
      var _animTimer = setInterval(function() {
        analyser.getByteFrequencyData(freqData);

        // Full redraw: clear + base + animated bars
        ctx.clearRect(0, 0, animCanvas.width, animCanvas.height);
        ctx.drawImage(baseCanvas, 0, 0);

        for (var i = 0; i < barCount; i++) {
          var sum = 0;
          var s = Math.floor(i * binSize);
          var e = Math.floor((i + 1) * binSize);
          for (var j = s; j < e; j++) sum += freqData[j];
          var avg = sum / (e - s);
          var norm = avg / 255;
          var barHeight = Math.max(4, Math.round(norm * wvH));
          var bx = wvX + Math.round(i * (barTotalWidth + gap));
          var by = wvY + wvH - barHeight;
          ctx.globalAlpha = 0.3 + norm * 0.5;
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, Math.max(1, Math.round(barTotalWidth)), barHeight);
        }
        ctx.globalAlpha = 1;

        // Update progress
        var elapsed = (performance.now() - animStartTime) / 1000;
        _setExportProgress(Math.min(elapsed / duration, 0.95));

        // Stop when audio duration is reached
        if (elapsed >= duration) {
          clearInterval(_animTimer);
          setTimeout(function() { if (rec.state !== 'inactive') try { rec.stop(); } catch(ce) {} }, 200);
        }
      }, 33); // ~30fps

      // Safety timeout
      setTimeout(function() {
        if (rec.state !== 'inactive') {
          clearInterval(_animTimer);
          try { rec.stop(); } catch(ce) {}
        }
      }, (duration + 3) * 1000);
    });
  } catch(e) {
    _generatingWebm = false;
    throw e;
  }
}

async function generateWebm() {
  if (!audioBlob || !webmCodecString) throw new Error("No audio or unsupported browser");
  if (_generatingWebm) throw new Error("Already generating WebM");
  var cacheKey = audioBlob.size + "|" + document.getElementById("sta").value + "|" + curP + "|" + curTone;
  if (_webmCache && _webmCache.key === cacheKey && Date.now() - _webmCache.ts < 86400000) {
    return _webmCache.blob;
  }
  _webmCache = null;

  // Animated path: when real audio waveform data is available (built-in mic recording)
  if (_cardWaveform) {
    try {
      return await _generateAnimatedWebm(audioBlob, cacheKey);
    } catch(e) {
      console.warn("[WebM] Animated path failed, falling back to static:", e);
      // Fall through to static ffmpeg path
    }
  }

  // Static path: existing ffmpeg loop approach
  await window.ensureHtml2canvas();
  if (!window.html2canvas) throw new Error("html2canvas not loaded");
  var card = document.getElementById("card");
  var cw = card.offsetWidth;
  var ch = card.offsetHeight;
  var scale = 2;
  var bgUrl = getCardBgImage();
  var canvas = await html2canvas(card, {
    backgroundColor: null,
    scale: scale,
    logging: false,
    useCORS: true,
    x: 0, y: 0, width: cw, height: ch,
    onclone: function(doc) {
      var c = doc.getElementById("card");
      var bg = doc.getElementById("cardBg");
      if (c) { c.style.backgroundImage = "url(" + bgUrl + ")"; c.style.backgroundSize = "100% 100%"; }
      if (bg) bg.style.display = "none";
    }
  });
  var pngBlob = await new Promise(function(resolve, reject) {
    canvas.toBlob(function(b) {
      if (b) resolve(b);
      else reject(new Error("PNG frame failed"));
    });
  });
  _setExportStage("Loading encoder\u2026");
  var ffmpeg = await _loadFfmpeg();
  _setExportStage("Encoding video\u2026");
  var ext = audioBlob.type && (audioBlob.type.includes('mp4') || audioBlob.type.includes('aac') || audioBlob.type.includes('m4a')) ? '.mp4' : '.webm';
  await ffmpeg.writeFile('frame.png', new Uint8Array(await pngBlob.arrayBuffer()));
  await ffmpeg.writeFile('audio' + ext, new Uint8Array(await audioBlob.arrayBuffer()));
  await ffmpeg.exec(['-loop','1','-i','frame.png','-i','audio' + ext,'-c:v','libvpx','-c:a','libopus','-shortest','-r','30','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','out.webm'], undefined, function(p) { if (p && typeof p.progress === 'number') _setExportProgress(p.progress); });
  _setExportStage("Finalizing\u2026");
  var data = await ffmpeg.readFile('out.webm');
  var webmBlob = new Blob([data], { type: 'video/webm' });
  // Never return/cache an empty export — a 0-byte file downloads but won't open.
  if (!webmBlob.size) throw new Error("WebM export produced 0 bytes");
  _webmCache = {
    blob: webmBlob,
    key: audioBlob.size + "|" + document.getElementById("sta").value + "|" + curP + "|" + curTone,
    ts: Date.now()
  };
  return webmBlob;
}

var _activeModalEl = null;
function _trapFocus(e) {
  if (e.key !== 'Tab') return;
  if (!_activeModalEl) return;
  var f = _activeModalEl.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function _activateModal(el) {
  if (_activeModalEl && _activeModalEl !== el) {
    var prev = _activeModalEl;
    prev.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
  _activeModalEl = el;
  document.addEventListener("keydown", _trapFocus);
  var f = el.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (f.length) setTimeout(function() { f[0].focus(); }, 100);
}
function _deactivateModal() {
  document.removeEventListener("keydown", _trapFocus);
  _activeModalEl = null;
}

document.addEventListener("keydown", function(e) {
  if (e.key !== "Escape") return;
  var openModals = document.querySelectorAll(".share-modal.open, .upgrade-modal.open, .sl-modal.open, .dl-choice.open");
  if (openModals.length) {
    openModals.forEach(function(m) { m.classList.remove("open"); });
    document.body.classList.remove("modal-open");
    _deactivateModal();
  }
});
// Spacebar record toggle
document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.key !== "Spacebar") return;
  const t = e.target.tagName;
  if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.target.isContentEditable) return;
  if (document.getElementById("shareModal").classList.contains("open")) return;
  e.preventDefault();
  if (isRec) {
    isRec = false;
    if (usingDeepgram) {
      stopDeepgramRecording().then((result) => {
        fullTx = result.text ? result.text.trim().slice(0, 150) : "";
        if (!fullTx) showToast((typeof getI18nSync === "function" && getI18nSync("toasts.silence")) || "Didn't catch that");
        const actualDuration = finishRec();
        reportRecordingDuration(actualDuration || result.duration);
      });
      return;
    }
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
    if (recog) {
      recog.stop();
      const actualDuration = finishRec();
      reportRecordingDuration(actualDuration);
    }
  } else startRec();
});

// Ctrl+Enter shortcut
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btnC").click();
  }
});

// Keyboard avoidance (mobile)
if (window.visualViewport) {
  var _vvTimer;
  window.visualViewport.addEventListener("resize", function () {
    if (window.innerWidth > 720) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      clearTimeout(_vvTimer);
      _vvTimer = setTimeout(function () { active.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300);
    }
  });
}

// html2canvas lazy loader — fetched on first download/share intent, not at page load.
// Triggered on hover/focus of the download or share buttons so it's ready by the
// time the user actually clicks. Falls back to on-click if hover never fires.
window.ensureHtml2canvas = (function () {
  let p = null;
  function load(r) {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) { resolve(); return; }
      const sc = document.createElement("script");
      sc.src = "assets/html2canvas/html2canvas.min.js";
      sc.onload = () => {
        document.querySelectorAll("[data-html2canvas-init]").forEach((el) => el.remove());
        resolve();
      };
      sc.onerror = () => {
        if (r > 0) setTimeout(() => load(r - 1).then(resolve, reject), 2000);
        else reject(new Error("html2canvas failed to load"));
      };
      document.head.appendChild(sc);
    });
  }
  return function () {
    if (!p) p = load(3);
    return p;
  };
})();

// ffmpeg.wasm lazy loader — single-threaded WASM build from CDN.
// Loaded on hover (preloader) so it's ready by the time the user clicks.
let _ffmpegInstance = null;
let _ffmpegPromise = null;
async function _loadFfmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegPromise) return _ffmpegPromise;
  _ffmpegPromise = (async () => {
    const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm'),
      classWorkerURL: await toBlobURL('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js', 'text/javascript'),
    });
    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  try { return await _ffmpegPromise; }
  catch (e) { _ffmpegPromise = null; throw e; }
}
(function wireLazyLoad() {
  const triggers = ["dlBtn", "btnS", "btnC"];
  const events = ["pointerenter", "focusin", "touchstart"];
  let armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    window.ensureHtml2canvas();
  }
  triggers.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    events.forEach((ev) => el.addEventListener(ev, arm, { once: true, passive: true }));
  });
})();

// Diagnostic: Check Web Speech API health on page load
(function diagnoseSpeechAPI() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSecure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const diag = [];
  diag.push("[Diagnostic] Protocol: " + location.protocol + " (secure: " + isSecure + ")");
  diag.push("[Diagnostic] SpeechRecognition available: " + !!SR);
  if (SR) {
    try {
      const test = new SR();
      diag.push("[Diagnostic] SpeechRecognition constructor: OK");
      diag.push("[Diagnostic] User agent: " + navigator.userAgent.slice(0, 80));
    } catch (e) {
      diag.push("[Diagnostic] SpeechRecognition constructor failed: " + e.message);
    }
  }
  if (!isSecure) {
    diag.push("[Diagnostic] ⚠️ Web Speech API requires HTTPS or localhost");
  }
  if (!SR) {
    diag.push("[Diagnostic] Web Speech API not supported — Deepgram only");
  }
  console.debug(diag.join("\n"));
})();

// Re-localize the Style accordion's chip summary after i18n is ready, so
// the initial "Original · Violet · Rounded" chips show in the user's
// language on first paint. Reversible: remove this listener.
document.addEventListener('languagesReady', function () {
  if (typeof updateStyleChipSummary === 'function') updateStyleChipSummary();
});
// Also re-localize when the UI language changes at runtime.
window.addEventListener('i18nApplied', function () {
  if (typeof updateStyleChipSummary === 'function') updateStyleChipSummary();
});

// Ghost Easter egg — click the ghost to reveal the tagline
(function() {
  var ghostEl = document.getElementById('ghostDecoration');
  var ghostImg = document.getElementById('ghostImg');
  var bubbleEl = document.getElementById('ghostBubble');
  var textEl = document.getElementById('ghostBubbleText');
  if (!ghostEl || !ghostImg || !bubbleEl || !textEl) return;

  var TAGLINE = 'Speak \u00B7 Style \u00B7 Share';
  var isRunning = false;
  var timer = null;

  ghostEl.addEventListener('click', function(e) {
    if (isRunning) return;
    isRunning = true;
    clearTimeout(timer);

    // Reset bubble
    bubbleEl.classList.remove('show', 'float-out');
    textEl.textContent = '';

    // Wiggle the ghost
    ghostImg.classList.remove('wiggle');
    void ghostImg.offsetWidth; // force reflow
    ghostImg.classList.add('wiggle');

    // Show bubble mid-wiggle
    timer = setTimeout(function() {
      bubbleEl.classList.add('show');

      // Typewriter
      var chars = TAGLINE.split('');
      var i = 0;
      var cursorSpan = document.createElement('span');
      cursorSpan.className = 'typing-cursor';
      textEl.textContent = '';
      textEl.appendChild(cursorSpan);

      function typeNext() {
        if (i >= chars.length) {
          // Remove cursor, hold, then float out
          if (cursorSpan.parentNode) cursorSpan.remove();
          timer = setTimeout(function() {
            bubbleEl.classList.add('float-out');
            timer = setTimeout(function() {
              bubbleEl.classList.remove('show', 'float-out');
              isRunning = false;
            }, 500);
          }, 1500);
          return;
        }
        textEl.insertBefore(document.createTextNode(chars[i]), cursorSpan);
        i++;
        timer = setTimeout(typeNext, 70);
      }
      typeNext();
    }, 250);
  });
})();
