let allLanguages = [];

// Languages that use Latin script (wave animation is safe)
const LATIN_LANGS = ['en', 'es', 'fr', 'pt', 'id', 'de', 'tr', 'it', 'sv', 'el', 'ca', 'cs', 'nl', 'da', 'fi', 'pl', 'hu', 'vi', 'ms', 'tl'];

// Languages shown in the nav-bar PAGE-LANGUAGE (i18n) dropdown — ONLY those that
// have a translation file in assets/i18n/. This is deliberately a small subset
// and is COMPLETELY SEPARATE from the speech-language picker, which offers every
// language in languages.json. Do not confuse the two: editing this list changes
// only the page-translation dropdown, never the speech languages.
const I18N_DISPLAY_LANGS = ['en', 'zh', 'hi', 'es', 'ja', 'ko', 'te', 'ta', 'it', 'th', 'kn'];
window.I18N_DISPLAY_LANGS = I18N_DISPLAY_LANGS;

window.isLatinScript = function(code) {
  return LATIN_LANGS.indexOf(code) !== -1;
};

async function loadLanguages() {
  try {
    const res = await fetch('assets/languages/languages.json');
    allLanguages = await res.json();
  } catch (e) {
    console.warn('[Lang] Failed to load languages.json:', e);
    return;
  }

  var dropdown = document.getElementById('langDropdown');
  var btn = document.getElementById('langBtn');
  var input = document.getElementById('langSel');

  if (dropdown && btn && input) {
    // Only the translated languages appear here (English pinned first, the rest
    // alphabetical by English label). The speech picker is built separately from
    // the full list and is unaffected by this filtering.
    var displayLangs = allLanguages
      .filter(function(lang) { return I18N_DISPLAY_LANGS.indexOf(lang.code) !== -1; })
      .sort(function(a, b) {
        if (a.code === 'en') return -1;
        if (b.code === 'en') return 1;
        return a.label.localeCompare(b.label);
      });
    displayLangs.forEach(function(lang) {
      var item = document.createElement('button');
      item.className = 'lang-dropdown-item';
      item.type = 'button';
      item.dataset.code = lang.code;
      item.onclick = function() { setLanguage(lang, btn, input); };
      if (lang.code === 'en') {
        item.textContent = lang.label;
      } else {
        var nn = document.createElement('span');
        nn.className = 'ldi-native';
        nn.textContent = lang.nativeName;
        var en = document.createElement('span');
        en.className = 'ldi-en';
        en.textContent = lang.label;
        item.appendChild(nn);
        item.appendChild(document.createTextNode(' - '));
        item.appendChild(en);
      }
      dropdown.appendChild(item);
    });

    // Restore saved language or default to English. Ignore a saved language that
    // is no longer in the translated set (e.g. left over from before this list
    // was trimmed) so the page doesn't show a stale flag with English text.
    var savedLang = localStorage.getItem('wsLang');
    var defaultLang = (savedLang && I18N_DISPLAY_LANGS.indexOf(savedLang) !== -1)
      ? allLanguages.find(function(l) { return l.code === savedLang; })
      : null;
    if (!defaultLang) defaultLang = allLanguages.find(function(l) { return l.code === 'en'; }) || allLanguages[0];
    setLanguage(defaultLang, btn, input);
  }

  document.dispatchEvent(new Event('languagesReady'));
}

function setLanguage(lang, btn, input) {
  if (input) input.value = lang.code;
  if (btn) {
    var btnText = document.getElementById('langBtnText');
    if (btnText) {
      if (lang.code === 'en') {
        btnText.innerHTML = '<i class="fa-solid fa-globe"></i> Lang';
      } else {
        btnText.innerHTML = '<i class="fa-solid fa-globe"></i> <i class="fi fi-' + lang.flagCode + '"></i>';
      }
    }
  }
  if (input) input.dispatchEvent(new Event('change', { bubbles: true }));

  // Persist language selection
  localStorage.setItem('wsLang', lang.code);

  // Apply i18n translations
  if (typeof window.applyI18n === 'function' && lang.i18nCode) {
    window.applyI18n(lang.i18nCode);
  }

  // Update checkmark in dropdown
  var dropdown = document.getElementById('langDropdown');
  if (dropdown) {
    var items = dropdown.querySelectorAll('.lang-dropdown-item');
    items.forEach(function(item) { item.classList.remove('selected'); });
    var selected = dropdown.querySelector('.lang-dropdown-item[data-code="' + lang.code + '"]');
    if (selected) selected.classList.add('selected');
    dropdown.classList.remove('open');
  }
}

window.setLanguageByCode = function(code) {
  var lang = allLanguages.find(function(l) { return l.code === code; });
  if (lang) setLanguage(lang, document.getElementById('langBtn'), document.getElementById('langSel'));
};

function initLangDropdown() {
  var btn = document.getElementById('langBtn');
  if (btn) {
    btn.addEventListener('click', function() {
      var dropdown = document.getElementById('langDropdown');
      if (dropdown) dropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.lang-wrap-sel')) {
      var dropdown = document.getElementById('langDropdown');
      if (dropdown) dropdown.classList.remove('open');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadLanguages();
    initLangDropdown();
  });
} else {
  loadLanguages();
  initLangDropdown();
}
