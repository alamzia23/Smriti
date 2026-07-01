"use client";
import { useMemo } from "react";
import type { Incident } from "@/lib/types";
import { cn } from "./ui";

export type Filter =
  | { kind: "all" }
  | { kind: "service"; value: string }
  | { kind: "severity"; value: string }
  | { kind: "tag"; value: string };

export function filterMatches(inc: Incident, f: Filter): boolean {
  switch (f.kind) {
    case "all":
      return true;
    case "service":
      return inc.service === f.value;
    case "severity":
      return inc.severity === f.value;
    case "tag":
      return inc.tags.includes(f.value);
  }
}

function count(incidents: Incident[], f: Filter) {
  return incidents.filter((i) => filterMatches(i, f)).length;
}

// Pills only HIDE cards from Cognee's set — they never re-rank or score.
export function PillFilters({
  incidents,
  active,
  onChange,
}: {
  incidents: Incident[];
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  const pills = useMemo(() => {
    const services = topBy(incidents.map((i) => i.service));
    const tags = topBy(incidents.flatMap((i) => i.tags)).slice(0, 5);
    const items: { label: string; f: Filter }[] = [
      { label: "All", f: { kind: "all" } },
      ...["SEV1", "SEV2", "SEV3"].map((s) => ({
        label: s,
        f: { kind: "severity", value: s } as Filter,
      })),
      ...services.slice(0, 5).map((s) => ({
        label: s,
        f: { kind: "service", value: s } as Filter,
      })),
      ...tags.map((t) => ({ label: t, f: { kind: "tag", value: t } as Filter })),
    ];
    return items.map((it) => ({ ...it, n: count(incidents, it.f) })).filter((it) => it.n > 0);
  }, [incidents]);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {pills.map((p) => {
        const isActive = sameFilter(p.f, active);
        return (
          <button
            key={`${p.f.kind}:${p.label}`}
            onClick={() => onChange(p.f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-ink bg-ink text-white"
                : "border-line bg-white/70 text-ink hover:border-ink/20",
            )}
          >
            {p.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                isActive ? "bg-white/20 text-white" : "bg-black/[0.05] text-muted",
              )}
            >
              {p.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function sameFilter(a: Filter, b: Filter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "all" || b.kind === "all") return a.kind === b.kind;
  return (a as { value: string }).value === (b as { value: string }).value;
}

function topBy(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);
}
