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

  function fire() {
    try {
      console.log("[secret-shortcut] shortcut fired, opening", ACKNOWLEDGED_LOGS_URL);
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

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key === "F1") {
      e.preventDefault();
      fire();
    }
  }

  window.addEventListener("keydown", onKeyDown, true);
})();
