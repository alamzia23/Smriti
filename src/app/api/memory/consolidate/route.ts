import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { verifyAdmin, verifyPassphrase } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { cogneeConsolidate } from "@/lib/cognee";
import { jsonError, jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cognee calls can take 10-15s; pin the function budget so Vercel does not
// time the request out (prod default varies by plan).
export const maxDuration = 60;

// improve(): re-cognify the dataset to strengthen connections so recurring
// patterns surface. Destructive/expensive → member session + admin-secret +
// passphrase gated (guests are read/recall only).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "member") return jsonError(403, "Forbidden");
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
