// i18n.js — Internationalization loader for Wispr Stories
// Loads translations from assets/i18n/{code}.json and applies to [data-i18n] elements.

(function() {
  var _cache = {};
  var _currentLang = 'en';
  var _showTimeout = setTimeout(function() {
    document.documentElement.style.visibility = '';
    document.documentElement.style.opacity = '';
  }, 3000);

  function loadTranslations(code) {
    if (_cache[code]) return Promise.resolve(_cache[code]);
    return fetch('assets/i18n/' + code + '.json')
      .then(function(res) {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(function(data) {
        _cache[code] = data;
        return data;
      })
      .catch(function(e) {
        if (code !== 'en') {
          console.warn('[i18n] Missing ' + code + '.json, falling back to en');
          return loadTranslations('en');
        }
        return {};
      });
  }

  function resolveKey(obj, key) {
    var parts = key.split('.');
    var val = obj;
    for (var i = 0; i < parts.length; i++) {
      if (val == null) return undefined;
      val = val[parts[i]];
    }
    return val;
  }

  function applyToElement(el, translations) {
    var key = el.getAttribute('data-i18n');
    var val = resolveKey(translations, key);
    if (!val) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.tagName === 'IMG') {
      el.alt = val;
    } else {
      el.innerHTML = val;
    }
  }

  window.applyI18n = function(code) {
    _currentLang = code;
    return loadTranslations(code).then(function(translations) {
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        applyToElement(el, translations);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-placeholder');
        var val = resolveKey(translations, key);
        if (val) el.placeholder = val;
      });
      document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-title');
        var val = resolveKey(translations, key);
        if (val) el.title = val;
      });
      // Show page after language is applied
      clearTimeout(_showTimeout);
      document.documentElement.style.visibility = '';
      document.documentElement.style.opacity = '';
    });
  };

  window.getCurrentI18nLang = function() { return _currentLang; };
})();
