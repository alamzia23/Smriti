"use client";
import { Loader2 } from "lucide-react";
import { DEMO_ALERT } from "@/lib/config";

// Controlled command bar (value lifted to Dashboard so node popovers can prefill it).
export function CommandBar({
  value,
  onChange,
  onAsk,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onAsk: (query: string) => void;
  loading: boolean;
}) {
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q && !loading) onAsk(q);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-[26px] flex max-w-[640px] items-center gap-2.5 rounded-full border border-line bg-panel py-[9px] pl-5 pr-[9px] shadow-soft"
    >
      <span className="text-ink-3" aria-hidden>
        ⌕
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`e.g. "${DEMO_ALERT}"`}
        aria-label="Paste an alert to recall past incidents"
        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-btnp px-4 text-[13px] font-semibold text-btnp-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>✦</span>}
        Ask Smriti
      </button>
    </form>
  );
}
