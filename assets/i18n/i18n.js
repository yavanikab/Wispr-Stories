// i18n.js — Internationalization loader for Wispr Stories
// Loads translations from assets/i18n/{code}.json and applies to [data-i18n] elements.

(function() {
  const _cache = {};
  const RTL_LANGS = ['ar', 'ur'];
  let _currentLang = 'en';

  async function loadTranslations(code) {
    if (_cache[code]) return _cache[code];
    try {
      const res = await fetch('assets/i18n/' + code + '.json');
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      _cache[code] = data;
      return data;
    } catch (e) {
      if (code !== 'en') {
        console.warn('[i18n] Missing ' + code + '.json, falling back to en');
        return loadTranslations('en');
      }
      return {};
    }
  }

  function resolveKey(obj, key) {
    const parts = key.split('.');
    let val = obj;
    for (const p of parts) {
      if (val == null) return undefined;
      val = val[p];
    }
    return val;
  }

  window.applyI18n = async function(code) {
    const translations = await loadTranslations(code);
    const langTag = code.split('-')[0];
    _currentLang = langTag;

    if (RTL_LANGS.includes(langTag)) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = code;
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = code;
    }

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      const key = el.getAttribute('data-i18n');
      const val = resolveKey(translations, key);
      if (val) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = val;
        } else if (el.tagName === 'IMG') {
          el.alt = val;
        } else {
          el.innerHTML = val;
        }
      }
    });

    // Handle placeholder translations
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = resolveKey(translations, key);
      if (val) el.placeholder = val;
    });

    // Handle title/tooltip translations
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      const key = el.getAttribute('data-i18n-title');
      const val = resolveKey(translations, key);
      if (val) el.title = val;
    });

    // Handle aria-label translations
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      const key = el.getAttribute('data-i18n-aria');
      const val = resolveKey(translations, key);
      if (val) el.setAttribute('aria-label', val);
    });
  };

  window.getCurrentI18nLang = function() { return _currentLang; };
})();
