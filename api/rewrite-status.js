// Read-only endpoint returning the authoritative per-tone rewrite counts for
// a given sessionId on the current date (UTC). Used by the client to sync its
// localStorage mirror with the server on page load, so clearing localStorage
// does not make the UI lie about remaining rewrites.
//
// The actual limit enforcement happens in api/rewrite-confirm.js — this
// endpoint just lets the UI display the real numbers.
//
// Edge runtime, GET method. No body required.

export const config = { runtime: 'edge' };

import { getRedis, KEYS } from '../lib/redis.js';

const REWRITE_TONES = ["warm", "bold", "poetic", "playful", "reflective", "honest"];
const FREE_MAX_PER_TONE = 5;

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const proKey = url.searchParams.get('proKey');

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate pro status server-side. Never trust client-sent isPro.
    let isPro = false;
    if (proKey) {
      try {
        const redis = getRedis();
        const keyData = await redis.get(KEYS.upgradeKey(proKey.trim()));
        isPro = !!keyData;
      } catch (proErr) {
        console.warn('[RewriteStatus] Pro key check failed, treating as free:', proErr.message);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const counts = {};

    try {
      const redis = getRedis();
      // Parallel fetch all tone counts for the current date.
      const results = await Promise.all(
        REWRITE_TONES.map(async (tone) => {
          const key = KEYS.userRewritesByTone(sessionId, tone, today);
          const raw = await redis.get(key);
          const used = parseInt(raw || '0', 10);
          return [tone, isNaN(used) ? 0 : used];
        })
      );
      for (const [tone, used] of results) {
        counts[tone] = used;
      }
    } catch (redisErr) {
      // Fail open: if Redis is unavailable, return zeros. The UI will
      // optimistically show full quota; the rewrite-confirm endpoint is the
      // authoritative gate.
      console.warn('[RewriteStatus] Redis unavailable, returning zeros:', redisErr.message);
      for (const tone of REWRITE_TONES) counts[tone] = 0;
    }

    return new Response(JSON.stringify({
      ok: true,
      sessionId,
      date: today,
      isPro,
      max: FREE_MAX_PER_TONE,
      counts,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Allow caching for 30s — the counter changes at most once per
        // user interaction. Helps when the user opens multiple tabs.
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (e) {
    console.error('[RewriteStatus] Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
