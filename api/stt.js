import { getRedis, secondsUntilMidnightUTC } from '../lib/redis.js';

// Accepted audio base MIME types — validated before use in Deepgram/Whisper
// request headers to prevent header injection from client-supplied format strings.
// Only the base type (before ';') is checked; codec parameters (e.g. codecs=opus)
// are preserved from the original rawFormat since they are needed by Deepgram.
const ALLOWED_AUDIO_FORMATS = [
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg',
];

// Daily STT call cap per session. Set well above the 5-recording free-tier
// limit enforced by /api/limits so legitimate users never hit this — it is
// purely a server-side safety net against callers who bypass /api/limits.
const STT_MAX_CALLS_PER_SESSION = 20;

export const config = { runtime: 'edge' };

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

  var orKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey && !orKey) {
    return new Response(JSON.stringify({ error: 'Server not configured — add DEEPGRAM_API_KEY or OPENROUTER_API_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawContentType = req.headers.get('content-type') || 'audio/webm';
    const language = req.headers.get('x-language') || '';
    const sessionId = req.headers.get('x-session-id') || '';
    const baseType = rawContentType.split(';')[0].trim();
    const isValid = ALLOWED_AUDIO_FORMATS.includes(baseType);
    // Validate base type for security, but send the full original type (with codecs)
    // to Deepgram so it knows the exact audio codec.
    const dgContentType = isValid ? rawContentType : 'audio/webm';

    // Read raw audio bytes directly — no base64 round-trip
    const audioArrayBuffer = await req.arrayBuffer();
    const bytes = new Uint8Array(audioArrayBuffer);

    // Generate base64 from raw bytes for Whisper path
    function rawBytesToBase64(buf) {
      var bin = '';
      for (var i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return btoa(bin);
    }
    var audioBase64 = rawBytesToBase64(bytes);

    // Server-side session rate limit
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
        console.warn('[STT] Rate limit check failed, allowing through:', redisErr.message);
      }
    }

    var dgLang = (language || '').slice(0, 2).toLowerCase();

    // Whisper-routed languages: CJK/Thai + Deepgram-unsupported Indian languages
    var whisperLanguages = ['th', 'ja', 'ko', 'zh', 'ml', 'pa', 'ne', 'my', 'si', 'jw', 'uz'];

    if (!apiKey || whisperLanguages.indexOf(dgLang) !== -1) {
      if (orKey) {
        var audioFormat = baseType.split('/')[1] || 'webm';
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
            input_audio: { data: audioBase64, format: audioFormat },
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

    // Deepgram Nova-3 Multilingual (Batch)
    var dgSupported = ['de','el','es','fr','gu','hi','id','it','kn','pt','ru','sv','ta','te','tr','ca','cs','ar','bn','da','fa','fi','he','hu','mr','ms','nl','pl','tl','uk','ur','vi'];
    var langParam = dgLang && dgSupported.indexOf(dgLang) !== -1 ? '&language=' + dgLang : '';
    const url = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true' + langParam;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + apiKey,
        'Content-Type': dgContentType,
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
    const dgMeta = data.metadata || {};
    const diag = {
      byteLen: bytes.length,
      ct: dgContentType,
      mDuration: dgMeta.duration || 0,
      mRequestId: dgMeta.request_id || '',
      dgError: data.err_code || data.err_msg || null,
      hasResults: !!data.results,
      channels: data.results?.channels?.length || 0,
      transcript: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '(empty)',
      confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
      words: (data.results?.channels?.[0]?.alternatives?.[0]?.words || []).length,
    };
    return new Response(JSON.stringify({ text, dg: diag }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
