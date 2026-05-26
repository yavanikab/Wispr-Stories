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

// Page init — one-time activation via URL hash
(function() {
  var _m = window.location.hash.match(/^#ws-admin=(.+)$/);
  if (_m && _m[1]) {
    try { localStorage.setItem('wsAdminSecret', _m[1]); } catch (_e) {}
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
})();
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
  recMaxDuration = FREE_MAX_RECORDING_SEC,
  recDurationTimer = null,
  recGraceTimer = null;
const isSafari =
  navigator.vendor === "Apple Computer, Inc." &&
  !navigator.userAgent.includes("CriOS");

let usingDeepgram = false,
  mediaRec = null,
  audioChunks = [],
  deepgramStartTime = null;

let audioBlob = null;
let voiceAttached = false;
let webmCodecString = null;
let audioDurationSec = 0;

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
    };
    sessionStorage.setItem("wisprDraft", JSON.stringify(draft));
  } catch (e) { /* storage unavailable */ }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem("wisprDraft");
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (draft.text) document.getElementById("sta").value = draft.text;
    if (draft.name) document.getElementById("nin").value = [...String(draft.name)].slice(0, 18).join("");
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
  const seed = (text || "").split("").reduce((s, c) => s + c.charCodeAt(0), 7);
  const active = Math.floor((len / 150) * 35);
  const col = PALS[curP];
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

function countCard() {
  if (curTone === "original") return;
  const today = new Date().toDateString();
  const d = getToneCounts();
  if (d.date !== today) { d.date = today; d.counts = {}; }
  d.counts[curTone] = (d.counts[curTone] || 0) + 1;
  localStorage.setItem("wsToneCounts", JSON.stringify(d));
}

function trackCardUsage() {
  var lang = speechLang || (typeof autoDetectLangFromText === "function" ? autoDetectLangFromText(document.getElementById("sta").value) : null) || (typeof curLang !== "undefined" ? curLang : null) || "en";
  var source = inputSource || "story";
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
}

