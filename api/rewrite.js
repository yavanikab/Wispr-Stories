import { getRedis, KEYS, secondsUntilMidnightUTC } from '../lib/redis.js';

const FREE_MAX_REWRITES = 10;

// Tone-specific prompts for rewriting
const TONE_PROMPTS = {
  warm: 'Rewrite this message to sound warm, friendly, and heartfelt. Keep it natural and personal.',
  bold: 'Rewrite this message to sound bold, confident, and impactful. Make it punchy and direct.',
  poetic: 'Rewrite this message to sound poetic, lyrical, and rhythmic. Use beautiful language.',
  playful: 'Rewrite this message to sound playful, fun, and lighthearted. Add a touch of humor.',
  reflective: 'Rewrite this message to sound thoughtful, contemplative, and introspective.',
  honest: 'Rewrite this message to sound direct, authentic, and genuine. No fluff.',
};

function truncateToSentenceBoundary(text, maxChars) {
  if (text.length <= maxChars) return text;

  // Find the last sentence boundary before maxChars
  const truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastBoundary = Math.max(lastPeriod, lastExclaim, lastQuestion);

  if (lastBoundary > maxChars * 0.5) {
    return text.slice(0, lastBoundary + 1).trim();
  }

  // If no good boundary, just truncate and add ellipsis
  return text.slice(0, maxChars).trim() + '...';
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, tone, sessionId, isPro } = await req.json();

    if (!text || !tone) {
      return new Response(JSON.stringify({ error: 'Missing text or tone' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!TONE_PROMPTS[tone]) {
      return new Response(JSON.stringify({ error: 'Unknown tone' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rewrite limit for free users
    let redisFailed = false;
    if (!isPro && sessionId) {
      try {
        const redis = getRedis();
        const today = new Date().toISOString().slice(0, 10);
        const key = KEYS.userRewrites(sessionId, today);
        const count = parseInt(await redis.get(key) || '0', 10);

        if (count >= FREE_MAX_REWRITES) {
          return new Response(JSON.stringify({
            error: 'Daily rewrite limit reached',
            used: count,
            max: FREE_MAX_REWRITES,
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Increment counter
        const ttl = secondsUntilMidnightUTC();
        await redis.incr(key);
        await redis.expire(key, ttl);
      } catch (redisErr) {
        console.warn('[Rewrite] Redis unavailable, allowing rewrite:', redisErr.message);
        redisFailed = true;
      }
    }

    // Call OpenRouter with Owl Alpha
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `${TONE_PROMPTS[tone]} Keep it under 150 characters. Return ONLY the rewritten text, no quotes or commentary.\n\nOriginal message: "${text}"`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wisprstories.vercel.app',
        'X-Title': 'Wispr Stories',
      },
      body: JSON.stringify({
        model: 'openrouter/owl-alpha',
        messages: [
          {
            role: 'system',
            content: 'You rewrite short voice messages into greeting cards with specific tones. Return ONLY the rewritten text.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'LLM API error', detail: err }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    let rewritten = data.choices?.[0]?.message?.content?.trim() || '';

    // Remove quotes if the LLM wrapped the response in quotes
    rewritten = rewritten.replace(/^["']|["']$/g, '').trim();

    // Enforce 150-char limit with sentence-boundary truncation
    rewritten = truncateToSentenceBoundary(rewritten, 150);

    return new Response(JSON.stringify({
      text: rewritten,
      original: text,
      tone,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[Rewrite] Error:', e.message);
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Rewrite timed out' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
