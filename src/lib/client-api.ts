"use client";
import type { Incident, SmritiGraph, RecallHit } from "@/lib/types";

export type RecallResponse = {
  query: string;
  hits: RecallHit[];
  matchedIncidentId: string | null;
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const api = {
  incidents: () =>
    fetch("/api/incidents", { cache: "no-store" }).then(
      unwrap<{ incidents: Incident[] }>,
    ),

  graph: () =>
    fetch("/api/graph", { cache: "no-store" }).then(unwrap<SmritiGraph>),

  recall: (query: string) =>
    fetch("/api/recall", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ query }),
    }).then(unwrap<RecallResponse>),

  simulate: (passphrase: string) =>
    fetch("/api/incidents/simulate", {
      method: "POST",
      headers: { ...jsonHeaders, "x-demo-passphrase": passphrase },
      body: "{}",
    }).then(unwrap<{ incident_id: string; incident: Incident }>),

  consolidate: (passphrase: string, adminSecret: string) =>
    fetch("/api/memory/consolidate", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "x-demo-passphrase": passphrase,
        "x-admin-secret": adminSecret,
      },
      body: "{}",
    }).then(unwrap<{ ok: boolean }>),

  retire: (incidentId: string, passphrase: string, adminSecret: string) =>
    fetch("/api/memory/retire", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "x-demo-passphrase": passphrase,
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify({ incidentId, confirm: true }),
    }).then(unwrap<{ ok: boolean }>),
};
