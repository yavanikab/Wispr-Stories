// Dynamic OG image generator. Renders the user's actual card (name, story
// text, palette art, branding) as a 1080×1080 PNG per request.
//
// Runtime: Node.js (Vercel default for /api/*.js). Edge runtime is rejected
// because Vercel's edge analyzer flags `process.env` references inside
// @vercel/og's edge bundle. Node has no such restriction.
//
// Element tree: plain `{type, props, $$typeof}` objects (what JSX compiles
// to). This avoids needing React installed or a JSX transpiler.

import { ImageResponse } from '@vercel/og';

const PAL_NAMES = [
  'violet', 'amber', 'crimson', 'emerald', 'ocean',
  'rose', 'orange', 'teal', 'fuchsia', 'indigo',
];
const PALS = [
  '#7c3aed', '#f59e0b', '#dc2626', '#059669', '#0284c7',
  '#db2777', '#ea580c', '#0d9488', '#c026d3', '#4f46e5',
];
const VALID_CORNERS = ['rounded', 'sharp'];

// Minimal React-element factory. Mirrors React.createElement output, so
// Satori (under @vercel/og) accepts the tree as a real element graph.
const REACT_ELEMENT = Symbol.for('react.element');
function el(type, props, children) {
  return {
    type,
    key: null,
    ref: null,
    props: { ...(props || {}), children: children == null ? undefined : children },
    $$typeof: REACT_ELEMENT,
  };
}

// Detect the dominant non-Latin script so we can fetch the right Noto Sans
// variant from Google Fonts. Falls through to plain "Noto Sans" which
// covers Latin + Cyrillic + Greek + Vietnamese.
function pickFontFamily(text) {
  if (/[一-鿿㐀-䶿]/.test(text)) return 'Noto+Sans+SC';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'Noto+Sans+JP';
  if (/[가-힯]/.test(text)) return 'Noto+Sans+KR';
  if (/[฀-๿]/.test(text)) return 'Noto+Sans+Thai';
  if (/[ऀ-ॿ]/.test(text)) return 'Noto+Sans+Devanagari';
  if (/[ঀ-৿]/.test(text)) return 'Noto+Sans+Bengali';
  if (/[஀-௿]/.test(text)) return 'Noto+Sans+Tamil';
  if (/[ఀ-౿]/.test(text)) return 'Noto+Sans+Telugu';
  if (/[ಀ-೿]/.test(text)) return 'Noto+Sans+Kannada';
  if (/[ഀ-ൿ]/.test(text)) return 'Noto+Sans+Malayalam';
  if (/[઀-૿]/.test(text)) return 'Noto+Sans+Gujarati';
  if (/[਀-੿]/.test(text)) return 'Noto+Sans+Gurmukhi';
  if (/[؀-ۿݐ-ݿ]/.test(text)) return 'Noto+Sans+Arabic';
  if (/[֐-׿]/.test(text)) return 'Noto+Sans+Hebrew';
  return 'Noto+Sans';
}

async function loadFont(family) {
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@400;700`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
  );
  if (!cssRes.ok) {
    throw new Error('Google Fonts CSS fetch failed: ' + cssRes.status);
  }
  const css = await cssRes.text();
  const match = css.match(/url\((https:\/\/[^)]+)\)/);
  if (!match) {
    throw new Error('Could not find font URL for ' + family);
  }
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error('Font file fetch failed: ' + fontRes.status);
  }
  return await fontRes.arrayBuffer();
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;
    const url = new URL(req.url, origin);

    const text = (url.searchParams.get('text') || 'Your story').slice(0, 200);
    const name = (url.searchParams.get('name') || '').slice(0, 40);
    const rawP = Number.parseInt(url.searchParams.get('p'), 10);
    const p =
      Number.isInteger(rawP) && rawP >= 0 && rawP < PALS.length ? rawP : 0;
    const palName = PAL_NAMES[p];
    let corners = url.searchParams.get('r') || 'rounded';
    if (!VALID_CORNERS.includes(corners)) corners = 'rounded';

    const W = 1080;
    const H = 1080;

    // The pre-rendered 1080×1080 PNG of the palette art. Lives at this URL
    // because we generated them with sharp earlier — guaranteed to load.
    const bgUrl = `${origin}/assets/og-1080/2x2_${corners}_${palName}.png`;

    const family = pickFontFamily(text + ' ' + name);
    let fontData;
    try {
      fontData = await loadFont(family);
    } catch (_) {
      fontData = await loadFont('Noto+Sans');
    }

    const displayText = text.length > 150 ? text.slice(0, 150) + '…' : text;
    const displayName = name || 'Wispr Stories';

    // Element tree as plain objects — equivalent to JSX, but no transpiler
    // or React dependency needed.
    const tree = el(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          fontFamily: 'CardFont',
        },
      },
      [
        el(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 38,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
            },
          },
          displayName,
        ),
        el(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: '44px 40px',
              maxHeight: 560,
              overflow: 'hidden',
            },
          },
          el(
            'div',
            {
              style: {
                display: 'flex',
                fontSize: 44,
                color: '#1a1a1a',
                lineHeight: 1.45,
                fontWeight: 400,
              },
            },
            displayText,
          ),
        ),
        el(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          [
            el(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 30,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.95)',
                },
              },
              'Wispr Stories',
            ),
            el(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 22,
                  color: 'rgba(255,255,255,0.75)',
                },
              },
              'wisprflow.ai',
            ),
          ],
        ),
      ],
    );

    const imageResponse = new ImageResponse(tree, {
      width: W,
      height: H,
      fonts: [
        { name: 'CardFont', data: fontData, style: 'normal', weight: 400 },
      ],
    });

    // ImageResponse extends standard Response. In Node runtime we drain it
    // to a Buffer ourselves before piping to res.
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.end(buffer);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      'OG render error: ' + (e && e.message ? e.message : 'unknown'),
    );
  }
}
