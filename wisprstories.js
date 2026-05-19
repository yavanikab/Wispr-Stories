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
const RTL = ["ar-SA", "he-IL", "fa-IR", "ur-PK", "ar", "ur", "fa", "he"];

function getLanguageName(code) {
  if (typeof allLanguages === "undefined" || !allLanguages) return "";
  const lang = allLanguages.find((l) => l.code === code);
  return lang ? lang.label : "";
}


let curP = 0,
  curTone = "original",
  curLang = "en-US",
  isRTL = false,
  useRounded = true,
  inputSource = "story";
let recog = null,
  isRec = false,
  fullTx = "";
let cardReady = false,
  _lastBlob = null;
let recogTimeout = null,
  recogRestartCount = 0;
const RECOG_MAX_RESTARTS = 5;
const isSafari =
  navigator.vendor === "Apple Computer, Inc." &&
  !navigator.userAgent.includes("CriOS");

let usingWhisper = false,
  mediaRec = null,
  audioChunks = [];

const isFF = navigator.userAgent.toLowerCase().includes("firefox");
if (isFF) {
  document.getElementById("ffNotice").classList.add("show");
  const rb = document.getElementById("recBtn");
  rb.style.opacity = ".35";
  rb.style.pointerEvents = "none";
}

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
    if (draft.name) document.getElementById("nin").value = String(draft.name).replace(/[^\p{L}]/gu, "").slice(0, 10);
    inputSource = draft.inputSource === "voice" ? "voice" : "story";
    if (draft.tone) applyTone(draft.tone);
    if (draft.palette != null) applyPal(draft.palette);
    if (draft.lang) {
      curLang = draft.lang;
      isRTL = draft.isRTL || false;
      window.setLanguageByCode(draft.lang);
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
    updateCard();
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
}

function getCardsLeft() {
  const raw = localStorage.getItem("wsCards");
  if (!raw) return 10;
  const d = JSON.parse(raw);
  if (d.date !== new Date().toDateString()) return 10;
  return Math.max(0, 10 - d.count);
}

function countCard() {
  if (curTone === "original") return;
  const today = new Date().toDateString();
  const raw = localStorage.getItem("wsCards");
  if (!raw || JSON.parse(raw).date !== today) {
    localStorage.setItem(
      "wsCards",
      JSON.stringify({ date: today, count: 1 })
    );
  } else {
    const d = JSON.parse(raw);
    d.count++;
    localStorage.setItem("wsCards", JSON.stringify(d));
  }
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
  msg.textContent = "Thank you! I\u2019ll get back to you shortly.";
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
  const limitReached = !isSupporter() && getCardsLeft() === 0;
  toneBtns.forEach((c) => {
    if (c.dataset.tone === "original") { c.disabled = false; return; }
    c.disabled = limitReached;
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
      badge.textContent = limitReached ? "0" : getCardsLeft();
    }
  });

  function showPill() { wrap.style.display = ""; }
  function hidePill() { wrap.style.display = "none"; }

  if (tone === "original") {
    btn.textContent = "Create card";
    if (limitReached) {
      if (isMobile) {
        hidePill();
      } else {
        showPill();
        pill.textContent = "0 rewrites remaining \u2014 Original is unlimited";
        pill.className = "tone-pill exhausted";
        upgBtn.style.display = "";
      }
    } else {
      hidePill();
    }
  } else {
    const label = tone.charAt(0).toUpperCase() + tone.slice(1);
    btn.textContent = "Create " + label + " card";
    if (isSupporter()) {
      showPill();
      pill.textContent = "\u221E Unlimited \u2014 no daily cap";
      pill.className = "tone-pill supporter";
      upgBtn.style.display = "none";
    } else {
      const left = getCardsLeft();
      if (isMobile) {
        hidePill();
      } else {
        showPill();
        if (left === 0) {
          pill.textContent = "0 rewrites remaining \u2014 Original is unlimited";
          pill.className = "tone-pill exhausted";
        } else {
          pill.textContent = left + " tone rewrite" + (left === 1 ? "" : "s") + " left today";
          pill.className = "tone-pill";
        }
        upgBtn.style.display = "";
      }
    }
  }
  updateMobileBar();
  updateSourceLabel();
}

