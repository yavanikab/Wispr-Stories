let allLanguages = [];

async function loadLanguages() {
  const res = await fetch('assets/languages/languages.json');
  allLanguages = await res.json();

  const dropdown = document.getElementById('langDropdown');
  const btn = document.getElementById('langBtn');
  const input = document.getElementById('langSel');

  allLanguages.forEach(lang => {
    const item = document.createElement('button');
    item.className = 'lang-dropdown-item';
    item.type = 'button';
    item.innerHTML = `<i class="fi fi-${lang.flagCode}"></i><strong>${lang.label}</strong>`;
    item.onclick = () => setLanguage(lang, btn, input);
    dropdown.appendChild(item);
  });

  setLanguage(allLanguages.find(l => l.code === 'en-US'), btn, input);
  const arrow = document.querySelector('.lang-arr');
  btn.onclick = () => {
    dropdown.classList.toggle('open');
    arrow.style.transform = dropdown.classList.contains('open') ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)';
  };
  document.onclick = e => {
    if (!e.target.closest('.lang-wrap-sel')) {
      dropdown.classList.remove('open');
      arrow.style.transform = 'translateY(-50%)';
    }
  };
  document.getElementById('resetBtn')?.addEventListener('click', () => setLanguageByCode('en-US'));
  document.dispatchEvent(new Event('languagesReady'));
}

function setLanguage(lang, btn, input) {
  input.value = lang.code;
  btn.querySelector('#langBtnText').innerHTML = `<i class="fi fi-${lang.flagCode}"></i><span>${lang.label}</span>`;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

window.setLanguageByCode = code => {
  const lang = allLanguages.find(l => l.code === code);
  if (lang) setLanguage(lang, document.getElementById('langBtn'), document.getElementById('langSel'));
};

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadLanguages) : loadLanguages();
