"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Brain, X } from "lucide-react";
import type { RecallResponse } from "@/lib/client-api";
import type { Incident } from "@/lib/types";

export function RecallResult({
  result,
  matchedIncident,
  onClose,
}: {
  result: RecallResponse;
  matchedIncident: Incident | null;
  onClose: () => void;
}) {
  const answer = result.hits.map((h) => h.text).join("\n\n").trim();

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-accent/20 bg-accent-soft/40 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Brain className="h-4 w-4" aria-hidden />
          </span>
          Smriti remembers
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss recall result"
          className="rounded-full p-1 text-muted hover:bg-black/[0.05] hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="mt-1 text-xs text-muted">
        Alert: <span className="italic">“{result.query}”</span>
      </p>

      {matchedIncident && (
        <div className="mt-4 rounded-2xl border border-line bg-white/80 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Matched past incident
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {matchedIncident.service} · {matchedIncident.incident_id}
          </p>
        </div>
      )}

      {answer ? (
        <div className="prose-smriti mt-4 max-w-none text-sm leading-relaxed text-ink/90">
          {/* rehypeSanitize strips any unsafe HTML — no dangerouslySetInnerHTML */}
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {answer}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No grounded memory yet — try again in a few seconds if this incident was
          just ingested.
        </p>
      )}

      <p className="mt-4 text-[11px] text-muted/80">
        Retrieved and synthesized by Cognee graph memory — not keyword matching.
      </p>
    </section>
  );
}
