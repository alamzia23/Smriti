"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Plus, Sparkles, Loader2, ChevronDown, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { Creds } from "./DemoControls";
import type { SessionUser } from "./Dashboard";
import { cn } from "./ui";

export function TopBar({
  user,
  creds,
  setCreds,
  onSimulate,
  onConsolidate,
  busy,
}: {
  user: SessionUser;
  creds: Creds;
  setCreds: (c: Creds) => void;
  onSimulate: () => void;
  onConsolidate: () => void;
  busy: { simulate: boolean; consolidate: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const hasPass = creds.passphrase.trim().length > 0;
  const hasAdmin = creds.adminSecret.trim().length > 0;
  const isMember = user.role === "member";
  const initial = (user.name?.[0] ?? "G").toUpperCase();

  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-line glass px-9 py-4">
      {/* brand */}
      <div className="flex items-baseline gap-2.5">
        <span className="text-[23px] font-extrabold tracking-[-0.5px] text-ink">Smriti</span>
        <span className="font-serif text-[19px] not-italic text-accent">स्मृति</span>
        <span className="ml-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          Incident memory
        </span>
      </div>

      {/* status */}
      <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
        <span className="h-[7px] w-[7px] rounded-full bg-[#22C55E] shadow-[0_0_0_3px_rgba(34,197,94,.15)]" />
        Cognee Cloud · connected
      </div>

      <div className="flex-1" />

      <ThemeToggle />

      {/* demo controls dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-transparent px-4 py-2 text-[13px] font-semibold text-ink hover:bg-accent-soft"
        >
          Demo controls
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-[300px] rounded-2xl border border-line bg-panel p-4 shadow-soft">
            <p className="mb-2.5 text-[11.5px] leading-relaxed text-ink-3">
              Write actions are gated so the live demo isn&apos;t an open write surface.
              Enter the demo passphrase and admin secret (demo-grade — see README).
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Demo passphrase"
                value={creds.passphrase}
                onChange={(e) => setCreds({ ...creds, passphrase: e.target.value })}
                className="rounded-full border border-line bg-bg px-4 py-2 text-[13px] text-ink focus:border-accent focus:outline-none"
              />
              <input
                type="password"
                placeholder="Admin secret"
                value={creds.adminSecret}
                onChange={(e) => setCreds({ ...creds, adminSecret: e.target.value })}
                className="rounded-full border border-line bg-bg px-4 py-2 text-[13px] text-ink focus:border-accent focus:outline-none"
              />
              <button
                onClick={onConsolidate}
                disabled={!isMember || !hasPass || !hasAdmin || busy.consolidate}
                title={isMember ? "" : "Sign in with GitHub to run improve()"}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-panel px-4 py-2 text-[13px] font-semibold text-ink hover:bg-accent-soft disabled:opacity-40"
              >
                {busy.consolidate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Consolidate memory
              </button>
              {!isMember && (
                <p className="text-[11px] leading-snug text-ink-3">
                  improve() &amp; forget() require a member session (GitHub sign-in).
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* simulate */}
      <button
        onClick={onSimulate}
        disabled={!hasPass || busy.simulate}
        title={hasPass ? "" : "Enter the demo passphrase in Demo controls first"}
        className="inline-flex items-center gap-1.5 rounded-full border border-btnp bg-btnp px-4 py-2 text-[13px] font-semibold text-btnp-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy.simulate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Simulate resolved incident
      </button>

      {/* user chip → sign-out */}
      <div className="relative">
        <button
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full border border-line bg-panel py-[5px] pl-[5px] pr-3 text-[13px] font-semibold text-ink hover:bg-accent-soft"
        >
          <span className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-gradient-to-br from-[#0080FF] to-[#66B2FF] text-[12px] font-bold text-white">
            {initial}
          </span>
          <span className="max-w-[120px] truncate">{user.name}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-ink-3 transition-transform", userOpen && "rotate-180")} />
        </button>
        {userOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] rounded-2xl border border-line bg-panel p-3 shadow-soft">
            <div className="px-2 pb-2.5">
              <p className="text-[13px] font-semibold text-ink">{user.name}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                {isMember ? "Member · full access" : "Guest · read & recall"}
              </p>
            </div>
            <button
              onClick={() => void signOut({ callbackUrl: "/signin" })}
              className="inline-flex w-full items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-[13px] font-semibold text-ink hover:bg-accent-soft"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
