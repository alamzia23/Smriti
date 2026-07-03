"use client";
import type { Incident } from "@/lib/types";
import {
  HERO_TAGLINE_BOLD,
  HERO_TAGLINE_SERIF,
  HERO_SUBLINE,
  HERO_MICRO_LABEL,
} from "@/lib/config";
import { CommandBar } from "./CommandBar";
import { SeverityDot, timeAgo } from "./ui";

function title(inc: Incident) {
  return inc.symptoms[0]
    ? `${cap(inc.symptoms[0])} — ${inc.service}`
    : inc.root_cause.slice(0, 46);
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Hero({
  incidents,
  insight,
  briefLine,
  onOpenBrief,
  query,
  setQuery,
  onAsk,
  recallLoading,
}: {
  incidents: Incident[];
  insight: string | null;
  briefLine: string | null;
  onOpenBrief: () => void;
  query: string;
  setQuery: (v: string) => void;
  onAsk: (q: string) => void;
  recallLoading: boolean;
}) {
  const newest = incidents[0];
  const recent = incidents[1] ?? incidents[0];

  return (
    <div className="relative min-h-[430px] px-9 pb-14 pt-[72px]">
      {/* floating flank cards (hidden on narrow viewports) */}
      {recent && (
        <FloatCard className="left-[44px] top-[96px] -rotate-[4deg]">
          <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
            <SeverityDot severity={recent.severity} />
            {recent.incident_id} · {recent.service}
          </div>
          <div className="mt-1.5 text-[13px] font-semibold leading-snug text-ink">
            {title(recent)}
          </div>
          <div className="mt-1.5 flex gap-2.5 text-[11px] text-ink-3">
            <span>via {recent.source}</span>
            <span>fixed by {recent.fixed_by}</span>
            <span>{timeAgo(recent.date)}</span>
          </div>
        </FloatCard>
      )}
      {newest && (
        <FloatCard className="left-[92px] top-[262px] rotate-[2.5deg]">
          <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
            <SeverityDot severity={newest.severity} />
            {newest.incident_id} · {newest.service}
            <span className="text-[10px] font-bold tracking-[0.08em] text-accent">● NEW</span>
          </div>
          <div className="mt-1.5 text-[13px] font-semibold leading-snug text-ink">
            {title(newest)}
          </div>
          <div className="mt-1.5 flex gap-2.5 text-[11px] text-ink-3">
            <span>via {newest.source}</span>
            <span>{timeAgo(newest.date)}</span>
          </div>
        </FloatCard>
      )}
      <FloatCard className="right-[48px] top-[92px] rotate-[3deg]">
        <span className="chip-accent">✦ Pattern detected · improve()</span>
        <div className="mt-2 text-[13px] font-semibold leading-snug text-ink">
          {insight ?? "Consolidate memory to surface recurring patterns"}
        </div>
        <div className="mt-1.5 text-[11px] text-ink-3">from consolidated memory</div>
      </FloatCard>
      <button
        onClick={onOpenBrief}
        className="absolute right-[96px] top-[268px] z-[1] hidden w-[270px] rotate-[-2.5deg] cursor-pointer rounded-2xl border border-line glass p-4 text-left shadow-soft transition-transform hover:rotate-0 min-[1180px]:block"
      >
        <span className="chip-accent">📋 On-call handoff brief</span>
        <div className="mt-2 text-[12px] leading-relaxed text-ink-2">
          {briefLine ?? "Generate a brief for the next on-call engineer from memory."}
        </div>
        <div className="mt-1.5 text-[11px] text-ink-3">click to open · from memory</div>
      </button>

      {/* center column */}
      <div className="relative z-[2] mx-auto max-w-[760px] text-center">
        <h1 className="text-[56px] font-extrabold leading-[1.04] tracking-[-2px] text-ink">
          {HERO_TAGLINE_BOLD}{" "}
          <span className="font-serif text-accent not-italic italic">{HERO_TAGLINE_SERIF}</span>
        </h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">{HERO_SUBLINE}</p>
        <CommandBar value={query} onChange={setQuery} onAsk={onAsk} loading={recallLoading} />
        <div className="mt-[18px] text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {HERO_MICRO_LABEL}
        </div>
      </div>
    </div>
  );
}

function FloatCard({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute z-[1] hidden w-[270px] rounded-2xl border border-line glass p-4 shadow-soft min-[1180px]:block ${className}`}
    >
      {children}
    </div>
  );
}
