export const config = { runtime: 'edge' };

import { getRedis, secondsUntilMidnightUTC } from '../lib/redis.js';

// Accepted audio MIME types — validated before use in Deepgram/Whisper request
// headers to prevent header injection from client-supplied format strings.
const ALLOWED_AUDIO_FORMATS = [
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg',
];

// Daily STT call cap per session. Set well above the 5-recording free-tier
// limit enforced by /api/limits so legitimate users never hit this — it is
// purely a server-side safety net against callers who bypass /api/limits.
const STT_MAX_CALLS_PER_SESSION = 20;

export default async function handler(req) {
  // Health check — used by client to decide server STT vs Web Speech fallback
  if (req.method === 'GET') {
    const dgKey = process.env.DEEPGRAM_API_KEY;
    const dgAdminKey = process.env.DEEPGRAM_API_KEY_ADMIN;
    const orKey = process.env.OPENROUTER_API_KEY;
    const isReal = (k) => k && !k.includes('YOUR_ACTUAL_KEY');
    const available = !!(isReal(dgKey) || isReal(dgAdminKey) || isReal(orKey));
    return new Response(JSON.stringify({ available }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Route to admin key if admin secret matches
  const adminSecret = req.headers.get('x-admin-secret');
  const isAdmin = adminSecret && process.env.ADMIN_API_SECRET && adminSecret === process.env.ADMIN_API_SECRET;
  const apiKey = isAdmin ? process.env.DEEPGRAM_API_KEY_ADMIN : process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server not configured — add DEEPGRAM_API_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { audio, format: rawFormat, language, sessionId } = await req.json();

    // Sanitize format to an explicit allowlist. rawFormat comes from the
    // client and would otherwise be passed directly into a Deepgram request
    // header, creating a header-injection risk.
    const format = ALLOWED_AUDIO_FORMATS.includes(rawFormat) ? rawFormat : 'audio/webm';

    // Server-side session rate limit — catches callers who call /api/stt
    // directly without going through the /api/limits pre-flight.
    // Admin calls and anonymous sessions (no sessionId) bypass this check.
    if (!isAdmin && sessionId) {
      try {
        const redis = getRedis();
        const today = new Date().toISOString().slice(0, 10);
        const sttKey = `wispr:stt:${sessionId}:${today}`;
        const calls = parseInt(await redis.get(sttKey) || '0', 10);
        if (calls >= STT_MAX_CALLS_PER_SESSION) {
          return new Response(JSON.stringify({ error: 'Daily STT limit reached' }), {
            status: 429, headers: { 'Content-Type': 'application/json' },
          });
        }
        const ttl = secondsUntilMidnightUTC();
        await redis.incr(sttKey);
        await redis.expire(sttKey, ttl);
      } catch (redisErr) {
        // Redis unavailable — fail open rather than block legitimate users
        console.warn('[STT] Rate limit check failed, allowing through:', redisErr.message);
      }
    }

    const binaryStr = atob(audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    var dgLang = (language || '').slice(0, 2).toLowerCase();

    // Whisper-routed languages: CJK/Thai + Deepgram-unsupported Indian languages
    var whisperLanguages = ['th', 'ja', 'ko', 'zh', 'ml', 'pa'];

    if (whisperLanguages.indexOf(dgLang) !== -1) {
      var orKey = process.env.OPENROUTER_API_KEY;
      if (orKey) {
        // Sanitize format: "audio/webm;codecs=opus" → "webm"
        var audioFormat = (format || '').split(';')[0].split('/')[1] || 'webm';
        var whisperRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + orKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://wisprstories.vercel.app',
            'X-OpenRouter-Title': 'Wispr Stories',
          },
          body: JSON.stringify({
            model: 'openai/whisper-large-v3-turbo',
            input_audio: { data: audio, format: audioFormat },
            language: dgLang,
          }),
        });
        if (!whisperRes.ok) {
          const errText = await whisperRes.text();
          return new Response(JSON.stringify({ error: 'Whisper API error', detail: errText }), {
            status: whisperRes.status, headers: { 'Content-Type': 'application/json' },
          });
        }
        const whisperData = await whisperRes.json();
        const text = whisperData.text || '';
        return new Response(JSON.stringify({ text }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Deepgram Nova-3 Multilingual (Batch) — pass language code for non-English
    var dgSupported = ['de','es','fr','gu','hi','id','it','kn','pt','ru','sv','ta','te','tr'];
    var langParam = dgLang && dgSupported.indexOf(dgLang) !== -1 ? '&language=' + dgLang : '';
    const url = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true' + langParam;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + apiKey,
        'Content-Type': format,
      },
      body: bytes,
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'Deepgram API error', detail: err }), {
        status: res.status, headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
