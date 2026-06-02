// Confirm endpoint for tone rewrites. The actual counter tick happens here,
// not in /api/rewrite (which is now a preview-only call that returns the
// rewritten text without consuming quota). The client calls this endpoint
// when the user clicks Accept on a rewrite preview, OR when the user clicks
// Create without going through Accept (the rewrite is auto-committed).
//
// Free-tier users get 5 rewrites per tone per day. The same key shape as the
// old /api/rewrite increment (KEYS.userRewritesByTone) is used, so the daily
// counts and the daily-reset behavior are unchanged.

export const config = { runtime: 'edge' };

import { getRedis, KEYS, secondsUntilMidnightUTC } from '../lib/redis.js';

const FREE_MAX_PER_TONE = 5;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { tone, sessionId, proKey } = await req.json();

    if (!tone) {
      return new Response(JSON.stringify({ error: 'Missing tone' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // "original" is the no-rewrite path. The client should not call confirm
    // for it, but we guard anyway so a stray call doesn't create an empty key.
    if (tone === 'original') {
      return new Response(JSON.stringify({ ok: true, tone, used: 0, max: FREE_MAX_PER_TONE, remaining: FREE_MAX_PER_TONE }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate pro status server-side. Never trust a client-sent isPro flag.
    // Fail closed: if Redis is unavailable, treat as free user.
    let isPro = false;
    if (proKey) {
      try {
        const redis = getRedis();
        const keyData = await redis.get(KEYS.upgradeKey(proKey.trim()));
        isPro = !!keyData;
      } catch (proErr) {
        console.warn('[RewriteConfirm] Pro key check failed, treating as free:', proErr.message);
      }
    }

    // Pro users: no-op confirm. The client mirrors this by skipping the call,
    // but we still answer ok so a misbehaving client doesn't break the flow.
    if (isPro) {
      return new Response(JSON.stringify({ ok: true, tone, isPro: true, used: 0, max: Infinity, remaining: Infinity }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Free user: increment the per-tone daily counter. Use a check-then-incr
    // pattern: if the user is already at the cap, return 429 WITHOUT ticking.
    // This prevents the "confirm during preview of an exhausted tone" edge
    // case from over-incrementing.
    let newUsedCount;
    try {
      const redis = getRedis();
      const today = new Date().toISOString().slice(0, 10);
      const key = KEYS.userRewritesByTone(sessionId, tone, today);
      const count = parseInt(await redis.get(key) || '0', 10);

      if (count >= FREE_MAX_PER_TONE) {
        return new Response(JSON.stringify({
          error: 'Daily limit reached for this tone',
          tone,
          used: count,
          max: FREE_MAX_PER_TONE,
          remaining: 0,
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Atomic INCR. If two confirms race (e.g. double-tap on Accept), one
      // will land on 6 and the client should handle the 429 response. We do
      // NOT pre-check then INCR; the small overshoot is acceptable.
      const incremented = await redis.incr(key);
      const ttl = secondsUntilMidnightUTC();
      await redis.expire(key, ttl);
      newUsedCount = typeof incremented === 'number' ? incremented : count + 1;
    } catch (redisErr) {
      // Fail open: if Redis is down, allow the rewrite without ticking. The
      // client will continue to show its local count; the daily total will
      // not be precisely enforced, but the user is not blocked.
      console.warn('[RewriteConfirm] Redis unavailable, allowing without tick:', redisErr.message);
      return new Response(JSON.stringify({ ok: true, tone, used: 0, max: FREE_MAX_PER_TONE, remaining: FREE_MAX_PER_TONE, degraded: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      tone,
      used: newUsedCount,
      max: FREE_MAX_PER_TONE,
      remaining: Math.max(0, FREE_MAX_PER_TONE - newUsedCount),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[RewriteConfirm] Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
