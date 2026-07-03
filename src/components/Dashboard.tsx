"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Incident, SmritiGraph } from "@/lib/types";
import { api, type RecallResponse } from "@/lib/client-api";
import { patternInsights, buildHandoffBrief } from "@/lib/insights";
import { TopBar } from "./TopBar";
import { Hero } from "./Hero";
import { InteractiveGraph } from "./InteractiveGraph";
import { PillFilters, filterMatches, type Filter } from "./PillFilters";
import { IncidentCard } from "./IncidentCard";
import { HandoffModal } from "./HandoffModal";
import { Toast } from "./Toast";
import type { Creds } from "./DemoControls";

const EMPTY_GRAPH: SmritiGraph = { nodes: [], edges: [] };
const OPS = ["remember()", "recall()", "improve()", "forget()"];

export function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [graph, setGraph] = useState<SmritiGraph>(EMPTY_GRAPH);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  const [query, setQuery] = useState("");
  const [recallLoading, setRecallLoading] = useState(false);
  const [recall, setRecall] = useState<RecallResponse | null>(null);

  const [creds, setCreds] = useState<Creds>({ passphrase: "", adminSecret: "" });
  const [busy, setBusy] = useState({ simulate: false, consolidate: false });
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => setToast({ msg, kind }), []);

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
    async (q: string) => {
      setRecallLoading(true);
      setRecall(null);
      try {
        const res = await api.recall(q);
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

  const onAskAbout = useCallback(
    (q: string) => {
      setQuery(q);
      onAsk(q);
    },
    [onAsk],
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
        notify("Enter demo passphrase + admin secret in Demo controls", "err");
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

  const insights = useMemo(() => patternInsights(incidents), [incidents]);
  const brief = useMemo(() => buildHandoffBrief(incidents), [incidents]);
  const briefLine =
    incidents.length > 0
      ? `${brief.watchFor.length} pattern${brief.watchFor.length !== 1 ? "s" : ""} to watch · ${brief.knownFixes.length} fixes to know`
      : null;

  const matchedId = recall?.matchedIncidentId ?? null;
  const matchedIncident = useMemo(
    () => incidents.find((i) => i.incident_id === matchedId) ?? null,
    [incidents, matchedId],
  );
  const visible = useMemo(() => incidents.filter((i) => filterMatches(i, filter)), [incidents, filter]);

  return (
    <div className="flex-1">
      <TopBar
        creds={creds}
        setCreds={setCreds}
        onSimulate={onSimulate}
        onConsolidate={onConsolidate}
        busy={busy}
      />

      <Hero
        incidents={incidents}
        insight={insights[0]?.text ?? null}
        briefLine={briefLine}
        onOpenBrief={() => setBriefOpen(true)}
        query={query}
        setQuery={setQuery}
        onAsk={onAsk}
        recallLoading={recallLoading}
      />

      {/* graph */}
      <div className="px-9">
        <div className="relative overflow-hidden rounded-[20px] border border-line bg-panel shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-[22px] py-4">
            <h3 className="text-[14px] font-bold text-ink">Incident memory graph</h3>
            <span className="text-[12px] text-ink-3">
              {graph.nodes.length} nodes · {graph.edges.length} edges · recall path highlighted
            </span>
          </div>
          {loading ? (
            <div className="flex h-[600px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
            </div>
          ) : (
            <InteractiveGraph
              graph={graph}
              incidents={incidents}
              highlightedIncidentId={matchedId}
              recall={recall}
              matchedIncident={matchedIncident}
              onAskAbout={onAskAbout}
            />
          )}
        </div>
      </div>

      {/* feed */}
      <div className="px-9 pb-2 pt-[26px]">
        <div className="mb-3.5 flex items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-ink">Remembered incidents</h3>
          <PillFilters incidents={incidents} active={filter} onChange={setFilter} />
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="py-16 text-center text-ink-3">No incidents match this filter.</p>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-center gap-2.5 py-[30px] text-[11.5px] text-ink-3">
        Powered by Cognee
        {OPS.map((op) => (
          <span
            key={op}
            className="rounded-lg border border-line bg-panel px-2 py-[3px] font-mono text-[11px] text-ink-2"
          >
            {op}
          </span>
        ))}
      </div>

      {briefOpen && <HandoffModal brief={brief} onClose={() => setBriefOpen(false)} />}
      {toast && <Toast message={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  );
}
