import sharp from 'sharp';

export const config = { runtime: 'nodejs' };

const PAL_NAMES = [
  'violet', 'amber', 'crimson', 'emerald', 'ocean',
  'rose', 'orange', 'teal', 'fuchsia', 'indigo',
];
const PALS = [
  '#7c3aed', '#f59e0b', '#dc2626', '#059669', '#0284c7',
  '#db2777', '#ea580c', '#0d9488', '#c026d3', '#4f46e5',
];

// Output dimensions per ratio — matches what the user chose in the app.
const RATIO_DIMS = {
  '2x2': { w: 1080, h: 1080 },
  '3x4': { w: 1080, h: 1440 },
  '4x5': { w: 1080, h: 1350 },
  '9x16': { w: 1080, h: 1920 },
};
const VALID_CORNERS = ['rounded', 'sharp'];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    if (candidate.length <= maxChars) cur = candidate;
    else { if (cur) lines.push(cur); cur = w; }
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
    const p = Number.isFinite(rawP) && rawP >= 0 && rawP < PALS.length ? rawP : 0;
    const palName = PAL_NAMES[p];
    const fallbackBg = PALS[p];

    let ratio = url.searchParams.get('ratio') || '4x5';
    if (!RATIO_DIMS[ratio]) ratio = '4x5';
    const { w: W, h: H } = RATIO_DIMS[ratio];

    let corners = url.searchParams.get('r') || 'rounded';
    if (!VALID_CORNERS.includes(corners)) corners = 'rounded';

    // Pull the actual gradient art the in-app card uses.
    const bgUrl = `${proto}://${host}/assets/card-bgs/${ratio}_${corners}_${palName}.webp`;
    let cardBgBuffer = null;
    try {
      const r = await fetch(bgUrl);
      if (r.ok) cardBgBuffer = Buffer.from(await r.arrayBuffer());
    } catch (_) { /* will fall back to solid color */ }

    // Proportional layout. All positions scale with W/H so every ratio looks
    // visually consistent with the in-app card.
    const padX = Math.round(W * 0.056); // ~5.6%, matches 18/320 in-app
    const nameY = Math.round(H * 0.105);
    const nameFs = Math.round(W * 0.038);

    const panelX = padX;
    const panelW = W - 2 * padX;
    const panelY = Math.round(H * 0.27);
    const panelH = Math.round(H * 0.50);
    const panelRx = Math.round(W * 0.022);

    const txtFs = Math.round(W * 0.040);
    const txtLh = Math.round(txtFs * 1.5);
    const txtX = panelX + Math.round(W * 0.038);
    const txtY = panelY + Math.round(panelH * 0.18);

    const smallFs = Math.round(W * 0.022);
    const footerFs = Math.round(W * 0.032);
    const footerY = H - Math.round(H * 0.04);

    const maxCharsPerLine = Math.max(18, Math.floor(panelW / (txtFs * 0.55)));
    const maxLines = Math.max(3, Math.floor((panelH - txtLh) / txtLh));

    const displayText = text.length > 150 ? text.slice(0, 150) + '…' : text;
    const lines = wrap(displayText, maxCharsPerLine).slice(0, maxLines);

    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="${txtX}" dy="${i === 0 ? 0 : txtLh}">${escapeXml(line)}</tspan>`,
      )
      .join('');

    const displayName = name || '';

    const overlaySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${displayName
    ? `<text x="${padX}" y="${nameY}" font-family="Arial, Helvetica, sans-serif" font-size="${nameFs}" font-weight="600" fill="white">${escapeXml(displayName)}</text>`
    : ''}
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="${panelRx}" fill="#ffffff"/>
  <text font-family="Arial, Helvetica, sans-serif" font-size="${txtFs}" fill="#1a1a1a" x="${txtX}" y="${txtY}">${tspans}</text>
  <text x="${txtX}" y="${panelY + panelH - Math.round(panelH * 0.06)}" font-family="Arial, Helvetica, sans-serif" font-size="${smallFs}" fill="#77776a">Story Original</text>
  <text x="${padX}" y="${footerY}" font-family="Arial, Helvetica, sans-serif" font-size="${footerFs}" font-weight="700" fill="white">Wispr Stories</text>
  <text x="${W - padX}" y="${footerY}" font-family="Arial, Helvetica, sans-serif" font-size="${smallFs}" fill="white" fill-opacity="0.75" text-anchor="end">wisprflow.ai</text>
</svg>`;

    let png;
    if (cardBgBuffer) {
      // Composite text overlay onto the real card-bg art at output size.
      const resizedBg = await sharp(cardBgBuffer)
        .resize(W, H, { fit: 'fill' })
        .toBuffer();
      png = await sharp(resizedBg)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .png()
        .toBuffer();
    } else {
      // Fall back to solid palette color if asset fetch failed.
      const baseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${fallbackBg}"/>
</svg>`;
      const base = await sharp(Buffer.from(baseSvg)).png().toBuffer();
      png = await sharp(base)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .png()
        .toBuffer();
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.end(png);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('OG render error: ' + (e && e.message ? e.message : 'unknown'));
  }
}
