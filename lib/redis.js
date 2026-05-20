import { Redis } from '@upstash/redis';

// Shared Upstash Redis client for all serverless functions
// Used for: daily user counter, upgrade key validation, email lookup

let redis = null;

export function getRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

// Key prefixes to avoid collisions
export const KEYS = {
  // Daily user counter: wispr:daily:2026-05-19
  dailyCounter: (date) => `wispr:daily:${date}`,

  // Upgrade key validation: wispr:keys:WS-BDAY-2026-A7K2
  upgradeKey: (key) => `wispr:keys:${key}`,

  // Email lookup: wispr:emails:user@example.com
  emailLookup: (email) => `wispr:emails:${email}`,

  // Per-user recording counter: wispr:recordings:{sessionId}:2026-05-19
  userRecordings: (sessionId, date) => `wispr:recordings:${sessionId}:${date}`,

  // Per-user cumulative seconds: wispr:cumulative:{sessionId}:2026-05-19
  userCumulative: (sessionId, date) => `wispr:cumulative:${sessionId}:${date}`,

  // Per-user tone rewrite counter (legacy, shared across all tones — kept for backward compatibility)
  userRewrites: (sessionId, date) => `wispr:rewrites:${sessionId}:${date}`,

  // Per-user per-tone rewrite counter: wispr:rewrites:{sessionId}:warm:2026-05-19
  // Used to enforce a separate daily quota for each tone.
  userRewritesByTone: (sessionId, tone, date) => `wispr:rewrites:${sessionId}:${tone}:${date}`,
};

// Midnight UTC expiration helper
export function secondsUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.floor((midnight - now) / 1000);
}
