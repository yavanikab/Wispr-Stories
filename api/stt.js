export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Health check — used by client to decide Deepgram vs Web Speech API
  if (req.method === 'GET') {
    const available = !!(process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY_ADMIN);
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
    const { audio, format } = await req.json();
    const binaryStr = atob(audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // Deepgram Nova-3 Multilingual (Batch) — single request, raw audio bytes
    const url = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + apiKey,
        'Content-Type': format || 'audio/webm',
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
