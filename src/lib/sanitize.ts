import type { Incident } from "./types";

// Prompt-injection hygiene + storage safety: strip null bytes and control
// characters (keep \n and \t), and cap length. All ingested incident text is
// treated as untrusted DATA, never instructions. Regexes are built from
// unicode escapes so no raw control chars live in this source file.
const NULLS = new RegExp("\\u0000", "g");
const CONTROL = new RegExp("[\\u0001-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]", "g");

export function scrub(input: string, maxLen = 4000): string {
  return input.replace(NULLS, "").replace(CONTROL, "").slice(0, maxLen);
}

export function scrubIncident(i: Incident): Incident {
  return {
    ...i,
    incident_id: scrub(i.incident_id, 40),
    service: scrub(i.service, 80),
    root_cause: scrub(i.root_cause, 2000),
    resolution: scrub(i.resolution, 2000),
    fixed_by: scrub(i.fixed_by, 80),
    date: scrub(i.date, 40),
    postmortem_summary: scrub(i.postmortem_summary, 4000),
    symptoms: i.symptoms.map((s) => scrub(s, 200)).slice(0, 24),
    tags: i.tags.map((t) => scrub(t, 48)).slice(0, 24),
    reference_url: i.reference_url ? scrub(i.reference_url, 500) : i.reference_url,
  };
}
