import type { Incident, SmritiGraphNode } from "./types";
import { canonicalRootCause } from "./graph";

export type NodeDetail = {
  ptype: string;
  title: string;
  line: string;
  chronic: boolean;
  askQuery: string;
};

function byDateDesc(a: Incident, b: Incident) {
  return (b.date || "").localeCompare(a.date || "");
}
function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: [string, number] | null = null;
  for (const e of counts) if (!best || e[1] > best[1]) best = e;
  return best?.[0] ?? null;
}

// Build the click-popover content for a node from real incident metadata.
export function nodeDetail(node: SmritiGraphNode, incidents: Incident[]): NodeDetail {
  const key = node.id.slice(node.id.indexOf(":") + 1);

  if (node.type === "service") {
    const list = incidents.filter((i) => i.service.toLowerCase() === key);
    const recent = [...list].sort(byDateDesc)[0];
    const chronic = list.length >= 3;
    return {
      ptype: "Service",
      title: node.label,
      chronic,
      line: `${list.length} incident${list.length !== 1 ? "s" : ""} remembered${
        chronic ? " — flagged chronic" : ""
      }.${recent ? ` Most recent: ${trim(recent.root_cause, 64)}` : ""}`,
      askQuery: `What incidents has ${node.label} had, and how were they fixed?`,
    };
  }

  if (node.type === "incident") {
    const inc = incidents.find((i) => i.incident_id === node.label);
    if (!inc) {
      return { ptype: "Incident", title: node.label, line: "", chronic: false, askQuery: node.label };
    }
    return {
      ptype: `Incident · ${inc.severity}`,
      title: `${inc.incident_id} — ${inc.service}`,
      chronic: false,
      line: `Root cause: ${trim(inc.root_cause, 90)} Fix: ${trim(inc.resolution, 80)} Fixed by ${inc.fixed_by}.`,
      askQuery: `${inc.service} — ${inc.root_cause}`,
    };
  }

  if (node.type === "root_cause") {
    const shared = incidents.filter((i) => canonicalRootCause(i).key === key);
    const chronic = shared.length >= 3;
    const fix = shared[0]?.resolution;
    return {
      ptype: "Root cause",
      title: node.label,
      chronic,
      line: `Seen in ${shared.length} incident${shared.length !== 1 ? "s" : ""}${
        chronic ? " — top recurring root cause" : ""
      }.${fix ? ` Canonical fix: ${trim(fix, 80)}` : ""}`,
      askQuery: `Show me incidents caused by ${node.label} and the fixes that worked.`,
    };
  }

  // engineer
  const list = incidents.filter((i) => i.fixed_by.toLowerCase() === key);
  const specialty = mostCommon(list.map((i) => i.service));
  return {
    ptype: "Engineer",
    title: node.label,
    chronic: false,
    line: `Fixed ${list.length} remembered incident${list.length !== 1 ? "s" : ""}${
      specialty ? ` — ${specialty} specialist per the memory graph` : ""
    }. Their knowledge is now shared memory.`,
    askQuery: `What has ${node.label} fixed, and what should I know from those incidents?`,
  };
}

function trim(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
