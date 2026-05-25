export const config = { runtime: 'edge' };

import { getRedis, KEYS } from '../lib/redis.js';

// ── Constants ──
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'yellowgreenlabs@proton.me';
const SENDER_NAME = 'Wispr Stories';
const EMAIL_TIMEOUT_MS = 8000;

// Key charset: 32 chars (no O, I, 0, 1 — avoids visual confusion)
// 256 / 32 = 8 exactly → no modulo bias
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ── Helpers ──

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Timing-safe HMAC-SHA256 signature verification using Web Crypto (Edge-compatible)
async function verifySignature(secret, rawBody, incomingSignature) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const a = computed.toLowerCase();
  const b = incomingSignature.toLowerCase();
  if (a.length !== b.length) return false;

  // Timing-safe compare
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Crypto-random pro key: WS-XXXX-XXXX-XXXX
function generateProKey() {
  const bytes = new Uint8Array(12); // 3 groups × 4 chars
  crypto.getRandomValues(bytes);
  let key = 'WS';
  for (let g = 0; g < 3; g++) {
    key += '-';
    for (let i = 0; i < 4; i++) {
      key += KEY_CHARS[bytes[g * 4 + i] % 32];
    }
  }
  return key;
}

// Generate key, checking Redis for collisions (up to 3 attempts)
async function generateUniqueKey(redis) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const key = generateProKey();
    const existing = await redis.get(KEYS.upgradeKey(key));
    if (!existing) return key;
  }
  throw new Error('Pro key generation failed after 3 collision checks');
}

