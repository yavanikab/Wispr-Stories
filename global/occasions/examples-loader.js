let allExamples = [];

async function loadExamples() {
  try {
    showLoading(document.getElementById('exGrid'));
    const res = await fetch('global/occasions/examples.json');
    allExamples = await res.json();
    renderRandomExamples();
  } catch (error) {
    console.error('Error loading examples:', error);
  }
}

function showLoading(exGrid) {
  exGrid.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const s = document.createElement('div');
    s.className = 'ec-skeleton';
    s.innerHTML = '<div class="ec-skeleton-line"></div><div class="ec-skeleton-line short"></div>';
    exGrid.appendChild(s);
  }
}

function renderRandomExamples() {
  const exGrid = document.getElementById('exGrid');
  if (!exGrid || allExamples.length === 0) return;

  exGrid.innerHTML = '';

  // Select random languages without duplicates
  const isMobile = window.innerWidth <= 720;
  const count = Math.min(isMobile ? 8 : 9, allExamples.length);
  const shuffled = [...allExamples].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Create balanced array of message/occasion types
  // Roughly 50/50 split: ~4-5 of each type
  const types = [];
  const occasionCount = Math.floor(count / 2);
  const messageCount = count - occasionCount;
  for (let i = 0; i < messageCount; i++) types.push(false); // false = message
  for (let i = 0; i < occasionCount; i++) types.push(true);  // true = occasion
  // Shuffle the types array
  types.sort(() => Math.random() - 0.5);

  selected.forEach((example, idx) => {
    const useOccasion = types[idx];
    const text = useOccasion ? example.occasion_example : example.normal_example;
    const tone = ['warm', 'bold', 'poetic', 'playful', 'reflective', 'honest'][Math.floor(Math.random() * 6)];
    const palette = Math.floor(Math.random() * 6);

    const btn = document.createElement('button');
    btn.className = 'ec wave-trigger';
    btn.setAttribute('data-text', text);
    btn.setAttribute('data-name', 'Your name');
    btn.setAttribute('data-tone', tone);
    btn.setAttribute('data-p', palette);
    btn.setAttribute('data-lang', example.lang_code);

    const flagHtml = `<i class="fi fi-${example.flag_code}" aria-hidden="true"></i>`;
    const emoji = useOccasion ? '<i class="fa-solid fa-gift" aria-hidden="true"></i>' : '<i class="fa-solid fa-message" aria-hidden="true"></i>';
    const typeLabel = useOccasion ? 'Occasion' : 'Message';
    const article = useOccasion ? 'an' : 'a';
    btn.setAttribute('aria-label', `Try ${article} ${typeLabel.toLowerCase()} example in ${example.lang_name}`);
    btn.innerHTML = `<div class="ec-tag">${flagHtml} <span class="ec-lang" data-wave-child>${example.lang_name}</span></div><div class="ec-title">${emoji} ${typeLabel}</div>`;

    exGrid.appendChild(btn);
  });

  if (typeof bindHoverWave === 'function') bindHoverWave(exGrid);
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadExamples) : loadExamples();

// Re-render when crossing the mobile/desktop breakpoint so the grid switches
// between 2x4 (8 items) and 3x3 (9 items). Without this, dev-tools resize
// keeps the count chosen at initial load.
let _exPrevMobile = window.innerWidth <= 720;
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 720;
  if (nowMobile !== _exPrevMobile && allExamples.length > 0) {
    _exPrevMobile = nowMobile;
    renderRandomExamples();
  }
});
