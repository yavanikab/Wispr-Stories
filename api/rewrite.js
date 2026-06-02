export const config = { runtime: 'edge' };

import { getRedis, KEYS } from '../lib/redis.js';

// Free-tier quota is enforced per tone, per day.
// Each tone has its own 5-rewrite daily budget (5 x 6 tones = 30 max/day).
const FREE_MAX_PER_TONE = 5;

// Global Redis cache for rewrite results (keyed by tone + text hash).
// Cache hits skip both the OpenRouter call and rate limit consumption.
const CACHE_TTL_SEC = 86400; // 24 hours

// Bump whenever the prompt logic changes — old entries are orphaned and
// expire on their own TTL, so prompt fixes take effect immediately without
// a manual Redis flush.
const PROMPT_VERSION = 'v3';

function cacheKey(tone, text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `wispr:rewrites:cache:${PROMPT_VERSION}:${tone}:${Math.abs(hash).toString(36)}`;
}

// Tone-specific prompts for rewriting
const TONE_PROMPTS = {
  warm: 'Rewrite this message to sound warm, friendly, and heartfelt. Keep it natural and personal.',
  bold: 'Rewrite this message to sound bold, confident, and impactful. Make it punchy and direct.',
  poetic: 'Rewrite this message to sound poetic, lyrical, and rhythmic. Use beautiful language.',
  playful: 'Rewrite this message to sound playful, fun, and lighthearted. Add a touch of humor.',
  reflective: 'Rewrite this message to sound thoughtful, contemplative, and introspective.',
  honest: 'Rewrite this message to sound direct, authentic, and genuine. No fluff.',
};

// Classify the dominant script of the input so the prompt can give the LLM
// a positive, declarative instruction ("respond in Tamil script") instead of
// a one-sided guard that small models routinely misinterpret. Japanese is
// checked before Chinese because pure-Kanji Japanese would otherwise hit the
// CJK range and be tagged Chinese.
function detectScript(text) {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'Japanese';
  if (/[\uAC00-\uD7AF]/.test(text))             return 'Korean';
  if (/[\u4E00-\u9FFF]/.test(text))             return 'Chinese';
  if (/[\u0900-\u097F]/.test(text))             return 'Devanagari (Hindi/Marathi)';
  if (/[\u0980-\u09FF]/.test(text))             return 'Bengali';
  if (/[\u0A00-\u0A7F]/.test(text))             return 'Gurmukhi (Punjabi)';
  if (/[\u0A80-\u0AFF]/.test(text))             return 'Gujarati';
  if (/[\u0B00-\u0B7F]/.test(text))             return 'Oriya';
  if (/[\u0B80-\u0BFF]/.test(text))             return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text))             return 'Telugu';
  if (/[\u0C80-\u0CFF]/.test(text))             return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text))             return 'Malayalam';
  if (/[\u0E00-\u0E7F]/.test(text))             return 'Thai';
  if (/[\u0600-\u06FF]/.test(text))             return 'Arabic';
  if (/[\u0400-\u04FF]/.test(text))             return 'Cyrillic';
  if (/[\u0370-\u03FF]/.test(text))             return 'Greek';
  return 'Latin';
}

