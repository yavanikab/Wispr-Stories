import { getLangStatsRedis } from '../lib/lang-stats-redis.js';

export default async function handler(req, res) {
  // CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lang, source } = req.body || {};

    if (!lang || !source) {
      return res.status(400).json({ error: 'lang and source are required' });
    }

    if (source !== 'voice' && source !== 'story') {
      return res.status(400).json({ error: 'source must be "voice" or "story"' });
    }

    try {
      const redis = getLangStatsRedis();
      const field = source + ':' + lang;
      await redis.hincrby('wispr:langstats', field, 1);
    } catch (redisErr) {
      // Redis not configured or unavailable — tracking is non-critical, succeed silently
      console.warn('[TrackUsage] Redis unavailable:', redisErr.message);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[TrackUsage] Error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
