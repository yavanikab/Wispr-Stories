import { Redis } from '@upstash/redis';

let redis = null;

export function getLangStatsRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_LANG_STATS_URL;
    const token = process.env.UPSTASH_REDIS_LANG_STATS_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_LANG_STATS_URL and UPSTASH_REDIS_LANG_STATS_TOKEN must be set');
    }

    redis = new Redis({ url, token });
  }
  return redis;
}
