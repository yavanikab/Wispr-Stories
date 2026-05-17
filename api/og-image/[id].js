// Proxy endpoint for OG images.
// Fetches padded OG image from Vercel Blob and serves it from our domain.
// This ensures WhatsApp crawler can access the image without cross-domain issues.
//
// GET /api/og-image/:id

const BLOB_HOST = 'jkzbaevzmimaelrr.public.blob.vercel-storage.com';

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const id = url.pathname.replace(/^\/api\/og-image\//, '');

  if (!id || id.length < 4) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Image not found');
    return;
  }

  try {
    // Fetch OG image from Blob storage
    const blobUrl = `https://${BLOB_HOST}/og/${id}.png`;
    const response = await fetch(blobUrl);

    if (!response.ok) {
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Image not found');
      return;
    }

    // Get image buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Serve with proper headers for WhatsApp crawler
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buffer);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Error fetching image: ' + (e && e.message ? e.message : 'unknown'));
  }
}
