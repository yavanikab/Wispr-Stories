// Upload card PNG to Vercel Blob storage.
// Accepts raw PNG bytes (no multipart parsing) for fast uploads.
// Returns a short random ID for clean share URLs.
//
// POST /api/upload
// Body: raw PNG bytes
// Content-Type: image/png
// Response: { shortId: "aB3xK9mP" }

import { put } from '@vercel/blob';

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

    // Generate short random ID and upload to Blob
    const shortId = randomId();
    const filename = `cards/${shortId}.png`;

    const blob = await put(filename, pngBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days
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
