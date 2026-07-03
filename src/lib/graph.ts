import type { Incident } from "./types";
import type { SmritiGraph, SmritiGraphNode, SmritiGraphEdge } from "./types";

// Curated tag → canonical root-cause label. First matching tag on an incident
// becomes its shared root-cause node, so recurring themes visibly connect
// multiple incidents (and power the chronic-pattern insights).
const THEME_MAP: Record<string, string> = {
  "connection-pool": "connection-pool leak",
  memory: "memory leak",
  oom: "OOMKill",
  helm: "helm misconfig",
  tls: "cert expiry",
  certificates: "cert expiry",
  dns: "DNS failure",
  disk: "disk pressure",
  cardinality: "cardinality explosion",
  kafka: "consumer lag",
  redis: "cache stampede",
  cache: "cache stampede",
  argocd: "gitops drift",
  gitops: "gitops drift",
  "readiness-probe": "probe misconfig",
  "human-error": "human error",
  "network-partition": "network partition",
  failover: "failover split",
  "config-change": "bad config push",
  regex: "regex backtracking",
  autoscaling: "autoscale lag",
};

export function canonicalRootCause(inc: Incident): { key: string; label: string } {
  for (const tag of inc.tags) {
    const t = tag.toLowerCase();
    if (THEME_MAP[t]) return { key: t, label: THEME_MAP[t] };
  }
  const first = inc.tags[0]?.toLowerCase() || "other";
  return { key: first, label: first };
}

// Build the memory graph the user SEES from structured incident metadata:
// four node types (service, incident, root cause, engineer) — no tag clutter,
// matching the v3 prototype legend. Shared services/root-causes/engineers link
// incidents so recurring patterns are visible. (Matching intelligence stays in
// Cognee recall — this is only the reliable visual layer.)
export function deriveGraph(incidents: Incident[]): SmritiGraph {
  const nodes = new Map<string, SmritiGraphNode>();
  const edges: SmritiGraphEdge[] = [];
  const degree = new Map<string, number>();

  const add = (id: string, label: string, type: SmritiGraphNode["type"]) => {
    if (!nodes.has(id)) nodes.set(id, { id, label, type, rawType: type, weight: 1 });
  };
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
  const link = (source: string, target: string, label?: string) => {
    edges.push({ id: `${source}__${target}`, source, target, label });
    bump(source);
    bump(target);
  };

  for (const inc of incidents) {
    const incId = `inc:${inc.incident_id}`;
    add(incId, inc.incident_id, "incident");

    const svcId = `svc:${inc.service.toLowerCase()}`;
    add(svcId, inc.service, "service");
    link(incId, svcId, "affects");

    const rc = canonicalRootCause(inc);
    const rcId = `rc:${rc.key}`;
    add(rcId, rc.label, "root_cause");
    link(incId, rcId, "caused by");

    const engId = `eng:${inc.fixed_by.toLowerCase()}`;
    add(engId, inc.fixed_by, "engineer");
    link(incId, engId, "fixed by");
  }

  // Weight = importance → node radius. Incidents weighted by severity, hubs by degree.
  for (const node of nodes.values()) {
    const deg = degree.get(node.id) ?? 1;
    if (node.type === "incident") node.weight = 2; // uniform-ish, refined below
    else node.weight = 1 + deg; // services/root-causes/engineers grow with connections
  }
  // Severity-based sizing for incidents.
  for (const inc of incidents) {
    const n = nodes.get(`inc:${inc.incident_id}`);
    if (n) n.weight = inc.severity === "SEV1" ? 3 : inc.severity === "SEV2" ? 2.4 : 1.9;
  }

  return { nodes: Array.from(nodes.values()), edges };
}