function openUpgradeModal() {
  document.getElementById("upgradeModal").classList.add("open");
  document.body.classList.add("modal-open");
}
function closeUpgradeModal() {
  document.getElementById("upgradeModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  document.getElementById("upgradeKeyMsg").textContent = "";
  document.getElementById("upgradeEmailMsg").textContent = "";
}
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
        showToast("Welcome to Pro!");
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
          pill.textContent = (getI18nSync("rewrite.exhausted") || "0 {tone} rewrites left today — try another tone").replace("{tone}", toneLabel.toLowerCase());
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
  if (inputSource === "voice" && audioBlob && webmCodecString) {
    bar.style.display = "flex";
    toggle.disabled = false;
    info.style.display = audioDurationSec > 0 ? "flex" : "none";
    if (audioDurationSec > 0) durLabel.textContent = formatDuration(audioDurationSec);
  } else if (inputSource === "voice" && !audioBlob) {
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

  document.getElementById("rewriteAccept").addEventListener("click", () => {
    document.getElementById("sta").value = rewrittenText;
    window._originalText = null;
    window._pendingRewrite = null;
    hideRewritePreview();
    updateCard();
    saveDraft();
    showToast("Rewrite applied!");
  });
  document.getElementById("rewriteCancel").addEventListener("click", () => {
    document.getElementById("sta").value = originalText;
    window._originalText = null;
    window._pendingRewrite = null;
    hideRewritePreview();
    applyTone("original");
    updateCard();
    saveDraft();
  });
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
}

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


async function startDeepgramRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      if (recDurationTimer) { clearInterval(recDurationTimer); recDurationTimer = null; }
      stream.getTracks().forEach((t) => t.stop());
      showToast("Recording stopped — check your mic connection");
      finishRec();
    };

    // Show initial max duration before first timer tick
    document.getElementById("recSub").textContent = recMaxDuration + "s remaining";
    recDurationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - deepgramStartTime) / 1000);
      const remaining = recMaxDuration - elapsed;
      if (remaining <= 0) {
        clearInterval(recDurationTimer);
        recDurationTimer = null;
        isRec = false;
        showToast("Max recording time reached (" + recMaxDuration + "s)");
        console.log("[Rec] Timer expired, stopping, chunks=" + audioChunks.length + ", speechLang=" + speechLang);
        if (mediaRec && mediaRec.state !== "inactive") {
          stopDeepgramRecording().then(function(result) {
            fullTx = result.text ? result.text.trim().slice(0, 150) : "";
            var preview = (result.text || "").slice(0, 30) + ((result.text || "").length > 30 ? "..." : "");
            console.log("[Rec] STT result: text='" + preview + "', duration=" + result.duration + ", fullTx='" + fullTx + "'");
            if (!fullTx) showToast("We didn’t catch that — check your mic and try again");
            var actualDuration = finishRec();
            reportRecordingDuration(actualDuration || result.duration);
          });
        }
        return;
      }
      document.getElementById("recSub").textContent = remaining + "s remaining";
    }, 1000);

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
        clearInterval(recDurationTimer);
        recDurationTimer = null;
      }
      const duration = deepgramStartTime ? Math.floor((Date.now() - deepgramStartTime) / 1000) : 0;
      deepgramStartTime = null;
      resolve({ text: "", duration });
      return;
    }
      mediaRec.onstop = () => {
        mediaRec.stream.getTracks().forEach((t) => t.stop());
        if (recDurationTimer) {
          clearInterval(recDurationTimer);
          recDurationTimer = null;
        }
        const duration = deepgramStartTime ? Math.floor((Date.now() - deepgramStartTime) / 1000) : 0;
        deepgramStartTime = null;
        const blob = new Blob(audioChunks, { type: mediaRec.mimeType });
        console.log("[Rec] Onstop: chunks=" + audioChunks.length + ", blobSize=" + blob.size + ", duration=" + duration);
        audioChunks = [];
        audioBlob = blob;
        audioDurationSec = duration;

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(",")[1];
          var controller = new AbortController();
          var sttTimeout = setTimeout(function() { controller.abort(); }, 10000);
            try {
            console.log("[STT] Sending request, base64Len=" + base64.length + ", lang=" + (speechLang === "__native__" ? "" : speechLang));
            const res = await fetch("/api/stt", {
              method: "POST",
              headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
              body: JSON.stringify({ audio: base64, format: mediaRec.mimeType, language: speechLang === "__native__" ? "" : speechLang, sessionId: localStorage.getItem("wsSessionId") || null }),
              signal: controller.signal,
            });
            clearTimeout(sttTimeout);
            console.log("[STT] Response status=" + res.status);
            if (!res.ok) {
              const err = await res.text();
              console.error("[STT] API error:", err);
              showToast("Transcription failed \u2014 tap record to try again");
              resolve({ text: "", duration });
              return;
            }
            const data = await res.json();
            resolve({ text: data.text || "", duration });
          } catch (e) {
            clearTimeout(sttTimeout);
            if (e.name === 'AbortError') {
              console.warn("[STT] Request timed out");
              showToast("Transcription timed out \u2014 tap record to try again");
            } else {
              console.error("[STT] Error:", e);
              showToast("Transcription failed \u2014 tap record to try again");
            }
            resolve({ text: "", duration });
          }
        } catch (e) {
          console.error("[STT] Error:", e);
          showToast("Transcription failed \u2014 tap record to try again");
          resolve({ text: "", duration });
        }
      };
      reader.readAsDataURL(blob);
    };
    mediaRec.stop();
  });
}

function startRec() {
  if (location.protocol === "file:") {
    showToast(
      "Voice recording requires HTTPS \u2014 open via localhost or deploy to use"
    );
    return;
  }

  // Server STT health check — routes to Deepgram or Whisper based on language
  fetch("/api/stt?check=1").then(function(r) { return r.json(); }).then(function(data) {
    if (data.available) {
      usingDeepgram = true;
      startDeepgramRecording().then(function(ok) {
        if (ok) {
          isRec = true;
          document.getElementById("recBtn").classList.add("on");
          document.getElementById("recSt").textContent = "Recording\u2026";
          document.getElementById("recSub").textContent = "Tap again to stop and transcribe";
          document.getElementById("recSub").classList.add("live");
          document.getElementById("liveBox").textContent = "Recording\u2026";
        } else {
          // mic permission denied — try WSA fallback
          usingDeepgram = false;
          trySpeechFallback();
        }
      });
    } else {
      // Deepgram not configured — fall back to Web Speech API
      trySpeechFallback();
    }
  }).catch(function() {
    // Network error checking Deepgram — try WSA
    trySpeechFallback();
  });

  function trySpeechFallback() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showToast("Voice recording unavailable \u2014 try typing instead");
      finishRec();
      return;
    }
    startWebSpeechAPI();
  }
}

