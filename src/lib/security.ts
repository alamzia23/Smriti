import "server-only";
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "./env";

// HMAC-SHA256 over the EXACT raw request bytes (never re-serialized JSON).
export function computeHmac(rawBody: string, secret = env().WEBHOOK_HMAC_SECRET): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyHmac(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = computeHmac(rawBody);
  return constantTimeEqual(expected, signature);
}

// Constant-time string compare; length mismatch short-circuits (length is not secret).
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyAdmin(req: NextRequest): boolean {
  return constantTimeEqual(req.headers.get("x-admin-secret") ?? "", env().ADMIN_SECRET);
}

export function verifyPassphrase(req: NextRequest): boolean {
  return constantTimeEqual(req.headers.get("x-demo-passphrase") ?? "", env().DEMO_PASSPHRASE);
}

// Same-origin guard for write endpoints (no wildcard CORS on writes).
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches often omit Origin
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}
