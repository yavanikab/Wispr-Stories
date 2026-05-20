export const config = { runtime: 'edge' };

import { getRedis, KEYS } from '../lib/redis.js';

// Validate Pro status server-side
// Returns { isPro, keyData } or { isPro: false }
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { key } = await req.json();

    if (!key) {
      return new Response(JSON.stringify({ isPro: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const redisKey = KEYS.upgradeKey(key.trim());
    const data = await redis.get(redisKey);

    if (!data) {
      return new Response(JSON.stringify({ isPro: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyData = typeof data === 'string' ? JSON.parse(data) : data;

    return new Response(JSON.stringify({
      isPro: true,
      tier: keyData.tier || 'pro',
      email: keyData.email || '',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[ProStatus] Error:', e.message);
    return new Response(JSON.stringify({ isPro: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
