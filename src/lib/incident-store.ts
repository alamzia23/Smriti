import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IncidentSchema, type Incident } from "./types";

// In-memory mirror of incident METADATA for the cards + derived graph. Cognee
// remains the source of matching intelligence (recall); this is just the
// reliable structured view the UI renders. Seeded from seed/incidents.json,
// plus any incidents added at runtime via the webhook. Persists per server
// process (fine for the demo; note in README).
const store = new Map<string, Incident>();

function loadSeed() {
  try {
    const raw = readFileSync(join(process.cwd(), "seed", "incidents.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const r = IncidentSchema.safeParse(item);
        if (r.success) store.set(r.data.incident_id, r.data);
      }
    }
  } catch {
    // seed file optional at runtime
  }
}
loadSeed();

export function allIncidents(): Incident[] {
  // newest-looking first: reverse insertion so runtime-added show at the top
  return Array.from(store.values()).reverse();
}

export function getIncident(id: string): Incident | undefined {
  return store.get(id);
}

export function addIncident(incident: Incident): void {
  store.set(incident.incident_id, incident);
}

export function removeIncident(id: string): boolean {
  return store.delete(id);
}
