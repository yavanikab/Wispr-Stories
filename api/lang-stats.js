import { getLangStatsRedis } from '../lib/lang-stats-redis.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    let redis;
    try {
      redis = getLangStatsRedis();
    } catch (_e) {
      return new Response(JSON.stringify({ voice: {}, story: {} }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    const raw = await redis.hgetall('wispr:langstats');
    console.log('[LangStats] raw from Redis:', JSON.stringify(raw));

    if (!raw || typeof raw !== 'object') {
      return new Response(JSON.stringify({ voice: {}, story: {} }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    const voice = {};
    const story = {};

    for (const [field, count] of Object.entries(raw)) {
      const colonIdx = field.indexOf(':');
      if (colonIdx === -1) continue;
      const source = field.slice(0, colonIdx);
      const lang = field.slice(colonIdx + 1);
      // Skip sentinel values that are not real language codes
      if (!lang || lang === '__native__') continue;
      const num = Number(count) || 0;
      if (source === 'voice') {
        voice[lang] = num;
      } else if (source === 'story') {
        story[lang] = num;
      }
    }

    return new Response(JSON.stringify({ voice, story }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('[LangStats] Error:', e);
    return new Response(JSON.stringify({ voice: {}, story: {} }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
