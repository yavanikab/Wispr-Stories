/* SCRIPT FONTS HANDLER
 * Manages font selection for different scripts and tones
 * Detects text script and returns appropriate tone-specific font
 * EDIT THE FONTS BELOW TO CHANGE WHAT DISPLAYS FOR EACH TONE & LANGUAGE
 */

const TONES = {
  original: { fi: "normal", fw: "400", ls: "-0.02em", g: "fas fa-pen" },
  warm: { fi: "normal", fw: "400", ls: "-0.02em", g: "fas fa-heart" },
  bold: { fi: "normal", fw: "400", ls: "-0.01em", g: "fas fa-bolt" },
  poetic: { fi: "normal", fw: "400", ls: "-0.02em", g: "fas fa-feather" },
  playful: { fi: "normal", fw: "400", ls: "-0.03em", g: "fas fa-face-smile" },
  reflective: { fi: "normal", fw: "400", ls: "-0.01em", g: "fas fa-moon" },
  honest: { fi: "normal", fw: "400", ls: "0", g: "fas fa-handshake" },
};

const SCRIPT_FONTS = {
  // ORIGINAL TONE (no LLM rewrite, uses same fonts as warm)
  original: {
    dev: "Inter",
    cyr: "Inter",
    deva: "Noto Sans Devanagari",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Noto Sans Tamil",
    telu: "Noto Sans Telugu",
    kann: "Noto Sans Kannada",
    mlym: "Noto Sans Malayalam",
    thai: "Noto Sans Thai Looped",
    arab: "Noto Sans Arabic",
    zhs: "Noto Sans SC",
    zht: "Noto Sans TC",
    jpn: "Noto Sans JP",
    kor: "Noto Sans KR",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Inter",
  },
  // WARM TONE
  warm: {
    dev: "Inter",
    cyr: "Inter",
    deva: "Noto Sans Devanagari",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Noto Sans Tamil",
    telu: "Noto Sans Telugu",
    kann: "Noto Sans Kannada",
    mlym: "Noto Sans Malayalam",
    thai: "Noto Sans Thai Looped",
    arab: "Noto Sans Arabic",
    zhs: "Noto Sans SC",
    zht: "Noto Sans TC",
    jpn: "Noto Sans JP",
    kor: "Noto Sans KR",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Inter",
  },
  // BOLD TONE
  bold: {
    dev: "Stack Sans Headline",
    cyr: "Stack Sans Headline",
    deva: "Anek Devanagari",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Anek Tamil",
    telu: "Anek Telugu",
    kann: "Anek Kannada",
    mlym: "Anek Malayalam",
    thai: "Kanit",
    arab: "Cairo",
    zhs: "Ma Shan Zheng",
    zht: "LXGW WenKai TC",
    jpn: "WDXL Lubrifont JP N",
    kor: "Gowun Dodum",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Stack Sans Headline",
  },
  // POETIC TONE
  poetic: {
    dev: "EB Garamond",
    cyr: "EB Garamond",
    deva: "Noto Serif Devanagari",
    beng: "Noto Serif Bengali",
    guru: "Noto Serif Gurmukhi",
    gujr: "Noto Serif Gujarati",
    taml: "Noto Serif Tamil",
    telu: "Noto Serif Telugu",
    kann: "Noto Serif Kannada",
    mlym: "Noto Serif Malayalam",
    thai: "Playpen Sans Thai",
    arab: "Noto Naskh Arabic",
    zhs: "Noto Serif SC",
    zht: "Noto Serif TC",
    jpn: "M PLUS Rounded 1c",
    kor: "Noto Serif KR",
    mymr: "Noto Serif Myanmar",
    sinh: "Noto Serif Sinhala",
    java: "Noto Sans Javanese",
    grc: "EB Garamond",
  },
  // PLAYFUL TONE
  playful: {
    dev: "Fredoka",
    cyr: "Fredoka",
    deva: "Baloo Chettan 2",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Karla Tamil Inclined",
    telu: "Akaya Telivigala",
    kann: "Tiro Kannada",
    mlym: "Chilanka",
    thai: "itim",
    arab: "Harmattan",
    zhs: "ZCOOL XiaoWei",
    zht: "Chiron GoRound TC",
    jpn: "Kosugi Maru",
    kor: "Jua",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Fredoka",
  },
  // REFLECTIVE TONE
  reflective: {
    dev: "Merriweather",
    cyr: "Merriweather",
    deva: "Rajdhani",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Catamaran",
    telu: "Rajdhani",
    kann: "Baloo Chettan 2",
    mlym: "Manjari",
    thai: "Kodchasan",
    arab: "Reem Kufi",
    zhs: "ZCOOL KuaiLe",
    zht: "Noto Serif TC",
    jpn: "Hachi Maru Pop",
    kor: "Yeon Sung",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Merriweather",
  },
  // HONEST TONE
  honest: {
    dev: "Atkinson Hyperlegible",
    cyr: "Atkinson Hyperlegible",
    deva: "Alkatra",
    beng: "Noto Sans Bengali",
    guru: "Noto Sans Gurmukhi",
    gujr: "Noto Sans Gujarati",
    taml: "Meera Inimai",
    telu: "Sirivennela",
    kann: "Hubballi",
    mlym: "Catamaran",
    thai: "K2D",
    arab: "IBM Plex Sans Arabic",
    zhs: "Zhi Mang Xing",
    zht: "Noto Sans TC",
    jpn: "Kosugi",
    kor: "Hahmlet",
    mymr: "Noto Sans Myanmar",
    sinh: "Noto Sans Sinhala",
    java: "Noto Sans Javanese",
    grc: "Atkinson Hyperlegible",
  },
};