function updateSourceLabel() {
  const vl = document.getElementById("voiceLabel");
  if (!vl) return;
  const isVoice = inputSource === "voice";
  const isStyled = curTone !== "original";
  const voiceIcon = "\u{1F399}\uFE0F";
  const storyIcon = "\u{1F58B}\uFE0F";
  if (isVoice) {
    vl.textContent = voiceIcon + (isStyled ? " Voice Styles" : " Voice Original");
  } else {
    vl.textContent = storyIcon + (isStyled ? " Story Styles" : " Story Original");
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

function updateCard() {
  const raw = document.getElementById("sta").value;
  const name = document.getElementById("nin").value.trim();
  const tx = document.getElementById("cardText");
  const lbl = document.getElementById("cardLabel");
  const panel = document.getElementById("cardPanel");
  const cc = document.getElementById("charC");

  cc.textContent = raw.length + " / 150";
  cc.classList.toggle("warn", raw.length >= 120);
  panel.dir = RTL.includes(curLang) ? "rtl" : "ltr";
  document.getElementById("sta").dir = RTL.includes(curLang) ? "rtl" : "ltr";

  cardReady = false;
  document.getElementById("btnS").disabled = true;
  document.getElementById("dlBtn").style.display = "none";
  document.getElementById("wcta").classList.remove("show");
  const card = document.getElementById("card");
  if (raw.trim()) {
    card.classList.remove("card-empty");
    document.querySelector('.shell')?.classList.add('has-card');
    const t = TONES[curTone];
    const displayText = raw.length > 150 ? raw.slice(0, 150) + "..." : raw;
    tx.classList.remove("mt");
    applyScriptFonts(tx, curTone, displayText);
    tx.style.fontStyle = t.fi;
    tx.style.fontWeight = t.fw;
    tx.style.letterSpacing = t.ls;
    const langName = getLanguageName(curLang);
    lbl.textContent = name ? name + " \u00b7 " + langName : langName;
  } else {
    card.classList.add("card-empty");
    document.querySelector('.shell')?.classList.remove('has-card');
    document.getElementById("cardGhost").innerHTML = '\u201C';
    tx.textContent = "";
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

// Silence detection state
let silenceAnalyser = null, silenceCheckInterval = null;
let silenceRmsSamples = [];
const SILENCE_RMS_THRESHOLD = 0.01;
const SILENCE_SAMPLE_INTERVAL_MS = 500;
const SILENCE_MIN_DURATION_MS = 2000;

async function startWhisperFallback() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mt = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mediaRec = new MediaRecorder(stream, { mimeType: mt });
    audioChunks = [];
    mediaRec.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    // Set up silence detection via Web Audio API
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      silenceAnalyser = audioCtx.createAnalyser();
      silenceAnalyser.fftSize = 2048;
      source.connect(silenceAnalyser);
      silenceRmsSamples = [];
      silenceCheckInterval = setInterval(() => {
        if (!silenceAnalyser) return;
        const data = new Float32Array(silenceAnalyser.fftSize);
        silenceAnalyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) sumSquares += data[i] * data[i];
        const rms = Math.sqrt(sumSquares / data.length);
        silenceRmsSamples.push({ time: Date.now(), rms });
        // Keep only last 5 seconds of samples
        const cutoff = Date.now() - 5000;
        silenceRmsSamples = silenceRmsSamples.filter(s => s.time >= cutoff);
      }, SILENCE_SAMPLE_INTERVAL_MS);
    } catch (e) {
      console.warn("[Silence] Analyser setup failed:", e.message);
    }

    mediaRec.start(250);
    return true;
  } catch (e) {
    console.error("[Whisper] Start failed:", e);
    return false;
  }
}

