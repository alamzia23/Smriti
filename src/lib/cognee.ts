import "server-only";
import { env } from "./env";
import type {
  Incident,
  RecallHit,
  SmritiGraph,
  SmritiGraphNode,
  SmritiNodeType,
} from "./types";

// ---------------------------------------------------------------------------
// The ONLY module that talks to Cognee Cloud. Verified against the tenant's
// live OpenAPI on 2026-07-01 (see scripts/cognee-spike.mjs). Every call is
// server-side with an X-Api-Key header; the key never reaches the browser.
// ---------------------------------------------------------------------------

export class CogneeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CogneeError";
  }
}

function base() {
  return env().COGNEE_BASE_URL.replace(/\/+$/, "");
}
function authHeaders(): Record<string, string> {
  return { "X-Api-Key": env().COGNEE_API_KEY };
}
export function datasetName() {
  return env().COGNEE_DATASET;
}

async function cogneeJson<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 60_000,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    throw new CogneeError(
      e instanceof Error && e.name === "TimeoutError"
        ? "Cognee request timed out"
        : "Cognee is unreachable",
      502,
    );
  }
  return handle<T>(res);
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    // Log server-side detail; return a generic status to callers (no leak).
    console.error(`[cognee] ${res.status} ${res.url} :: ${text.slice(0, 500)}`);
    throw new CogneeError(`Cognee responded ${res.status}`, res.status);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ---- datasets -------------------------------------------------------------
type DatasetDTO = { id: string; name: string };
let datasetIdCache: string | null = null;

export async function listDatasets(): Promise<DatasetDTO[]> {
  return cogneeJson<DatasetDTO[]>("GET", "/api/v1/datasets/");
}

export async function ensureDataset(name = datasetName()): Promise<string> {
  if (datasetIdCache) return datasetIdCache;
  const existing = (await listDatasets()).find((d) => d.name === name);
  if (existing) return (datasetIdCache = existing.id);
  const created = await cogneeJson<DatasetDTO>("POST", "/api/v1/datasets/", {
    name,
  });
  return (datasetIdCache = created.id);
}

// ---- remember -------------------------------------------------------------
// `data` must be an uploaded FILE (a raw string 422s). We ingest one incident
// as a text file. run_in_background=false blocks until the graph is built.
export function incidentToText(i: Incident): string {
  return [
    `INCIDENT ${i.incident_id}`,
    `service: ${i.service}`,
    `severity: ${i.severity}`,
    `symptoms: ${i.symptoms.join(", ")}`,
    `root_cause: ${i.root_cause}`,
    `resolution: ${i.resolution}`,
    `fixed_by: ${i.fixed_by}`,
    `date: ${i.date}`,
    `tags: ${i.tags.join(", ")}`,
    `source: ${i.source}`,
    `postmortem: ${i.postmortem_summary}`,
  ].join("\n");
}

export type RememberResult = {
  status?: string;
  dataset_id?: string;
  items_processed?: number;
  elapsed_seconds?: number;
  items?: { id: string }[];
};

export async function cogneeRemember(
  text: string,
  opts: { fileName?: string; runInBackground?: boolean } = {},
): Promise<RememberResult> {
  const { fileName = "incident.txt", runInBackground = false } = opts;
  await ensureDataset();

  const form = new FormData();
  form.append("data", new File([text], fileName, { type: "text/plain" }));
  form.append("datasetName", datasetName());
  form.append("run_in_background", String(runInBackground));

  let res: Response;
  try {
    res = await fetch(`${base()}/api/v1/remember`, {
      method: "POST",
      headers: authHeaders(), // let fetch set the multipart boundary
      body: form,
      signal: AbortSignal.timeout(runInBackground ? 30_000 : 180_000),
      cache: "no-store",
    });
  } catch {
    throw new CogneeError("Cognee ingestion failed to start", 502);
  }
  return handle<RememberResult>(res);
}

// ---- recall ---------------------------------------------------------------
type RawRecall = {
  kind?: string;
  search_type?: string;
  text?: string;
  score?: number | null;
  dataset_name?: string;
  raw?: { value?: string };
};

