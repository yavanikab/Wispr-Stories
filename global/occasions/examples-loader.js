// Inspiration grid loader.
//
// Data model:
//   languages.json  — language metadata + a generic "normal_example"
//   occasions.json  — each occasion declares its image, triggers, AND a
//                     per-language `examples` object. The keys of `examples`
//                     ARE the cultural scope: Diwali only has Indian-language
//                     keys, so Diwali literally cannot render in French.
//
// Render rules:
//   - Pick N slots (4 mobile, 9 desktop), roughly 50/50 message vs occasion.
//   - Each render's language ids are tracked in a Set so no language appears
//     twice in the same render.
//   - Occasions are also de-duped within a render.
//   - Add a new occasion image → add one entry to occasions.json. Done.
//   - Add a new language to an existing occasion → add one key to that
//     occasion's `examples` object. Done. No other code changes needed.

let LANGUAGES = [];
let OCCASIONS = [];

async function loadExamples() {
  try {
    showLoading(document.getElementById('exGrid'));
    const [langRes, occRes] = await Promise.all([
      fetch('global/occasions/languages.json'),
      fetch('global/occasions/occasions.json'),
    ]);
    LANGUAGES = await langRes.json();
    OCCASIONS = await occRes.json();
    renderRandomExamples();
    window._examplePrompts = LANGUAGES.map(function(l) { return l.normal_example; }).filter(Boolean);
  } catch (error) {
    console.error('Error loading examples:', error);
  }
}

function showLoading(exGrid) {
  if (!exGrid) return;
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
  if (!exGrid || LANGUAGES.length === 0) return;
  exGrid.innerHTML = '';

  const isMobile = window.innerWidth <= 720;
  const count = isMobile ? 8 : 9;
  const occasionCount = Math.floor(count / 2);
  const messageCount = count - occasionCount;

  // Index languages by id for O(1) lookup.
  const langById = {};
  LANGUAGES.forEach((l) => { langById[l.id] = l; });

  const usedLangIds = new Set();
  const usedOccasionIds = new Set();
  const items = [];

  // -- Occasion slots first (more constrained because they depend on the
  // occasion having an example for an available language). --
  const occasionsWithExamples = OCCASIONS.filter(
    (o) => o.examples && Object.keys(o.examples).length > 0,
  );
  const shuffledOccasions = [...occasionsWithExamples].sort(() => Math.random() - 0.5);

  let placedOccasions = 0;
  for (const occ of shuffledOccasions) {
    if (placedOccasions >= occasionCount) break;
    if (usedOccasionIds.has(occ.id)) continue;

    // Eligible language ids = ones this occasion has an example for AND
    // not already used in this render AND known in languages.json.
    const eligibleIds = Object.keys(occ.examples).filter(
      (id) => !usedLangIds.has(id) && langById[id],
    );
    if (eligibleIds.length === 0) continue;

    const chosenId = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
    const lang = langById[chosenId];
    usedLangIds.add(chosenId);
    usedOccasionIds.add(occ.id);
    items.push({
      type: 'occasion',
      occasion: occ,
      lang,
      text: occ.examples[chosenId],
    });
    placedOccasions++;
  }

  // -- Message slots: fill remaining capacity with random unused languages. --
  const remainingLangs = LANGUAGES.filter((l) => !usedLangIds.has(l.id));
  remainingLangs.sort(() => Math.random() - 0.5);
  for (let i = 0; i < messageCount && i < remainingLangs.length; i++) {
    const lang = remainingLangs[i];
    items.push({
      type: 'message',
      lang,
      text: lang.normal_example,
    });
  }

  // If we couldn't fill occasion slots (e.g., few occasions left), backfill
  // with extra messages so the grid never looks half-empty.
  while (items.length < count) {
    const stillRemaining = LANGUAGES.filter((l) => !usedLangIds.has(l.id));
    if (stillRemaining.length === 0) break;
    const lang = stillRemaining[Math.floor(Math.random() * stillRemaining.length)];
    usedLangIds.add(lang.id);
    items.push({ type: 'message', lang, text: lang.normal_example });
  }

  // Shuffle so occasion vs message slots are interleaved randomly in the grid.
  items.sort(() => Math.random() - 0.5);

  items.forEach((item) => {
    const tone = ['warm', 'bold', 'poetic', 'playful', 'reflective', 'honest'][
      Math.floor(Math.random() * 6)
    ];
    const palette = Math.floor(Math.random() * 6);

    const btn = document.createElement('button');
    btn.className = 'ec wave-trigger';
    btn.setAttribute('data-text', item.text);
    btn.setAttribute('data-name', 'Yourname');
    btn.setAttribute('data-tone', tone);
    btn.setAttribute('data-p', palette);
    // Convert locale code (e.g., "fr-FR") to short code (e.g., "fr")
    // to match allLanguages[].code in assets/languages/languages.json
    const shortCode = item.lang.lang_code.split('-')[0];

    btn.setAttribute('data-lang', shortCode);

    const flagHtml = `<i class="fi fi-${item.lang.flag_code}" aria-hidden="true"></i>`;
    const isOccasion = item.type === 'occasion';
    const icon = isOccasion
      ? '<i class="fa-solid fa-gift" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-message" aria-hidden="true"></i>';
    const typeLabel = isOccasion ? 'Occasion' : 'Message';
    const article = isOccasion ? 'an' : 'a';

    btn.setAttribute(
      'aria-label',
      `Try ${article} ${typeLabel.toLowerCase()} example in ${item.lang.lang_name}`,
    );
    btn.innerHTML =
      `<div class="ec-tag">${flagHtml} <span class="ec-lang" data-wave-child>${item.lang.lang_name}</span></div>` +
      `<div class="ec-title">${icon} ${typeLabel}</div>`;

    exGrid.appendChild(btn);
  });

  if (typeof bindHoverWave === 'function') bindHoverWave(exGrid);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', loadExamples)
  : loadExamples();

// Re-render when crossing the mobile/desktop breakpoint so the grid switches
// between 2x4 (8 items) and 3x3 (9 items). Without this, dev-tools resize
// keeps the count chosen at initial load.
let _exPrevMobile = window.innerWidth <= 720;
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 720;
  if (nowMobile !== _exPrevMobile && LANGUAGES.length > 0) {
    _exPrevMobile = nowMobile;
    renderRandomExamples();
  }
});
