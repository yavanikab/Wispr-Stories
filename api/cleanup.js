// Cron job: delete card images older than 5 days from Vercel Blob.
// Triggered daily via Vercel Cron (configured in vercel.json).

import { list, del } from '@vercel/blob';

export default async function handler(req, res) {
  // Only allow cron-triggered requests
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  try {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    let cursor;
    let deleted = 0;

    do {
      const response = await list({ prefix: 'cards/', cursor });
      for (const blob of response.blobs) {
        // Filename format: cards/TIMESTAMP_id.png
        const match = blob.pathname.match(/cards\/(\d+)_/);
        if (match) {
          const timestamp = parseInt(match[1], 10);
          if (timestamp < fiveDaysAgo) {
            await del(blob.url);
            deleted++;
          }
        }
      }
      cursor = response.cursor;
    } while (cursor);

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ deleted }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      'Cleanup error: ' + (e && e.message ? e.message : 'unknown'),
    );
  }
}
