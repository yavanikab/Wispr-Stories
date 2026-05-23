const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Load .env file manually (no dotenv dependency)
try {
  const envContent = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (e) {
  // No .env file, skip
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
};

// Handle /api/stt — proxy to Deepgram Nova-3 Multilingual (batch)
function handleStt(req, res) {
  // Health check — tells client if Deepgram is configured
  if (req.method === 'GET') {
    const available = (!!process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('YOUR_ACTUAL_KEY'))
      || (!!process.env.DEEPGRAM_API_KEY_ADMIN && !process.env.DEEPGRAM_API_KEY_ADMIN.includes('YOUR_ACTUAL_KEY'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ available }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Route to admin key if admin secret matches
  const adminSecret = req.headers['x-admin-secret'];
  const isAdmin = adminSecret && process.env.ADMIN_API_SECRET && adminSecret === process.env.ADMIN_API_SECRET;
  const apiKey = isAdmin ? process.env.DEEPGRAM_API_KEY_ADMIN : process.env.DEEPGRAM_API_KEY;

  if (!apiKey || apiKey.includes('YOUR_ACTUAL_KEY')) {
    // Mock mode for local testing — no Deepgram credits consumed
    console.log('[Deepgram] No API key — returning mock transcription');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      text: 'This is a mock transcription for local testing. Add DEEPGRAM_API_KEY to Vercel env vars for real transcription.',
      mock: true,
    }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { audio, format, language } = JSON.parse(body);
      const audioBuffer = Buffer.from(audio, 'base64');

      // Deepgram batch API — pass language code for non-English
      var dgLang = (language || '').slice(0, 2).toLowerCase();
      var dgSupported = ['de','es','fr','gu','hi','id','it','ja','kn','ko','pt','ru','sv','ta','te','th','tr','zh'];
      var langParam = dgLang && dgSupported.indexOf(dgLang) !== -1 ? '&language=' + dgLang : '';
      const url = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true' + langParam;
      const deepgramRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': format || 'audio/webm',
        },
        body: audioBuffer,
      });

      if (!deepgramRes.ok) {
        const errText = await deepgramRes.text();
        console.error('[Deepgram] API error:', errText);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Deepgram API error', detail: errText }));
        return;
      }

      const data = await deepgramRes.json();
      const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      console.log('[Deepgram] Transcription OK:', text.slice(0, 50));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    } catch (e) {
      console.error('[Deepgram] Error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', detail: e.message }));
    }
  });
}

// Mock handlers for local development (no Redis, no LLM, no upload)
function mockJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function handleUsage(req, res) {
  mockJson(res, { allowed: true, used: 0, max: 99 });
}

function handleLimits(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      // Skip limits if admin secret matches
      const adminSecret = req.headers['x-admin-secret'];
      if (adminSecret && process.env.ADMIN_API_SECRET && adminSecret === process.env.ADMIN_API_SECRET) {
        mockJson(res, { allowed: true, isAdmin: true, recordingsMax: 9999, cumulativeMax: 999999 });
        return;
      }
      const { checkOnly } = parsed;
      // Mock: always allow, return sample counts
      mockJson(res, {
        allowed: true,
        recordingsUsed: checkOnly ? 1 : 2,
        recordingsMax: 5,
        cumulativeUsed: checkOnly ? 5 : 10,
        cumulativeMax: 75,
      });
    } catch (e) {
      mockJson(res, { allowed: true, recordingsUsed: 1, recordingsMax: 5, cumulativeUsed: 5, cumulativeMax: 75 });
    }
  });
}

