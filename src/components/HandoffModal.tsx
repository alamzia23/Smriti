"use client";
import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import type { HandoffBrief } from "@/lib/insights";

export function HandoffModal({
  brief,
  onClose,
}: {
  brief: HandoffBrief;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function asMarkdown() {
    return [
      "# On-call handoff brief",
      "",
      "## What broke (recent)",
      ...brief.whatBroke.map((w) => `- **${w.id}** (${w.service}): ${w.text}`),
      "",
      "## Watch for",
      ...(brief.watchFor.length ? brief.watchFor.map((w) => `- ${w}`) : ["- No active patterns"]),
      "",
      "## Known fixes worth knowing",
      ...brief.knownFixes.map((f) => `- **${f.id}**: ${f.text}`),
    ].join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(asMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="smriti-popin max-h-[85vh] w-full max-w-[560px] overflow-auto rounded-3xl border border-line bg-panel p-7 shadow-soft"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="chip-accent">📋 On-call handoff brief</span>
            <p className="mt-2 text-[12px] text-ink-3">Composed from memory · hand this to the next on-call</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-ink-3 hover:bg-line hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Section title="What broke">
          {brief.whatBroke.map((w) => (
            <li key={w.id} className="text-[13px] leading-relaxed text-ink">
              <span className="font-semibold">{w.id}</span>{" "}
              <span className="text-ink-3">({w.service})</span> — {w.text}
            </li>
          ))}
        </Section>

        <Section title="Watch for">
          {brief.watchFor.length ? (
            brief.watchFor.map((w, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-ink">
                {w}
              </li>
            ))
          ) : (
            <li className="text-[13px] text-ink-3">No active chronic patterns.</li>
          )}
        </Section>

        <Section title="Known fixes worth knowing">
          {brief.knownFixes.map((f) => (
            <li key={f.id} className="text-[13px] leading-relaxed text-ink">
              <span className="font-semibold">{f.id}</span> — {f.text}
            </li>
          ))}
        </Section>

        <button
          onClick={copy}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-btnp px-4 py-2 text-[13px] font-semibold text-btnp-ink hover:opacity-90"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy as markdown"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-ink-3">{title}</div>
      <ul className="mt-2 flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}
