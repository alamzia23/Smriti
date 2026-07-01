import "server-only";
import type { Incident } from "./types";

// Sample resolved incidents the "Simulate resolved incident" button ingests.
// Deliberately DISTINCT from the demo PaymentService pair (per the demo plan:
// the simulate button writes a separate incident; the recall you type on stage
// targets the pre-seeded one).
const SAMPLES: Omit<Incident, "incident_id">[] = [
  {
    service: "NotificationService",
    severity: "SEV2",
    symptoms: ["queue backlog growing", "delayed emails", "worker restarts"],
    root_cause:
      "A downstream SMTP provider rate-limited us, so the retry queue backed up faster than workers could drain it.",
    resolution:
      "Added exponential backoff with jitter, a dead-letter queue, and a circuit breaker around the SMTP client.",
    fixed_by: "priya",
    date: "2026-02-02",
    tags: ["queue", "smtp", "backpressure", "retries"],
    source: "PagerDuty",
    postmortem_summary:
      "NotificationService's retry queue backed up when the email provider throttled us, delaying notifications. Backoff, a DLQ, and a circuit breaker stabilized delivery.",
    reference_url: "",
  },
  {
    service: "SearchService",
    severity: "SEV3",
    symptoms: ["elevated p95", "thread pool saturation", "slow queries"],
    root_cause:
      "A missing index caused full scans on a hot query path after a schema migration, saturating the DB thread pool.",
    resolution: "Added the composite index and a slow-query alert; backfilled online.",
    fixed_by: "diego",
    date: "2026-02-14",
    tags: ["database", "index", "latency", "migration"],
    source: "Slack",
    postmortem_summary:
      "A post-migration missing index forced full scans on SearchService's hot path, spiking latency. Adding the index and slow-query alerting resolved it.",
    reference_url: "",
  },
  {
    service: "AuthService",
    severity: "SEV1",
    symptoms: ["login failures", "token validation errors", "5xx spike"],
    root_cause:
      "A JWKS key rotation propagated before all pods refreshed their key cache, so tokens signed with the new key failed validation.",
    resolution:
      "Shortened the JWKS cache TTL, added overlap between old and new keys, and forced a cache warm on rotation.",
    fixed_by: "chen",
    date: "2026-02-20",
    tags: ["auth", "jwt", "jwks", "key-rotation"],
    source: "PagerDuty",
    postmortem_summary:
      "AuthService rejected valid tokens during a JWKS key rotation because pods cached stale keys. Overlapping keys and shorter cache TTLs fixed validation.",
    reference_url: "",
  },
];

let counter = 0;

export function nextSampleIncident(): Incident {
  const base = SAMPLES[counter % SAMPLES.length];
  counter += 1;
  const stamp = `${Date.now()}`.slice(-6);
  return { ...base, incident_id: `INC-SIM-${stamp}` };
}
