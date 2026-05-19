import { getRedis, KEYS, secondsUntilMidnightUTC } from '../lib/redis.js';

const DAILY_USER_CAP = 99;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { sessionId, isPro } = await req.json();

    // Pro users bypass the daily cap
    if (isPro) {
      return new Response(JSON.stringify({ allowed: true, count: 0, cap: DAILY_USER_CAP }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = KEYS.dailyCounter(today);
    const ttl = secondsUntilMidnightUTC();

    // Check current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= DAILY_USER_CAP) {
      // Check if this session was already counted (grandfather existing sessions)
      const sessionKey = `wispr:session:${sessionId}:${today}`;
      const alreadyCounted = await redis.get(sessionKey);

      if (alreadyCounted) {
        return new Response(JSON.stringify({ allowed: true, count, cap: DAILY_USER_CAP }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        allowed: false,
        count,
        cap: DAILY_USER_CAP,
        resetsAt: new Date(Date.now() + ttl * 1000).toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment counter and mark session as counted
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    pipeline.set(`wispr:session:${sessionId}:${today}`, '1', { ex: ttl });
    await pipeline.exec();

    return new Response(JSON.stringify({
      allowed: true,
      count: count + 1,
      cap: DAILY_USER_CAP,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // If Redis fails, allow access (fail open) but log the error
    console.error('[Usage] Redis error:', e.message);
    return new Response(JSON.stringify({
      allowed: true,
      count: 0,
      cap: DAILY_USER_CAP,
      error: 'Usage tracking unavailable',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
