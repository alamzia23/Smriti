"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SmritiGraph, SmritiNodeType } from "@/lib/types";
import { cn } from "./ui";

const RING: Record<SmritiNodeType, number> = {
  engineer: 90,
  service: 210,
  incident: 360,
  root_cause: 520,
  symptom: 600,
  tag: 620,
  other: 680,
};

const NODE_STYLE: Record<SmritiNodeType, string> = {
  incident: "bg-accent text-white border-accent",
  service: "bg-ink text-white border-ink",
  root_cause: "bg-sev2/15 text-ink border-sev2/40",
  engineer: "bg-white text-ink border-line",
  tag: "bg-black/[0.04] text-muted border-line",
  symptom: "bg-white text-muted border-line",
  other: "bg-white text-muted border-line",
};

function SmritiNode({
  data,
}: {
  data: { label: string; type: SmritiNodeType; highlighted?: boolean };
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm",
        NODE_STYLE[data.type],
        data.highlighted && "smriti-pulse ring-2 ring-accent",
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <span className="block max-w-[140px] truncate">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { smriti: SmritiNode };

export default function MemoryGraph({
  graph,
  highlightedIncidentId,
}: {
  graph: SmritiGraph;
  highlightedIncidentId?: string | null;
}) {
  const { nodes, edges } = useMemo(() => {
    // Concentric radial layout grouped by node type.
    const byType = new Map<SmritiNodeType, string[]>();
    for (const n of graph.nodes) {
      const arr = byType.get(n.type) ?? [];
      arr.push(n.id);
      byType.set(n.type, arr);
    }
    const pos = new Map<string, { x: number; y: number }>();
    for (const [type, ids] of byType) {
      const r = RING[type];
      ids.forEach((id, i) => {
        const angle = (i / Math.max(ids.length, 1)) * Math.PI * 2;
        pos.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      });
    }

    const highlightId = highlightedIncidentId
      ? `inc:${highlightedIncidentId}`
      : null;

    const rfNodes: Node[] = graph.nodes.map((n) => ({
      id: n.id,
      type: "smriti",
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        type: n.type,
        highlighted: n.id === highlightId,
      },
      draggable: true,
    }));

    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      style: {
        stroke:
          highlightId && (e.source === highlightId || e.target === highlightId)
            ? "#0080ff"
            : "#d7dbe4",
        strokeWidth:
          highlightId && (e.source === highlightId || e.target === highlightId)
            ? 2
            : 1,
      },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph, highlightedIncidentId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      minZoom={0.15}
      className="!bg-transparent"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e2e6ee" />
      <Controls showInteractive={false} className="!shadow-sm" />
    </ReactFlow>
  );
}