function startWebSpeechAPI() {
  if (recogTimeout) {
    clearTimeout(recogTimeout);
    recogTimeout = null;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("Voice recording unavailable \u2014 try typing instead");
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
  if (isSafari && curLang !== "en-US") {
    showToast(
      "Safari may only support English (US) for voice recognition"
    );
  }
  recog.onstart = () => {
    isRec = true;
    if (recStartTime === null) recStartTime = Date.now();
    recMaxDuration = isSupporter() ? PRO_MAX_RECORDING_SEC : FREE_MAX_RECORDING_SEC;
    document.getElementById("recBtn").classList.add("on");
    document.getElementById("recSt").textContent = "Listening\u2026";
    document.getElementById("recSub").textContent = recMaxDuration + "s remaining";
    document.getElementById("recSub").classList.add("live");
    document.getElementById("liveBox").classList.add("show");
    console.log("[Speech] Started, lang=" + recog.lang + ", max=" + recMaxDuration + "s");
    recDurationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recStartTime) / 1000);
      const remaining = recMaxDuration - elapsed;
      if (remaining <= 0) {
        clearInterval(recDurationTimer);
        recDurationTimer = null;
        showToast("Max recording time reached (" + recMaxDuration + "s)");
        isRec = false;
        recog.stop();
        return;
      }
      document.getElementById("recSub").textContent = remaining + "s remaining";
    }, 1000);
    recogTimeout = setTimeout(() => {
      console.warn("[Speech] Timeout \u2014 no results after 8s");
      showToast(
        "Speech service not responding \u2014 try again or type instead"
      );
      isRec = false;
      recog.stop();
    }, 8000);
  };
  recog.onresult = (e) => {
    recogRestartCount = 0;
    let fi = "",
      it = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) fi += e.results[i][0].transcript;
      else it += e.results[i][0].transcript;
    }
    if (fi) {
      fullTx += fi + " ";
      console.log('[Speech] Final result: "' + fi.trim() + '"');
    }
    document.getElementById("liveBox").textContent = (fullTx + it).trim();
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
  };
  recog.onend = () => {
    if (usingDeepgram) return;
    console.log("[Speech] Ended, isRec=" + isRec);
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
    if (isRec) {
      recogRestartCount++;
      if (recogRestartCount > RECOG_MAX_RESTARTS) {
        console.warn("[Speech] Max restarts reached");
        showToast(
          "Speech service unavailable \u2014 try again later or type instead"
        );
        isRec = false;
        finishRec();
        return;
      }
      setTimeout(() => {
        if (!isRec) return;
        try {
          recog.lang = _wsLocales[speechLang] || _wsLocales[curLang] || 'en-US';
          recog.start();
          console.log(
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
      showToast("Microphone access denied \u2014 check browser settings");
      isRec = false;
      return;
    }
    if (e.error === "network") {
      showToast("Speech service unavailable \u2014 try again");
      isRec = false;
      return;
    }
    if (e.error === "no-speech")
      showToast("No speech detected \u2014 try speaking louder");
    else showToast("Speech error \u2014 try again");
    isRec = false;
  };
  recog.onnomatch = () => {
    console.warn("[Speech] No match");
    showToast(
      "Couldn\u2019t match speech \u2014 try speaking more clearly"
    );
  };
  try {
    recog.start();
  } catch (e) {
    showToast("Could not start microphone");
  }
}

function finishRec() {
  console.warn("[Rec] finishRec() called, fullTx='" + (fullTx || "").slice(0, 40) + "', recStartTime=" + recStartTime + ", usingDeepgram=" + usingDeepgram);
  if (recDurationTimer) {
    clearTimeout(recGraceTimer);
    recGraceTimer = null;
  }
  const actualDuration = recStartTime ? Math.floor((Date.now() - recStartTime) / 1000) : 0;
  recStartTime = null;
  usingDeepgram = false;
  document.getElementById("recBtn").classList.remove("on");
  document.getElementById("recSt").textContent =
    (typeof getI18nSync === "function" && getI18nSync("record.status")) || "Tap to speak";
  document.getElementById("recSub").textContent =
    (typeof getI18nSync === "function" && getI18nSync("record.sub")) || "Words appear when you stop";
  document.getElementById("recSub").classList.remove("live");
  if (fullTx.trim()) {
    document.getElementById("sta").value = fullTx.trim().slice(0, 150);
    inputSource = "voice";
    userOverride = false;
    setTimeout(
      () => document.getElementById("liveBox").classList.remove("show"),
      500,
    );
    updateCard();
    saveDraft();
    showToast("Done \u2014 review your words then tap Create");
    fullTx = "";
  }
  updateSlNudge();
  updateMicState();
  updateVoiceBar();
  return actualDuration;
}

document.getElementById("recBtn").addEventListener("click", async () => {
  if (isRec) {
    isRec = false;
    if (recDurationTimer) {
      clearInterval(recDurationTimer);
      recDurationTimer = null;
    }
    if (recGraceTimer) {
      clearTimeout(recGraceTimer);
      recGraceTimer = null;
    }
    if (usingDeepgram) {
      const result = await stopDeepgramRecording();
      fullTx = result.text ? result.text.trim().slice(0, 150) : "";
      if (!fullTx) showToast("We didn't catch that — check your mic and try again");
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
    return;
  }

  // Speech language guard — don't record when no valid speech language
  if (!speechLang) {
    showToast("Select a language first");
    return;
  }
  if (speechLang === "__native__") {
    showToast("This language isn't supported for speech yet. Type your words below.");
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

  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
      body: JSON.stringify({ sessionId: localStorage.getItem("wsSessionId"), isPro, audioDuration: maxDuration, checkOnly: true }),
    });
    const data = await res.json();

    if (!data.allowed) {
      if (data.reason === "too_many") {
        showToast(isPro
          ? `Pro limit reached (${data.max}/day). Come back tomorrow!`
          : `Free limit reached (${data.max}/day). Upgrade for more.`);
      } else if (data.reason === "cumulative_exceeded") {
        showToast("Daily audio time limit reached. Come back tomorrow!");
      } else if (data.reason === "too_long") {
        showToast(`Recording too long (max ${data.maxSeconds}s).`);
      }
      return;
    }
    // Update counter with current usage
    updateRecCounter(data.recordingsUsed, data.recordingsMax, data.cumulativeUsed, data.cumulativeMax);
  } catch (e) {
    console.warn("[Limits] Check failed, allowing:", e.message);
  }

  startRec();
});

async function reportRecordingDuration(actualDuration) {
  if (!actualDuration || actualDuration <= 0) return;
  const sessionId = localStorage.getItem("wsSessionId");
  const isPro = isSupporter();
  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getAdminHeaders()),
      body: JSON.stringify({ sessionId, isPro, audioDuration: actualDuration, checkOnly: false }),
    });
    const data = await res.json();
    if (data.allowed) {
      updateRecCounter(data.recordingsUsed, data.recordingsMax, data.cumulativeUsed, data.cumulativeMax);
    }
  } catch (e) {
    console.warn("[Limits] Report failed:", e.message);
  }
}

