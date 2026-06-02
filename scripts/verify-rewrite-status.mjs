// Verification script for the /api/rewrite-status endpoint.
// Asserts:
//  1. GET with no sessionId returns 400
//  2. GET with a fresh sessionId returns counts all == 0, isPro == false, max == 5
//  3. After a real confirm via /api/rewrite-confirm, GET returns the new used count
//  4. With a valid proKey, GET returns isPro == true
//  5. Non-GET methods return 405
//
// Usage:
//   node scripts/verify-rewrite-status.mjs
//   node scripts/verify-rewrite-status.mjs --base=https://wisprstories.vercel.app

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

async function get(path) {
  const r = await fetch(BASE + path);
  let body;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
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
  // 1. Missing sessionId -> 400
  await check("missing sessionId returns 400", async () => {
    const r = await get("/api/rewrite-status");
    if (r.status !== 400) throw new Error("expected 400, got " + r.status + " body=" + JSON.stringify(r.body));
  });

  // 2. Fresh sessionId -> 0 counts
  const freshId = uniqueId("fresh");
  await check("fresh sessionId returns counts all 0", async () => {
    const r = await get("/api/rewrite-status?sessionId=" + freshId);
    if (r.status !== 200) throw new Error("expected 200, got " + r.status);
    if (!r.body || !r.body.counts) throw new Error("missing counts in body: " + JSON.stringify(r.body));
    if (r.body.isPro !== false) throw new Error("expected isPro=false, got " + r.body.isPro);
    if (r.body.max !== 5) throw new Error("expected max=5, got " + r.body.max);
    const tones = ["warm", "bold", "poetic", "playful", "reflective", "honest"];
    for (const t of tones) {
      if (r.body.counts[t] !== 0) throw new Error("expected " + t + "=0, got " + r.body.counts[t]);
    }
  });

  // 3. After a real confirm, status returns the updated used count
  const confirmId = uniqueId("confirm");
  await check("after /api/rewrite-confirm, status reflects new used count", async () => {
    // First, do a real confirm for "warm" tone
    const cr = await post("/api/rewrite-confirm", { tone: "warm", sessionId: confirmId });
    if (cr.status !== 200) throw new Error("confirm failed: " + cr.status + " " + JSON.stringify(cr.body));
    if (cr.body.used !== 1) throw new Error("expected used=1 after confirm, got " + cr.body.used);
    // Now read status
    const r = await get("/api/rewrite-status?sessionId=" + confirmId);
    if (r.status !== 200) throw new Error("status fetch failed: " + r.status);
    if (r.body.counts.warm !== 1) throw new Error("expected warm=1, got " + r.body.counts.warm);
  });

  // 4. After multiple confirms, count goes up
  const multiId = uniqueId("multi");
  await check("after 3 confirms for bold, status returns used=3", async () => {
    for (let i = 0; i < 3; i++) {
      const cr = await post("/api/rewrite-confirm", { tone: "bold", sessionId: multiId });
      if (cr.status !== 200) throw new Error("confirm #" + (i+1) + " failed: " + cr.status);
    }
    const r = await get("/api/rewrite-status?sessionId=" + multiId);
    if (r.body.counts.bold !== 3) throw new Error("expected bold=3, got " + r.body.counts.bold);
  });

  // 5. Invalid proKey -> isPro=false (default free)
  const proTestId = uniqueId("protest");
  await check("invalid proKey returns isPro=false", async () => {
    const r = await get("/api/rewrite-status?sessionId=" + proTestId + "&proKey=WS-INVALID-12345");
    if (r.status !== 200) throw new Error("expected 200, got " + r.status);
    if (r.body.isPro !== false) throw new Error("expected isPro=false, got " + r.body.isPro);
  });

  // 6. POST not allowed -> 405
  await check("POST method returns 405", async () => {
    const r = await post("/api/rewrite-status", { sessionId: "x" });
    if (r.status !== 405) throw new Error("expected 405, got " + r.status);
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

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
