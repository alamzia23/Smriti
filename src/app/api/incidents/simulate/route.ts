import type { NextRequest } from "next/server";
import { verifyPassphrase } from "@/lib/security";
import { computeHmac } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { nextSampleIncident } from "@/lib/samples";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo convenience: builds a sample resolved incident, signs it with the server
// HMAC secret, and POSTs it to the REAL webhook — proving automatic, signed
// ingestion end-to-end without wiring live PagerDuty OAuth. Passphrase-gated so
// the live demo isn't an open write surface.
export async function POST(req: NextRequest) {
  if (!verifyPassphrase(req)) return jsonError(401, "Unauthorized");

  const rl = rateLimit(clientKey(req, "simulate"), 10, 60_000);
  if (!rl.ok) return jsonError(429, "Rate limit exceeded");

  const incident = nextSampleIncident();
  const rawBody = JSON.stringify(incident);
  const signature = computeHmac(rawBody);

  const webhookUrl = new URL("/api/incidents/webhook", req.nextUrl.origin);
  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-smriti-signature": signature,
      },
      body: rawBody,
    });
  } catch {
    return jsonError(502, "Simulated ingestion failed");
  }

  if (!res.ok) return jsonError(502, "Simulated ingestion failed");
  return jsonOk({ ok: true, incident_id: incident.incident_id, incident }, 202);
}
