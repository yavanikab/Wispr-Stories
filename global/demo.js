/* EMPTY-STATE TYPEWRITER DEMO
 * Cycles a sample card through the right column when the user hasn't started
 * filling the form yet. Stops permanently on the first real interaction.
 *
 * Reads `allExamples` (from examples-loader.js), `PALS`/`TONES`/`getToneFont`
 * (from wisprstories.js / global/fonts.js) — all top-level consts/lets, accessible
 * across non-module scripts.
 */

(function () {
  return; // DISABLED — preserved for restoration. Early exit to avoid parse cost.
  // Curated picks that showcase different scripts. Falls back to random if any
  // are missing from the loaded dataset.
  const PICKS = [
    { lang_code: "en-US", use: "occasion", palIdx: 0, displayName: "Priya" },
    { lang_code: "es-ES", use: "normal", palIdx: 1, displayName: "Margaret" },
    { lang_code: "hi-IN", use: "normal", palIdx: 5, displayName: "Aanya" },
    { lang_code: "ja-JP", use: "occasion", palIdx: 3, displayName: "Hiro" },
  ];

  const TYPING_NAME_MS = 45;
  const TYPING_TEXT_MS = 28;
  const HOLD_MS = 2600;
  const FADE_MS = 450;
  const GAP_MS = 600;
  const NAME_TO_TEXT_PAUSE_MS = 220;

  let stopped = false;
  let timers = [];

  function delay(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      timers.push(t);
    });
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function getCardEls() {
    return {
      card: document.getElementById("card"),
      bg: document.getElementById("cardBg"),
      label: document.getElementById("cardLabel"),
      text: document.getElementById("cardText"),
      wv: document.getElementById("cardWv"),
      panel: document.getElementById("cardPanel"),
      voice: document.getElementById("voiceLabel"),
      occasion: document.getElementById("cardOccasion"),
      pvw: document.querySelector(".pvw-lbl"),
    };
  }

  function getLangLabel(langCode) {
    const map = {
      "en-US": "English (US)",
      "es-ES": "Español",
      "hi-IN": "Hindi",
      "ja-JP": "Japanese",
    };
    return map[langCode] || langCode;
  }

  function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 170;
  }

  function resolveExamples() {
    if (typeof allExamples === "undefined" || !allExamples.length) return [];
    return PICKS.map((pick) => {
      const ex = allExamples.find((e) => e.lang_code === pick.lang_code);
      if (!ex) return null;
      const body = pick.use === "occasion" ? ex.occasion_example : ex.normal_example;
      return {
        name: pick.displayName,
        text: body,
        lang: pick.lang_code,
        palIdx: pick.palIdx,
      };
    }).filter(Boolean);
  }

  async function typeInto(el, str, perCharMs) {
    el.textContent = "";
    for (let i = 0; i < str.length; i++) {
      if (stopped) return;
      el.textContent = str.slice(0, i + 1);
      await delay(perCharMs);
    }
  }

  function applyDemoStyling(example) {
    const els = getCardEls();
    const color = PALS[example.palIdx] || PALS[0];

    els.card.classList.add("card-demo");
    els.card.classList.remove("card-empty");
    document.querySelector('.shell')?.classList.add('has-card');
    els.bg.style.backgroundImage = '';
    els.bg.style.background = color;

    const light = isLight(color);
    els.label.style.color = light ? "#1a1a1a" : "";
    const logoText = document.querySelector(".card-logo-text");
    if (logoText) logoText.style.color = light ? "#1a1a1a" : "";
    const domain = document.querySelector(".card-domain");
    if (domain) domain.style.color = light ? "#555548" : "";

    els.text.classList.remove("mt");
    const fontFamily = typeof getToneFont === "function"
      ? getToneFont("warm", example.text)
      : "";
    els.text.style.fontFamily = fontFamily;
    const t = (typeof TONES !== "undefined" && TONES.warm) || { fi: "normal", fw: "400", ls: "-0.02em" };
    els.text.style.fontStyle = t.fi;
    els.text.style.fontWeight = t.fw;
    els.text.style.letterSpacing = t.ls;

    if (els.voice) els.voice.style.display = "none";
  }

  function resetCardToEmpty() {
    const els = getCardEls();
    els.card.classList.add("card-empty");
    els.card.classList.remove("card-demo");
    document.querySelector('.shell')?.classList.remove('has-card');
    els.label.textContent = "";
    els.text.textContent = "";
    els.text.classList.add("mt");
    els.text.style.fontFamily = "";
    els.text.style.fontStyle = "";
    els.text.style.fontWeight = "";
    els.text.style.letterSpacing = "";
    els.label.style.color = "";
    els.bg.style.backgroundImage = "";
    els.bg.style.background = "";
    if (els.wv) els.wv.innerHTML = "";
    if (els.voice) els.voice.style.display = "";
    const logoText = document.querySelector(".card-logo-text");
    if (logoText) logoText.style.color = "";
    const domain = document.querySelector(".card-domain");
    if (domain) domain.style.color = "";
  }

  async function fadeOut() {
    const els = getCardEls();
    els.card.classList.add("card-demo-fading");
    await delay(FADE_MS);
    els.card.classList.remove("card-demo-fading");
  }

  function renderWave(text, palIdx) {
    const wv = document.getElementById("cardWv");
    if (!wv) return;
    wv.innerHTML = "";
    const len = Math.min(text.length, 150);
    const seed = text.split("").reduce((s, c) => s + c.charCodeAt(0), 7);
    const active = Math.floor((len / 150) * 35);
    const col = PALS[palIdx] || PALS[0];
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
      wv.appendChild(b);
    }
  }

  async function playOne(example) {
    if (stopped) return;
    const els = getCardEls();
    applyDemoStyling(example);

    const langLabel = getLangLabel(example.lang);
    await typeInto(els.label, example.name + " · " + langLabel, TYPING_NAME_MS);
    if (stopped) return;
    await delay(NAME_TO_TEXT_PAUSE_MS);
    if (stopped) return;
    await typeInto(els.text, example.text, TYPING_TEXT_MS);
    if (stopped) return;
    renderWave(example.text, example.palIdx);
    await delay(HOLD_MS);
    if (stopped) return;
    await fadeOut();
    if (stopped) return;
    resetCardToEmpty();
    await delay(GAP_MS);
  }

  async function loop() {
    const examples = resolveExamples();
    if (!examples.length) return;
    while (!stopped) {
      for (const ex of examples) {
        if (stopped) break;
        await playOne(ex);
      }
    }
  }

  function setPreviewLabel(text) {
    const pvw = document.querySelector(".pvw-lbl");
    if (pvw) pvw.textContent = text;
  }

  function stopDemo() {
    if (stopped) return;
    stopped = true;
    clearTimers();
    setPreviewLabel("Live preview");
    const card = document.getElementById("card");
    // Always strip transient demo classes — these can leave the card invisible
    // (opacity:0) or styled for the demo if the stop happens mid-fade.
    if (card) {
      card.classList.remove("card-demo", "card-demo-fading");
    }
    // Always undo the inline display:none we applied to the voice label.
    // wisprstories.js only sets the label's *text*, never its display, so if
    // we leave the inline style on, "Voice original / styled" stays hidden
    // forever — even on real cards.
    const voice = document.getElementById("voiceLabel");
    if (voice) voice.style.display = "";
    // If the user's stop trigger also populated the form (e.g. clicking an
    // inspiration tile, which fills sta/nin and renders the real card), leave
    // that rendered state alone. If the form is still empty, wipe demo
    // artefacts back to a clean empty placeholder.
    const sta = document.getElementById("sta");
    const nin = document.getElementById("nin");
    const formHasContent = !!((sta && sta.value.trim()) || (nin && nin.value.trim()));
    if (!formHasContent) {
      resetCardToEmpty();
    }
  }

  function userHasInputAlready() {
    const sta = document.getElementById("sta");
    const nin = document.getElementById("nin");
    return !!(sta && sta.value.trim()) || !!(nin && nin.value.trim());
  }

  function bindStopTriggers() {
    const stopOn = (el, evt) => {
      if (!el) return;
      el.addEventListener(evt, stopDemo, { once: true, passive: true });
    };
    stopOn(document.getElementById("sta"), "input");
    stopOn(document.getElementById("sta"), "focus");
    stopOn(document.getElementById("nin"), "input");
    stopOn(document.getElementById("nin"), "focus");
    stopOn(document.getElementById("recBtn"), "click");
    stopOn(document.getElementById("btnC"), "click");
    stopOn(document.getElementById("exGrid"), "click");
    stopOn(document.getElementById("toneRow"), "click");
    stopOn(document.getElementById("palRow"), "click");
    stopOn(document.getElementById("sizeRow"), "click");
    stopOn(document.getElementById("roundnessRow"), "click");
    const langBtnEl = document.getElementById("langBtn");
    if (langBtnEl) stopOn(langBtnEl, "click");
    stopOn(document.getElementById("resetBtn"), "click");
  }

  function waitForExamples() {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (typeof allExamples !== "undefined" && allExamples.length) return resolve();
        if (Date.now() - start > 8000) return resolve();
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  async function start() {
    if (userHasInputAlready()) return;
    await waitForExamples();
    if (stopped || userHasInputAlready()) return;
    setPreviewLabel("Watch: type below to make yours");
    bindStopTriggers();
    loop();
  }

  // Auto-demo disabled — see backup/demo-auto-animation.js to restore
  // if (document.readyState === "loading") {
  //   document.addEventListener("DOMContentLoaded", start);
  // } else {
  //   start();
  // }

  // Keep prefers-reduced-motion check in case demo is re-enabled
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stopped = true;
  }
})();
