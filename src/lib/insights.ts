import type { Incident } from "./types";
import { canonicalRootCause } from "./graph";

export type Insight = { text: string; kind: "chronic-service" | "recurring-cause" };

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    (m.get(k) ?? m.set(k, []).get(k)!).push(it);
  }
  return m;
}

const MEMORY_TAGS = ["memory", "connection-pool", "oom"];

// Feature A: pattern insights computed from incident metadata (labelled
// "from consolidated memory" in the UI). Chronic services + top recurring cause.
export function patternInsights(incidents: Incident[]): Insight[] {
  const out: Insight[] = [];

  for (const [svc, list] of groupBy(incidents, (i) => i.service)) {
    if (list.length >= 3) {
      const mem = list.filter((i) =>
        i.tags.some((t) => MEMORY_TAGS.includes(t.toLowerCase())),
      ).length;
      const q = mem >= 2 ? `${mem} memory incidents` : `${list.length} incidents`;
      out.push({ text: `${svc}: ${q} this quarter — chronic issue`, kind: "chronic-service" });
    }
  }

  const byCause = groupBy(incidents, (i) => canonicalRootCause(i).label);
  const top = [...byCause.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (top && top[1].length >= 2) {
    const services = new Set(top[1].map((i) => i.service)).size;
    out.push({
      text: `${top[0]}: top recurring root cause (${top[1].length} incidents, ${services} service${
        services !== 1 ? "s" : ""
      })`,
      kind: "recurring-cause",
    });
  }
  return out;
}

// Set of chronic service names (used to tag graph nodes).
export function chronicServices(incidents: Incident[]): Set<string> {
  const s = new Set<string>();
  for (const [svc, list] of groupBy(incidents, (i) => i.service)) {
    if (list.length >= 3) s.add(svc);
  }
  return s;
}

// Feature B (local composition; the /api/handoff route enriches this via recall()).
export type HandoffBrief = {
  whatBroke: { id: string; service: string; text: string }[];
  watchFor: string[];
  knownFixes: { id: string; text: string }[];
};

export function buildHandoffBrief(incidents: Incident[]): HandoffBrief {
  const sorted = [...incidents].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const whatBroke = sorted.slice(0, 4).map((i) => ({
    id: i.incident_id,
    service: i.service,
    text: trim(i.root_cause, 90),
  }));
  const watchFor = patternInsights(incidents).map((p) => p.text);
  const knownFixes = sorted.slice(0, 3).map((i) => ({
    id: i.incident_id,
    text: `${i.service}: ${trim(i.resolution, 90)}`,
  }));
  return { whatBroke, watchFor, knownFixes };
}

function trim(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
