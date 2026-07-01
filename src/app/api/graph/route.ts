import { allIncidents } from "@/lib/incident-store";
import { deriveGraph } from "@/lib/graph";
import { jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only nodes/edges for the Reactflow memory graph, derived from incident
// metadata (reliable, readable). Cognee remains the matching brain via recall().
export async function GET() {
  return jsonOk(deriveGraph(allIncidents()));
}
