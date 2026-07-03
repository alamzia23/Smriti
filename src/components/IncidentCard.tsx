"use client";
import { Trash2 } from "lucide-react";
import type { Incident } from "@/lib/types";
import { SeverityDot, timeAgo, cn } from "./ui";

function title(inc: Incident) {
  return inc.symptoms[0]
    ? `${cap(inc.symptoms[0])} — ${inc.service}`
    : inc.root_cause.slice(0, 46);
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
        "group rounded-2xl border bg-panel p-[15px_17px] shadow-soft transition-shadow hover:shadow-lg",
        matched ? "border-accent ring-2 ring-accent/30" : "border-line",
      )}
    >
      <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
        <SeverityDot severity={incident.severity} />
        <span className="truncate">
          {incident.incident_id} · {incident.service}
        </span>
        {matched && (
          <span className="ml-auto shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
            matched
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold leading-snug text-ink">{title(incident)}</div>
      <div className="mt-2 flex items-center gap-2.5 text-[11px] text-ink-3">
        <span>via {incident.source}</span>
        <span>{incident.fixed_by}</span>
        <span>{timeAgo(incident.date)}</span>
        {onRetire && (
          <button
            onClick={() => onRetire(incident.incident_id)}
            title="Retire from memory (forget)"
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 opacity-0 transition-opacity hover:text-sev1 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" /> retire
          </button>
        )}
      </div>
    </article>
  );
}
