export const config = { runtime: 'edge' };

import { getRedis, KEYS } from '../lib/redis.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { key } = await req.json();

    if (!key || typeof key !== 'string') {
      return new Response(JSON.stringify({ valid: false, reason: 'missing_key' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const redisKey = KEYS.upgradeKey(key.trim());
    const data = await redis.get(redisKey);

    if (!data) {
      return new Response(JSON.stringify({ valid: false, reason: 'invalid_key' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyData = typeof data === 'string' ? JSON.parse(data) : data;

    // Revoked keys (refunded supporters) get a clear reason, not a generic 'invalid_key'
    if (keyData.revoked) {
      return new Response(JSON.stringify({ valid: false, reason: 'revoked' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Never return PII — email and purchase date stay server-side only.
    return new Response(JSON.stringify({
      valid: true,
      tier: keyData.tier || 'pro',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[ValidateKey] Error:', e.message);
    return new Response(JSON.stringify({ valid: false, reason: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
