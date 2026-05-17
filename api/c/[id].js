// Short URL endpoint for shared cards.
// Serves OG meta for bots (WhatsApp/Twitter crawlers) and
// a landing page with card image + "Create Your Own" for humans.
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

  // OG image is served from our domain via proxy (avoids cross-domain issues with WhatsApp)
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
<title>Wispr Stories</title>
<meta property="og:title" content="Wispr Stories">
<meta property="og:description" content="Create and share voice-made cards">
<meta property="og:image" content="${safeOgUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:url" content="${safeShareUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wispr Stories">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Wispr Stories">
<meta name="twitter:description" content="Create and share voice-made cards">
<meta name="twitter:image" content="${safeOgUrl}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#1a1a1a;
  color:#ffffeb;
  padding:24px;
}
.card-wrap{
  width:100%;
  max-width:600px;
  text-align:center;
}
.card-img{
  width:100%;
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
  margin-top:24px;
  background:#ffffeb;
  color:#1a1a1a;
  text-decoration:none;
  padding:12px 28px;
  border-radius:999px;
  font-size:15px;
  font-weight:600;
  transition:transform .15s ease,background .15s ease;
}
.cta:hover{background:#fff;transform:translateY(-1px)}
</style>
</head>
<body>
<main class="card-wrap">
  <div class="card-img">
    <img src="${safeCardUrl}" alt="Wispr Story">
  </div>
  <a class="cta" href="${safeHomeUrl}">Create your own &rarr;</a>
</main>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html;charset=UTF-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(html);
}
