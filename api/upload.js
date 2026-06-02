// Upload card to Vercel Blob storage.
// Accepts raw PNG bytes (no multipart parsing) for fast uploads.
// Creates two versions:
//   1. Original card PNG (for landing page display)
//   2. Card re-encoded as JPEG at native aspect (for WhatsApp large preview)
// JPEG keeps the file ~5× smaller than PNG, comfortably under WhatsApp's
// mobile preview size threshold. The card fills the OG frame instead of
// sitting inside padding bars, so the preview reads as a large hero image.
//
// POST /api/upload
// Body: raw PNG bytes
// Content-Type: image/png
// Response: { shortId: "aB3xK9mP" }

import { put } from '@vercel/blob';
import sharp from 'sharp';

const VALID_TONES = new Set([
  'original', 'warm', 'bold', 'poetic', 'playful', 'reflective', 'honest',
]);
const PAL_COUNT = 10;
const VALID_CORNERS = new Set(['rounded', 'sharp']);

function safeTone(value) {
  return VALID_TONES.has(value) ? value : 'original';
}

function safePalette(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < PAL_COUNT
    ? String(parsed)
    : '0';
}

function safeCorners(value) {
  return VALID_CORNERS.has(value) ? value : 'rounded';
}

// Generate random 8-char alphanumeric ID
function randomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Method not allowed');
    return;
  }

  try {
    // Read raw PNG bytes directly from request body.
    // Hard-cap at 2 MB — a 1080×1080 card PNG is typically 200–600 KB,
    // so 2 MB gives ample headroom while preventing runaway uploads.
    const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
    let totalBytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_UPLOAD_BYTES) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File too large — maximum 2 MB' }));
        return;
      }
      chunks.push(chunk);
    }
    const pngBuffer = Buffer.concat(chunks);

    if (pngBuffer.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Empty file');
      return;
    }

    // Generate short random ID
    const shortId = randomId();

    // Upload original card PNG (used by the landing page hero image)
    await put(`cards/${shortId}.png`, pngBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days
    });

    // Re-encode the original card as a 1200×1200 JPEG for the OG image.
    // NATIVE ASPECT (1:1) matches the card, so the link preview shows the
    // card as the user created it — not a 16:9 padded version with cream
    // bars on top/bottom. A 1:1 OG triggers a smaller preview on some
    // platforms (WhatsApp/Twitter), but the user's reported bug was the
    // 16:9 image being visibly wrong. The native aspect is the correct
    // trade-off for Wispr Stories' card-shaped content.
    // mozjpeg + quality 82 typically lands ~50–100 KB.
    const ogBuffer = await sharp(pngBuffer)
      .flatten({ background: '#ffffff' }) // strip alpha so JPEG bg is predictable
      .resize({
        width: 1200,
        height: 1200,
        fit: 'cover', // crop to exact 1:1 (card is already 1:1, this is a safety)
        position: 'center',
      })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();

    await put(`og/${shortId}.jpg`, ogBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days
      contentType: 'image/jpeg',
    });

    // Store card metadata sidecar if provided via custom headers
    const cardText = req.headers['x-card-text'] ? decodeURIComponent(req.headers['x-card-text']) : '';
    const cardName = req.headers['x-card-name'] ? decodeURIComponent(req.headers['x-card-name']) : '';
    const cardTone = safeTone(req.headers['x-card-tone']) || 'original';
    const cardP = safePalette(req.headers['x-card-p']) || '0';
    const cardR = safeCorners(req.headers['x-card-r']) || 'rounded';
    if (cardText || cardName) {
      const meta = { text: cardText, name: cardName, tone: cardTone, p: cardP, r: cardR };
      await put(`meta/${shortId}.json`, JSON.stringify(meta), {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 5,
        contentType: 'application/json',
      });
    }

    res.setHeader('Content-Type', 'application/json');
    // Restrict CORS to own origin — upload should only be callable from the app itself.
    res.setHeader('Access-Control-Allow-Origin', 'https://wisprstories.vercel.app');
    res.end(JSON.stringify({ shortId }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Upload error: ' + (e && e.message ? e.message : 'unknown'));
  }
}
