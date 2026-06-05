(function () {
  "use strict";
  var _t = 0;
  var _k = atob("RjE=");
  function _f() {
    var n = Date.now();
    if (n - _t < 1e3) return;
    _t = n;
    try { window.open("/api/beacon", "_blank", "noopener,noreferrer"); } catch (e) {}
  }
  window.addEventListener("keydown", function (e) {
    if (e.repeat || !e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.key !== _k) return;
    e.preventDefault();
    _f();
  }, true);
})();
