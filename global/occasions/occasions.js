var OCCASION_TRIGGERS = [];
var DATE_OCCASIONS = {};
var COUNTRY_MAPPING = {};

function loadOccasions() {
  Promise.all([
    fetch('global/occasions/occasions.json'),
    fetch('global/occasions/date-occasions.json'),
    fetch('global/occasions/country-mapping.json')
  ]).then(function(responses) {
    var occRes = responses[0];
    var dateRes = responses[1];
    var countryRes = responses[2];

    if (!occRes.ok || !dateRes.ok || !countryRes.ok) {
      console.warn('[Occasions] One or more JSON files failed to load');
      return;
    }

    return Promise.all([occRes.json(), dateRes.json(), countryRes.json()]);
  }).then(function(data) {
    if (!data) return;
    OCCASION_TRIGGERS = data[0];
    DATE_OCCASIONS = data[1];
    COUNTRY_MAPPING = data[2];
    if (typeof checkOccasions === 'function') checkOccasions();
  }).catch(function(error) {
    console.warn('[Occasions] Failed to load occasion data:', error.message);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadOccasions);
} else {
  loadOccasions();
}

function sanitizeText(text) {
  if (!text) return '';
  text = text.replace(/[\p{Emoji}\p{Emoji_Component}]/gu, ' ');
  text = text.normalize('NFC');
  text = text.replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u061B\u06DD\u200C\u200D\uFEFF]/g, ' ');
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/[''\u02BC\uFF07\u055E\u05F3\u2035\u2032]/g, "'");
  return text.toLowerCase().trim();
}

function findOccasionMatch(text, triggers) {
  var sanitized = sanitizeText(text);
  if (!sanitized) return -1;
  var earliest = -1;

  for (var t = 0; t < triggers.length; t++) {
    var p = triggers[t];
    // Check if trigger is a regex pattern (wrapped in forward slashes)
    if (typeof p === 'string' && p.charAt(0) === '/' && p.lastIndexOf('/') > 0) {
      // Extract regex pattern and flags
      var lastSlashIdx = p.lastIndexOf('/');
      var patternStr = p.substring(1, lastSlashIdx);
      var flags = p.substring(lastSlashIdx + 1);

      try {
        var regex = new RegExp(patternStr, flags || '');
        var match = sanitized.match(regex);

        if (match && match.index !== undefined) {
          var idx = match.index;
          if (idx === 0) return 0;

          var pre = idx - 1;
          while (pre >= 0 && /\s/.test(sanitized[pre])) pre--;

          if (pre < 0) {
            if (earliest === -1 || idx < earliest) earliest = idx;
          } else {
            var c = sanitized[pre];
            if (".!?\n—\"':;,¿¡。、，！？：；」』】》।آ،،：；".indexOf(c) !== -1) {
              if (earliest === -1 || idx < earliest) earliest = idx;
            }
          }
        }
      } catch (e) {
        console.warn('Invalid regex pattern:', p, e);
      }
    } else {
      // Standard string matching
      var triggerLower = p.toLowerCase();
      var idx2 = 0;
      while ((idx2 = sanitized.indexOf(triggerLower, idx2)) !== -1) {
        // Substring match — no word boundaries, no punctuation checks.
        // Enables non-space-separated scripts (Thai, CJK) and inflected
        // forms (syskondagen, napját, günün). Occasion images are cosmetic;
        // false-positive risk is negligible.
        if (idx2 === 0) return 0;
        if (earliest === -1 || idx2 < earliest) earliest = idx2;
        idx2++;
      }
    }
  }
  return earliest;
}

