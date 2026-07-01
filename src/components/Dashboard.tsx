"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Incident, SmritiGraph } from "@/lib/types";
import { api, type RecallResponse } from "@/lib/client-api";
import { Hero } from "./Hero";
import { CommandBar } from "./CommandBar";
import { PillFilters, filterMatches, type Filter } from "./PillFilters";
import { IncidentCard } from "./IncidentCard";
import { RecallResult } from "./RecallResult";
import { DemoControls, type Creds } from "./DemoControls";
import { Toast } from "./Toast";

// Reactflow touches window → must be client-only (no SSR).
const MemoryGraph = dynamic(() => import("./MemoryGraph"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

const EMPTY_GRAPH: SmritiGraph = { nodes: [], edges: [] };

export function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [graph, setGraph] = useState<SmritiGraph>(EMPTY_GRAPH);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  const [recallLoading, setRecallLoading] = useState(false);
  const [recall, setRecall] = useState<RecallResponse | null>(null);

  const [creds, setCreds] = useState<Creds>({ passphrase: "", adminSecret: "" });
  const [busy, setBusy] = useState({ simulate: false, consolidate: false });
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [i, g] = await Promise.all([api.incidents(), api.graph()]);
      setIncidents(i.incidents);
      setGraph(g);
    } catch {
      notify("Could not load incidents", "err");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onAsk = useCallback(
    async (query: string) => {
      setRecallLoading(true);
      setRecall(null);
      try {
        const res = await api.recall(query);
        setRecall(res);
        if (!res.hits.length) notify("No grounded memory found yet", "err");
      } catch {
        notify("Recall failed", "err");
      } finally {
        setRecallLoading(false);
      }
    },
    [notify],
  );

  const onSimulate = useCallback(async () => {
    setBusy((b) => ({ ...b, simulate: true }));
    try {
      const res = await api.simulate(creds.passphrase);
      notify(`Ingested ${res.incident_id} via signed webhook`);
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Simulate failed", "err");
    } finally {
      setBusy((b) => ({ ...b, simulate: false }));
    }
  }, [creds.passphrase, notify, refresh]);

  const onConsolidate = useCallback(async () => {
    setBusy((b) => ({ ...b, consolidate: true }));
    try {
      await api.consolidate(creds.passphrase, creds.adminSecret);
      notify("Memory consolidated — connections strengthened");
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Consolidate failed", "err");
    } finally {
      setBusy((b) => ({ ...b, consolidate: false }));
    }
  }, [creds, notify, refresh]);

  const onRetire = useCallback(
    async (id: string) => {
      if (!creds.passphrase || !creds.adminSecret) {
        notify("Open Demo controls and enter secrets to retire", "err");
        return;
      }
      try {
        await api.retire(id, creds.passphrase, creds.adminSecret);
        notify(`Retired ${id} from memory (forget)`);
        await refresh();
      } catch (e) {
        notify(e instanceof Error ? e.message : "Retire failed", "err");
      }
    },
    [creds, notify, refresh],
  );

  const matchedId = recall?.matchedIncidentId ?? null;
  const matchedIncident = useMemo(
    () => incidents.find((i) => i.incident_id === matchedId) ?? null,
    [incidents, matchedId],
  );

  const visible = useMemo(
    () => incidents.filter((i) => filterMatches(i, filter)),
    [incidents, filter],
  );

  return (
    <main className="flex-1 pb-24">
      <Hero />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <CommandBar onAsk={onAsk} loading={recallLoading} />

        {recall && (
          <RecallResult
            result={recall}
            matchedIncident={matchedIncident}
            onClose={() => setRecall(null)}
          />
        )}

        <DemoControls
          creds={creds}
          setCreds={setCreds}
          onSimulate={onSimulate}
          onConsolidate={onConsolidate}
          busy={busy}
        />

        <section className="glass rounded-3xl p-2 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <h2 className="text-sm font-semibold text-ink">Incident memory graph</h2>
            <span className="text-xs text-muted">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
          </div>
          <div className="h-[440px] w-full overflow-hidden rounded-2xl">
            {loading ? (
              <GraphSkeleton />
            ) : (
              <MemoryGraph graph={graph} highlightedIncidentId={matchedId} />
            )}
          </div>
        </section>

        <PillFilters incidents={incidents} active={filter} onChange={setFilter} />

        {loading ? (
          <div className="flex justify-center py-16 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((inc) => (
              <IncidentCard
                key={inc.incident_id}
                incident={inc}
                matched={inc.incident_id === matchedId}
                onRetire={onRetire}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-muted">No incidents match this filter.</p>
        )}
      </div>

      {toast && (
        <Toast message={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />
      )}
    </main>
  );
}

function GraphSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/40">
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
    </div>
  );
}
