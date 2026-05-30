// i18n.js — Internationalization loader for Wispr Stories
// Loads translations from assets/i18n/{code}.json and applies to [data-i18n] elements.

(function() {
  var _cache = {};
  var _currentLang = 'en';
  /* No reveal-timeout needed — the document is never hidden. English
     defaults render on first paint; translations swap in when ready. */

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
      /* Notify dynamic listeners (e.g. speechLang trigger, mic state) */
      window.dispatchEvent(new CustomEvent('i18nApplied', { detail: { code: code } }));
    });
  };

  window.getCurrentI18nLang = function() { return _currentLang; };

  // Synchronous lookup for already-loaded translations. Returns the string
  // for a dot-path key in the current language's cache, or undefined if the
  // cache hasn't loaded yet or the key doesn't exist. Falls back to the
  // English cache for missing keys in non-English locales. Used by callers
  // that need to insert a localized value into a freshly-created element
  // (e.g. the Style chip summary) outside the [data-i18n] flow.
  window.getI18nSync = function(key) {
    var cur = _cache[_currentLang];
    if (cur) {
      var v = resolveKey(cur, key);
      if (v != null) return v;
    }
    var en = _cache['en'];
    if (en) {
      var fv = resolveKey(en, key);
      if (fv != null) return fv;
    }
    return undefined;
  };
})();
