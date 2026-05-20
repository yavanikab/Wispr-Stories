export default async function handler(req) {
  return new Response(JSON.stringify({
    openrouterKey: process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET',
    redisUrl: process.env.UPSTASH_REDIS_REST_URL ? 'SET' : 'NOT SET',
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'NOT SET',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
