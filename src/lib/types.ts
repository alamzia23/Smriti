import { z } from "zod";
import { SEVERITIES, INCIDENT_SOURCES } from "./config";

// ---- Incident schema (strict, length-capped) -----------------------------
export const IncidentSchema = z.object({
  incident_id: z.string().min(1).max(40),
  service: z.string().min(1).max(80),
  severity: z.enum(SEVERITIES),
  symptoms: z.array(z.string().max(200)).max(24),
  root_cause: z.string().min(1).max(2000),
  resolution: z.string().min(1).max(2000),
  fixed_by: z.string().min(1).max(80),
  date: z.string().max(40),
  tags: z.array(z.string().max(48)).max(24),
  source: z.enum(INCIDENT_SOURCES),
  postmortem_summary: z.string().max(4000),
  reference_url: z.string().url().max(500).optional().or(z.literal("")),
});
export type Incident = z.infer<typeof IncidentSchema>;

// Webhook payload = an incident without the client-supplied id (we derive one).
export const IncidentWebhookSchema = IncidentSchema.extend({
  incident_id: z.string().min(1).max(40).optional(),
});
export type IncidentWebhookPayload = z.infer<typeof IncidentWebhookSchema>;

// ---- Recall ---------------------------------------------------------------
export const RecallQuerySchema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).optional(),
});
export type RecallQuery = z.infer<typeof RecallQuerySchema>;

export type RecallHit = {
  kind: string;
  searchType?: string;
  text: string;
  score?: number | null;
  datasetName?: string;
};

// ---- Retire (forget) ------------------------------------------------------
export const RetireSchema = z
  .object({
    incidentId: z.string().max(40).optional(),
    everything: z.boolean().optional(),
    confirm: z.literal(true),
  })
  .refine((v) => v.incidentId || v.everything, {
    message: "Provide incidentId or everything=true",
  });
export type RetireRequest = z.infer<typeof RetireSchema>;

// ---- Graph (for Reactflow), mirrors Cognee GraphNodeDTO/GraphEdgeDTO ------
export type SmritiNodeType =
  | "incident"
  | "service"
  | "root_cause"
  | "engineer"
  | "tag"
  | "symptom"
  | "other";

export type SmritiGraphNode = {
  id: string;
  label: string;
  type: SmritiNodeType;
  rawType: string;
  weight?: number; // relative importance → node radius
};
export type SmritiGraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};
export type SmritiGraph = {
  nodes: SmritiGraphNode[];
  edges: SmritiGraphEdge[];
};
