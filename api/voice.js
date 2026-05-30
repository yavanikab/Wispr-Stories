// Upload card voice audio to Vercel Blob storage.
// Called after card image upload to attach audio to the same shortId.
//
// POST /api/voice
// Body: raw audio bytes (WebM/Opus)
// Content-Type: audio/webm
// Headers:
//   X-Short-Id: the 8-char ID from the card upload response
// Response: { ok: true }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://wisprstories.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Short-Id');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Method not allowed');
    return;
  }

  try {
    const shortId = req.headers['x-short-id'];
    if (!shortId || shortId.length < 4) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid shortId' }));
      return;
    }

    const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
    let totalBytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_AUDIO_BYTES) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Audio too large' }));
        return;
      }
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length < 100) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Audio too small' }));
      return;
    }

    const contentType = req.headers['content-type'] || 'audio/webm';
    const { put } = await import('@vercel/blob');

    await put('voice/' + shortId, audioBuffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentType,
      cacheControlMaxAge: 60 * 60 * 24 * 5,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'https://wisprstories.vercel.app');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Voice upload error: ' + (e && e.message ? e.message : 'unknown'));
  }
}
