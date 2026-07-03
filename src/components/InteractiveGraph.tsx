"use client";
import { useMemo, useRef, useState } from "react";
import type { Incident, SmritiGraph, SmritiNodeType } from "@/lib/types";
import type { RecallResponse } from "@/lib/client-api";
import {
  layoutGraph,
  fitToBox,
  relaxOverlaps,
  GRAPH_W,
  GRAPH_H,
  type Pos,
} from "@/lib/graph-layout";
import { nodeDetail } from "@/lib/node-detail";
import { cn } from "./ui";

const FILL: Record<SmritiNodeType, string> = {
  incident: "var(--ink)",
  service: "var(--accent)",
  root_cause: "var(--sev2)",
  engineer: "var(--eng)",
  symptom: "var(--ink-3)",
  tag: "var(--ink-3)",
  other: "var(--ink-3)",
};

function radius(weight = 1) {
  return Math.max(8, Math.min(20, 7 + weight * 2.4));
}

function curvePath(a: Pos, b: Pos) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const off = Math.min(60, len * 0.14);
  const cx = mx + (-dy / len) * off;
  const cy = my + (dx / len) * off;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function InteractiveGraph({
  graph,
  incidents,
  highlightedIncidentId,
  recall,
  matchedIncident,
  onAskAbout,
}: {
  graph: SmritiGraph;
  incidents: Incident[];
  highlightedIncidentId?: string | null;
  recall: RecallResponse | null;
  matchedIncident: Incident | null;
  onAskAbout: (query: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pop, setPop] = useState<{ x: number; y: number } | null>(null);

  const pos = useMemo(() => {
    const raw = layoutGraph(graph, { width: 1600, height: 920, iterations: 400 });
    const fitted = fitToBox(raw, GRAPH_W, GRAPH_H);
    const radii = new Map(graph.nodes.map((n) => [n.id, radius(n.weight)] as const));
    return relaxOverlaps(fitted, radii);
  }, [graph]);
  const viewBox = `0 0 ${GRAPH_W} ${GRAPH_H}`;

  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target);
      (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source);
    }
    return m;
  }, [graph.edges]);

  const highlightNodeId = highlightedIncidentId ? `inc:${highlightedIncidentId}` : null;
  const litSet = useMemo(() => {
    if (!selected) return null;
    const s = new Set<string>([selected]);
    neighbors.get(selected)?.forEach((n) => s.add(n));
    return s;
  }, [selected, neighbors]);

  const selectedNode = selected ? graph.nodes.find((n) => n.id === selected) : null;
  const detail = selectedNode ? nodeDetail(selectedNode, incidents) : null;
  const selectedConnections = selected ? neighbors.get(selected)?.size ?? 0 : 0;

  function clearSel() {
    setSelected(null);
    setPop(null);
  }

  function onNodeClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      let x = e.clientX - rect.left + 16;
      let y = e.clientY - rect.top - 10;
      if (x + 296 > rect.width) x = e.clientX - rect.left - 296;
      if (y + 230 > rect.height) y = rect.height - 240;
      if (y < 10) y = 10;
      setPop({ x, y });
    }
    setSelected(id);
  }

  return (
    <div
      ref={canvasRef}
      onClick={clearSel}
      className="dotgrid relative h-[600px] w-full overflow-hidden"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="block"
      >
        {/* edges */}
        {graph.edges.map((e) => {
          const a = pos.get(e.source);
          const b = pos.get(e.target);
          if (!a || !b) return null;
          const touchesSelected = selected && (e.source === selected || e.target === selected);
          const touchesHot =
            highlightNodeId && (e.source === highlightNodeId || e.target === highlightNodeId);
          const dim = selected ? !touchesSelected : false;
          return (
            <path
              key={e.id}
              d={curvePath(a, b)}
              fill="none"
              className={cn(touchesHot && !selected && "smriti-dash")}
              stroke={
                touchesSelected || (touchesHot && !selected) ? "var(--accent)" : "var(--line)"
              }
              strokeWidth={touchesSelected || touchesHot ? 2 : 1.3}
              style={{ opacity: dim ? 0.08 : 1, transition: "opacity .25s, stroke .25s" }}
            />
          );
        })}

        {/* recall halo on the matched node */}
        {highlightNodeId && pos.get(highlightNodeId) && (
          <circle
            className="smriti-halo"
            cx={pos.get(highlightNodeId)!.x}
            cy={pos.get(highlightNodeId)!.y}
            r={radius(graph.nodes.find((n) => n.id === highlightNodeId)?.weight) + 12}
            fill="var(--accent)"
          />
        )}

        {/* nodes */}
        {graph.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const r = radius(n.weight);
          const dim = litSet ? !litSet.has(n.id) : false;
          // Declutter: label only hub nodes (services + root causes) by default;
          // incidents/engineers get labels when focused or matched.
          const showLabel =
            n.type === "service" ||
            n.type === "root_cause" ||
            n.id === highlightNodeId ||
            (litSet ? litSet.has(n.id) : false);
          return (
            <g
              key={n.id}
              onClick={(e) => onNodeClick(e, n.id)}
              style={{ cursor: "pointer", opacity: dim ? 0.18 : 1, transition: "opacity .25s" }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={FILL[n.type]}
                stroke="var(--node-stroke)"
                strokeWidth={2.5}
              />
              {showLabel && (
                <text
                  x={p.x}
                  y={p.y + r + 13}
                  textAnchor="middle"
                  style={{ fontSize: 10.5, fill: "var(--ink-2)", pointerEvents: "none" }}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* hint chip */}
      <div className="absolute left-[18px] top-[16px] rounded-full border border-line glass px-3 py-1.5 text-[11.5px] text-ink-3">
        👆 Click any node to explore its memory
      </div>

      {/* legend */}
      <div className="absolute bottom-[16px] left-[18px] flex gap-3.5 rounded-xl border border-line glass px-4 py-2 text-[11.5px] text-ink-2">
        <LegendItem color="var(--ink)" label="incident" />
        <LegendItem color="var(--accent)" label="service" />
        <LegendItem color="var(--sev2)" label="root cause" />
        <LegendItem color="var(--eng)" label="engineer" />
      </div>

      {/* floating recall card (inside the canvas) */}
      <div
        className={cn(
          "absolute right-5 top-5 w-[320px] rounded-[18px] border border-line glass p-[18px] shadow-soft transition-opacity",
          selected && "pointer-events-none opacity-[0.15]",
        )}
      >
        {recall && matchedIncident ? (
          <RecallCardBody incident={matchedIncident} />
        ) : recall ? (
          <div>
            <span className="chip-accent">✦ recalled from memory</span>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink">
              {recall.hits[0]?.text?.slice(0, 260) || "No grounded match yet."}
            </p>
          </div>
        ) : (
          <div>
            <span className="chip-accent">✦ ready</span>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              Paste an alert above — Smriti surfaces the matching past incident, its
              root cause, and the fix that worked.
            </p>
          </div>
        )}
      </div>

      {/* node popover */}
      {pop && detail && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: pop.x, top: pop.y }}
          className="smriti-popin absolute z-[9] w-[280px] rounded-2xl border border-line glass p-4 shadow-soft"
        >
          <button
            onClick={clearSel}
            aria-label="Close"
            className="absolute right-3 top-2 text-[13px] text-ink-3 hover:text-ink"
          >
            ✕
          </button>
          <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-accent">
            {detail.ptype}
            {detail.chronic && (
              <span className="ml-2 rounded-full bg-sev2/15 px-2 py-0.5 text-sev2">chronic</span>
            )}
          </div>
          <h5 className="mt-1.5 text-[14px] font-bold text-ink">{detail.title}</h5>
          <p className="mt-1.5 text-[12px] leading-[1.55] text-ink-2">{detail.line}</p>
          <p className="mt-2.5 text-[11px] text-ink-3">
            ⤳ {selectedConnections} connection{selectedConnections !== 1 ? "s" : ""} in memory
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onAskAbout(detail.askQuery);
                clearSel();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-btnp px-3 py-1.5 text-[11.5px] font-semibold text-btnp-ink"
            >
              ✦ Ask Smriti about this
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function RecallCardBody({ incident }: { incident: Incident }) {
  return (
    <div>
      <span className="chip-accent">✦ seen before · recalled from memory</span>
      <h4 className="mt-2.5 text-[14.5px] font-bold leading-tight text-ink">
        {incident.incident_id} — {incident.service}
      </h4>
      <RecallRow k="Root cause" v={incident.root_cause} />
      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.11em] text-ink-3">
        Fix that worked
      </div>
      <div className="mt-1 text-[12.5px] leading-[1.55] text-ink">
        <code className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px]">
          {incident.resolution}
        </code>
      </div>
      <RecallRow k="Context" v={`Fixed by ${incident.fixed_by} · ${incident.date}`} />
    </div>
  );
}

function RecallRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.11em] text-ink-3">{k}</div>
      <div className="mt-1 text-[12.5px] leading-[1.55] text-ink">{v}</div>
    </>
  );
}