function updateRecCounter(used, max, cumulativeUsed, cumulativeMax) {
  const el = document.getElementById("recCounter");
  if (!el) return;
  const remaining = max - used;
  const cumRemaining = Math.max(0, cumulativeMax - cumulativeUsed);
  if (remaining <= 0) {
    el.textContent = "No recordings left today";
    el.className = "rec-counter exhausted";
  } else if (remaining <= 2) {
    el.textContent = remaining + " recording" + (remaining === 1 ? "" : "s") + " left · " + cumRemaining + "s audio";
    el.className = "rec-counter warn";
  } else {
    el.textContent = remaining + "/" + max + " recordings · " + cumRemaining + "s audio left";
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
  populateSlGrid();
}
function closeSlModal() {
  var m = document.getElementById('slModal');
  if (!m) return;
  m.classList.remove('open');
  document.body.classList.remove('modal-open');
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
    showToast("Daily " + toneLabel.toLowerCase() + " rewrites used — try another tone");
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
        showToast("Daily " + toneLabel.toLowerCase() + " rewrites used — try another tone");
        applyTone("original");
      } else {
        showToast("Rewrite failed — showing original");
        applyTone(tone);
      }
      cardText.textContent = prevText;
      cardText.classList.remove("mt");
      updateCard();
      saveDraft();
      return;
    }

    const data = await res.json();
    // Sync the local per-tone counter from the server response.
    if (typeof data.used === "number") {
      setToneUsed(data.tone || tone, data.used);
    }
    // Store original text so we can restore it
    window._originalText = text;
    // Store the rewritten text as pending
    window._pendingRewrite = data.text;
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
      showToast("Rewrite timed out — showing original");
    } else {
      showToast("Rewrite failed — showing original");
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
let _dc;
document.getElementById("sta").addEventListener("input", (e) => {
  rewriteCache = {};
  if (!userOverride) {
    var _len = (e.data || "").length;
    if (_len >= 4) {
      inputSource = "voice";
    }
  }
  if (voiceAttached && (e.data || "").length > 0) {
    voiceAttached = false;
    var vt = document.getElementById("voiceToggle");
    if (vt) vt.checked = false;
    showToast(typeof getI18nSync === "function" ? getI18nSync("voice.textChanged") : "Text changed \u2014 voice detached. Re-record to attach.");
    updateVoiceBar();
  }
  clearTimeout(_dc);
  _dc = setTimeout(function() { updateCard(); saveDraft(); updateSlNudge(); updateMicState(); }, 50);
});
document.getElementById("sta").addEventListener("paste", () => {
  rewriteCache = {};
  inputSource = "story";
  setTimeout(function() { updateCard(); saveDraft(); updateSlNudge(); updateMicState(); }, 50);
});
document.getElementById("nin").addEventListener("input", function() {
  this.value = [...this.value].slice(0, 18).join("");
  updateCard();
  saveDraft();
});
document.getElementById("resetBtn").addEventListener("click", () => {
  rewriteCache = {};
  if (isRec) {
    isRec = false;
    if (usingDeepgram) {
      stopDeepgramRecording().then((result) => {
        fullTx = result.text ? result.text.trim().slice(0, 150) : "";
        if (!fullTx) showToast("We didn't catch that — check your mic and try again");
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
    document.getElementById("liveBox").classList.remove("show");
  }
  document.getElementById("sta").value = "";
  document.getElementById("nin").value = "";
  inputSource = "story";
  userOverride = false;
  // Do NOT reset language — keep user's selection
  audioBlob = null;
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
});
// Voice toggle
document.getElementById("voiceToggle").addEventListener("change", function() {
  voiceAttached = this.checked;
  updateCard();
  saveDraft();
  showToast(voiceAttached ? (typeof getI18nSync === "function" ? getI18nSync("voice.attached") : "Voice will be attached") : (typeof getI18nSync === "function" ? getI18nSync("voice.detached") : "Voice removed from card"));
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
    showToast("Playback failed");
  }.bind(this);
  audio.play().then(function() {
    this.classList.add("playing");
    this.textContent = "\u23F8";
  }.bind(this)).catch(function() {
    showToast("Tap again to play");
    this.classList.remove("playing");
    this.textContent = "\u25B6";
  }.bind(this));
});
// Restore card from draft or shared URL
var restored = false;
// Tap source label to toggle between Voice and Story
document.getElementById("voiceLabel").addEventListener("click", function() {
  inputSource = (inputSource === "voice") ? "story" : "voice";
  userOverride = true;
  if (inputSource === "story" && voiceAttached) {
    voiceAttached = false;
    var vt = document.getElementById("voiceToggle");
    if (vt) vt.checked = false;
  }
  updateSourceLabel();
  updateVoiceBar();
  updateCard();
  saveDraft();
});
if (location.hash && location.hash.length > 1) {
  var params = new URLSearchParams(location.hash.slice(1));
  var hText = params.get("text");
  var hName = params.get("name");
  var hTone = params.get("tone");
  var hP = params.get("p");
  inputSource = "story";
  if (hText) document.getElementById("sta").value = hText;
  if (hName) document.getElementById("nin").value = [...hName].slice(0, 18).join("");
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
updateSupporterBadge();
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

// Auto-detect language from browser on first load (no UI dropdown)
function tryAutoDetectLang() {
  const saved = sessionStorage.getItem("wisprDraft");
  if (saved) return; // respect saved draft language
  if (typeof allLanguages === "undefined" || !allLanguages.length) return; // not loaded yet
  const navLang = navigator.language || "en-US";
  const tryCodes = [navLang, navLang.split("-")[0], "en-US"];
  for (const code of tryCodes) {
    if (allLanguages.find((l) => l.code === code)) {
      curLang = code;
      isRTL = false;
      window.setLanguageByCode(code);
      return;
    }
  }
  curLang = "en-US";
  isRTL = false;
  window.setLanguageByCode("en-US");
}
tryAutoDetectLang();
document.addEventListener("languagesReady", tryAutoDetectLang);

// Check daily user cap on app load
async function checkDailyCap() {
  const sessionId = localStorage.getItem("wsSessionId");
  if (!sessionId) {
    const newId = "sess_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("wsSessionId", newId);
  }
  const sid = localStorage.getItem("wsSessionId");

  // Server-side Pro validation
  let isPro = false;
  const storedKey = sessionStorage.getItem("wsProKey");
  if (storedKey) {
    try {
      const proRes = await fetch("/api/pro-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: storedKey }),
      });
      const proData = await proRes.json();
      isPro = proData.isPro || false;
    } catch (e) {
      console.warn("[Cap] Pro check failed:", e.message);
    }
  }

  try {
    const res = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, isPro }),
    });
    const data = await res.json();

    if (!data.allowed) {
      // Show capacity page
      document.getElementById("capacityPage").classList.add("show");
      document.body.style.overflow = "hidden";

      // Update reset text with countdown
      if (data.resetsAt) {
        const resetTime = new Date(data.resetsAt);
        const now = new Date();
        const diffMs = resetTime - now;
        if (diffMs > 0 && diffMs < 60 * 60 * 1000) {
          const mins = Math.ceil(diffMs / 60000);
          document.getElementById("capacityResetText").textContent =
            `We'll be back in about ${mins} minute${mins !== 1 ? "s" : ""}.`;
        }
      }
      return false;
    }
  } catch (e) {
    console.warn("[Cap] Check failed, allowing access:", e.message);
  }
  return true;
}

