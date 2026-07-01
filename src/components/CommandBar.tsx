"use client";
import { useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { DEMO_ALERT } from "@/lib/config";
import { cn } from "./ui";

export function CommandBar({
  onAsk,
  loading,
}: {
  onAsk: (query: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q && !loading) onAsk(q);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-line bg-white/80 p-2 pl-5 shadow-sm backdrop-blur"
    >
      <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Paste an alert… e.g. "${DEMO_ALERT}"`}
        aria-label="Paste an alert to recall past incidents"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden />
        )}
        Ask {""}Smriti
      </button>
    </form>
  );
}
