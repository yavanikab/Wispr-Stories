export const config = { runtime: 'edge' };

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

    // Admin bypass — same header check as api/limits.js and api/stt.js
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret && process.env.ADMIN_API_SECRET && adminSecret === process.env.ADMIN_API_SECRET) {
      return new Response(JSON.stringify({ allowed: true, isAdmin: true, count: 0, cap: DAILY_USER_CAP }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Server-side Pro key validation
    let validatedPro = false;
    const proKey = req.headers.get('x-pro-key');
    if (proKey) {
      try {
        const redis = getRedis();
        const keyData = await redis.get(KEYS.upgradeKey(proKey.trim()));
        validatedPro = !!keyData;
      } catch (e) {
        console.warn('[Usage] Pro key check failed, treating as free:', e.message);
      }
    }
    const effectivePro = !!(isPro && validatedPro);
    if (effectivePro) {
      return new Response(JSON.stringify({ allowed: true, count: 0, cap: DAILY_USER_CAP }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = KEYS.dailyCounter(today);
    const sessionKey = `wispr:session:${sessionId}:${today}`;
    const ttl = secondsUntilMidnightUTC();

    // If this session was already counted today, allow immediately (grandfather)
    const alreadyCounted = await redis.get(sessionKey);
    if (alreadyCounted) {
      return new Response(JSON.stringify({ allowed: true, count: 0, cap: DAILY_USER_CAP }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Atomic INCR — eliminates the get-then-incr race condition
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    pipeline.set(sessionKey, '1', { ex: ttl });
    const results = await pipeline.exec();
    const newCount = results[0];

    if (newCount > DAILY_USER_CAP) {
      return new Response(JSON.stringify({
        allowed: false,
        count: newCount,
        cap: DAILY_USER_CAP,
        resetsAt: new Date(Date.now() + ttl * 1000).toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      allowed: true,
      count: newCount,
      cap: DAILY_USER_CAP,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[Usage] Error:', e.message);
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