// Run cap check on load
checkDailyCap().then((allowed) => {
  if (allowed) {
    console.log("[Cap] Access granted");
  }
});

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

// Help icon in nav — re-show onboarding
document.getElementById("helpBtn")?.addEventListener("click", showOnboarding);

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
      showToast("Daily " + toneLabel.toLowerCase() + " rewrites used — try another tone");
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
document.getElementById("btnC").addEventListener("click", () => {
  const btn = document.getElementById("btnC");
  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => btn.disabled = false, 400);
  const text = document.getElementById("sta").value.trim();
  if (!text) {
    const ta = document.getElementById("sta");
    ta.style.borderColor = "rgba(26,26,26,.3)";
    ta.focus();
    setTimeout(() => (ta.style.borderColor = ""), 1400);
    showToast("Speak or write your story first");
    return;
  }
  const check = canCreateCard();
  if (!check.ok) {
    showToast(check.msg);
    return;
  }
  countCard();
  trackCardUsage();
  updateCard();
  const card = document.getElementById("card");
  card.style.transition =
    "transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s";
  card.style.transform = "scale(1.018)";
  card.style.boxShadow = "0 32px 80px rgba(0,0,0,.22)";
  setTimeout(() => {
    card.style.transform = "";
    card.style.boxShadow = "";
  }, 400);
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
  showToast("Card ready \u2014 tap Share to download");
});