// Validate pro key against Upstash Redis REST API (mirrors api/rewrite.js logic for local dev)
async function validateProKeyRedis(proKey) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !proKey) return false;
  try {
    const redisKey = `wispr:keys:${proKey.trim()}`;
    const res = await fetch(`${url}/get/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.result !== null && data.result !== undefined;
  } catch (e) {
    console.warn('[ProKey] Redis validation failed, treating as free:', e.message);
    return false;
  }
}

// In-memory per-tone usage tracker (mirrors Redis logic in api/rewrite.js for local dev)
const FREE_MAX_PER_TONE = 5;
const localToneCounts = { date: '', counts: {} };

function getLocalToneCount(tone) {
  const today = new Date().toDateString();
  if (localToneCounts.date !== today) { localToneCounts.date = today; localToneCounts.counts = {}; }
  return localToneCounts.counts[tone] || 0;
}

function incrementLocalToneCount(tone) {
  const today = new Date().toDateString();
  if (localToneCounts.date !== today) { localToneCounts.date = today; localToneCounts.counts = {}; }
  localToneCounts.counts[tone] = (localToneCounts.counts[tone] || 0) + 1;
  return localToneCounts.counts[tone];
}

function handleRewrite(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { text, tone, proKey } = JSON.parse(body);

      // Validate pro status server-side — same logic as api/rewrite.js
      const isPro = await validateProKeyRedis(proKey);

      // Enforce per-tone daily limit for free users only
      if (!isPro) {
        const currentCount = getLocalToneCount(tone);
        if (currentCount >= FREE_MAX_PER_TONE) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Daily limit reached for this tone', tone, used: currentCount, max: FREE_MAX_PER_TONE, remaining: 0 }));
          return;
        }
      }

      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        // No key — echo original text so at least the language is preserved in mock mode
        console.log('[Rewrite] No OPENROUTER_API_KEY — echoing original text');
        if (isPro) {
          mockJson(res, { text, original: text, tone, isPro: true });
        } else {
          const used = incrementLocalToneCount(tone);
          mockJson(res, { text, original: text, tone, used, max: FREE_MAX_PER_TONE, remaining: Math.max(0, FREE_MAX_PER_TONE - used) });
        }
        return;
      }

      const TONE_PROMPTS = {
        warm: 'Rewrite this message to sound warm, friendly, and heartfelt. Keep it natural and personal.',
        bold: 'Rewrite this message to sound bold, confident, and impactful. Make it punchy and direct.',
        poetic: 'Rewrite this message to sound poetic, lyrical, and rhythmic. Use beautiful language.',
        playful: 'Rewrite this message to sound playful, fun, and lighthearted. Add a touch of humor.',
        reflective: 'Rewrite this message to sound thoughtful, contemplative, and introspective.',
        honest: 'Rewrite this message to sound direct, authentic, and genuine. No fluff.',
      };

      function detectScript(t) {
        if (/[぀-ゟ゠-ヿ]/.test(t)) return 'Japanese';
        if (/[가-힯]/.test(t)) return 'Korean';
        if (/[一-鿿]/.test(t)) return 'Chinese';
        if (/[ऀ-ॿ]/.test(t)) return 'Devanagari (Hindi/Marathi)';
        if (/[ঀ-৿]/.test(t)) return 'Bengali';
        if (/[਀-੿]/.test(t)) return 'Gurmukhi (Punjabi)';
        if (/[઀-૿]/.test(t)) return 'Gujarati';
        if (/[஀-௿]/.test(t)) return 'Tamil';
        if (/[ఀ-౿]/.test(t)) return 'Telugu';
        if (/[ಀ-೿]/.test(t)) return 'Kannada';
        if (/[ഀ-ൿ]/.test(t)) return 'Malayalam';
        if (/[฀-๿]/.test(t)) return 'Thai';
        if (/[؀-ۿ]/.test(t)) return 'Arabic';
        if (/[Ѐ-ӿ]/.test(t)) return 'Cyrillic';
        return 'Latin';
      }

      const script = detectScript(text);
      const scriptRule = script === 'Latin'
        ? 'The input uses Latin script. Respond in Latin script only. If the input mixes English with romanized words (Hinglish), keep that mix.'
        : `The input is written in ${script} script. Respond in ${script} script. Do NOT transliterate to Latin/Romanized form.`;
      const prompt = `${TONE_PROMPTS[tone] || TONE_PROMPTS.warm} Keep it under 150 characters. Return ONLY the rewritten text, no quotes or commentary.\n\nLANGUAGE RULE: Respond in the exact same language and script as the input. Do not translate. ${scriptRule}\n\nOriginal message: "${text}"`;

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wisprstories.vercel.app',
          'X-Title': 'Wispr Stories',
        },
        body: JSON.stringify({
          model: isPro ? 'inclusionai/ling-2.6-flash' : 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'system', content: 'You rewrite short voice messages into greeting cards with specific tones. You ALWAYS respond in the exact same language and script as the input. You never translate or transliterate. Return ONLY the rewritten text.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      if (!orRes.ok) {
        const err = await orRes.text();
        console.error('[Rewrite] OpenRouter error:', err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'OpenRouter error', detail: err }));
        return;
      }

      const data = await orRes.json();
      let rewritten = data.choices?.[0]?.message?.content?.trim() || text;
      rewritten = rewritten.replace(/^["']|["']$/g, '').trim();
      if (isPro) {
        console.log('[Rewrite] OK (pro):', tone, script, '→', rewritten.slice(0, 60));
        mockJson(res, { text: rewritten, original: text, tone, isPro: true });
      } else {
        const used = incrementLocalToneCount(tone);
        console.log('[Rewrite] OK:', tone, script, `(${used}/${FREE_MAX_PER_TONE})`, '→', rewritten.slice(0, 60));
        mockJson(res, { text: rewritten, original: text, tone, used, max: FREE_MAX_PER_TONE, remaining: Math.max(0, FREE_MAX_PER_TONE - used) });
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

function handleProStatus(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { key } = JSON.parse(body);
      const isPro = await validateProKeyRedis(key);
      if (isPro) {
        mockJson(res, { isPro: true, tier: 'pro' });
      } else {
        mockJson(res, { isPro: false });
      }
    } catch (e) {
      mockJson(res, { isPro: false });
    }
  });
}

function handleUpload(req, res) {
  mockJson(res, { url: 'https://example.com/mock-card.png', shortId: 'mock123' });
}

function handleValidateKey(req, res) {
  mockJson(res, { valid: false, error: 'Local server — no key validation' });
}

function handleApi(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  mockJson(res, { allowed: true });
}

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Route API requests
  if (urlPath === '/api/stt') { handleStt(req, res); return; }
  if (urlPath === '/api/usage') { handleUsage(req, res); return; }
  if (urlPath === '/api/limits') { handleLimits(req, res); return; }
  if (urlPath === '/api/rewrite') { handleRewrite(req, res); return; }
  if (urlPath === '/api/pro-status') { handleProStatus(req, res); return; }
  if (urlPath === '/api/upload') { handleUpload(req, res); return; }
  if (urlPath === '/api/validate-key') { handleValidateKey(req, res); return; }
  if (urlPath.startsWith('/api/')) { handleApi(req, res); return; }

  // Serve static files
  let filePath = path.join(ROOT, urlPath === '/' ? 'wisprstories.html' : urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  Wispr Stories server running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\n  On your phone (via port forwarding):`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\n  API routes handled locally: /api/stt (Deepgram + health check), all others mocked`);
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
