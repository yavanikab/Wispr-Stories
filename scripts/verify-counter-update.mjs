// Verification script for the /api/limits counter-update flow.
// Catches the "Counter stuck at 5/5" regression where multiple
// reportRecordingDuration() calls did not increment the server-side
// recordings counter.
//
// Asserts:
//  1. Fresh sessionId starts at 0/5
//  2. Three checkOnly:false reports with audioDuration=5 → recordingsUsed goes 1,2,3 and cumulativeUsed goes 5,10,15
//  3. checkOnly:true does NOT increment
//  4. The auto-heal flow: after a successful report, a follow-up checkOnly returns the same value (no drift)
//  5. The v0.10.4.4 zero-duration bug: report with audioDuration=0 still increments recordings by 1
//
// Usage:
//   node scripts/verify-counter-update.mjs
//   node scripts/verify-counter-update.mjs --base=https://wisprstories.vercel.app

const BASE = (process.argv.find(a => a.startsWith("--base=")) || "").slice("--base=".length) || "http://localhost:3000";

let passed = 0;
let failed = 0;
const results = [];

function ok(name) { passed++; results.push(["PASS", name]); }
function fail(name, detail) { failed++; results.push(["FAIL", name, detail]); }

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    fail(name, e.message);
  }
}

function uniqueId(prefix) {
  return (prefix || "test") + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function post(path, body, headers) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await r.json(); } catch { data = null; }
  return { status: r.status, body: data };
}

const main = async () => {
  const sessionId = uniqueId("counter");

  // 1. Fresh sessionId → 0/5
  await check("fresh sessionId starts at 0/5 (free tier)", async () => {
    const r = await post("/api/limits", { sessionId, isPro: false, audioDuration: 0, checkOnly: true });
    if (r.status !== 200) throw new Error("expected 200, got " + r.status);
    if (!r.body.allowed) throw new Error("expected allowed=true, got " + JSON.stringify(r.body));
    if (r.body.recordingsUsed !== 0) throw new Error("expected recordingsUsed=0, got " + r.body.recordingsUsed);
    if (r.body.recordingsMax !== 5) throw new Error("expected recordingsMax=5, got " + r.body.recordingsMax);
    if (r.body.cumulativeUsed !== 0) throw new Error("expected cumulativeUsed=0, got " + r.body.cumulativeUsed);
    if (r.body.cumulativeMax !== 75) throw new Error("expected cumulativeMax=75, got " + r.body.cumulativeMax);
  });

  // 2. Three checkOnly:false reports → recordingsUsed goes 1,2,3
  let prevRecordings = 0;
  let prevCumulative = 0;
  for (let i = 1; i <= 3; i++) {
    await check("report #" + i + " (audioDuration=5) increments to " + i + " and cumulative to " + (i * 5), async () => {
      const r = await post("/api/limits", { sessionId, isPro: false, audioDuration: 5, checkOnly: false });
      if (r.status !== 200) throw new Error("expected 200, got " + r.status);
      if (!r.body.allowed) throw new Error("expected allowed=true, got " + JSON.stringify(r.body));
      if (r.body.recordingsUsed !== i) throw new Error("expected recordingsUsed=" + i + ", got " + r.body.recordingsUsed);
      if (r.body.cumulativeUsed !== i * 5) throw new Error("expected cumulativeUsed=" + (i * 5) + ", got " + r.body.cumulativeUsed);
      prevRecordings = r.body.recordingsUsed;
      prevCumulative = r.body.cumulativeUsed;
    });
  }

  // 3. checkOnly:true does NOT increment
  await check("checkOnly:true is idempotent (still returns 3/15)", async () => {
    const r = await post("/api/limits", { sessionId, isPro: false, audioDuration: 0, checkOnly: true });
    if (r.status !== 200) throw new Error("expected 200, got " + r.status);
    if (r.body.recordingsUsed !== prevRecordings) throw new Error("expected recordingsUsed=" + prevRecordings + " (no increment), got " + r.body.recordingsUsed);
    if (r.body.cumulativeUsed !== prevCumulative) throw new Error("expected cumulativeUsed=" + prevCumulative + " (no increment), got " + r.body.cumulativeUsed);
  });

  // 4. Auto-heal flow: after a successful report, follow-up checkOnly returns the same value
  await check("auto-heal: post-report checkOnly matches the report response (no client-server drift)", async () => {
    const reportRes = await post("/api/limits", { sessionId, isPro: false, audioDuration: 7, checkOnly: false });
    if (reportRes.body.recordingsUsed !== prevRecordings + 1) throw new Error("expected recordingsUsed=" + (prevRecordings + 1) + " after report, got " + reportRes.body.recordingsUsed);
    const checkRes = await post("/api/limits", { sessionId, isPro: false, audioDuration: 0, checkOnly: true });
    if (checkRes.body.recordingsUsed !== reportRes.body.recordingsUsed) throw new Error("drift detected: report said " + reportRes.body.recordingsUsed + ", checkOnly says " + checkRes.body.recordingsUsed);
    if (checkRes.body.cumulativeUsed !== reportRes.body.cumulativeUsed) throw new Error("cumulative drift: report said " + reportRes.body.cumulativeUsed + ", checkOnly says " + checkRes.body.cumulativeUsed);
    prevRecordings = checkRes.body.recordingsUsed;
    prevCumulative = checkRes.body.cumulativeUsed;
  });

  // 5. v0.10.4.4 zero-duration bug: report with audioDuration=0 still increments recordings by 1
  await check("v0.10.4.4 fix: report with audioDuration=0 still increments recordings by 1", async () => {
    const r = await post("/api/limits", { sessionId, isPro: false, audioDuration: 0, checkOnly: false });
    if (r.status !== 200) throw new Error("expected 200, got " + r.status);
    if (r.body.recordingsUsed !== prevRecordings + 1) throw new Error("expected recordingsUsed=" + (prevRecordings + 1) + " after 0-duration report, got " + r.body.recordingsUsed);
    if (r.body.cumulativeUsed !== prevCumulative) throw new Error("expected cumulativeUsed=" + prevCumulative + " (no change for 0-duration), got " + r.body.cumulativeUsed);
  });

  // 6. Session isolation: a different sessionId starts fresh
  const otherId = uniqueId("counter-other");
  await check("different sessionId is isolated (starts at 0)", async () => {
    const r = await post("/api/limits", { sessionId: otherId, isPro: false, audioDuration: 0, checkOnly: true });
    if (r.body.recordingsUsed !== 0) throw new Error("expected other session to start at 0, got " + r.body.recordingsUsed);
  });

  console.log("");
  for (const r of results) {
    if (r[0] === "PASS") console.log("  PASS  " + r[1]);
    else console.log("  FAIL  " + r[1] + (r[2] ? "  -- " + r[2] : ""));
  }
  console.log("");
  console.log("Summary: " + passed + " passed, " + failed + " failed (base=" + BASE + ")");
  process.exit(failed === 0 ? 0 : 1);
};

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
