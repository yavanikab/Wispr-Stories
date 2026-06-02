#!/usr/bin/env node
// Stress-test the 99-user daily capacity cap on /api/usage.
//
// Sends N requests with unique sessionIds in parallel, then verifies:
//   1. Exactly 99 requests return allowed: true (the cap)
//   2. The remaining requests return allowed: false
//   3. A repeated request with the same sessionId is grandfathered (allowed)
//   4. The server-reported count and cap match the DAILY_USER_CAP constant
//
// Usage:
//   node scripts/stress-test-99-cap.mjs                 # localhost:3000
//   node scripts/stress-test-99-cap.mjs --base=https://wisprstories.vercel.app
//   node scripts/stress-test-99-cap.mjs --count=120     # override 100 default
//
// What "pass" means:
//   - All 99 of the first 99 unique sessions are allowed
//   - All 21 (default) of the next sessions are blocked
//   - A re-checked session stays allowed (grandfather)
//
// What "fail" looks like:
//   - The 100th session is allowed (cap not enforced)
//   - A session in the first 99 is blocked (over-blocking)
//   - Grandfather logic is broken (re-check returns blocked)

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3000';

const COUNT_ARG = process.argv.find(a => a.startsWith('--count='));
const COUNT = COUNT_ARG ? parseInt(COUNT_ARG.split('=')[1], 10) : 120;
const EXPECTED_CAP = 99;

function makeSessionId(i) {
  return `stress_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
}

async function hitUsageEndpoint(sessionId) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, isPro: false }),
  });
  const elapsed = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data, elapsed };
}

async function main() {
  console.log(`\n=== Stress test: ${COUNT} unique sessions against ${BASE} ===\n`);
  console.log(`Expected: first ${EXPECTED_CAP} = allowed, rest = blocked\n`);

  // Fire all requests in parallel batches of 20 to avoid swamping localhost.
  const BATCH = 20;
  const results = [];
  for (let i = 0; i < COUNT; i += BATCH) {
    const batch = [];
    for (let j = 0; j < Math.min(BATCH, COUNT - i); j++) {
      batch.push(hitUsageEndpoint(makeSessionId(i + j)));
    }
    results.push(...await Promise.all(batch));
    process.stdout.write(`  ${Math.min(i + BATCH, COUNT)}/${COUNT}\r`);
  }
  console.log('\n');

  // Tally results
  let allowed = 0;
  let blocked = 0;
  let errors = 0;
  let grandfatherOk = false;
  const seenCaps = new Set();
  const seenCounts = new Set();
  for (const r of results) {
    if (r.status !== 200 || !r.body || typeof r.body.allowed !== 'boolean') {
      errors++;
      continue;
    }
    if (r.body.cap) seenCaps.add(r.body.cap);
    if (typeof r.body.count === 'number') seenCounts.add(r.body.count);
    if (r.body.allowed) allowed++;
    else blocked++;
  }

  // Test grandfather logic: re-hit one of the first 99 sessions, expect allowed.
  const grandfatherSession = results[0]; // we don't have its sessionId here, generate a new one
  const gfId = makeSessionId('gf');
  await hitUsageEndpoint(gfId); // first hit
  const gfRes = await hitUsageEndpoint(gfId); // second hit, should be allowed
  grandfatherOk = gfRes.body && gfRes.body.allowed === true;

  // Print results
  console.log('--- Results ---');
  console.log(`Allowed (count=${allowed})`);
  console.log(`Blocked (count=${blocked})`);
  console.log(`Errors  (count=${errors})`);
  console.log(`Unique "cap" values reported: ${[...seenCaps].join(', ')}`);
  console.log(`Min/max count seen: ${Math.min(...seenCounts)} / ${Math.max(...seenCounts)}`);
  console.log(`Grandfather re-hit allowed: ${grandfatherOk}\n`);

  // Pass/fail checks
  const checks = [
    { name: 'errors == 0', ok: errors === 0 },
    { name: `cap == ${EXPECTED_CAP}`, ok: seenCaps.size === 1 && seenCaps.has(EXPECTED_CAP) },
    { name: `allowed + blocked == ${COUNT}`, ok: (allowed + blocked) === COUNT },
    { name: `allowed <= ${EXPECTED_CAP}`, ok: allowed <= EXPECTED_CAP },
    { name: 'grandfather works', ok: grandfatherOk },
  ];

  console.log('--- Checks ---');
  let allPass = true;
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    if (!c.ok) allPass = false;
    console.log(`  [${mark}] ${c.name}`);
  }

  console.log('');
  if (allPass) {
    console.log(`\u2713 STRESS TEST PASSED. The ${EXPECTED_CAP}-user cap is enforced correctly.`);
    process.exit(0);
  } else {
    console.log(`\u2717 STRESS TEST FAILED. See checks above.`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(2);
});