export async function cogneeRecall(
  query: string,
  opts: { topK?: number } = {},
): Promise<RecallHit[]> {
  const raw = await cogneeJson<RawRecall[]>(
    "POST",
    "/api/v1/recall",
    {
      query,
      datasets: [datasetName()],
      topK: opts.topK ?? 5,
      // Fresh session per query: recall is session-aware, and reusing a session
      // makes it drift into chat-follow-up mode instead of grounded retrieval.
      // A new session id each call gives deterministic, memory-grounded answers.
      sessionId: crypto.randomUUID(),
    },
    45_000,
  );
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => ({
      kind: r.kind ?? "graph_completion",
      searchType: r.search_type,
      text: (r.text ?? r.raw?.value ?? "").toString(),
      score: r.score ?? null,
      datasetName: r.dataset_name,
    }))
    .filter((h) => h.text.trim().length > 0);
}

// ---- improve / consolidate (no /improve endpoint → re-cognify enriches) ----
export async function cogneeConsolidate(): Promise<unknown> {
  return cogneeJson(
    "POST",
    "/api/v1/cognify",
    { datasets: [datasetName()], runInBackground: false },
    120_000,
  );
}

// ---- forget ---------------------------------------------------------------
type DataItem = { id: string; name?: string };

// Resolve a Cognee datapoint id from the incident id we used as the filename
// (we ingest each incident as "<incident_id>.txt"). Returns null if not found.
export async function findDataId(incidentId: string): Promise<string | null> {
  const id = await ensureDataset();
  try {
    const items = await cogneeJson<DataItem[]>(
      "GET",
      `/api/v1/datasets/${id}/data`,
      undefined,
      20_000,
    );
    const match = (items ?? []).find((d) =>
      (d.name ?? "").toLowerCase().includes(incidentId.toLowerCase()),
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function cogneeForget(opts: {
  dataId?: string;
  everything?: boolean;
}): Promise<unknown> {
  // Cognee's /forget expects snake_case: `dataset` (name) + `data_id`, or
  // `everything`. (camelCase datasetName/dataId 422s.)
  const body: Record<string, unknown> = {};
  if (opts.everything) body.everything = true;
  else {
    body.dataset = datasetName();
    if (opts.dataId) body.data_id = opts.dataId;
  }
  return cogneeJson("POST", "/api/v1/forget", body, 30_000);
}

// ---- graph (feeds Reactflow directly from Cognee memory) ------------------
type GraphNodeDTO = {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
};
type GraphEdgeDTO = { source: string; target: string; label: string };

function mapNodeType(rawType: string, label: string): SmritiNodeType {
  const t = `${rawType} ${label}`.toLowerCase();
  if (t.includes("incident")) return "incident";
  if (t.includes("service") || t.includes("application")) return "service";
  if (t.includes("cause") || t.includes("root")) return "root_cause";
  if (t.includes("person") || t.includes("engineer") || t.includes("user"))
    return "engineer";
  if (t.includes("symptom")) return "symptom";
  if (t.includes("tag") || t.includes("keyword") || t.includes("topic"))
    return "tag";
  return "other";
}

export async function cogneeGraph(): Promise<SmritiGraph> {
  const id = await ensureDataset();
  const raw = await cogneeJson<{ nodes: GraphNodeDTO[]; edges: GraphEdgeDTO[] }>(
    "GET",
    `/api/v1/datasets/${id}/graph`,
    undefined,
    30_000,
  );
  const nodes: SmritiGraphNode[] = (raw.nodes ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    type: mapNodeType(n.type, n.label),
    rawType: n.type,
  }));
  const edges = (raw.edges ?? []).map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
  return { nodes, edges };
}

// ---- quota (nice demo stat) ----------------------------------------------
export async function cogneeQuota(): Promise<{
  storageLimitInBytes?: number;
  storageUsedInBytes?: number;
}> {
  return cogneeJson("GET", "/api/v1/quotas/usage", undefined, 15_000);
}
