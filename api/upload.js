// Upload card PNG to Vercel Blob storage.
// Accepts raw PNG bytes (no multipart parsing) for fast uploads.
// Creates two versions:
//   1. Original card PNG (for landing page display)
//   2. Padded 1200×630 OG image (for WhatsApp large preview)
// Returns short IDs for clean share URLs.
//
// POST /api/upload
// Body: raw PNG bytes
// Content-Type: image/png
// Response: { shortId: "aB3xK9mP", ogId: "cD4yL0nQ" }

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

    // Get image dimensions to calculate padding
    const metadata = await sharp(pngBuffer).metadata();
    const cardWidth = metadata.width;
    const cardHeight = metadata.height;

    // Generate short random ID
    const shortId = randomId();

    // Upload original card PNG
    await put(`cards/${shortId}.png`, pngBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days
    });

    // Create padded 1200×630 OG image
    // Card is centered with background color padding
    const ogWidth = 1200;
    const ogHeight = 630;
    
    // Calculate scale to fit card within OG dimensions with padding
    const padding = 40;
    const maxCardWidth = ogWidth - (padding * 2);
    const maxCardHeight = ogHeight - (padding * 2);
    const scale = Math.min(maxCardWidth / cardWidth, maxCardHeight / cardHeight, 1);
    const scaledWidth = Math.floor(cardWidth * scale);
    const scaledHeight = Math.floor(cardHeight * scale);
    const offsetX = Math.floor((ogWidth - scaledWidth) / 2);
    const offsetY = Math.floor((ogHeight - scaledHeight) / 2);

    // Detect dominant background color from card edges for padding
    // Sample pixels from the edges to find the background color
    const edgeSample = await sharp(pngBuffer)
      .extract({ left: 0, top: 0, width: Math.min(10, cardWidth), height: Math.min(10, cardHeight) })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Calculate average color from edge pixels
    const edgeData = edgeSample.data;
    let r = 0, g = 0, b = 0;
    const pixelCount = edgeSample.info.width * edgeSample.info.height;
    for (let i = 0; i < edgeData.length; i += 3) {
      r += edgeData[i];
      g += edgeData[i + 1];
      b += edgeData[i + 2];
    }
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);

    // Create padded OG image
    const ogBuffer = await sharp({
      create: {
        width: ogWidth,
        height: ogHeight,
        channels: 3,
        background: { r, g, b },
      },
    })
      .composite([
        {
          input: await sharp(pngBuffer)
            .resize(scaledWidth, scaledHeight, { fit: 'contain' })
            .toBuffer(),
          top: offsetY,
          left: offsetX,
        },
      ])
      .png({ quality: 90 })
      .toBuffer();

    // Upload padded OG image with same ID in og/ directory
    await put(`og/${shortId}.png`, ogBuffer, {
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
