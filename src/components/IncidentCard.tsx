"use client";
import { Wrench, ExternalLink, Trash2, Clock } from "lucide-react";
import type { Incident } from "@/lib/types";
import { SeverityDot, timeAgo, cn } from "./ui";

export function IncidentCard({
  incident,
  matched,
  onRetire,
}: {
  incident: Incident;
  matched?: boolean;
  onRetire?: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
        matched ? "border-accent ring-2 ring-accent/30" : "border-line",
      )}
    >
      {matched && (
        <span className="absolute -top-2 left-5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
          Matched by Smriti
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">
            {incident.service}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{incident.incident_id}</p>
        </div>
        <SeverityDot severity={incident.severity} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {incident.symptoms.slice(0, 3).map((s, i) => (
          <span
            key={i}
            className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[11px] text-muted"
          >
            {s}
          </span>
        ))}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink/80">
        <span className="font-medium text-ink">Root cause: </span>
        {incident.root_cause}
      </p>

      <div className="mt-3 flex items-start gap-1.5 text-xs text-muted">
        <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="line-clamp-2">{incident.resolution}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {timeAgo(incident.date)}
        </span>
        <span className="truncate">fixed by {incident.fixed_by}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted">
          {incident.source}
        </span>
        <div className="flex items-center gap-2">
          {incident.reference_url ? (
            <a
              href={incident.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              postmortem <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <span />
          )}
          {onRetire && (
            <button
              onClick={() => onRetire(incident.incident_id)}
              title="Retire this incident from memory (forget)"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted opacity-0 transition-opacity hover:text-sev1 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" aria-hidden /> retire
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
