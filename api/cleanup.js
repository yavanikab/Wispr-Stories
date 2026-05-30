// Scheduled cleanup of expired card blobs.
// Runs daily via Vercel Cron (see vercel.json `crons` block). Deletes any
// blob in `cards/` or `og/` older than MAX_AGE_HOURS so shared cards live
// ~1–2 days, never longer. Triggered by Vercel with
// `Authorization: Bearer ${CRON_SECRET}`; rejects anything else with 401.

import { list, del } from '@vercel/blob';

const MAX_AGE_HOURS = 36; // 1.5 days — gives ~1–2 day blob lifetime
const PREFIXES = ['cards/', 'og/', 'voice/', 'meta/'];
const DELETE_BATCH = 50;

export default async function handler(req, res) {
  // Reject anything that isn't the scheduled Vercel cron call
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Unauthorized');
    return;
  }

  const cutoffMs = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
  const expiredUrls = [];

  try {
    for (const prefix of PREFIXES) {
      let cursor;
      do {
        const page = await list({ prefix, cursor });
        for (const blob of page.blobs) {
          if (new Date(blob.uploadedAt).getTime() < cutoffMs) {
            expiredUrls.push(blob.url);
          }
        }
        cursor = page.cursor;
      } while (cursor);
    }

    let deleted = 0;
    for (let i = 0; i < expiredUrls.length; i += DELETE_BATCH) {
      const batch = expiredUrls.slice(i, i + DELETE_BATCH);
      await del(batch);
      deleted += batch.length;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      deleted,
      cutoff: new Date(cutoffMs).toISOString(),
    }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: false,
      error: (e && e.message) || 'unknown',
    }));
  }
}
