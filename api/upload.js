// Upload card PNG to Vercel Blob storage.
// Returns a public URL that can be used as og:image.
//
// POST /api/upload
// Body: multipart/form-data with "card" field (PNG file)
// Response: { url: "https://public.blob.vercel-storage.com/cards/xxx.png" }

import { put } from '@vercel/blob';

export const runtime = 'edge';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('card');

    if (!file || !(file instanceof Blob)) {
      return new Response('Missing card file', { status: 400 });
    }

    // Generate unique filename with timestamp for auto-expiry tracking
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const filename = `cards/${timestamp}_${id}.png`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 5, // 5 days cache
    });

    return new Response(JSON.stringify({ url: blob.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      'Upload error: ' + (e && e.message ? e.message : 'unknown'),
      { status: 500, headers: { 'Content-Type': 'text/plain' } },
    );
  }
}
