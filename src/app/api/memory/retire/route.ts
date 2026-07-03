import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { RetireSchema } from "@/lib/types";
import { verifyAdmin, verifyPassphrase } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { cogneeForget, findDataId } from "@/lib/cognee";
import { removeIncident } from "@/lib/incident-store";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// forget(): prune stale memory so recall stays accurate. Member session +
// admin-secret + passphrase + explicit confirm required (never publicly callable).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "member") return jsonError(403, "Forbidden");
  if (!verifyAdmin(req) || !verifyPassphrase(req)) {
    return jsonError(401, "Unauthorized");
  }

  const rl = rateLimit(clientKey(req, "retire"), 10, 60_000);
  if (!rl.ok) return jsonError(429, "Rate limit exceeded");

  const raw = await req.text();
  if (raw.length > 2 * 1024) return jsonError(413, "Payload too large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, "Malformed JSON");
  }

  const parsed = RetireSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "Invalid request");

  try {
    if (parsed.data.everything) {
      await cogneeForget({ everything: true });
      return jsonOk({ ok: true, scope: "everything" });
    }

    const incidentId = parsed.data.incidentId!;
    const dataId = await findDataId(incidentId);
    // Delete the specific datapoint from Cognee memory (per-incident forget).
    await cogneeForget({ dataId: dataId ?? undefined });
    removeIncident(incidentId);
    return jsonOk({ ok: true, incidentId, forgotDataId: dataId });
  } catch {
    return jsonError(502, "Retire failed");
  }
}
