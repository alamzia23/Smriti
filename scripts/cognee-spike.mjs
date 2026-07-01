// ---------------------------------------------------------------------------
// Step 0 live spike — prove the Cognee Cloud connection BEFORE writing app code.
//
// Uses YOUR credentials to run: auth -> ensure dataset -> remember() -> recall()
// -> graph, and asserts Cognee returns the seeded PaymentService incident.
// Endpoints/shapes were verified from your tenant's live OpenAPI spec.
//
// Requires Node 20+ (global fetch + FormData + --env-file, no npm install).
// Run from the project ROOT:
//   node --env-file=.env.local scripts/cognee-spike.mjs
// ---------------------------------------------------------------------------

const RAW_BASE = process.env.COGNEE_BASE_URL;
const API_KEY = process.env.COGNEE_API_KEY;
const DATASET = process.env.COGNEE_DATASET || "smriti_incidents";

if (!RAW_BASE || !API_KEY) {
  console.error("Missing COGNEE_BASE_URL or COGNEE_API_KEY in .env.local.");
  process.exit(1);
}
const BASE = RAW_BASE.replace(/\/+$/, "");
const authHeaders = () => ({ "X-Api-Key": API_KEY });

async function jsonCall(method, path, body) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, json, text, url };
  } catch (e) {
    return { ok: false, status: 0, error: String(e), url };
  }
}

async function formCall(path, fields) {
  const url = `${BASE}${path}`;
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((item) => form.append(k, item));
    else if (v !== undefined && v !== null) form.append(k, String(v));
  }
  try {
    const res = await fetch(url, { method: "POST", headers: authHeaders(), body: form });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, json, text, url };
  } catch (e) {
    return { ok: false, status: 0, error: String(e), url };
  }
}

function show(label, r) {
  const raw = r.json ? JSON.stringify(r.json) : r.text || r.error || "";
  console.log(`\n[${label}] ${r.status} ${r.url}\n${raw.slice(0, 900)}`);
}

const PAYMENT_INCIDENT =
  "INCIDENT INC-2025-042 | service: PaymentService | severity: SEV2 | " +
  "symptoms: p99 latency spike, pods restarting, OOMKilled | " +
  "root_cause: Connection pool not releasing idle connections, causing a memory leak | " +
  "resolution: Set maxIdleConnections=10 in Helm values and added a memory limit | " +
  "fixed_by: alam | tags: memory, helm, kubernetes | " +
  "postmortem: PaymentService pods were OOMKilled because the DB connection pool never " +
  "released idle connections; heap grew until the kernel OOM-killed the container. " +
  "Fixed by capping idle connections and setting a memory limit.";

const RECALL_QUERY = "PaymentService is consuming high memory and pods are getting killed";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Base URL : ${BASE}`);
  console.log(`Dataset  : ${DATASET}`);

  // 1) Auth check — GET /datasets requires a valid key.
  const ds = await jsonCall("GET", "/api/v1/datasets/");
  show("auth GET /datasets", ds);
  if (!ds.ok) {
    console.error("\nAuth/list failed. Check COGNEE_BASE_URL (origin only) and COGNEE_API_KEY.");
    process.exit(1);
  }

  // 2) Ensure our dataset exists (ignore 'already exists' errors), then find its id.
  await jsonCall("POST", "/api/v1/datasets/", { name: DATASET });
  const dsList = await jsonCall("GET", "/api/v1/datasets/");
  const mine = Array.isArray(dsList.json)
    ? dsList.json.find((d) => (d.name || d.datasetName) === DATASET)
    : null;
  const datasetId = mine && (mine.id || mine.datasetId);
  console.log(`\nDataset id: ${datasetId || "(not resolved)"}`);

  // 3) remember() — multipart; `data` must be an uploaded FILE, not a raw string.
  //    run_in_background=false so add+cognify+improve finish before we recall.
  console.log("\nRemembering the PaymentService incident (synchronous — cognify may take a while)...");
  const incidentFile = new File([PAYMENT_INCIDENT], "INC-2025-042.txt", { type: "text/plain" });
  const remembered = await formCall("/api/v1/remember", {
    data: [incidentFile],
    datasetName: DATASET,
    run_in_background: false,
  });
  show("remember", remembered);

  // 4) recall() — a REAL match must contain a fingerprint that exists ONLY in the
  //    stored incident and NOT in the query, proving Cognee recalled memory rather
  //    than the LLM parroting the query. "paymentservice" alone is not enough.
  const FINGERPRINTS = ["maxidleconnections", "inc-2025-042", "helm values", "idle connections"];
  let matched = false;
  let lastRecall = null;
  for (let attempt = 1; attempt <= 6 && !matched; attempt++) {
    const r = await jsonCall("POST", "/api/v1/recall", {
      query: RECALL_QUERY,
      datasets: [DATASET],
      topK: 5,
    });
    lastRecall = r;
    const blob = (r.text || "").toLowerCase();
    const hits = FINGERPRINTS.filter((f) => blob.includes(f));
    matched = r.ok && hits.length > 0;
    console.log(`[recall attempt ${attempt}] status=${r.status} groundedFingerprints=[${hits.join(", ")}]`);
    if (matched) { show("recall GROUNDED MATCH", r); break; }
    if (attempt < 6) await sleep(12000);
  }
  if (!matched && lastRecall) show("recall (no grounded match — likely generic LLM answer)", lastRecall);

  // 5) graph endpoint — confirm we can feed Reactflow straight from Cognee.
  if (datasetId) {
    const g = await jsonCall("GET", `/api/v1/datasets/${datasetId}/graph`);
    const n = g.json && Array.isArray(g.json.nodes) ? g.json.nodes.length : "?";
    const e = g.json && Array.isArray(g.json.edges) ? g.json.edges.length : "?";
    console.log(`\n[graph] status=${g.status} nodes=${n} edges=${e}`);
  }

  // 6) token usage (nice to show in the demo)
  const q = await jsonCall("GET", "/api/v1/quotas/usage");
  if (q.ok) console.log(`\n[quotas] ${JSON.stringify(q.json).slice(0, 300)}`);

  console.log("\n===== SPIKE RESULT =====");
  console.log(`auth     : OK`);
  console.log(`remember : ${remembered.ok ? "accepted" : "FAILED — see response above"}`);
  console.log(`recall   : ${matched ? "PASS - Cognee returned PaymentService (matching is Cognee's, not ours)" : "NO MATCH - see last response above"}`);
  console.log("========================");
  process.exit(matched ? 0 : 2);
}

main().catch((e) => { console.error(e); process.exit(1); });