function getUserCountry() {
  var lang = (typeof curLang !== 'undefined' ? curLang : null) ||
             (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  // Normalize short language code (e.g. "hi") to full COUNTRY_MAPPING key (e.g. "hi-IN")
  var shortToFull = {
    'af': 'af-ZA', 'ar': 'ar-SA', 'bn': 'bn-IN', 'da': 'da-DK', 'de': 'de-DE',
    'en': 'en-US', 'es': 'es-ES', 'fa': 'fa-IR', 'fi': 'fi-FI', 'fil': 'fil-PH',
    'fr': 'fr-FR', 'gu': 'gu-IN', 'he': 'he-IL', 'hi': 'hi-IN', 'hu': 'hu-HU',
    'id': 'id-ID', 'it': 'it-IT', 'ja': 'ja-JP', 'kn': 'kn-IN', 'ko': 'ko-KR',
    'ml': 'ml-IN', 'mr': 'mr-IN', 'ms': 'ms-MY', 'nl': 'nl-NL', 'pa': 'pa-IN',
    'pl': 'pl-PL', 'pt': 'pt-BR', 'ro': 'ro-RO', 'ru': 'ru-RU', 'sv': 'sv-SE',
    'ta': 'ta-IN', 'te': 'te-IN', 'th': 'th-TH', 'tr': 'tr-TR', 'uk': 'uk-UA',
    'ur': 'ur-PK', 'vi': 'vi-VN', 'zh': 'zh-CN'
  };
  var fullCode = shortToFull[lang] || lang;
  var mapping = COUNTRY_MAPPING[fullCode] || COUNTRY_MAPPING['en-US'];
  return mapping;
}

function isDateMatch(occasionId, userCountry) {
  var dateOcc = DATE_OCCASIONS[occasionId];
  if (!dateOcc || dateOcc.type !== "date-aware") return false;

  var today = new Date();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  var todayMM_DD = month + '-' + day;

  var targetDate = dateOcc.dateMap[userCountry.country] || dateOcc.dateMap["all"];
  return todayMM_DD === targetDate;
}

function getOccasionDisplay(occasion, userCountry) {
  if (occasion.type === "date-aware") {
    if (occasion.displayType === "country-flag") {
      return '<i class="fi fi-' + userCountry.flagCode + '"></i>';
    } else if (occasion.displayType === "generic-image" && occasion.img) {
      return '<img src="' + occasion.img + '" />';
    }
  } else {
    if (occasion.img) {
      return '<img src="' + occasion.img + '" />';
    }
  }
  return '';
}

function checkOccasions() {
  var el = document.getElementById('cardOccasion');
  var panel = document.getElementById('cardPanel');
  if (!el || !panel) return;

  var raw = document.getElementById('sta').value;
  var earliestPos = -1;
  var chosen = null;
  var userCountry = getUserCountry();

  var curLangCode = (typeof curLang !== 'undefined' ? curLang : 'en') || 'en';

  for (var i = 0; i < OCCASION_TRIGGERS.length; i++) {
    var oc = OCCASION_TRIGGERS[i];
    // Skip if occasion has language restriction and current language is not included
    if (oc.languages && oc.languages.indexOf(curLangCode) === -1) continue;
    var pos = findOccasionMatch(raw, oc.triggers);
    if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) {
      earliestPos = pos;
      chosen = oc;
    }
  }

  for (var occasionId in DATE_OCCASIONS) {
    var dateOcc = DATE_OCCASIONS[occasionId];
    var pos2 = findOccasionMatch(raw, dateOcc.triggers);
    if (pos2 !== -1 && (earliestPos === -1 || pos2 < earliestPos)) {
      if (isDateMatch(occasionId, userCountry)) {
        earliestPos = pos2;
        chosen = Object.assign({}, dateOcc, { userCountry: userCountry });
      }
    }
  }

  if (chosen) {
    var displayHTML = getOccasionDisplay(chosen, userCountry || {});

    if (displayHTML && chosen.displayType === "country-flag") {
      el.innerHTML = displayHTML;
      el.classList.add('show');
      panel.classList.add('occasion');
    } else if (chosen.img) {
      var img = el.querySelector('img');
      if (img) {
        img.src = chosen.img;
        img.onerror = function () {
          console.warn('[Occasions] Failed to load image:', chosen.img);
          el.classList.remove('show');
          panel.classList.remove('occasion');
        };
      }
      el.classList.add('show');
      panel.classList.add('occasion');
    } else {
      el.classList.remove('show');
      panel.classList.remove('occasion');
      var img2 = el.querySelector('img');
      if (img2) { img2.onerror = null; img2.src = ''; }
    }
  } else {
    el.classList.remove('show');
    panel.classList.remove('occasion');
    var img3 = el.querySelector('img');
    if (img3) { img3.onerror = null; img3.src = ''; }
  }
}
