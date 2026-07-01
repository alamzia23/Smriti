import type { Incident } from "./types";
import type { SmritiGraph, SmritiGraphNode, SmritiGraphEdge } from "./types";

// Build the memory graph the user SEES from our structured incident metadata.
// Shared services / engineers / tags become shared nodes, so recurring patterns
// visibly connect incidents. (The matching intelligence still comes from Cognee
// recall — this is only the reliable visual layer.)
export function deriveGraph(incidents: Incident[]): SmritiGraph {
  const nodes = new Map<string, SmritiGraphNode>();
  const edges: SmritiGraphEdge[] = [];

  const add = (id: string, label: string, type: SmritiGraphNode["type"]) => {
    if (!nodes.has(id)) nodes.set(id, { id, label, type, rawType: type });
  };
  const link = (source: string, target: string, label?: string) => {
    edges.push({ id: `${source}__${target}`, source, target, label });
  };

  for (const inc of incidents) {
    const incId = `inc:${inc.incident_id}`;
    add(incId, inc.incident_id, "incident");

    const svcId = `svc:${inc.service.toLowerCase()}`;
    add(svcId, inc.service, "service");
    link(incId, svcId, "affects");

    const rcId = `rc:${inc.incident_id}`;
    add(rcId, truncate(inc.root_cause, 48), "root_cause");
    link(incId, rcId, "caused by");

    const engId = `eng:${inc.fixed_by.toLowerCase()}`;
    add(engId, inc.fixed_by, "engineer");
    link(incId, engId, "fixed by");

    for (const tag of inc.tags.slice(0, 4)) {
      const tagId = `tag:${tag.toLowerCase()}`;
      add(tagId, tag, "tag");
      link(incId, tagId);
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
