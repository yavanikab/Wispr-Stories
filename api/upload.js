// Upload card PNG to Vercel Blob storage.
// Returns a public URL that can be used as og:image.
//
// POST /api/upload
// Body: multipart/form-data with "card" field (PNG file)
// Response: { url: "https://public.blob.vercel-storage.com/cards/xxx.png" }

import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Parse multipart form data manually (no dependency needed)
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      res.statusCode = 400;
      res.end('Missing boundary');
      return;
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const endBoundaryBuf = Buffer.from(`--${boundary}--`);

    // Find the file part
    const startIdx = body.indexOf(boundaryBuf);
    if (startIdx === -1) {
      res.statusCode = 400;
      res.end('Invalid form data');
      return;
    }

    const afterBoundary = body.slice(startIdx + boundaryBuf.length);
    const headerEnd = afterBoundary.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      res.statusCode = 400;
      res.end('Invalid form data');
      return;
    }

    const headers = afterBoundary.slice(0, headerEnd).toString();
    const fileStart = headerEnd + 4;

    // Find end boundary
    const endIdx = afterBoundary.indexOf(endBoundaryBuf, fileStart);
    const fileEnd = endIdx !== -1 ? endIdx - 2 : afterBoundary.length; // -2 for trailing \r\n
    const fileData = afterBoundary.slice(fileStart, fileEnd);

    // Generate unique filename with timestamp for auto-expiry tracking
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const filename = `cards/${timestamp}_${id}.png`;

    const blob = await put(filename, fileData, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days cache
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ url: blob.url }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      'Upload error: ' + (e && e.message ? e.message : 'unknown'),
    );
  }
}
