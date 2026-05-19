let allLanguages = [];

async function loadLanguages() {
  try {
    const res = await fetch('assets/languages/languages.json');
    allLanguages = await res.json();
  } catch (e) {
    console.warn('[Lang] Failed to load languages.json:', e);
    return;
  }

  const dropdown = document.getElementById('langDropdown');
  const btn = document.getElementById('langBtn');
  const input = document.getElementById('langSel');

  if (dropdown && btn && input) {
    allLanguages.forEach(lang => {
      const item = document.createElement('button');
      item.className = 'lang-dropdown-item';
      item.type = 'button';
      item.innerHTML = '<i class="fi fi-' + lang.flagCode + '"></i><strong>' + lang.label + '</strong>';
      item.onclick = function() { setLanguage(lang, btn, input); };
      dropdown.appendChild(item);
    });

    var defaultLang = allLanguages.find(function(l) { return l.code === 'en'; }) || allLanguages[0];
    setLanguage(defaultLang, btn, input);
  }

  document.getElementById('resetBtn') && document.getElementById('resetBtn').addEventListener('click', function() {
    setLanguageByCode('en');
  });
  document.dispatchEvent(new Event('languagesReady'));
}

function setLanguage(lang, btn, input) {
  if (input) input.value = lang.code;
  if (btn) {
    var btnText = document.getElementById('langBtnText');
    if (btnText) btnText.innerHTML = '<i class="fi fi-' + lang.flagCode + '"></i><span>' + lang.label + '</span>';
  }
  if (input) input.dispatchEvent(new Event('change', { bubbles: true }));
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

document.getElementById('langBtn').addEventListener('click', function() {
  var dropdown = document.getElementById('langDropdown');
  if (dropdown) dropdown.classList.toggle('open');
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.lang-wrap-sel')) {
    var dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLanguages);
} else {
  loadLanguages();
}