// Download
document.getElementById("dlBtn").addEventListener("click", async () => {
  if (!cardReady) { document.getElementById("btnC").click(); return; }
  const btn = document.getElementById("dlBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting\u2026';
  try {
    await window.ensureHtml2canvas();
    await document.fonts.ready;
    const pngBlob = await generateBlobWithProgress();
    var a = document.createElement("a");
    a.download = "wispr-story.png";
    a.href = URL.createObjectURL(pngBlob);
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Downloaded!");
    if (voiceAttached && audioBlob && webmCodecString) {
      showExportProgress();
      try {
        var webmBlob = await generateWebm();
        var v = document.createElement("a");
        v.download = "wispr-story.webm";
        v.href = URL.createObjectURL(webmBlob);
        v.click();
        URL.revokeObjectURL(v.href);
        showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmDone") : "WebM with voice also downloaded");
      } catch (webmErr) {
        console.error("[WebM]", webmErr);
        showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmFailed") : "WebM export failed \u2014 PNG downloaded");
      } finally {
        hideExportProgress();
      }
    }
    btn.innerHTML = '<i class="fas fa-download"></i> Download card';
  } catch (e) {
    btn.innerHTML = '<i class="fas fa-download"></i> Download card';
    showToast("Export failed \u2014 try again");
  }
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
document.getElementById("btnS").addEventListener("click", async () => {
  if (!cardReady) { document.getElementById("btnC").click(); return; }
  const btn = document.getElementById("btnS");
  const generatingLabel = typeof getI18nSync === "function" ? getI18nSync("shareModal.generating") : "Generating\u2026";
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + generatingLabel;
  btn.disabled = true;
  try {
    await window.ensureHtml2canvas();
    if (!window.html2canvas) throw new Error("html2canvas not loaded");
    await document.fonts.ready;
    _shareBlob = await generateBlobWithProgress();
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
  } catch (e) {
    btn.innerHTML = '<i class="fas fa-share-nodes"></i> Share card';
    btn.disabled = false;
    showToast("Export failed \u2014 try again");
  }
});
document.getElementById("shareClose").addEventListener("click", function () { document.getElementById("shareModal").classList.remove("open"); document.body.classList.remove("modal-open"); });
document.getElementById("shareBackdrop").addEventListener("click", function () { document.getElementById("shareModal").classList.remove("open"); document.body.classList.remove("modal-open"); });
document.getElementById("shareNative").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var btn = document.getElementById("shareNative");
  var origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png", "X-Card-Text": encodeURIComponent(document.getElementById("sta").value), "X-Card-Name": encodeURIComponent(document.getElementById("nin").value), "X-Card-Tone": curTone || "", "X-Card-P": String(curP), "X-Card-R": useRounded ? "rounded" : "sharp" } });
    if (!res.ok) throw new Error("Upload failed");
    var data = await res.json();
    if (voiceAttached && audioBlob) {
      try { await fetch("/api/voice", { method: "POST", body: audioBlob, headers: { "Content-Type": audioBlob.type || "audio/webm", "X-Short-Id": data.shortId } }); } catch (ve) { console.error("[Voice] Upload failed:", ve); }
    }
    var shareUrl = "https://wisprstories.vercel.app/c/" + data.shortId;
    var sharerName = document.getElementById("nin").value || "";
    var shareText = sharerName ? "A Wispr Story by " + sharerName : "A Wispr Story";
    navigator.share({ url: shareUrl, text: shareText }).catch(function () {});
  } catch (e) {
    showToast("Upload failed — try again");
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
  showToast("Downloaded!");
  if (voiceAttached && audioBlob && webmCodecString) {
    try {
      var webmBlob = await generateWebm();
      var v = document.createElement("a");
      v.download = "wispr-story.webm";
      v.href = URL.createObjectURL(webmBlob);
      v.click();
      URL.revokeObjectURL(v.href);
      showToast(typeof getI18nSync === "function" ? getI18nSync("voice.webmDone") : "WebM with voice also downloaded");
    } catch (e) {
      console.error("[WebM] Share download failed:", e);
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
    var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png", "X-Card-Text": encodeURIComponent(document.getElementById("sta").value), "X-Card-Name": encodeURIComponent(document.getElementById("nin").value), "X-Card-Tone": curTone || "", "X-Card-P": String(curP), "X-Card-R": useRounded ? "rounded" : "sharp" } });
    if (!res.ok) throw new Error("Upload failed");
    var data = await res.json();
    if (voiceAttached && audioBlob) {
      try { await fetch("/api/voice", { method: "POST", body: audioBlob, headers: { "Content-Type": audioBlob.type || "audio/webm", "X-Short-Id": data.shortId } }); } catch (ve) { console.error("[Voice] Upload failed:", ve); }
    }
    var url = "https://wisprstories.vercel.app/c/" + data.shortId;
    navigator.clipboard.writeText(url).then(function () { showToast("Link copied!"); }).catch(function () { showToast("Could not copy link"); });
  } catch (e) {
    showToast("Upload failed — try again");
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
      showToast("Image saved — open Photos to paste");
    } catch (e) {
      showToast("Download failed — try Share instead");
    }
    btn.innerHTML = origHTML;
    btn.disabled = false;
    return;
  }

  try {
    // Copy image to clipboard using Clipboard API
    var item = new ClipboardItem({ "image/png": _shareBlob });
    await navigator.clipboard.write([item]);
    showToast("Image copied!");
  } catch (e) {
    // Android fallback: download to device
    if (isAndroid) {
      try {
        var a = document.createElement("a");
        a.download = "wispr-story.png";
        a.href = URL.createObjectURL(_shareBlob);
        a.click();
        showToast("Image saved to downloads");
      } catch (e2) {
        showToast("Download failed — try Share instead");
      }
    } else {
      showToast("Copy not supported — try Download instead");
    }
  }
  btn.innerHTML = origHTML;
  btn.disabled = false;
});

// Tooltips
document.querySelectorAll(".ii").forEach((icon) => {
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    const tip = icon.nextElementSibling;
    const open = tip.classList.contains("open");
    document
      .querySelectorAll(".tip.open")
      .forEach((t) => t.classList.remove("open"));
    document
      .querySelectorAll(".ii.tip-open")
      .forEach((i) => i.classList.remove("tip-open"));
    if (!open) {
      tip.classList.add("open");
      icon.classList.add("tip-open");
      setTimeout(() => adjustTooltipPosition(tip), 0);
    }
  });
  icon.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      icon.click();
    }
  });
});
document.addEventListener("click", () => {
  document
    .querySelectorAll(".tip.open")
    .forEach((t) => t.classList.remove("open"));
  document
    .querySelectorAll(".ii.tip-open")
    .forEach((i) => i.classList.remove("tip-open"));
});

