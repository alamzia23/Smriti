// Client-safe app constants (no secrets — this file is importable from the browser).

export const APP_NAME = "Smriti";

export const HERO_TAGLINE_BOLD = "Fix it once.";
export const HERO_TAGLINE_SERIF = "Remember it forever.";
export const HERO_SUBLINE =
  "Smriti gives your on-call team a shared memory of every incident — so the same fire never burns twice.";
export const HERO_MICRO_LABEL =
  "Powered by Cognee · Zero manual entry · Self-updating memory";

export const SEVERITIES = ["SEV1", "SEV2", "SEV3"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const INCIDENT_SOURCES = ["PagerDuty", "Slack", "GitHub", "manual"] as const;
export type IncidentSource = (typeof INCIDENT_SOURCES)[number];

// The alert we type in the live demo — must recall the seeded PaymentService incident.
export const DEMO_ALERT =
  "PaymentService is consuming high memory and pods are getting killed";
