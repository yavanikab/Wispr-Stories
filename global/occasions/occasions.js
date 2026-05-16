let OCCASION_TRIGGERS = [];
let DATE_OCCASIONS = {};
let COUNTRY_MAPPING = {};

async function loadOccasions() {
  try {
    const [occRes, dateRes, countryRes] = await Promise.all([
      fetch('global/occasions/occasions.json'),
      fetch('global/occasions/date-occasions.json'),
      fetch('global/occasions/country-mapping.json')
    ]);

    OCCASION_TRIGGERS = await occRes.json();
    DATE_OCCASIONS = await dateRes.json();
    COUNTRY_MAPPING = await countryRes.json();
    if(typeof checkOccasions==='function')checkOccasions();
  } catch (error) {
    console.error('Error loading occasions:', error);
  }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadOccasions) : loadOccasions();

function sanitizeText(text) {
  if (!text) return '';
  text = text.replace(/[\p{Emoji}\p{Emoji_Component}]/gu, ' ');
  text = text.normalize('NFC');
  text = text.replace(/[‎‏؜‪‫‬‭‮⁦⁧⁨⁩؛۝‌‍﻿]/g, ' ');
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/[''ʼ＇՞׳′‵]/g, "'");
  return text.toLowerCase().trim();
}

function isWordBoundary(text, idx, forward) {
  const pos = forward ? idx : idx - 1;
  if (pos < 0 || pos >= text.length) return true;
  const c = text[pos];
  return /[\s\p{P}]/u.test(c);
}

function findOccasionMatch(text, triggers){
  const sanitized = sanitizeText(text);
  if(!sanitized) return -1;
  let earliest = -1;

  for(const p of triggers){
    // Check if trigger is a regex pattern (wrapped in forward slashes)
    if(typeof p === 'string' && p.startsWith('/') && p.lastIndexOf('/') > 0){
      // Extract regex pattern and flags
      const lastSlashIdx = p.lastIndexOf('/');
      const patternStr = p.substring(1, lastSlashIdx);
      const flags = p.substring(lastSlashIdx + 1);

      try {
        const regex = new RegExp(patternStr, flags || '');
        const match = sanitized.match(regex);

        if(match && match.index !== undefined){
          const idx = match.index;
          if(idx === 0) return 0;

          let pre = idx - 1;
          while(pre >= 0 && /\s/.test(sanitized[pre])) pre--;

          if(pre < 0){
            if(earliest === -1 || idx < earliest) earliest = idx;
          } else {
            const c = sanitized[pre];
            if(".!?\n—\"':;,¿¡。、，！？：；」』】》।آ،،：；".indexOf(c) !== -1){
              if(earliest === -1 || idx < earliest) earliest = idx;
            }
          }
        }
      } catch(e) {
        console.warn('Invalid regex pattern:', p, e);
      }
    } else {
      // Standard string matching (existing logic)
      const triggerLower = p.toLowerCase();
      let idx = 0;
      while ((idx = sanitized.indexOf(triggerLower, idx)) !== -1) {
        const endIdx = idx + triggerLower.length;
        const atStart = idx === 0 || isWordBoundary(sanitized, idx, false);
        const atEnd = endIdx >= sanitized.length || isWordBoundary(sanitized, endIdx, true);

        if (atStart && atEnd) {
          if (idx === 0) return 0;
          let pre = idx - 1;
          while (pre >= 0 && /\s/.test(sanitized[pre])) pre--;

          if (pre < 0) {
            if (earliest === -1 || idx < earliest) earliest = idx;
          } else {
            const c = sanitized[pre];
            if (".!?\n—\"':;,¿¡。、，！？：；」』】》।آ،،：；".indexOf(c) !== -1) {
              if (earliest === -1 || idx < earliest) earliest = idx;
            }
          }
        }
        idx++;
      }
    }
  }
  return earliest;
}

function getUserCountry() {
  // Try to get from current language setting
  const lang = (typeof curLang !== 'undefined' ? curLang : null) ||
               (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const mapping = COUNTRY_MAPPING[lang] || COUNTRY_MAPPING['en-US'];
  return mapping;
}

function isDateMatch(occasionId, userCountry) {
  const dateOcc = DATE_OCCASIONS[occasionId];
  if (!dateOcc || dateOcc.type !== "date-aware") return false;

  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayMM_DD = month + '-' + day;

  const targetDate = dateOcc.dateMap[userCountry.country] || dateOcc.dateMap["all"];
  return todayMM_DD === targetDate;
}

function getOccasionDisplay(occasion, userCountry) {
  if (occasion.type === "date-aware") {
    if (occasion.displayType === "country-flag") {
      return `<i class="fi fi-${userCountry.flagCode}"></i>`;
    } else if (occasion.displayType === "generic-image" && occasion.img) {
      return `<img src="${occasion.img}" />`;
    }
  } else {
    if (occasion.img) {
      return `<img src="${occasion.img}" />`;
    }
  }
  return '';
}

function checkOccasions(){
  const raw = document.getElementById('sta').value;
  let earliestPos = -1;
  let chosen = null;
  const userCountry = getUserCountry();

  for(const oc of OCCASION_TRIGGERS){
    const pos = findOccasionMatch(raw, oc.triggers);
    if(pos !== -1 && (earliestPos === -1 || pos < earliestPos)){
      earliestPos = pos;
      chosen = oc;
    }
  }

  for(const occasionId in DATE_OCCASIONS){
    const dateOcc = DATE_OCCASIONS[occasionId];
    const pos = findOccasionMatch(raw, dateOcc.triggers);
    if(pos !== -1 && (earliestPos === -1 || pos < earliestPos)){
      if(isDateMatch(occasionId, userCountry)){
        earliestPos = pos;
        chosen = { ...dateOcc, userCountry };
      }
    }
  }

  const el = document.getElementById('cardOccasion');
  const panel = document.getElementById('cardPanel');

  if(chosen){
    const displayHTML = getOccasionDisplay(chosen, userCountry || {});

    if(displayHTML && chosen.displayType === "country-flag"){
      el.innerHTML = displayHTML;
      el.classList.add('show');
      panel.classList.add('occasion');
    } else if(chosen.img){
      el.querySelector('img').src = chosen.img;
      el.classList.add('show');
      panel.classList.add('occasion');
    } else {
      el.classList.remove('show');
      panel.classList.remove('occasion');
      el.querySelector('img').src = '';
    }
  } else {
    el.classList.remove('show');
    panel.classList.remove('occasion');
    el.querySelector('img').src = '';
  }
}
