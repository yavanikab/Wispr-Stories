import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const PALS = [
  '#7c3aed',
  '#f59e0b',
  '#dc2626',
  '#059669',
  '#0284c7',
  '#db2777',
  '#ea580c',
  '#0d9488',
  '#c026d3',
  '#4f46e5',
];

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || 'Your story';
  const name = searchParams.get('name') || '';
  const rawP = Number.parseInt(searchParams.get('p'), 10);
  const p = Number.isInteger(rawP) && rawP >= 0 && rawP < PALS.length ? rawP : 0;
  const bg = PALS[p] || PALS[0];
  const lines = text.length > 280 ? text.slice(0, 280) + '...' : text;

  return new ImageResponse(
    (
      <div style={{
        height: '100%', width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg,
        padding: '64px',
      }}>
        <div style={{
          color: 'white',
          fontSize: 48,
          lineHeight: 1.4,
          textAlign: 'center',
          fontWeight: 400,
          fontFamily: '"Inter", sans-serif',
        }}>
          {lines}
        </div>
        {name && (
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 32,
            marginTop: 24,
            fontWeight: 300,
            fontFamily: '"Inter", sans-serif',
          }}>
            &mdash; {name}
          </div>
        )}
        <div style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 18,
          marginTop: 48,
          fontWeight: 300,
          fontFamily: '"Inter", sans-serif',
        }}>
          wisprflow.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
