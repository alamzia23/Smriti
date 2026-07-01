"use client";
import { useState } from "react";
import { Plus, Sparkles, Loader2, Lock, ChevronDown } from "lucide-react";
import { Button, cn } from "./ui";

export type Creds = { passphrase: string; adminSecret: string };

export function DemoControls({
  creds,
  setCreds,
  onSimulate,
  onConsolidate,
  busy,
}: {
  creds: Creds;
  setCreds: (c: Creds) => void;
  onSimulate: () => void;
  onConsolidate: () => void;
  busy: { simulate: boolean; consolidate: boolean };
}) {
  const [open, setOpen] = useState(false);
  const hasPass = creds.passphrase.trim().length > 0;
  const hasAdmin = creds.adminSecret.trim().length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onSimulate} disabled={!hasPass || busy.simulate}>
          {busy.simulate ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Simulate resolved incident
        </Button>
        <Button
          variant="ghost"
          onClick={onConsolidate}
          disabled={!hasPass || !hasAdmin || busy.consolidate}
        >
          {busy.consolidate ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          Consolidate memory
        </Button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs font-medium text-muted hover:border-ink/20"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Demo controls
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="w-full max-w-md rounded-2xl border border-line bg-white/80 p-4">
          <p className="mb-2 text-xs text-muted">
            Write actions are gated so the live demo isn&apos;t an open write
            surface. Enter the demo passphrase and admin secret (demo-grade — see
            README).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              placeholder="Demo passphrase"
              value={creds.passphrase}
              onChange={(e) => setCreds({ ...creds, passphrase: e.target.value })}
              className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <input
              type="password"
              placeholder="Admin secret"
              value={creds.adminSecret}
              onChange={(e) => setCreds({ ...creds, adminSecret: e.target.value })}
              className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
