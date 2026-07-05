import type { NextRequest } from "next/server";
import { IncidentWebhookSchema, type Incident } from "@/lib/types";
import { verifyHmac } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { scrubIncident } from "@/lib/sanitize";
import { addIncident } from "@/lib/incident-store";
import { cogneeRemember, incidentToText } from "@/lib/cognee";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cognee calls can take 10-15s; pin the function budget so Vercel does not
// time the request out (prod default varies by plan).
export const maxDuration = 60;

const MAX_BODY_BYTES = 16 * 1024; // hard cap before buffering

// Real production webhook: PagerDuty/GitHub POST a resolved incident here with
// an HMAC signature. Unauthenticated writes to memory are impossible.
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "webhook"), 30, 60_000);
  if (!rl.ok) return jsonError(429, "Rate limit exceeded");

  // Body-size cap (advertised + actual) to avoid memory abuse.
  const advertised = Number(req.headers.get("content-length") ?? 0);
  if (advertised > MAX_BODY_BYTES) return jsonError(413, "Payload too large");

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, "Payload too large");

  // Verify HMAC over the EXACT raw bytes, before any parsing.
  if (!verifyHmac(raw, req.headers.get("x-smriti-signature"))) {
    return jsonError(401, "Invalid signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonError(400, "Malformed JSON");
  }

  const result = IncidentWebhookSchema.safeParse(parsed);
  if (!result.success) return jsonError(422, "Invalid incident payload");

  const incident: Incident = scrubIncident({
    ...result.data,
    incident_id: result.data.incident_id || `INC-${Date.now().toString().slice(-6)}`,
  });

  // Ingest into Cognee (background so the webhook returns fast) + mirror locally.
  try {
    await cogneeRemember(incidentToText(incident), {
      fileName: `${incident.incident_id}.txt`,
      runInBackground: true,
    });
  } catch {
    return jsonError(502, "Memory ingestion failed");
  }
  addIncident(incident);

  return jsonOk({ ok: true, incident_id: incident.incident_id }, 202);
}