function adjustTooltipPosition(tip) {
  // Reset prior overrides so measurement starts from the default position.
  tip.style.left = "";
  tip.style.right = "";
  tip.style.maxWidth = "";
  tip.style.transform = "";
  const margin = 8;
  // Hard-cap width to viewport so a long tooltip never wider than the screen.
  const maxW = Math.min(280, window.innerWidth - margin * 2);
  tip.style.maxWidth = maxW + "px";
  // Measure, then translate horizontally to keep both edges inside the viewport.
  const r = tip.getBoundingClientRect();
  let shift = 0;
  if (r.right > window.innerWidth - margin) {
    shift = window.innerWidth - margin - r.right;
  } else if (r.left < margin) {
    shift = margin - r.left;
  }
  if (shift !== 0) tip.style.transform = "translateX(" + shift + "px)";
  if (r.bottom > window.innerHeight) tip.style.top = "auto";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 3200);
}

// Export
const EXPORT_PROGRESS = document.getElementById("exportProgress");
function showExportProgress() {
  EXPORT_PROGRESS.classList.add("show");
}
function hideExportProgress() {
  EXPORT_PROGRESS.classList.remove("show");
}
async function generateBlobWithProgress() {
  showExportProgress();
  try {
    return await generateBlob();
  } finally {
    hideExportProgress();
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r || 0, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

async function createExportBackground(card, cw, ch, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cw * scale);
  canvas.height = Math.round(ch * scale);
  const ctx = canvas.getContext("2d");
  const radius = useRounded ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0 : 0;

  ctx.save();
  ctx.scale(scale, scale);
  drawRoundedRect(ctx, 0, 0, cw, ch, radius);
  ctx.clip();
  const img = await loadImage(getCardBgImage());
  if (img) ctx.drawImage(img, 0, 0, cw, ch);
  ctx.restore();
  return canvas;
}

async function generateBlob() {
  if (!window.html2canvas) throw new Error("not loaded");
  const card = document.getElementById("card");
  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  const scale = 3;
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
      if (blob) resolve(blob);
      else reject(new Error("blob"));
    });
  });
}

