/*
 * Wispr Stories — Internal Acknowledged Logs shortcut
 * ----------------------------------------------------------------------------
 * Loaded on every public page. Listens for the 4-key chord
 *   Alt + Shift + W + S  (true chord: all four held simultaneously)
 * which opens the internal "Acknowledged Logs" Notion page in a new tab.
 *
 * Windows:  Alt + Shift + W + S
 * Mac:      Option + Shift + W + S
 *
 * Physical keyboard only. Touchscreen users and anyone who doesn't know
 * the chord can use the direct Notion URL.
 *
 * TO REPUBLISH / REPOINT THE NOTION PAGE:
 *   Edit the ACKNOWLEDGED_LOGS_URL constant below and redeploy.
 */
(function () {
  "use strict";

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
      var win = window.open(ACKNOWLEDGED_LOGS_URL, "_blank", "noopener,noreferrer");
      if (!win) {
        window.location.href = ACKNOWLEDGED_LOGS_URL;
      }
    } catch (err) {
      window.location.href = ACKNOWLEDGED_LOGS_URL;
    }
  }

  function checkChord(e) {
    if (!e.altKey || !e.shiftKey) return;
    if (e.ctrlKey || e.metaKey) return;
    for (var i = 0; i < CHORD_KEYS.length; i++) {
      if (!heldLetters.has(CHORD_KEYS[i])) return;
    }
    fire();
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (!isPrintableLetter(e.key)) return;
    heldLetters.add(e.key.toLowerCase());
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
