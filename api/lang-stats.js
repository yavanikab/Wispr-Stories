import { getLangStatsRedis } from '../lib/lang-stats-redis.js';

export default async function handler(req, res) {
  // CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let redis;
    try {
      redis = getLangStatsRedis();
    } catch (_e) {
      // Redis not configured — return empty data
      return res.status(200).json({ voice: {}, story: {} });
    }

    const raw = await redis.hgetall('wispr:langstats');

    if (!raw || typeof raw !== 'object') {
      return res.status(200).json({ voice: {}, story: {} });
    }

    // Parse flat hash into voice: {} and story: {} objects
    const voice = {};
    const story = {};

    for (const [field, count] of Object.entries(raw)) {
      const colonIdx = field.indexOf(':');
      if (colonIdx === -1) continue;
      const source = field.slice(0, colonIdx);
      const lang = field.slice(colonIdx + 1);
      const num = Number(count) || 0;
      if (source === 'voice') {
        voice[lang] = num;
      } else if (source === 'story') {
        story[lang] = num;
      }
    }

    return res.status(200).json({ voice, story });
  } catch (e) {
    console.error('[LangStats] Error:', e);
    return res.status(200).json({ voice: {}, story: {} });
  }
}
