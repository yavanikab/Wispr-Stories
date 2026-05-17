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
const VALID_RATIOS = new Set(['2x2', '3x4', '4x5', '9x16']);
const VALID_CORNERS = new Set(['rounded', 'sharp']);
const RATIO_DIMS = {
  '2x2': { w: 1080, h: 1080 },
  '3x4': { w: 1080, h: 1440 },
  '4x5': { w: 1080, h: 1350 },
  '9x16': { w: 1080, h: 1920 },
};

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
  const rawRatio = searchParams.get('ratio') || '4x5';
  const ratio = VALID_RATIOS.has(rawRatio) ? rawRatio : '4x5';
  const rawCorners = searchParams.get('r') || 'rounded';
  const corners = VALID_CORNERS.has(rawCorners) ? rawCorners : 'rounded';
  const { w: ogW, h: ogH } = RATIO_DIMS[ratio];

  const enc = s => encodeURIComponent(s || '');
  const ogUrl = `${origin}/api/og?text=${enc(text)}&name=${enc(name)}&p=${p}&ratio=${ratio}&r=${corners}`;
  const appUrl = `${origin}/#text=${enc(text)}&name=${enc(name)}&tone=${tone}&p=${p}&ratio=${ratio}&r=${corners}`;
  const homeUrl = origin + '/';
  const shareUrl = `${origin}/card?text=${enc(text)}&name=${enc(name)}&tone=${tone}&p=${p}&ratio=${ratio}&r=${corners}`;

  const title = name ? `A Wispr Story by ${name}` : 'A Wispr Story';
  const desc = text.length > 160 ? text.slice(0, 160) + '...' : (text || 'A voice-made card from Wispr Stories.');
  const sharerLine = name
    ? `${name} shared the card with you.`
    : 'Someone shared the card with you.';

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const safeOgUrl = escapeHtml(ogUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeHomeUrl = escapeHtml(homeUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const safeSharerLine = escapeHtml(sharerLine);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:image" content="${safeOgUrl}">
<meta property="og:image:width" content="${ogW}">
<meta property="og:image:height" content="${ogH}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${safeTitle}">
<meta property="og:url" content="${safeShareUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wispr Stories">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${safeOgUrl}">
<script>
// Bots (WhatsApp/Facebook/Twitter crawlers) don't execute JS, so they read the
// OG meta tags above and stop. Real browsers run this and get sent straight
// into the editor with the card pre-loaded — no landing-page friction.
try { window.location.replace(${JSON.stringify(appUrl)}); } catch (e) {}
</script>
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#ffffeb;
  color:#1a1a1a;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  line-height:1.5;
}
.card-share-wrap{
  width:100%;
  max-width:640px;
  text-align:center;
}
.card-share-image{
  width:100%;
  aspect-ratio:1200/630;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,0.12),0 4px 12px rgba(0,0,0,0.06);
  background:#eee9d0;
  display:block;
}
.card-share-image img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.card-share-sharer{
  margin:28px 0 6px;
  font-size:18px;
  color:#1a1a1a;
  font-weight:500;
}
.card-share-tagline{
  margin:0 0 24px;
  font-size:15px;
  color:#77776a;
}
.card-share-inline{
  color:#1a1a1a;
  font-weight:600;
  text-decoration:none;
  border-bottom:1px solid #cfcfb8;
}
.card-share-inline:hover{border-bottom-color:#1a1a1a}
.card-share-cta{
  display:inline-block;
  background:#1a1a1a;
  color:#ffffeb;
  text-decoration:none;
  padding:14px 28px;
  border-radius:999px;
  font-size:16px;
  font-weight:600;
  transition:transform .15s ease,background .15s ease;
}
.card-share-cta:hover{background:#000;transform:translateY(-1px)}
.card-share-foot{
  margin-top:28px;
  font-size:13px;
  color:#9a9a8a;
}
.card-share-foot a{color:#555548;text-decoration:none;border-bottom:1px solid #cfcfb8}
@media (prefers-color-scheme: dark){
  body{background:#1a1a1a;color:#ffffeb}
  .card-share-image{background:#2a2a2a;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
  .card-share-sharer{color:#ffffeb}
  .card-share-tagline{color:#a5a596}
  .card-share-cta{background:#ffffeb;color:#1a1a1a}
  .card-share-cta:hover{background:#fff}
  .card-share-foot{color:#77776a}
  .card-share-foot a{color:#cfcfb8;border-bottom-color:#555548}
  .card-share-inline{color:#ffffeb;border-bottom-color:#555548}
  .card-share-inline:hover{border-bottom-color:#ffffeb}
}
</style>
</head>
<body>
<main class="card-share-wrap">
  <div class="card-share-image">
    <img src="${safeOgUrl}" alt="${safeTitle}" width="1200" height="630">
  </div>
  <p class="card-share-sharer">${safeSharerLine}</p>
  <p class="card-share-tagline">Create your own at <a class="card-share-inline" href="${safeHomeUrl}">Wispr Stories</a>.</p>
  <a class="card-share-cta" href="${safeHomeUrl}">Create your own &rarr;</a>
  <p class="card-share-foot">
    <a href="${safeAppUrl}">Open this card in the editor</a>
  </p>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    }
  });
}
