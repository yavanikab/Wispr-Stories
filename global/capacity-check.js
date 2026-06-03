// Shared capacity-check for all pages. On load, checks /api/usage.
// If the daily user cap is reached, shows a full-screen overlay on every page.

(function() {
  // Parse admin secret from URL hash (e.g., #ws-admin=mysecret)
  try {
    var _m = window.location.hash.match(/^#ws-admin=(.+)$/);
    if (_m && _m[1]) {
      localStorage.setItem('wsAdminSecret', _m[1]);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch (_e) {}

  // Get or create session ID (wrapped in try/catch for blocked localStorage)
  var sid;
  try { sid = localStorage.getItem('wsSessionId'); } catch (_e) {}
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem('wsSessionId', sid); } catch (_e) {}
  }

  // Build headers for the /api/usage request
  var headers = { 'Content-Type': 'application/json' };

  // Include admin secret header if available
  var adminSecret;
  try { adminSecret = localStorage.getItem('wsAdminSecret'); } catch (_e) {}
  if (adminSecret) {
    headers['X-Admin-Secret'] = adminSecret;
  }

  // Include Pro key header (server validates it — no separate /api/pro-status call needed)
  var storedKey;
  try { storedKey = sessionStorage.getItem('wsProKey'); } catch (_e) {}
  var isPro = !!storedKey;
  if (storedKey) {
    headers['X-Pro-Key'] = storedKey;
  }

  // Call /api/usage
  fetch('/api/usage', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ sessionId: sid, isPro: isPro }),
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && !data.allowed) {
        var resetMsg = 'Check back at midnight UTC.';
        if (data.resetsAt) {
          var diff = new Date(data.resetsAt) - new Date();
          if (diff > 0 && diff < 3600000) {
            resetMsg = 'We\u2019ll be back in about ' + Math.ceil(diff / 60000) + ' minute' + (Math.ceil(diff / 60000) !== 1 ? 's' : '') + '.';
          }
        }
        showCapacityOverlay(resetMsg);
      }
    })
    .catch(function(e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Cap] Usage check failed:', e && e.message ? e.message : e);
      }
    });

  function showCapacityOverlay(resetText) {
    if (document.getElementById('capacityPageGlobal')) return;

    var el = document.createElement('div');
    el.id = 'capacityPageGlobal';
    el.className = 'capacity-page show';
    el.innerHTML =
      '<div class="capacity-page-content">' +
        '<div class="capacity-page-icon"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Growing%20Heart.png" alt="" width="72" height="72"></div>' +
        '<h1 class="capacity-page-title">We\u2019re overwhelmed with love!</h1>' +
        '<p class="capacity-page-text">Thank you for the incredible response! We\u2019ve hit our daily limit.</p>' +
        '<p class="capacity-page-reset" id="capResetText">' + resetText + '</p>' +
        '<div class="capacity-page-actions">' +
          '<button class="capacity-page-btn" onclick="window.location.reload()">Check if we\u2019re back</button>' +
        '</div>' +
        '<p class="capacity-page-footer">Wispr Stories &mdash; made for <a href="https://wisprflow.ai/r?BEST76" target="_blank" rel="noopener"><strong><em>Wispr Flow</em></strong></a></p>' +
      '</div>';

    document.documentElement.appendChild(el);
    document.body.style.overflow = 'hidden';
  }
})();
