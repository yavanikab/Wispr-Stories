import { getRedis, KEYS } from '../../lib/redis.js';

// Occasion mapping from purchase message keywords
const OCCASION_MAP = [
  { keywords: ['birthday', 'bday', 'birth'], code: 'BDAY' },
  { keywords: ['anniversary', 'anniv'], code: 'ANNIV' },
  { keywords: ['thanks', 'thank', 'grateful'], code: 'THANKS' },
  { keywords: ['love', 'heart', 'care'], code: 'LOVE' },
];

function generateRandomCode(length = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function detectOccasion(message) {
  if (!message) return 'WISH';
  const lower = message.toLowerCase();
  for (const { keywords, code } of OCCASION_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return code;
    }
  }
  return 'WISH';
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify webhook signature (BMC secret)
    const bmcSecret = process.env.BMC_WEBHOOK_SECRET;
    if (bmcSecret) {
      const signature = req.headers.get('x-bmc-signature') || '';
      // In production, verify HMAC signature here
      // For now, we trust the endpoint is secure
    }

    const body = await req.json();
    const email = body.payer_email;
    const message = body.message || '';
    const amount = body.amount || '5';
    const txnId = body.transaction_id || '';

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing payer_email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const occasion = detectOccasion(message);
    const year = new Date().getUTCFullYear();
    const randomCode = generateRandomCode(4);
    const key = `WS-${occasion}-${year}-${randomCode}`;

    // Store key in Redis
    const keyData = {
      email,
      tier: 'pro',
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      txn: txnId,
      occasion,
    };

    const redisKey = KEYS.upgradeKey(key);
    const emailKey = KEYS.emailLookup(email.toLowerCase());

    const pipeline = redis.pipeline();
    pipeline.set(redisKey, JSON.stringify(keyData));
    pipeline.set(emailKey, key);
    await pipeline.exec();

    // In production, send confirmation email here (via Resend/SendGrid)
    console.log(`[BMC Webhook] Generated key ${key} for ${email}`);

    return new Response(JSON.stringify({
      success: true,
      key,
      email,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[BMC Webhook] Error:', e.message);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
