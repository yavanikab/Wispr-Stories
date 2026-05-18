// Short URL endpoint for shared cards.
// Serves OG meta for bots (WhatsApp/Twitter crawlers) and
// a landing page with branding + card image + "Create Your Own" for humans.
//
// GET /c/:id
// Uses padded OG image for meta tags and original card for display.

const BLOB_HOST = 'jkzbaevzmimaelrr.public.blob.vercel-storage.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  const host = req.headers.host || 'wisprstories.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;

  // Extract short ID from URL path: /c/abc123
  const url = new URL(req.url, origin);
  const id = url.pathname.replace(/^\/c\//, '');

  if (!id || id.length < 4) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Card not found');
    return;
  }

  // OG image - serve from our own domain via proxy (WhatsApp/crawlers block third-party blob URLs)
  const ogUrl = `${origin}/api/og-image/${id}`;
  // Card image is original square version in cards/ directory
  const cardUrl = `https://${BLOB_HOST}/cards/${id}.png`;
  const shareUrl = `${origin}/c/${id}`;
  const homeUrl = origin + '/';

  const safeOgUrl = escapeHtml(ogUrl);
  const safeCardUrl = escapeHtml(cardUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeHomeUrl = escapeHtml(homeUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${safeHomeUrl}assets/ws-logo-wh.png" type="image/png">
<title>Wispr Stories</title>
<meta property="og:title" content="A Wispr Story — Turn your voice into something beautiful">
<meta property="og:description" content="Created with Wispr Stories. Tap to make your own.">
<meta property="og:image" content="${safeOgUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:url" content="${safeShareUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wispr Stories">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="A Wispr Story — Turn your voice into something beautiful">
<meta name="twitter:description" content="Created with Wispr Stories. Tap to make your own.">
<meta name="twitter:image" content="${safeOgUrl}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  position:fixed;
  inset:0;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#1a1a1a;
  color:#ffffeb;
  padding:24px;
}
.landing-wrap{
  width:100%;
  max-width:600px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:16px;
}
.branding{
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
}
.branding-row{
  display:flex;
  align-items:center;
  gap:10px;
}
.branding-logo{
  width:28px;
  height:28px;
  object-fit:contain;
}
.branding-name{
  font-size:clamp(18px, 3vw, 24px);
  font-weight:700;
  color:#ffffeb;
}
.branding-sub{
  font-size:clamp(12px, 2vw, 14px);
  color:#a5a596;
  max-width:320px;
  line-height:1.4;
}
.card-img{
  width:100%;
  max-width:500px;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,0.3);
  display:block;
}
.card-img img{
  width:100%;
  height:auto;
  display:block;
}
.cta{
  display:inline-block;
  background:#ffffeb;
  color:#1a1a1a;
  text-decoration:none;
  padding:12px 28px;
  border-radius:999px;
  font-size:clamp(15px, 2.2vw, 18px);
  font-weight:600;
  transition:transform .15s ease,background .15s ease;
  margin-top:8px;
}
.cta:hover{background:#fff;transform:translateY(-1px)}
@media (max-height:700px){
  .branding{gap:2px}
  .branding-sub{font-size:11px}
  .card-img{max-width:400px}
  .cta{padding:10px 24px}
}
@media (max-width:400px){
  html,body{padding:16px}
  .branding-logo{width:24px;height:24px}
  .card-img{max-width:100%}
}
</style>
</head>
<body>
<main class="landing-wrap">
  <div class="branding">
    <div class="branding-row">
      <img class="branding-logo" src="${safeHomeUrl}assets/ws-logo-wh.png" alt="Wispr Stories">
      <span class="branding-name">Wispr Stories</span>
    </div>
    <p class="branding-sub">Turn your voice into something beautiful</p>
  </div>
  <br>
  <div class="card-img">
    <img src="${safeCardUrl}" alt="Wispr Story">
  </div>
  <a class="cta" href="${safeHomeUrl}">Create your own &rarr;</a>
  <br>
</main>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html;charset=UTF-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(html);
}
