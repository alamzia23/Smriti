import type { SmritiGraph } from "./types";

export type Pos = { x: number; y: number };

// Deterministic force-directed layout (Fruchterman–Reingold-lite). No randomness
// → stable across renders and SSR-safe. Returns a position per node id.
export function layoutGraph(
  graph: SmritiGraph,
  opts: { width?: number; height?: number; iterations?: number } = {},
): Map<string, Pos> {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 720;
  const iterations = opts.iterations ?? 320;

  const nodes = graph.nodes;
  const n = nodes.length;
  const pos = new Map<string, Pos>();
  const index = new Map<string, number>();

  nodes.forEach((nd, i) => {
    index.set(nd.id, i);
    const a = (i / Math.max(n, 1)) * Math.PI * 2;
    const r = Math.min(width, height) * 0.38;
    pos.set(nd.id, { x: width / 2 + Math.cos(a) * r, y: height / 2 + Math.sin(a) * r });
  });
  if (n === 0) return pos;

  const k = Math.sqrt((width * height) / n) * 0.8;
  const disp = nodes.map(() => ({ x: 0, y: 0 }));
  let temp = width * 0.1;
  const cool = temp / (iterations + 1);

  for (let it = 0; it < iterations; it++) {
    for (const d of disp) {
      d.x = 0;
      d.y = 0;
    }
    // repulsion (all pairs)
    for (let i = 0; i < n; i++) {
      const pi = pos.get(nodes[i].id)!;
      for (let j = i + 1; j < n; j++) {
        const pj = pos.get(nodes[j].id)!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i].x += fx;
        disp[i].y += fy;
        disp[j].x -= fx;
        disp[j].y -= fy;
      }
    }
    // attraction (edges)
    for (const e of graph.edges) {
      const a = index.get(e.source);
      const b = index.get(e.target);
      if (a === undefined || b === undefined) continue;
      const pa = pos.get(e.source)!;
      const pb = pos.get(e.target)!;
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[a].x -= fx;
      disp[a].y -= fy;
      disp[b].x += fx;
      disp[b].y += fy;
    }
    // integrate (temp-limited) + gentle centering
    for (let i = 0; i < n; i++) {
      const d = disp[i];
      const len = Math.hypot(d.x, d.y) || 0.01;
      const p = pos.get(nodes[i].id)!;
      p.x += (d.x / len) * Math.min(len, temp);
      p.y += (d.y / len) * Math.min(len, temp);
      p.x += (width / 2 - p.x) * 0.005;
      p.y += (height / 2 - p.y) * 0.005;
    }
    temp -= cool;
  }
  return pos;
}

// Rescale positions uniformly (preserving shape) to fill a fixed WxH box with
// padding, then center. This guarantees the graph always fills the canvas at a
// consistent, visible node size regardless of how the force sim spread out —
// paired with a fixed viewBox on the SVG.
export function fitToBox(
  pos: Map<string, Pos>,
  width = 1200,
  height = 600,
  pad = 70,
): Map<string, Pos> {
  if (pos.size === 0) return pos;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const scale = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh);
  const offX = (width - bw * scale) / 2;
  const offY = (height - bh * scale) / 2;
  const out = new Map<string, Pos>();
  for (const [id, p] of pos) {
    out.set(id, { x: (p.x - minX) * scale + offX, y: (p.y - minY) * scale + offY });
  }
  return out;
}

export const GRAPH_W = 1200;
export const GRAPH_H = 600;

// Push apart any nodes closer than their combined radii (+pad). Removes the
// overlapping "clumps" the force sim leaves within tightly-connected clusters.
export function relaxOverlaps(
  pos: Map<string, Pos>,
  radii: Map<string, number>,
  opts: { iterations?: number; pad?: number } = {},
): Map<string, Pos> {
  const iters = opts.iterations ?? 70;
  const pad = opts.pad ?? 10;
  const ids = [...pos.keys()];
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const minD = (radii.get(ids[i]) ?? 10) + (radii.get(ids[j]) ?? 10) + pad;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minD) {
          const push = (minD - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }
  return pos;
}
