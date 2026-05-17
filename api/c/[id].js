// Short URL endpoint for shared cards.
// Serves OG meta for bots (WhatsApp/Twitter crawlers) and
// a landing page with card image + "Create Your Own" for humans.
//
// GET /c/:id
// Reconstructs blob URL from short ID and serves HTML.

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

  // Reconstruct blob URL from short ID
  const blobUrl = `https://${BLOB_HOST}/cards/${id}.png`;
  const shareUrl = `${origin}/c/${id}`;
  const homeUrl = origin + '/';

  const safeBlobUrl = escapeHtml(blobUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeHomeUrl = escapeHtml(homeUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>A Wispr Story</title>
<meta name="description" content="A voice-made card from Wispr Stories.">
<meta property="og:title" content="A Wispr Story">
<meta property="og:description" content="A voice-made card from Wispr Stories.">
<meta property="og:image" content="${safeBlobUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="A Wispr Story">
<meta property="og:url" content="${safeShareUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wispr Stories">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="A Wispr Story">
<meta name="twitter:description" content="A voice-made card from Wispr Stories.">
<meta name="twitter:image" content="${safeBlobUrl}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#ffffeb;
  color:#1a1a1a;
  padding:24px;
}
.card-wrap{
  width:100%;
  max-width:800px;
  text-align:center;
}
.card-img{
  width:100%;
  aspect-ratio:1200/630;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,0.12),0 4px 12px rgba(0,0,0,0.06);
  background:#eee9d0;
  display:block;
}
.card-img img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.cta{
  display:inline-block;
  margin-top:32px;
  background:#1a1a1a;
  color:#ffffeb;
  text-decoration:none;
  padding:14px 32px;
  border-radius:999px;
  font-size:16px;
  font-weight:600;
  transition:transform .15s ease,background .15s ease;
}
.cta:hover{background:#000;transform:translateY(-1px)}
@media (prefers-color-scheme: dark){
  body{background:#1a1a1a;color:#ffffeb}
  .card-img{background:#2a2a2a;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
  .cta{background:#ffffeb;color:#1a1a1a}
  .cta:hover{background:#fff}
}
</style>
</head>
<body>
<main class="card-wrap">
  <div class="card-img">
    <img src="${safeBlobUrl}" alt="A Wispr Story" width="1200" height="630">
  </div>
  <a class="cta" href="${safeHomeUrl}">Create your own &rarr;</a>
</main>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html;charset=UTF-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(html);
}