function isSilentRecording() {
  if (silenceRmsSamples.length < SILENCE_MIN_DURATION_MS / SILENCE_SAMPLE_INTERVAL_MS) return false;
  const recent = silenceRmsSamples.filter(s => s.time >= Date.now() - SILENCE_MIN_DURATION_MS);
  if (recent.length < 2) return false;
  const avgRms = recent.reduce((sum, s) => sum + s.rms, 0) / recent.length;
  return avgRms < SILENCE_RMS_THRESHOLD;
}

function cleanupSilenceDetection() {
  if (silenceCheckInterval) {
    clearInterval(silenceCheckInterval);
    silenceCheckInterval = null;
  }
  if (silenceAnalyser) {
    try { silenceAnalyser.context.close(); } catch (e) {}
    silenceAnalyser = null;
  }
  silenceRmsSamples = [];
}

function stopWhisperFallback() {
  return new Promise((resolve) => {
    if (!mediaRec || mediaRec.state === "inactive") {
      cleanupSilenceDetection();
      resolve("");
      return;
    }
    mediaRec.onstop = () => {
      mediaRec.stream.getTracks().forEach((t) => t.stop());
      cleanupSilenceDetection();
      const blob = new Blob(audioChunks, { type: mediaRec.mimeType });
      audioChunks = [];

      // Check for silence before sending to Deepgram
      if (isSilentRecording()) {
        console.log("[Silence] Recording detected as silent — skipping STT");
        showToast("We didn't catch that \u2014 try speaking louder");
        resolve("");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(",")[1];
          const res = await fetch("/api/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, format: mediaRec.mimeType }),
          });
          if (!res.ok) {
            const err = await res.text();
            console.error("[Whisper] API error:", err);
            showToast(
              "Transcription failed \u2014 need to run 'vercel dev' or deploy"
            );
            resolve("");
            return;
          }
          const data = await res.json();
          if (data.mock) {
            console.log("[STT] Mock transcription returned (no API key set)");
            showToast("Recording works! Add Deepgram key for real transcription");
          }
          resolve(data.text || "");
        } catch (e) {
          console.error("[Whisper] Error:", e);
          resolve("");
        }
      };
      reader.readAsDataURL(blob);
    };
    mediaRec.stop();
  });
}