async function generateWebm() {
  if (!audioBlob || !webmCodecString) throw new Error("No audio or unsupported browser");
  await window.ensureHtml2canvas();
  if (!window.html2canvas) throw new Error("html2canvas not loaded");
  await document.fonts.ready;
  var card = document.getElementById("card");
  var cw = card.offsetWidth;
  var ch = card.offsetHeight;
  var bgUrl = getCardBgImage();
  var canvas = await html2canvas(card, {
    backgroundColor: null,
    scale: 1,
    logging: false,
    useCORS: true,
    x: 0, y: 0, width: cw, height: ch,
    onclone: function(doc) {
      var c = doc.getElementById("card");
      if (c) {
        c.style.backgroundImage = "url(" + bgUrl + ")";
        c.style.backgroundSize = "100% 100%";
      }
      var bg = doc.getElementById("cardBg");
      if (bg) bg.style.display = "none";
    }
  });
  var videoStream = canvas.captureStream(1);
  var videoTrack = videoStream.getVideoTracks()[0];
  var audioCtx = new AudioContext();
  var arrayBuffer = await audioBlob.arrayBuffer();
  var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  var dest = audioCtx.createMediaStreamDestination();
  var source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(dest);
  var combinedStream = new MediaStream([
    videoTrack,
    dest.stream.getAudioTracks()[0]
  ]);
  return new Promise(function(resolve, reject) {
    var chunks = [];
    var recorder = new MediaRecorder(combinedStream, { mimeType: webmCodecString });
    recorder.ondataavailable = function(e) {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = function() {
      audioCtx.close();
      videoTrack.stop();
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    recorder.onerror = function(e) {
      audioCtx.close();
      videoTrack.stop();
      reject(e);
    };
    recorder.start();
    source.start(0);
    source.onended = function() {
      if (recorder.state !== "inactive") recorder.stop();
    };
  });
}

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
        if (!fullTx) showToast("We didn't catch that — check your mic and try again");
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
  console.log(diag.join("\n"));
})();

// Re-localize the Style accordion's chip summary after i18n is ready, so
// the initial "Original · Violet · Rounded" chips show in the user's
// language on first paint. Reversible: remove this listener.
document.addEventListener('languagesReady', function () {
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
