import "server-only";
import { z } from "zod";

// Server-only, zod-validated environment access. Validated lazily on first use
// (so `next build` doesn't require secrets to be present), and cached thereafter.
const schema = z.object({
  COGNEE_BASE_URL: z.string().url("COGNEE_BASE_URL must be a full origin URL"),
  COGNEE_API_KEY: z.string().min(1, "COGNEE_API_KEY is required"),
  COGNEE_DATASET: z.string().min(1).default("smriti_incidents"),
  COGNEE_TENANT_ID: z.string().optional(),
  COGNEE_USER_ID: z.string().optional(),
  WEBHOOK_HMAC_SECRET: z.string().min(1, "WEBHOOK_HMAC_SECRET is required"),
  ADMIN_SECRET: z.string().min(1, "ADMIN_SECRET is required"),
  DEMO_PASSPHRASE: z.string().min(1, "DEMO_PASSPHRASE is required"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Never echo values — only which keys are wrong.
    throw new Error(`Invalid environment configuration → ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
