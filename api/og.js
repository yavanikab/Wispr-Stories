// OG image generator. Runs on Vercel's Node.js serverless runtime (the
// default for /api/* files with no explicit runtime config).
//
// Why Node and not Edge: Vercel's Edge runtime statically analyzes function
// bundles and rejects any module that references `process.X`. The
// @vercel/og edge bundle (and satori, its underlying renderer) both contain
// such references — so they hit "unsupported modules" build errors on Edge.
// Node runtime has no such restriction.
//
// Why plain objects instead of JSX: JSX in .js files isn't auto-transpiled
// by Vercel's bundler, and using .jsx requires a React dependency for the
// JSX transform. Building the element tree as plain `{type, props}` objects
// (which is what JSX compiles to anyway) sidesteps both issues. The
// $$typeof: Symbol.for('react.element') marker makes Satori treat these as
// real React elements.

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

// Minimal React-element factory. Mirrors what React.createElement returns,
// so Satori accepts the output without an actual React dependency.
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
// covers Latin + Cyrillic + Greek + Vietnamese out of the box.
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

// Resolve a Google Fonts family name → woff URL → ArrayBuffer. Satori
// needs the font data as an ArrayBuffer to render glyphs.
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
    throw new Error('Could not find font URL in Google Fonts CSS for ' + family);
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

    // Always 1080×1080 square. WhatsApp/iMessage/Twitter reliably render
    // square images as the large image-first preview format. Portrait and
    // tall ratios frequently get demoted to the small thumbnail layout.
    const W = 1080;
    const H = 1080;

    // The 2x2 (square) gradient art matches the output dimensions natively.
    const bgUrl = `${origin}/assets/card-bgs/2x2_${corners}_${palName}.webp`;

    // Load a font covering the script of the user's text. Defensive fallback
    // to Latin Noto Sans if the script-specific font fails to load.
    const family = pickFontFamily(text + ' ' + name);
    let fontData;
    try {
      fontData = await loadFont(family);
    } catch (_) {
      fontData = await loadFont('Noto+Sans');
    }

    const displayText = text.length > 150 ? text.slice(0, 150) + '…' : text;
    const displayName = name || 'Wispr Stories';

    // Element tree as plain `{type, props, $$typeof}` objects — what JSX
    // compiles to. Avoids needing React or a JSX transpiler.
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
        // Top: name label
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
        // Middle: white text panel
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
        // Bottom: footer
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

    // ImageResponse extends the standard Response. In Node runtime we have
    // to drain it to a Buffer ourselves before piping to res.
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
