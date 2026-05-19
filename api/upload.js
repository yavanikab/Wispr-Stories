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
    // Read raw PNG bytes directly from request body
    const chunks = [];
    for await (const chunk of req) {
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

    // Re-encode the original card as JPEG for the OG image.
    // mozjpeg + quality 82 typically lands ~30–60 KB for a 1080×1080 card.
    const ogBuffer = await sharp(pngBuffer)
      .flatten({ background: '#ffffff' }) // strip alpha so JPEG bg is predictable
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();

    await put(`og/${shortId}.jpg`, ogBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days
      contentType: 'image/jpeg',
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ shortId }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Upload error: ' + (e && e.message ? e.message : 'unknown'));
  }
}
