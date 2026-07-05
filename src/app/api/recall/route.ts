import type { NextRequest } from "next/server";
import { RecallQuerySchema } from "@/lib/types";
import { sameOrigin } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { scrub } from "@/lib/sanitize";
import { cogneeRecall } from "@/lib/cognee";
import { allIncidents } from "@/lib/incident-store";
import { attributeIncident } from "@/lib/attribution";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cognee calls can take 10-15s; pin the function budget so Vercel does not
// time the request out (prod default varies by plan).
export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024;

// The money shot: pass a new alert to Cognee recall() and return graph-grounded
// matches. Matching/ranking is 100% Cognee — we only normalize its output and
// attribute the answer to a known incident so the UI can glow the right node.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Forbidden");

  const rl = rateLimit(clientKey(req, "recall"), 20, 60_000);
  if (!rl.ok) return jsonError(429, "Rate limit exceeded");

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, "Payload too large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, "Malformed JSON");
  }

  const parsed = RecallQuerySchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "Invalid query");

  const query = scrub(parsed.data.query, 500);

  try {
    const hits = await cogneeRecall(query, { topK: parsed.data.topK ?? 5 });
    const matchedIncidentId = attributeIncident(hits, allIncidents());
    return jsonOk({ query, hits, matchedIncidentId });
  } catch {
    return jsonError(502, "Recall failed");
  }
}
