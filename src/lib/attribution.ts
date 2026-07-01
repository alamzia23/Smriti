import type { Incident, RecallHit } from "./types";

// Attribution for VISUALIZATION ONLY. Cognee performs the retrieval + synthesis;
// this just figures out which of our known incidents Cognee's answer is
// describing, so we can glow the right graph node. It reads Cognee's OUTPUT —
// it does NOT rank or decide relevance itself.
export function attributeIncident(
  hits: RecallHit[],
  incidents: Incident[],
): string | null {
  const answer = hits
    .map((h) => h.text)
    .join(" ")
    .toLowerCase();
  if (!answer.trim()) return null;

  let best: { id: string; score: number } | null = null;

  for (const inc of incidents) {
    const fingerprints = distinctiveTokens(inc);
    let score = 0;
    for (const token of fingerprints) {
      if (token.length >= 4 && answer.includes(token)) score += 1;
    }
    // exact id or service mention is a strong signal
    if (answer.includes(inc.incident_id.toLowerCase())) score += 3;

    if (score > 0 && (!best || score > best.score)) {
      best = { id: inc.incident_id, score };
    }
  }

  // require a couple of grounded tokens so a generic answer doesn't attribute
  return best && best.score >= 2 ? best.id : null;
}

function distinctiveTokens(inc: Incident): string[] {
  const raw = `${inc.root_cause} ${inc.resolution} ${inc.tags.join(" ")}`.toLowerCase();
  return Array.from(
    new Set(
      raw
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !STOPWORDS.has(w)),
    ),
  );
}

const STOPWORDS = new Set([
  "which",
  "there",
  "their",
  "about",
  "would",
  "could",
  "these",
  "those",
  "after",
  "before",
  "because",
  "während",
  "service",
  "incident",
  "caused",
  "added",
  "using",
  "value",
  "values",
]);
