/*
 * Wispr Stories — Internal Acknowledged Logs shortcut
 * ----------------------------------------------------------------------------
 * Loaded on every public page. Listens for the 4-key chord
 *   Ctrl + Shift + W + S  (true chord: all four held simultaneously)
 * which opens the internal "Acknowledged Logs" Notion page in a new tab.
 *
 * Works the same on Windows, Mac, and Linux.
 *
 * Physical keyboard only. Touchscreen users and anyone who doesn't know
 * the chord can use the direct Notion URL.
 *
 * NOTE: Ctrl+Shift+W closes the browser window by default on Windows/Linux,
 * and Ctrl+Shift+S triggers "Save As". We call e.preventDefault() for both
 * chord keys so those browser defaults are suppressed while the chord builds.
 *
 * TO REPUBLISH / REPOINT THE NOTION PAGE:
 *   Edit the ACKNOWLEDGED_LOGS_URL constant below and redeploy.
 */
(function () {
  "use strict";

  console.log("[secret-shortcut] handler loaded; chord = Ctrl+Shift+W+S");

  var ACKNOWLEDGED_LOGS_URL =
    "https://wisprstories.notion.site/wisprstories-ackologs";

  var CHORD_KEYS = ["w", "s"];
  var heldLetters = new Set();

  function isPrintableLetter(key) {
    return typeof key === "string" && /^[a-zA-Z]$/.test(key);
  }

  function fire() {
    heldLetters.clear();
    try {
      console.log("[secret-shortcut] chord fired, opening", ACKNOWLEDGED_LOGS_URL);
      var win = window.open(ACKNOWLEDGED_LOGS_URL, "_blank", "noopener,noreferrer");
      if (!win) {
        console.log("[secret-shortcut] window.open returned null, falling back to location.href");
        window.location.href = ACKNOWLEDGED_LOGS_URL;
      }
    } catch (err) {
      console.log("[secret-shortcut] window.open threw, falling back to location.href", err);
      window.location.href = ACKNOWLEDGED_LOGS_URL;
    }
  }

  function checkChord(e) {
    if (!e.ctrlKey || !e.shiftKey) return;
    if (e.altKey || e.metaKey) return;
    for (var i = 0; i < CHORD_KEYS.length; i++) {
      if (!heldLetters.has(CHORD_KEYS[i])) return;
    }
    fire();
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    // Ctrl+Shift+W closes the browser window (Windows/Linux) and Ctrl+Shift+S
    // triggers "Save As". Suppress those defaults for the two chord keys only,
    // so other Ctrl+Shift shortcuts (e.g. Ctrl+Shift+T reopen tab) still work.
    var k = e.key;
    if (
      e.ctrlKey &&
      e.shiftKey &&
      (k === "w" || k === "W" || k === "s" || k === "S")
    ) {
      e.preventDefault();
    }
    if (!isPrintableLetter(k)) return;
    heldLetters.add(k.toLowerCase());
    checkChord(e);
  }

  function onKeyUp(e) {
    if (!isPrintableLetter(e.key)) return;
    heldLetters.delete(e.key.toLowerCase());
  }

  function onBlur() {
    heldLetters.clear();
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur, true);
})();
