export const config = { runtime: 'edge' };

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
const VALID_TONES = new Set(['original', 'warm', 'bold', 'poetic', 'playful', 'reflective', 'honest']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeTone(value) {
  return VALID_TONES.has(value) ? value : 'original';
}

function safePalette(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < PALS.length ? String(parsed) : '0';
}

export default function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const text = (searchParams.get('text') || '').slice(0, 500);
  const name = (searchParams.get('name') || '').slice(0, 80);
  const tone = safeTone(searchParams.get('tone') || 'original');
  const p = safePalette(searchParams.get('p') || '0');

  const enc = s => encodeURIComponent(s || '');
  const ogUrl = `${origin}/api/og?text=${enc(text)}&name=${enc(name)}&p=${p}`;
  const appUrl = `${origin}/#text=${enc(text)}&name=${enc(name)}&tone=${tone}&p=${p}`;

  const title = name ? `A Wispr Story by ${name}` : 'A Wispr Story';
  const desc = text.length > 160 ? text.slice(0, 160) + '...' : text;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const safeOgUrl = escapeHtml(ogUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const scriptAppUrl = JSON.stringify(appUrl).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:image" content="${safeOgUrl}">
<meta property="og:url" content="${safeAppUrl}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${safeOgUrl}">
<meta http-equiv="refresh" content="0;url=${safeAppUrl}">
<style>
body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#ffffeb;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:90vh;text-align:center}
a{color:#555548}
</style>
</head>
<body>
<div>
<p style="font-size:18px">Your Wispr Story is ready.</p>
<p style="font-size:14px;color:#77776a">Redirecting to the app&hellip;</p>
<p style="font-size:13px;margin-top:32px"><a href="${safeAppUrl}">Click here if not redirected</a></p>
</div>
<script>location.replace(${scriptAppUrl});<\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
