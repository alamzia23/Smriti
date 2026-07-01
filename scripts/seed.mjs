// ---------------------------------------------------------------------------
// Seed script — loads seed/incidents.json into Cognee via remember().
// Ingestion is synchronous (run_in_background=false) so each incident's graph
// is built before we move on. Run once before the demo (~15-20s per incident).
//
//   node --env-file=.env.local scripts/seed.mjs
// ---------------------------------------------------------------------------

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.COGNEE_BASE_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.COGNEE_API_KEY;
const DATASET = process.env.COGNEE_DATASET || "smriti_incidents";

if (!BASE || !API_KEY) {
  console.error("Missing COGNEE_BASE_URL or COGNEE_API_KEY in .env.local.");
  process.exit(1);
}

const auth = { "X-Api-Key": API_KEY };

function incidentToText(i) {
  return [
    `INCIDENT ${i.incident_id}`,
    `service: ${i.service}`,
    `severity: ${i.severity}`,
    `symptoms: ${(i.symptoms || []).join(", ")}`,
    `root_cause: ${i.root_cause}`,
    `resolution: ${i.resolution}`,
    `fixed_by: ${i.fixed_by}`,
    `date: ${i.date}`,
    `tags: ${(i.tags || []).join(", ")}`,
    `source: ${i.source}`,
    `postmortem: ${i.postmortem_summary}`,
  ].join("\n");
}

async function ensureDataset() {
  const res = await fetch(`${BASE}/api/v1/datasets/`, { headers: auth });
  const list = await res.json();
  if (Array.isArray(list) && list.find((d) => d.name === DATASET)) return;
  await fetch(`${BASE}/api/v1/datasets/`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DATASET }),
  });
  console.log(`Created dataset "${DATASET}".`);
}

async function remember(incident) {
  const form = new FormData();
  form.append(
    "data",
    new File([incidentToText(incident)], `${incident.incident_id}.txt`, {
      type: "text/plain",
    }),
  );
  form.append("datasetName", DATASET);
  form.append("run_in_background", "false");
  const res = await fetch(`${BASE}/api/v1/remember`, {
    method: "POST",
    headers: auth,
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function main() {
  const raw = await readFile(join(__dirname, "..", "seed", "incidents.json"), "utf8");
  const incidents = JSON.parse(raw);
  console.log(`Seeding ${incidents.length} incidents into "${DATASET}" at ${BASE}\n`);
  await ensureDataset();

  let ok = 0;
  for (let idx = 0; idx < incidents.length; idx++) {
    const i = incidents[idx];
    process.stdout.write(`[${idx + 1}/${incidents.length}] ${i.incident_id} ${i.service} … `);
    try {
      const r = await remember(i);
      ok++;
      console.log(`ok (${r.elapsed_seconds ? r.elapsed_seconds.toFixed(1) + "s" : "done"})`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
  console.log(`\nDone. ${ok}/${incidents.length} incidents remembered.`);
  console.log(
    "Note: recall may take ~30-60s after seeding before it grounds on the new memory.",
  );
  process.exit(ok === incidents.length ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