// Send pro key email via Brevo with 8s timeout
async function sendProKeyEmail(brevoApiKey, { toEmail, toName, proKey }) {
  const safeName = htmlEscape(toName);
  const safeKey = htmlEscape(proKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email: toEmail, name: safeName }],
        subject: 'Your Wispr Stories Pro Key 🎉',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:1.4rem">Thank you, ${safeName}! 🙏</h2>
            <p style="color:#444;margin:0 0 24px">Your support keeps Wispr Stories growing. Here's your Pro key:</p>
            <div style="background:#f4f4f4;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
              <span style="font-family:monospace;font-size:1.5rem;font-weight:700;letter-spacing:3px;color:#222">${safeKey}</span>
            </div>
            <p style="color:#444;margin:0 0 12px"><strong>How to activate:</strong></p>
            <ol style="color:#444;padding-left:20px;margin:0 0 24px">
              <li style="margin-bottom:6px">Open <a href="https://wisprstories.vercel.app" style="color:#6b6bff">Wispr Stories</a></li>
              <li style="margin-bottom:6px">Tap the ✨ or key icon in the app</li>
              <li>Enter your Pro key and tap <strong>Activate</strong></li>
            </ol>
            <p style="color:#888;font-size:0.8rem;margin:0">Save this email. If you lose your key, reply here and we'll resend it.</p>
          </div>
        `,
      }),
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

// ── Handler ──

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Fail fast if env vars are missing
  const BMAC_SECRET = process.env.BMAC_WEBHOOK_SECRET;
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BMAC_SECRET || !BREVO_KEY) {
    console.error('[BMAC] Missing required env vars: BMAC_WEBHOOK_SECRET or BREVO_API_KEY');
    return new Response('Server configuration error', { status: 500 });
  }

  // Read raw body before anything else (needed for signature check)
  const rawBody = await req.text();

  // Verify BMAC signature
  const incomingSignature = req.headers.get('X-Bmc-Signature') || '';
  const signatureValid = await verifySignature(BMAC_SECRET, rawBody, incomingSignature);
  if (!signatureValid) {
    console.warn('[BMAC] Signature verification failed');
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const eventType = (req.headers.get('X-Bmc-Event') || '').trim();
  const data = payload.response || {};

  // Log event type on first deploys so we can confirm exact header values from BMAC
  console.log(`[BMAC] Event received: "${eventType}"`);

  // Detect test webhook — skip processing
  if (payload.test === true || (data.supporter_email || '').includes('test@buymeacoffee')) {
    console.log('[BMAC] Test event detected, skipping');
    return new Response('OK', { status: 200 });
  }

  // Normalize email (lowercase — same inbox, different casing = same person)
  const email = (data.supporter_email || '').toLowerCase().trim();
  const supporterName = (data.supporter_name || data.payer_name || 'Supporter').trim();

  if (!email) {
    console.error('[BMAC] Missing supporter_email in payload');
    return new Response('Bad Request', { status: 400 });
  }

  const redis = getRedis();

  // ── Support Created ──────────────────────────────────────────────────────────
  const isSupportCreated = ['coffee_purchase', 'support_created', 'Support created'].includes(eventType);

  if (isSupportCreated) {
    // Idempotency: SET NX on a fingerprint of this event (atomic — handles race conditions)
    const eventId = data.support_id || data.payment_id || `${email}:${data.support_created_on}`;
    const idempKey = `wispr:bmac-events:${eventId}`;
    const isNew = await redis.set(idempKey, '1', { nx: true, ex: 86400 }); // 24h TTL

    if (!isNew) {
      console.log('[BMAC] Duplicate event, skipping');
      return new Response('OK', { status: 200 });
    }

    // Check if this email already has a pro key (e.g. repeat supporter, recurring monthly)
    const existingKey = await redis.get(KEYS.emailLookup(email));
    if (existingKey) {
      const sent = await sendProKeyEmail(BREVO_KEY, { toEmail: email, toName: supporterName, proKey: existingKey });
      console.log(`[BMAC] Existing supporter — resent key (sent=${sent})`);
      return new Response('OK', { status: 200 });
    }

    // Generate collision-safe pro key
    const proKey = await generateUniqueKey(redis);

    // Write to Redis first (if email fails, key still exists — buyer can contact support)
    const keyData = JSON.stringify({
      tier: 'pro',
      email,
      purchasedAt: new Date().toISOString(),
    });
    await redis.set(KEYS.upgradeKey(proKey), keyData);
    await redis.set(KEYS.emailLookup(email), proKey);

    // Send email
    const sent = await sendProKeyEmail(BREVO_KEY, { toEmail: email, toName: supporterName, proKey });
    if (!sent) {
      // Key is stored — buyer can email support to get it resent
      console.error('[BMAC] Email delivery failed — key stored in Redis, manual resend may be needed');
    } else {
      console.log('[BMAC] Pro key granted and emailed successfully');
    }

    return new Response('OK', { status: 200 });
  }

  // ── Support Refunded ─────────────────────────────────────────────────────────
  const isRefund = ['support_refunded', 'Support refunded', 'coffee_purchase_refunded'].includes(eventType);

  if (isRefund) {
    const existingKey = await redis.get(KEYS.emailLookup(email));
    if (!existingKey) {
      // Unknown email — no key to revoke, safe no-op
      console.log('[BMAC] Refund for unknown email, no-op');
      return new Response('OK', { status: 200 });
    }

    // Mark revoked (not deleted — so validate-key can return reason:'revoked' not reason:'invalid_key')
    const raw = await redis.get(KEYS.upgradeKey(existingKey));
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      await redis.set(
        KEYS.upgradeKey(existingKey),
        JSON.stringify({ ...parsed, revoked: true, revokedAt: new Date().toISOString() })
      );
    }

    console.log('[BMAC] Pro key revoked due to refund');
    return new Response('OK', { status: 200 });
  }

  // ── All other events (cancellations, level updates) — intentional no-op ─────
  // Policy: once a supporter, always a supporter. Cancellation ≠ refund.
  console.log(`[BMAC] Unhandled event "${eventType}" — no-op (intentional)`);
  return new Response('OK', { status: 200 });
}
