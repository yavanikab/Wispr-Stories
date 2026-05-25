let allLanguages = [];

// Languages that use Latin script (wave animation is safe)
const LATIN_LANGS = ['en', 'es', 'fr', 'pt', 'id', 'de', 'tr', 'it', 'sv'];

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
    allLanguages.forEach(function(lang) {
      var item = document.createElement('button');
      item.className = 'lang-dropdown-item';
      item.type = 'button';
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

    // Restore saved language or default to English
    var savedLang = localStorage.getItem('wsLang');
    var defaultLang = savedLang ? allLanguages.find(function(l) { return l.code === savedLang; }) : null;
    if (!defaultLang) defaultLang = allLanguages.find(function(l) { return l.code === 'en'; }) || allLanguages[0];
    setLanguage(defaultLang, btn, input);
  }

  document.dispatchEvent(new Event('languagesReady'));
}

function setLanguage(lang, btn, input) {
  if (input) input.value = lang.code;
  if (btn) {
    var btnText = document.getElementById('langBtnText');
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-globe"></i> Language';
  }
  if (input) input.dispatchEvent(new Event('change', { bubbles: true }));

  // Persist language selection
  localStorage.setItem('wsLang', lang.code);

  // Apply i18n translations
  if (typeof window.applyI18n === 'function' && lang.i18nCode) {
    window.applyI18n(lang.i18nCode);
  }

  var dropdown = document.getElementById('langDropdown');
  if (dropdown) dropdown.classList.remove('open');
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
