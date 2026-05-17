// Cron job: delete card images older than 5 days from Vercel Blob.
// Triggered daily via Vercel Cron (configured in vercel.json).

import { list, del } from '@vercel/blob';

export const runtime = 'edge';

export default async function handler(req) {
  // Only allow cron-triggered requests
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
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

    return new Response(JSON.stringify({ deleted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      'Cleanup error: ' + (e && e.message ? e.message : 'unknown'),
      { status: 500, headers: { 'Content-Type': 'text/plain' } },
    );
  }
}
