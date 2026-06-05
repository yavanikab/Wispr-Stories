/*
 * Wispr Stories — Internal Acknowledged Logs shortcut
 * ----------------------------------------------------------------------------
 * Loaded on every public page. Listens for Alt + F1 and opens the internal
 * "Acknowledged Logs" Notion page in a new tab.
 *
 * Works on Windows, Mac, and Linux. Physical keyboard only.
 *
 * TO REPUBLISH / REPOINT THE NOTION PAGE:
 *   Edit the ACKNOWLEDGED_LOGS_URL constant below and redeploy.
 */
(function () {
  "use strict";

  console.log("[secret-shortcut] handler loaded; shortcut = Alt+F1");

  var ACKNOWLEDGED_LOGS_URL =
    "https://wisprstories.notion.site/wisprstories-ackologs";

  // Deduplication guard — prevents double-open if the browser fires the
  // keydown more than once (e.g. Alt+F1 triggering both our handler and
  // a browser default before preventDefault takes full effect).
  var _lastFired = 0;

  function fire() {
    var now = Date.now();
    if (now - _lastFired < 1000) return;
    _lastFired = now;
    console.log("[secret-shortcut] shortcut fired, opening", ACKNOWLEDGED_LOGS_URL);
    window.open(ACKNOWLEDGED_LOGS_URL, "_blank", "noopener,noreferrer");
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key === "F1") {
      e.preventDefault();
      fire();
    }
  }

  window.addEventListener("keydown", onKeyDown, true);
})();