// CJK Unified Ideographs (U+4E00-U+9FFF) are shared by Chinese (Hanzi),
// Japanese (Kanji), and Korean (Hanja). A character-only classifier can't
// tell them apart. detectLanguageContext does a quick pre-scan for
// distinguishing markers — Hiragana/Katakana means the whole text is
// Japanese, Hangul means it is Korean — and the result is threaded into
// charScript so every Kanji/Hanja in the document is tagged with the
// correct language instead of falling through to Chinese.
function detectLanguageContext(text) {
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if ((c >= 0x3040 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)) return "jpn";
    if (c >= 0xac00 && c <= 0xd7af) return "kor";
  }
  return null;
}

function charScript(ch, context) {
  const c = ch.codePointAt(0);
  // CJK Unified Ideographs are ambiguous on their own — route by context.
  if (c >= 0x4e00 && c <= 0x9fff) {
    if (context === "jpn") return "jpn"; // Kanji inside Japanese text
    if (context === "kor") return "kor"; // Hanja inside Korean text
    return "zhs";                         // pure CJK → Chinese
  }
  if ((c >= 0x3040 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)) return "jpn";
  if (c >= 0x0e00 && c <= 0x0e7f) return "thai";
  if (c >= 0x0900 && c <= 0x097f) return "deva";
  if (c >= 0x0980 && c <= 0x09ff) return "beng";
  if (c >= 0x0a00 && c <= 0x0a7f) return "guru";
  if (c >= 0x0a80 && c <= 0x0aff) return "gujr";
  if (c >= 0x0b80 && c <= 0x0bff) return "taml";
  if (c >= 0x0c00 && c <= 0x0c7f) return "telu";
  if (c >= 0x0c80 && c <= 0x0cff) return "kann";
  if (c >= 0x0d00 && c <= 0x0d7f) return "mlym";
  if (c >= 0x0d80 && c <= 0x0dff) return "sinh";
  if (c >= 0x0600 && c <= 0x06ff) return "arab";
  if (c >= 0xac00 && c <= 0xd7af) return "kor";
  if (c >= 0x0400 && c <= 0x04ff) return "cyr";
  if (c >= 0x1000 && c <= 0x109f) return "mymr";
  if (c >= 0xa980 && c <= 0xa9df) return "java";
  if (c >= 0x0370 && c <= 0x03ff) return "grc";
  return "dev";
}

function detectScript(t) {
  const ctx = detectLanguageContext(t);
  for (const ch of t) {
    const s = charScript(ch, ctx);
    if (s !== "dev") return s;
  }
  return "dev";
}

function getToneFont(tone, text) {
  const s = detectScript(text);
  return SCRIPT_FONTS[tone][s] || SCRIPT_FONTS[tone].dev;
}

function splitByScript(text) {
  const ctx = detectLanguageContext(text);
  const segments = [];
  let cur = "", curScript = "dev";
  for (const ch of text) {
    const s = charScript(ch, ctx);
    if (s !== curScript && cur) {
      segments.push({ text: cur, script: curScript });
      cur = "";
    }
    curScript = s;
    cur += ch;
  }
  if (cur) segments.push({ text: cur, script: curScript });
  return segments;
}

function esc(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function applyScriptFonts(el, tone, text) {
  const segments = splitByScript(text);
  if (segments.length <= 1) {
    el.textContent = text;
    el.style.fontFamily = getToneFont(tone, text);
    return;
  }
  let html = "";
  for (const seg of segments) {
    if (seg.script === "dev") {
      html += esc(seg.text);
    } else {
      const font = SCRIPT_FONTS[tone]?.[seg.script] || SCRIPT_FONTS[tone]?.dev || "Inter";
      html += '<span style="font-family:' + font + '">' + esc(seg.text) + "</span>";
    }
  }
  el.innerHTML = html;
  el.style.fontFamily = "";
}
