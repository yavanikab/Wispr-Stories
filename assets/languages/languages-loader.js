let allLanguages = [];

// Map language codes to i18n file codes (only 23 languages have translations)
const I18N_MAP = {
  'ar-SA': 'ar', 'ar-AE': 'ar', 'ar-BH': 'ar', 'ar-DZ': 'ar', 'ar-EG': 'ar', 'ar-IQ': 'ar', 'ar-JO': 'ar', 'ar-KW': 'ar', 'ar-LB': 'ar', 'ar-LY': 'ar', 'ar-MA': 'ar', 'ar-OM': 'ar', 'ar-QA': 'ar', 'ar-SY': 'ar', 'ar-TN': 'ar', 'ar-YE': 'ar',
  'zh-CN': 'zh', 'zh-Hans': 'zh', 'zh-TW': 'zh', 'zh-HK': 'zh',
  'hi-IN': 'hi', 'hi': 'hi',
  'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es', 'es-CO': 'es', 'es-US': 'es',
  'fr-FR': 'fr', 'fr-CA': 'fr', 'fr-BE': 'fr', 'fr-CH': 'fr',
  'pt-BR': 'pt', 'pt-PT': 'pt',
  'ru-RU': 'ru', 'ru': 'ru',
  'ur-PK': 'ur', 'ur-IN': 'ur',
  'id-ID': 'id',
  'de-DE': 'de', 'de-AT': 'de', 'de-CH': 'de',
  'ja-JP': 'ja',
  'pa-IN': 'pa', 'pa-PK': 'pa',
  'ko-KR': 'ko',
  'te-IN': 'te',
  'ta-IN': 'ta', 'ta-SG': 'ta', 'ta-LK': 'ta',
  'tr-TR': 'tr',
  'it-IT': 'it', 'it-CH': 'it',
  'th-TH': 'th',
  'gu-IN': 'gu',
  'kn-IN': 'kn',
  'ml-IN': 'ml',
  'sv-SE': 'sv',
  'en-US': 'en', 'en-GB': 'en', 'en-AU': 'en', 'en-CA': 'en', 'en-IN': 'en', 'en-NZ': 'en', 'en-ZA': 'en', 'en-IE': 'en',
};

function getI18nCode(langCode) {
  return I18N_MAP[langCode] || langCode.split('-')[0] || 'en';
}

async function loadLanguages() {
  const res = await fetch('assets/languages/languages.json');
  allLanguages = await res.json();

  const dropdown = document.getElementById('langDropdown');
  const btn = document.getElementById('langBtn');
  const input = document.getElementById('langSel');

  if (dropdown && btn && input) {
    allLanguages.forEach(lang => {
      const item = document.createElement('button');
      item.className = 'lang-dropdown-item';
      item.type = 'button';
      item.innerHTML = `<i class="fi fi-${lang.flagCode}"></i><strong>${lang.label}</strong>`;
      item.onclick = () => setLanguage(lang, btn, input);
      dropdown.appendChild(item);
    });

    setLanguage(allLanguages.find(l => l.code === 'en-US') || allLanguages[0], btn, input);
    const arrow = document.querySelector('.lang-arr');
    if (arrow) {
      btn.onclick = () => {
        dropdown.classList.toggle('open');
        arrow.style.transform = dropdown.classList.contains('open') ? 'rotate(180deg)' : '';
      };
      document.onclick = e => {
        if (!e.target.closest('.lang-wrap-sel')) {
          dropdown.classList.remove('open');
          if (arrow) arrow.style.transform = '';
        }
      };
    }
  }
  document.getElementById('resetBtn')?.addEventListener('click', () => setLanguageByCode('en-US'));
  document.dispatchEvent(new Event('languagesReady'));
}

function setLanguage(lang, btn, input) {
  if (input) input.value = lang.code;
  if (btn) {
    const btnText = btn.querySelector('#langBtnText');
    if (btnText) btnText.innerHTML = `<i class="fi fi-${lang.flagCode}"></i><span>${lang.label}</span>`;
  }
  if (input) input.dispatchEvent(new Event('change', { bubbles: true }));
  // Apply i18n translations if available
  if (typeof window.applyI18n === 'function') {
    const i18nCode = getI18nCode(lang.code);
    window.applyI18n(i18nCode);
  }
  // Close dropdown
  const dropdown = document.getElementById('langDropdown');
  if (dropdown) dropdown.classList.remove('open');
  const arrow = document.querySelector('.lang-arr');
  if (arrow) arrow.style.transform = '';
}

window.setLanguageByCode = code => {
  const lang = allLanguages.find(l => l.code === code);
  if (lang) setLanguage(lang, document.getElementById('langBtn'), document.getElementById('langSel'));
};

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadLanguages) : loadLanguages();