function startRec() {
  if (isFF) {
    showToast("Voice not supported in Firefox");
    return;
  }
  if (location.protocol === "file:") {
    showToast(
      "Voice recording requires HTTPS \u2014 open via localhost or deploy to use"
    );
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.warn("[Speech] Web Speech API not available — using Deepgram fallback");
    showToast("Web Speech API unavailable — using direct recording...");
    usingWhisper = true;
    startWhisperFallback().then((ok) => {
      if (ok) {
        isRec = true;
        document.getElementById("recBtn").classList.add("on");
        document.getElementById("recSt").textContent = "Recording\u2026";
        document.getElementById("recSub").textContent = "Tap again to stop and transcribe";
        document.getElementById("recSub").classList.add("live");
        document.getElementById("liveBox").textContent = "Recording audio directly...";
      } else {
        showToast("Could not start recording \u2014 try typing instead");
        usingWhisper = false;
        isRec = false;
        finishRec();
      }
    });
    return;
  }
  if (recogTimeout) {
    clearTimeout(recogTimeout);
    recogTimeout = null;
  }
  curLang = curLang || "en-US";
  fullTx = "";
  recogRestartCount = 0;
  recog = new SR();
  recog.continuous = false;
  recog.interimResults = true;
  recog.lang = curLang;
  if (isSafari && curLang !== "en-US") {
    showToast(
      "Safari may only support English (US) for voice recognition"
    );
  }
  recog.onstart = () => {
    isRec = true;
    document.getElementById("recBtn").classList.add("on");
    document.getElementById("recSt").textContent = "Listening\u2026";
    document.getElementById("recSub").textContent = "Tap again to stop";
    document.getElementById("recSub").classList.add("live");
    document.getElementById("liveBox").classList.add("show");
    console.log("[Speech] Started, lang=" + recog.lang);
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
    if (usingWhisper) return;
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
          recog.lang = curLang;
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
      showToast("Speech service unavailable \u2014 trying alternative...");
      usingWhisper = true;
      startWhisperFallback().then((ok) => {
        if (ok) {
          document.getElementById("recSub").textContent =
            "Tap again to stop and transcribe";
        } else {
          showToast("Could not start recording \u2014 try typing instead");
          usingWhisper = false;
          isRec = false;
          finishRec();
        }
      });
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
  usingWhisper = false;
  document.getElementById("recBtn").classList.remove("on");
  document.getElementById("recSt").textContent = "Tap to speak";
  document.getElementById("recSub").textContent =
    "Your words appear live as you talk";
  document.getElementById("recSub").classList.remove("live");
  if (fullTx.trim()) {
    document.getElementById("sta").value = fullTx.trim().slice(0, 150);
    inputSource = "voice";
    setTimeout(
      () => document.getElementById("liveBox").classList.remove("show"),
      500,
    );
    updateCard();
    saveDraft();
    showToast("Done \u2014 review your words then tap Create");
    fullTx = "";
    // Server-side limit already incremented in recBtn click handler
  }
}

document.getElementById("recBtn").addEventListener("click", async () => {
  if (isRec) {
    isRec = false;
    if (usingWhisper) {
      const text = await stopWhisperFallback();
      fullTx = text ? text.trim().slice(0, 150) : "";
      finishRec();
      return;
    }
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
    if (recog) recog.stop();
    return;
  }

  // Server-side limit check before starting recording
  const sessionId = localStorage.getItem("wsSessionId");
  if (!sessionId) {
    const newId = "sess_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("wsSessionId", newId);
  }
  const isPro = isSupporter();

  try {
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: localStorage.getItem("wsSessionId"), isPro, audioDuration: 15 }),
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
  } catch (e) {
    console.warn("[Limits] Check failed, allowing:", e.message);
  }

  startRec();
});
const langSelEl = document.getElementById("langSel");
if (langSelEl) {
  langSelEl.addEventListener("change", (e) => {
    curLang = e.target.value;
    isRTL = RTL.includes(curLang);
    updateCard();
    saveDraft();
  });
}
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

  // Check if Pro user (skip limit check)
  const isPro = isSupporter();
  if (!isPro && getCardsLeft() <= 0) {
    showToast("Daily rewrites used — showing as Original");
    applyTone("original");
    updateCard();
    saveDraft();
    return;
  }

  // Show loading state on card
  const cardText = document.getElementById("cardText");
  const prevText = cardText.textContent;
  cardText.textContent = "Rewriting...";
  cardText.classList.add("mt");

  try {
    const sessionId = localStorage.getItem("wsSessionId") || "anon";
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tone, sessionId, isPro }),
    });

    if (!res.ok) {
      const err = await res.json();
      if (res.status === 429) {
        showToast("Daily rewrite limit reached");
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
    // Store original text so we can restore it
    window._originalText = text;
    // Store the rewritten text as pending
    window._pendingRewrite = data.text;
    // Show rewritten text on card preview only
    cardText.textContent = data.text;
    cardText.classList.remove("mt");
    applyTone(tone);
    updateCard();
    saveDraft();
    // Show accept/cancel preview bar
    showRewritePreview(text, data.text, tone);
  } catch (err) {
    console.error("[Rewrite] Error:", err);
    showToast("Rewrite failed — showing original");
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
document.getElementById("sta").addEventListener("input", () => {
  inputSource = "story";
  clearTimeout(_dc);
  _dc = setTimeout(function() { updateCard(); saveDraft(); }, 100);
});
document.getElementById("nin").addEventListener("input", function() {
  const cleaned = this.value.replace(/[^\p{L}]/gu, "").slice(0, 10);
  if (cleaned !== this.value) {
    const pos = this.selectionStart;
    this.value = cleaned;
    try { this.setSelectionRange(pos - 1, pos - 1); } catch (e) {}
  }
  updateCard();
  saveDraft();
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (isRec) {
    recog.stop();
    isRec = false;
    fullTx = "";
    document.getElementById("recBtn").classList.remove("on");
    document.getElementById("recSt").textContent = "Tap to speak";
    document.getElementById("recSub").textContent =
      "Your words appear live as you talk";
    document.getElementById("recSub").classList.remove("live");
    document.getElementById("liveBox").classList.remove("show");
  }
  document.getElementById("sta").value = "";
  document.getElementById("nin").value = "";
  inputSource = "story";
  curLang = "en-US";
  isRTL = false;
  window.setLanguageByCode("en-US");
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
  updateMobileBar();
});
// Restore card from draft or shared URL
var restored = false;
if (location.hash && location.hash.length > 1) {
  var params = new URLSearchParams(location.hash.slice(1));
  var hText = params.get("text");
  var hName = params.get("name");
  var hTone = params.get("tone");
  var hP = params.get("p");
  inputSource = "story";
  if (hText) document.getElementById("sta").value = hText;
  if (hName) document.getElementById("nin").value = hName.replace(/[^\p{L}]/gu, "").slice(0, 10);
  if (hTone) applyTone(hTone);
  if (hP != null) applyPal(parseInt(hP));
  if (hText) { updateCard(); cardReady = true; document.getElementById("btnS").disabled = false; document.getElementById("wcta").classList.add("show"); document.getElementById("dlBtn").style.display = "block"; restored = true; }
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

  var limitReached = !isSupporter() && getCardsLeft() === 0;
  var isStyled = curTone !== "original";

  if (isStyled || limitReached) {
    rightGroup.style.display = "flex";
    if (isSupporter()) {
      rewriteText.innerHTML = '<span class="rewrite-count">\u221E</span><span class="rewrite-label">Unlimited</span>';
      rewriteText.className = "mobile-bar-rewrite-text";
    } else if (limitReached) {
      rewriteText.innerHTML = '<span class="rewrite-count">0</span><span class="rewrite-label">Upgrade</span>';
      rewriteText.className = "mobile-bar-rewrite-text exhausted";
    } else {
      var left = getCardsLeft();
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
      isRTL = RTL.includes(code);
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
const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function applyWaveText(textEl) {
  if (prefersReducedMotion) return;
  if (!textEl || textEl.dataset.waveInit) return;
  const text = textEl.textContent;
  textEl.dataset.waveText = text;
  textEl.innerHTML = "";
  textEl.dataset.waveInit = "true";
  let charIdx = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      textEl.appendChild(document.createTextNode(" "));
    } else {
      const span = document.createElement("span");
      span.textContent = text[i];
      span.style.display = "inline-block";
      span.style.animation = `wave-letter 0.7s ease-in-out ${charIdx * 0.05}s 1`;
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

// Theme toggle
function setTheme(dark, animate) {
  const html = document.documentElement;
  const icon = document.getElementById('themeToggle').querySelector('i');
  icon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#1a1a1a' : '#ffffeb';
  document.querySelector('meta[name="color-scheme"]').content = dark ? 'dark' : 'light';
  const logo = document.querySelector('.nav-logo');
  if (logo) logo.src = dark ? 'assets/ws-logo-wh.png' : 'assets/ws-logo-bl.png';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  if (animate) {
    html.classList.add('theme-transitioning');
    html.classList.toggle('dark', dark);
    setTimeout(function() { html.classList.remove('theme-transitioning'); }, 300);
  } else {
    html.classList.toggle('dark', dark);
  }
}
function initTheme() {
  const saved = localStorage.getItem('theme');
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(dark, false);
}
initTheme();
document.getElementById('themeToggle').addEventListener('click', function() {
  setTheme(!document.documentElement.classList.contains('dark'), true);
});

// Upgrade modal
document.getElementById("upgradeBtn").addEventListener("click", openUpgradeModal);
document.getElementById("mobileBtnUpgrade")?.addEventListener("click", openUpgradeModal);
document.getElementById("upgradeClose").addEventListener("click", closeUpgradeModal);
document.getElementById("upgradeBackdrop").addEventListener("click", closeUpgradeModal);
document.getElementById("upgradeKeyGo").addEventListener("click", handleUpgradeKey);
document.getElementById("upgradeEmailGo").addEventListener("click", handleUpgradeEmail);
document.getElementById("upgradeKeyInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleUpgradeKey();
});
document.getElementById("upgradeEmailInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleUpgradeEmail();
});

// Examples
document.getElementById("exGrid").addEventListener("click", (e) => {
  const c = e.target.closest(".ec");
  if (!c) return;
  inputSource = "story";
  document.getElementById("sta").value = (c.dataset.text || "").slice(0, 150);
  document.getElementById("nin").value = (c.dataset.name || "").replace(/[^\p{L}]/gu, "").slice(0, 10);
  if (c.dataset.tone) {
    const tone = c.dataset.tone;
    if (tone !== "original" && !isSupporter() && getCardsLeft() === 0) {
      applyTone("original");
      showToast("Daily rewrites used — showing as Original");
    } else {
      applyTone(tone);
    }
  }
  if (c.dataset.p != null) applyPal(parseInt(c.dataset.p));
  if (c.dataset.lang) {
    curLang = c.dataset.lang;
    isRTL = RTL.includes(curLang);
    window.setLanguageByCode(c.dataset.lang);
  }
  updateCard();
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
    const blob = await generateBlobWithProgress();
    const a = document.createElement("a");
    a.download = "wispr-story.png";
    a.href = URL.createObjectURL(blob);
    a.click();
    btn.innerHTML = '<i class="fas fa-download"></i> Download card';
    showToast("Downloaded!");
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
  btn.textContent = "Generating\u2026";
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
    var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png" } });
    if (!res.ok) throw new Error("Upload failed");
    var data = await res.json();
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
document.getElementById("shareDownload").addEventListener("click", function () {
  if (!_shareBlob) return;
  var a = document.createElement("a");
  a.download = "wispr-story.png";
  a.href = URL.createObjectURL(_shareBlob);
  a.click();
  showToast("Downloaded!");
});
document.getElementById("shareCopyLink").addEventListener("click", async function () {
  if (!_shareBlob) return;
  var btn = document.getElementById("shareCopyLink");
  var origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    var res = await fetch("/api/upload", { method: "POST", body: _shareBlob, headers: { "Content-Type": "image/png" } });
    if (!res.ok) throw new Error("Upload failed");
    var data = await res.json();
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

// Spacebar record toggle
document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.key !== "Spacebar") return;
  const t = e.target.tagName;
  if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.target.isContentEditable) return;
  if (document.getElementById("shareModal").classList.contains("open")) return;
  e.preventDefault();
  if (isRec) {
    isRec = false;
    if (usingWhisper) {
      stopWhisperFallback().then((text) => {
        fullTx = text ? text.trim().slice(0, 150) : "";
        finishRec();
      });
      return;
    }
    if (recogTimeout) {
      clearTimeout(recogTimeout);
      recogTimeout = null;
    }
    if (recog) recog.stop();
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
    diag.push("[Diagnostic] ⚠️ Web Speech API not supported — will use Deepgram fallback");
  }
  console.log(diag.join("\n"));
})();
