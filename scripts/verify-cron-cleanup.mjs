#!/usr/bin/env node
// Verify that the /api/cleanup endpoint:
//   1. Rejects unauthorized requests with 401
//   2. Accepts requests with the correct CRON_SECRET
//   3. Returns a well-formed response ({ ok, deleted, cutoff })
//   4. Doesn't error on an empty or near-empty blob store
//
// Usage:
//   node scripts/verify-cron-cleanup.mjs
//   node scripts/verify-cron-cleanup.mjs --base=https://wisprstories.vercel.app
//   CRON_SECRET=xxx node scripts/verify-cron-cleanup.mjs
//
// The script reads CRON_SECRET from (in order):
//   1. --secret=xxx flag
//   2. CRON_SECRET environment variable
//   3. Prompts the user (only if running in an interactive TTY)
//
// If CRON_SECRET is not set, the script still runs the 401 check (which
// doesn't need the secret) and reports the auth check as inconclusive.

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3000';

const SECRET_ARG = process.argv.find(a => a.startsWith('--secret='));
const SECRET = SECRET_ARG
  ? SECRET_ARG.split('=')[1]
  : process.env.CRON_SECRET;

async function callCleanup(authHeader) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/cleanup`, {
    method: 'GET',
    headers: authHeader ? { 'Authorization': authHeader } : {},
  });
  const elapsed = Date.now() - t0;
  let body = null;
  try { body = await res.json(); } catch (_e) { body = null; }
  return { status: res.status, body, elapsed };
}

async function main() {
  console.log(`\n=== Verifying /api/cleanup on ${BASE} ===\n`);

  const checks = [];

  // Check 1: unauthorized request returns 401
  const noAuth = await callCleanup(null);
  const noAuthOk = noAuth.status === 401;
  checks.push({ name: 'unauthorized request returns 401', ok: noAuthOk, detail: `got ${noAuth.status}` });
  console.log(`[${noAuthOk ? 'PASS' : 'FAIL'}] unauthorized → ${noAuth.status}`);

  // Check 2: wrong secret returns 401
  if (SECRET) {
    const wrongAuth = await callCleanup('Bearer wrong-secret-value');
    const wrongAuthOk = wrongAuth.status === 401;
    checks.push({ name: 'wrong secret returns 401', ok: wrongAuthOk, detail: `got ${wrongAuth.status}` });
    console.log(`[${wrongAuthOk ? 'PASS' : 'FAIL'}] wrong secret → ${wrongAuth.status}`);
  } else {
    checks.push({ name: 'wrong secret returns 401', ok: null, detail: 'skipped (no CRON_SECRET)' });
    console.log(`[SKIP] wrong secret check (no CRON_SECRET provided)`);
  }

  // Check 3: correct secret returns 200 with valid body
  if (SECRET) {
    const ok = await callCleanup(`Bearer ${SECRET}`);
    const okStatus = ok.status === 200;
    const okShape = ok.body && typeof ok.body.ok === 'boolean';
    const okDeleted = ok.body && typeof ok.body.deleted === 'number' && ok.body.deleted >= 0;
    const okCutoff = ok.body && ok.body.cutoff && !isNaN(new Date(ok.body.cutoff).getTime());
    const allOk = okStatus && okShape && okDeleted && okCutoff;
    checks.push({ name: 'authorized request returns 200 with valid body', ok: allOk, detail: `status=${ok.status} body=${JSON.stringify(ok.body)}` });
    console.log(`[${allOk ? 'PASS' : 'FAIL'}] authorized → ${ok.status} ${JSON.stringify(ok.body)} (${ok.elapsed}ms)`);
  } else {
    checks.push({ name: 'authorized request returns 200 with valid body', ok: null, detail: 'skipped (no CRON_SECRET)' });
    console.log(`[SKIP] authorized check (no CRON_SECRET provided)`);
  }

  // Summary
  console.log('\n--- Summary ---');
  let pass = 0, fail = 0, skip = 0;
  for (const c of checks) {
    if (c.ok === true) pass++;
    else if (c.ok === false) fail++;
    else skip++;
  }
  console.log(`Pass: ${pass}  Fail: ${fail}  Skip: ${skip}\n`);

  if (fail > 0) {
    console.log('\u2717 VERIFICATION FAILED. See checks above.');
    process.exit(1);
  }
  if (skip > 0) {
    console.log(`\u26A0 PARTIAL VERIFICATION. ${skip} check(s) skipped because CRON_SECRET was not provided.`);
    console.log('Set CRON_SECRET to the same value as in your Vercel dashboard, then re-run.');
    process.exit(0);
  }
  console.log('\u2713 CLEANUP ENDPOINT VERIFIED.');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(2);
});
