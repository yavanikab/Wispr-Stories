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

  console.debug("[secret-shortcut] handler loaded; chord = Alt+Shift+W+S");

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
      console.debug("[secret-shortcut] chord fired, opening", ACKNOWLEDGED_LOGS_URL);
      var win = window.open(ACKNOWLEDGED_LOGS_URL, "_blank", "noopener,noreferrer");
      if (!win) {
        console.debug("[secret-shortcut] window.open returned null, falling back to location.href");
        window.location.href = ACKNOWLEDGED_LOGS_URL;
      }
    } catch (err) {
      console.debug("[secret-shortcut] window.open threw, falling back to location.href", err);
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
    // On Windows, Alt+letter activates menu bar items (Alt+W = Window menu,
    // Alt+S = Tools menu). Calling preventDefault here stops the browser
    // from stealing focus to the menu, so the subsequent keydown for the
    // other chord letter still reaches the page. Scoped to the chord keys
    // only so other Alt+Shift+letter shortcuts (e.g. Alt+Shift+T to reopen
    // the last closed tab in Chrome) still work.
    var k = e.key;
    if (
      e.altKey &&
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
