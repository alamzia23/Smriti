import type { NextRequest } from "next/server";
import { verifyAdmin, verifyPassphrase } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { cogneeConsolidate } from "@/lib/cognee";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// improve(): re-cognify the dataset to strengthen connections so recurring
// patterns surface. Destructive/expensive → admin-secret + passphrase gated.
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req) || !verifyPassphrase(req)) {
    return jsonError(401, "Unauthorized");
  }

  const rl = rateLimit(clientKey(req, "consolidate"), 5, 60_000);
  if (!rl.ok) return jsonError(429, "Rate limit exceeded");

  try {
    await cogneeConsolidate();
    return jsonOk({ ok: true });
  } catch {
    return jsonError(502, "Consolidate failed");
  }
}
