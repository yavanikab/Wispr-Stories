import sharp from 'sharp';

export const config = { runtime: 'nodejs' };

const PALS = [
  '#7c3aed',
  '#f59e0b',
  '#dc2626',
  '#059669',
  '#0284c7',
  '#db2777',
  '#ea580c',
  '#0d9488',
  '#c026d3',
  '#4f46e5',
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Greedy word-wrap to fit ~maxChars per line. Returns an array of lines.
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const url = new URL(req.url, `${proto}://${host}`);

    const text = (url.searchParams.get('text') || 'Your story').slice(0, 200);
    const name = (url.searchParams.get('name') || '').slice(0, 40);
    const rawP = parseInt(url.searchParams.get('p'), 10);
    const p =
      Number.isFinite(rawP) && rawP >= 0 && rawP < PALS.length ? rawP : 0;
    const bg = PALS[p];

    const displayText =
      text.length > 150 ? text.slice(0, 150) + '…' : text;
    const lines = wrap(displayText, 32).slice(0, 7);

    // Canvas: 1200x630 cream background.
    // Card: 480x600 (4:5), centered horizontally, 15px from top.
    const cardX = 360;
    const cardY = 15;
    const cardW = 480;
    const cardH = 600;

    // Inner white text panel inside the card.
    const panelX = cardX + 26;
    const panelY = cardY + 220;
    const panelW = cardW - 52;
    const panelH = 280;

    // Text positioning inside the white panel.
    const txtX = panelX + 22;
    const txtY = panelY + 44;
    const lh = 32;

    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="${txtX}" dy="${i === 0 ? 0 : lh}">${escapeXml(line)}</tspan>`,
      )
      .join('');

    const displayName = name || 'Wispr Stories';

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#ffffeb"/>
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="32" fill="${bg}"/>
  <text x="${cardX + 26}" y="${cardY + 54}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="white">${escapeXml(displayName)}</text>
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="14" fill="#ffffff"/>
  <text font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#1a1a1a" x="${txtX}" y="${txtY}">${tspans}</text>
  <text x="${panelX + 22}" y="${panelY + panelH - 20}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#77776a">Story Original</text>
  <text x="${cardX + 26}" y="${cardY + cardH - 34}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="white">Wispr Stories</text>
  <text x="${cardX + cardW - 26}" y="${cardY + cardH - 34}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="white" fill-opacity="0.7" text-anchor="end">wisprflow.ai</text>
</svg>`;

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.end(png);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      'OG render error: ' + (e && e.message ? e.message : 'unknown'),
    );
  }
}
