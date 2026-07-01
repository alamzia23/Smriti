import { allIncidents } from "@/lib/incident-store";
import { jsonOk } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only list of incident metadata for the cards. No secrets, same-origin.
export async function GET() {
  return jsonOk({ incidents: allIncidents() });
}
