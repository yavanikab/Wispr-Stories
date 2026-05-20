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
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
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
      const { audio, format } = JSON.parse(body);
      const audioBuffer = Buffer.from(audio, 'base64');

      // Deepgram batch API — send audio directly, get transcript back
      const url = 'https://api.deepgram.com/v1/listen?model=nova-3&language=multilingual&smart_format=true&punctuate=true';
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
  mockJson(res, { allowed: true, recordingsUsed: 1, recordingsMax: 5, cumulativeUsed: 5, cumulativeMax: 75 });
}

function handleRewrite(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { text, tone } = JSON.parse(body);
      const TONE_REWRITES = {
        warm: 'Your words carry warmth and kindness — a gentle reminder of what truly matters.',
        bold: 'This is your moment. Speak it loud. Let it echo.',
        poetic: 'Like whispers on the wind, these words drift softly into eternity.',
        playful: 'Hey there! Just dropping a little sunshine your way — because you deserve it!',
        reflective: 'In the quiet spaces between moments, we find what truly endures.',
        honest: "Here's the truth, plain and simple — no sugarcoating, just real.",
      };
      const rewritten = TONE_REWRITES[tone] || text;
      console.log('[Rewrite] Mock:', tone, '→', rewritten.slice(0, 50));
      mockJson(res, { text: rewritten, original: text, tone });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

function handleProStatus(req, res) {
  mockJson(res, { isPro: false });
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
  console.log(`\n  API routes handled locally: /api/stt (Deepgram), all others mocked`);
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
