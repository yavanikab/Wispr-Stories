// Dynamic OG image generator. Renders the user's actual card (name, story
// text, palette art, branding) as a 1200×630 PNG per request.
//
// Runtime: Node.js (Vercel default). Uses sharp + SVG for text rendering.

import sharp from 'sharp';

const PAL_NAMES = [
  'violet', 'amber', 'crimson', 'emerald', 'ocean',
  'rose', 'orange', 'teal', 'fuchsia', 'indigo',
];
const PALS = [
  '#7c3aed', '#f59e0b', '#dc2626', '#059669', '#0284c7',
  '#db2777', '#ea580c', '#0d9488', '#c026d3', '#4f46e5',
];
const VALID_CORNERS = ['rounded', 'sharp'];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;
    const url = new URL(req.url, origin);

    const text = (url.searchParams.get('text') || 'Your story').slice(0, 200);
    const name = (url.searchParams.get('name') || '').slice(0, 40);
    const rawP = Number.parseInt(url.searchParams.get('p'), 10);
    const p =
      Number.isInteger(rawP) && rawP >= 0 && rawP < PALS.length ? rawP : 0;
    const palName = PAL_NAMES[p];
    let corners = url.searchParams.get('r') || 'rounded';
    if (!VALID_CORNERS.includes(corners)) corners = 'rounded';

    const W = 1200;
    const H = 630;

    // Fetch the pre-rendered 1200×630 background image via HTTP.
    const bgUrl = `${origin}/assets/og-1200x630/1200x630_${corners}_${palName}.png`;
    const bgRes = await fetch(bgUrl);
    if (!bgRes.ok) throw new Error('Background fetch failed: ' + bgRes.status);
    const bgBuffer = await bgRes.arrayBuffer();

    const displayText = text.length > 150 ? text.slice(0, 150) + '…' : text;
    const displayName = name || 'Wispr Stories';

    // Build SVG overlay with text.
    const lines = wrapText(displayText, 35);
    const lineHeight = 42;
    const textBlockHeight = lines.length * lineHeight;
    const cardY = Math.floor((H - textBlockHeight - 80) / 2);

    let textElements = '';
    lines.forEach((line, i) => {
      textElements += `<text x="600" y="${cardY + 52 + i * lineHeight}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#1a1a1a" font-weight="400">${escapeXml(line)}</text>\n`;
    });

    const svgOverlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Name at top -->
  <text x="56" y="64" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="rgba(255,255,255,0.95)" font-weight="600">${escapeXml(displayName)}</text>
  
  <!-- White card background -->
  <rect x="56" y="${cardY}" width="${W - 112}" height="${textBlockHeight + 80}" rx="20" fill="#ffffff"/>
  
  <!-- Story text -->
  ${textElements}
  
  <!-- Footer branding -->
  <text x="56" y="${H - 44}" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="rgba(255,255,255,0.95)" font-weight="700">Wispr Stories</text>
  <text x="${W - 56}" y="${H - 44}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="rgba(255,255,255,0.75)">wisprflow.ai</text>
</svg>`;

    const image = await sharp(bgBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png({ quality: 90 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.end(image);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      'OG render error: ' + (e && e.message ? e.message : 'unknown') + ' | ' + (e && e.stack ? e.stack.split('\n')[0] : ''),
    );
  }
}
