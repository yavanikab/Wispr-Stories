import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const PAL_NAMES = [
  'violet',
  'amber',
  'crimson',
  'emerald',
  'ocean',
  'rose',
  'orange',
  'teal',
  'fuchsia',
  'indigo',
];

export default async function handler(req) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const text = (searchParams.get('text') || 'Your story').slice(0, 200);
    const name = (searchParams.get('name') || '').slice(0, 40);
    const rawP = Number.parseInt(searchParams.get('p'), 10);
    const p = Number.isInteger(rawP) && rawP >= 0 && rawP < PAL_NAMES.length ? rawP : 0;
    const palName = PAL_NAMES[p];

    // Card background: 4/5 ratio rounded variant from the real asset library.
    const cardBgUrl = `${origin}/assets/card-bgs/4x5_rounded_${palName}.webp`;
    const logoUrl = `${origin}/assets/ws-logo-wh.png`;

    const displayText = text.length > 150 ? text.slice(0, 150) + '…' : text;
    const labelText = name ? `${name}` : 'Wispr Stories';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffeb',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Card — 4/5 aspect ratio, centered in 1200x630 frame */}
          <div
            style={{
              width: 480,
              height: 600,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 32,
              padding: '28px 24px',
              backgroundImage: `url(${cardBgUrl})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            }}
          >
            {/* Top label: name */}
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {labelText}
            </div>

            {/* Text panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                padding: '22px 20px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  color: '#1a1a1a',
                  lineHeight: 1.5,
                  fontWeight: 400,
                }}
              >
                {displayText}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 14,
                  fontSize: 12,
                  color: 'rgba(26,26,26,0.55)',
                  letterSpacing: 1,
                }}
              >
                Story Original
              </div>
            </div>

            {/* Footer: logo + domain */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <img
                  src={logoUrl}
                  width="22"
                  height="22"
                  style={{ marginRight: 8 }}
                />
                <div
                  style={{
                    display: 'flex',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  Wispr Stories
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                wisprflow.ai
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    return new Response('OG render error: ' + (e && e.message ? e.message : 'unknown'), {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
