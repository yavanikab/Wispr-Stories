export const config = { runtime: 'edge' };

import { getRedis, KEYS, secondsUntilMidnightUTC } from '../lib/redis.js';

const FREE_MAX_RECORDINGS = 5;
const PRO_MAX_RECORDINGS = 50;
const FREE_MAX_SECONDS = 75;
const PRO_MAX_SECONDS = 900;
const FREE_MAX_LENGTH = 15;
const PRO_MAX_LENGTH = 30;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { sessionId, isPro, audioDuration, checkOnly, proKey } = await req.json();

    // Skip all limits if admin secret matches
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret && process.env.ADMIN_API_SECRET && adminSecret === process.env.ADMIN_API_SECRET) {
      return new Response(JSON.stringify({ allowed: true, isAdmin: true, recordingsMax: 9999, cumulativeMax: 999999 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate pro status server-side — never trust client-sent isPro alone
    let validatedPro = false;
    if (proKey) {
      try {
        const redis = getRedis();
        const keyData = await redis.get(KEYS.upgradeKey(proKey.trim()));
        validatedPro = !!keyData;
      } catch (e) {
        console.warn('[Limits] Pro key check failed, treating as free:', e.message);
      }
    }
    const effectivePro = !!isPro && validatedPro;

    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const ttl = secondsUntilMidnightUTC();

    const recordingsKey = KEYS.userRecordings(sessionId, today);
    const cumulativeKey = KEYS.userCumulative(sessionId, today);

    const recordings = parseInt(await redis.get(recordingsKey) || '0', 10);
    const cumulative = parseInt(await redis.get(cumulativeKey) || '0', 10);

    const maxRecordings = effectivePro ? PRO_MAX_RECORDINGS : FREE_MAX_RECORDINGS;
    const maxSeconds = effectivePro ? PRO_MAX_SECONDS : FREE_MAX_SECONDS;
    const maxLength = effectivePro ? PRO_MAX_LENGTH : FREE_MAX_LENGTH;

    // Check audio length
    if (audioDuration > maxLength) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'too_long',
        maxSeconds: maxLength,
        actualSeconds: audioDuration,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check recording count
    if (recordings >= maxRecordings) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'too_many',
        used: recordings,
        max: maxRecordings,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check cumulative seconds
    if (cumulative + audioDuration > maxSeconds) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'cumulative_exceeded',
        used: cumulative,
        max: maxSeconds,
        wouldBe: cumulative + audioDuration,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment counters only if not check-only
    if (!checkOnly) {
      const pipeline = redis.pipeline();
      pipeline.incr(recordingsKey);
      pipeline.expire(recordingsKey, ttl);
      pipeline.incrby(cumulativeKey, audioDuration);
      pipeline.expire(cumulativeKey, ttl);
      await pipeline.exec();
    }

    return new Response(JSON.stringify({
      allowed: true,
      recordingsUsed: checkOnly ? recordings : recordings + 1,
      recordingsMax: maxRecordings,
      cumulativeUsed: checkOnly ? cumulative : cumulative + audioDuration,
      cumulativeMax: maxSeconds,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[Limits] Error:', e.message);
    return new Response(JSON.stringify({
      allowed: true,
      error: 'Limits tracking unavailable',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
