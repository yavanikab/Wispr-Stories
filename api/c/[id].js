// Short URL endpoint for shared cards.
// Serves OG meta for bots (WhatsApp/Twitter crawlers) and
// a landing page with branding + card image + "Create Your Own" for humans.
//
// GET /c/:id
// og:image points to a JPEG copy of the card on Vercel Blob (direct CDN,
// no proxy hop) so WhatsApp/Facebook crawlers fetch a ~30–60 KB hero
// image instead of a 200 KB padded PNG. Original card PNG is used for
// the landing-page display.

const BLOB_HOST = 'jkzbaevzmimaelrr.public.blob.vercel-storage.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
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

  // OG image — direct Blob CDN URL (no serverless hop). JPEG keeps it small
  // enough for WhatsApp mobile to render as a large preview.
  const ogUrl = `https://${BLOB_HOST}/og/${id}.jpg`;
  // Card image is original square version in cards/ directory
  const cardUrl = `https://${BLOB_HOST}/cards/${id}.png`;
  const shareUrl = `${origin}/c/${id}`;
  const homeUrl = origin + '/';

  // Fetch card metadata sidecar if available
  let metaText = '', metaName = '', metaTone = 'original', metaP = '0', metaR = 'rounded';
  try {
    const metaRes = await fetch(`https://${BLOB_HOST}/meta/${id}.json`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      metaText = meta.text || '';
      metaName = meta.name || '';
      metaTone = meta.tone || 'original';
      metaP = meta.p || '0';
      metaR = meta.r || 'rounded';
    }
  } catch (e) {
    // Old cards without sidecar — fall through with defaults
  }

  // Check if voice audio exists for this card
  let hasVoice = false;
  try {
    const voiceRes = await fetch(`https://${BLOB_HOST}/voice/${id}`, { method: 'HEAD' });
    hasVoice = voiceRes.ok;
  } catch (e) { /* no voice */ }

  const enc = (s) => encodeURIComponent(s || '');
  const appUrl = metaText || metaName
    ? `${origin}/#text=${enc(metaText)}&name=${enc(metaName)}&tone=${metaTone}&p=${metaP}&r=${metaR}`
    : homeUrl;

  const safeOgUrl = escapeHtml(ogUrl);
  const safeCardUrl = escapeHtml(cardUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeHomeUrl = escapeHtml(homeUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const safeName = escapeHtml(metaName);
  const voiceUrl = `https://${BLOB_HOST}/voice/${id}`;
  const safeVoiceUrl = escapeHtml(voiceUrl);

  const altText = safeName
    ? `You have received a Wispr Story from ${safeName}`
    : 'A Wispr Story card';

  const captionHtml = safeName
    ? `<p class="landing-caption">${safeName} shared a Wispr Story with you.</p>`
    : '';

  const ogAltText = safeName
    ? `A Wispr Story shared by ${safeName}`
    : 'A Wispr Story card';

  const ogTitle = safeName
    ? `A Wispr Story by ${safeName}`
    : 'A Wispr Story — Turn your voice into something beautiful';

  const ogDesc = safeName
    ? `${safeName} shared a Wispr Story with you — created with Wispr Stories.`
    : 'Created with Wispr Stories. Tap to make your own.';

  const twitterDesc = safeName
    ? `${safeName} shared a Wispr Story with you. Make your own at Wispr Stories.`
    : 'Created with Wispr Stories. Tap to make your own.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${safeHomeUrl}assets/ws-logo-wh.png" type="image/png">
<title>${ogTitle}</title>
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:image" content="${safeOgUrl}">
<meta property="og:image:secure_url" content="${safeOgUrl}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${ogAltText}">
<meta property="og:url" content="${safeShareUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wispr Stories">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${twitterDesc}">
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
.landing-caption{
  font-size:clamp(13px, 2vw, 15px);
  color:#a5a596;
  text-align:center;
  margin-top:4px;
  line-height:1.4;
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
.voice-player{margin-top:8px;text-align:center}
.voice-btn{background:#f59e0b;color:#1a1a1a;border:none;border-radius:40px;padding:12px 28px;font-size:clamp(14px,2.2vw,16px);font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(245,158,11,.4)}
.voice-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(245,158,11,.5)}
.voice-btn.playing{background:#555;color:#ffffeb;box-shadow:none}
.voice-btn.playing:hover{transform:none;box-shadow:none}
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
    <img src="${safeCardUrl}" alt="${altText}">
  </div>
  ${hasVoice ? '<div class="voice-player"><button class="voice-btn" id="playVoice" onclick="var a=document.getElementById(\'voiceAudio\');if(a.paused){a.play();this.innerHTML=\'<span>⏸</span> Playing\u2026\';this.classList.add(\'playing\')}else{a.pause();this.innerHTML=\'<span>▶</span> Listen to voice\';this.classList.remove(\'playing\')}"><span>▶</span> Listen to voice</button><audio id="voiceAudio" src="' + safeVoiceUrl + '" preload="none" onended="var b=document.getElementById(\'playVoice\');b.innerHTML=\'<span>▶</span> Listen to voice\';b.classList.remove(\'playing\')"></audio></div>' : ''}
  ${captionHtml}
  <a class="cta" href="${safeAppUrl}">Create your own &rarr;</a>
  <br>
</main>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html;charset=UTF-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(html);
}