// Returns true if the model translated the text to English despite a non-Latin input.
// Detects this by checking whether a non-Latin input produced a Latin-only output.
function isLanguageMismatch(inputText, outputText) {
  const inputScript = detectScript(inputText);
  if (inputScript === 'Latin') return false; // Latin input is fine either way
  const outputScript = detectScript(outputText);
  return outputScript === 'Latin'; // Non-Latin input but Latin output → translated
}

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
    const { text, tone, sessionId, proKey } = await req.json();

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

    // Server-side length guard. The client enforces 150 chars via maxlength,
    // but a direct API call could send much longer text and amplify LLM costs.
    // 500 chars is generous enough for any legitimate use while capping abuse.
    if (text.length > 500) {
      return new Response(JSON.stringify({ error: 'Text too long — maximum 500 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate pro status server-side via Redis.
    // Never trust the client-sent isPro flag — proKey is validated here directly.
    // Fail closed: if Redis is unavailable, treat as free user.
    let isPro = false;
    if (proKey) {
      try {
        const redis = getRedis();
        const keyData = await redis.get(KEYS.upgradeKey(proKey.trim()));
        isPro = !!keyData;
      } catch (proErr) {
        console.warn('[Rewrite] Pro key check failed, treating as free:', proErr.message);
      }
    }

    // Check global Redis cache for this tone+text combination.
    // Cache hits skip both the OpenRouter call and rate limit consumption.
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey(tone, text));
      if (cached) {
        const payload = { text: cached, original: text, tone };
        if (isPro) payload.isPro = true;
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (cacheErr) {
      console.warn('[Rewrite] Cache check failed, proceeding:', cacheErr.message);
    }

    // Check per-tone rewrite limit for free users (PREVIEW ONLY — no increment).
    // The actual counter tick happens in /api/rewrite-confirm when the user
    // accepts the rewrite or creates a card with it. This way, picking a
    // tone and cancelling the preview doesn't burn quota.
    let redisFailed = false;
    if (!isPro && sessionId) {
      try {
        const redis = getRedis();
        const today = new Date().toISOString().slice(0, 10);
        const key = KEYS.userRewritesByTone(sessionId, tone, today);
        const count = parseInt(await redis.get(key) || '0', 10);

        if (count >= FREE_MAX_PER_TONE) {
          return new Response(JSON.stringify({
            error: 'Daily limit reached for this tone',
            tone,
            used: count,
            max: FREE_MAX_PER_TONE,
            remaining: 0,
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (redisErr) {
        console.warn('[Rewrite] Redis unavailable, allowing preview:', redisErr.message);
        redisFailed = true;
      }
    }

    // Call OpenRouter — Qwen 3 14B (free) / Ling 2.6 Flash (pro)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const script = detectScript(text);
    const scriptRule = script === 'Latin'
      ? 'The input uses Latin script. Respond in Latin script only. If the input mixes English with romanized Hindi/Indic words (Hinglish), keep that mix — do NOT convert to Devanagari or any native script. If the input is plain English, respond in plain English.'
      : `The input is written in ${script} script. Respond in ${script} script. Do NOT transliterate to Latin/Romanized form.`;
    const prompt = `${TONE_PROMPTS[tone]} Keep it under 150 characters. Return ONLY the rewritten text, no quotes or commentary.\n\nLANGUAGE RULE: Respond in the exact same language and script as the input. Do not translate. ${scriptRule}\n\nOriginal message: "${text}"`;

    // STRICT RULE: inclusionai/ling-2.6-flash is ONLY for verified pro users.
    // It must never appear in the free-user model list under any circumstance.
    const models = isPro
      ? ['inclusionai/ling-2.6-flash', 'sao10k/l3-lunaris-8b']  // pro: primary + fallback
      : ['google/gemma-4-31b-it:free', 'moonshotai/kimi-k2.6:free', 'google/gemma-4-26b-a4b-it:free'];  // free: 3-model chain
    let lastError = null;
    let data = null;

    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi];
      const isLastModel = mi === models.length - 1;
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
          model,
          messages: [
            {
              role: 'system',
              content: 'You rewrite short voice messages into greeting cards with specific tones. You ALWAYS respond in the exact same language and script as the input. You never translate or transliterate. Return ONLY the rewritten text.',
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
        const errText = await res.text();
        // Fall back to next model on rate-limit or model-not-found errors.
        // 429 = rate-limited; 404 = model unavailable on this provider.
        if (res.status === 429 || res.status === 404) {
          lastError = errText;
          console.warn(`[Rewrite] Model ${model} returned ${res.status}, trying fallback`);
          continue;
        }
        // Other upstream errors — return as 502 Bad Gateway so the client
        // never sees a confusing "404 Not Found" for this route.
        console.error(`[Rewrite] Model ${model} error ${res.status}:`, errText);
        return new Response(JSON.stringify({ error: 'LLM API error', detail: errText }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const candidate = await res.json();
      const candidateText = candidate.choices?.[0]?.message?.content?.trim() || '';

      // If free model returned English for a non-Latin input, fall through to paid fallback.
      if (!isLastModel && isLanguageMismatch(text, candidateText)) {
        console.warn(`[Rewrite] ${model} language mismatch (${detectScript(text)} input → Latin output), trying fallback`);
        continue;
      }

      data = candidate;
      break;
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'LLM API error', detail: lastError }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let rewritten = data.choices?.[0]?.message?.content?.trim() || '';

    // Remove quotes if the LLM wrapped the response in quotes
    rewritten = rewritten.replace(/^["']|["']$/g, '').trim();

    // Enforce 150-char limit with sentence-boundary truncation
    rewritten = truncateToSentenceBoundary(rewritten, 150);

    // Store in Redis cache so future requests for the same tone+text skip OpenRouter
    try {
      const redis = getRedis();
      await redis.set(cacheKey(tone, text), rewritten, { ex: CACHE_TTL_SEC });
    } catch (cacheErr) {
      console.warn('[Rewrite] Cache write failed, continuing:', cacheErr.message);
    }

    // Response payload. The per-tone counter is NOT incremented here — see
    // /api/rewrite-confirm. We only return the rewritten text and the tone
    // signal. The client uses isPro to skip limit UI for Pro users.
    const responsePayload = {
      text: rewritten,
      original: text,
      tone,
    };
    if (isPro) {
      responsePayload.isPro = true;
    }

    return new Response(JSON.stringify(responsePayload), {
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
