"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

// Sign-in screen. Guest is the one-click demo path; GitHub appears only when
// OAuth is configured. Styled in the same token system as the app (both themes).
export function SignInPanel({
  githubEnabled,
  callbackUrl,
}: {
  githubEnabled: boolean;
  callbackUrl: string;
}) {
  const [pending, setPending] = useState<"guest" | "github" | null>(null);

  const go = (provider: "guest" | "github") => {
    setPending(provider);
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* ambient hero glow + dotgrid, matching the app background */}
      <div className="dotgrid pointer-events-none absolute inset-0 opacity-70" />
      <div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[620px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "var(--heroglow)" }}
      />

      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[400px] rounded-[22px] border border-line bg-panel p-8 shadow-soft">
        <div className="mb-1 flex items-baseline gap-2.5">
          <span className="text-[26px] font-extrabold tracking-[-0.5px] text-ink">Smriti</span>
          <span className="font-serif text-[21px] not-italic text-accent">स्मृति</span>
        </div>
        <p className="mb-7 text-[13.5px] leading-relaxed text-ink-2">
          A shared memory for every incident — so the same fire never burns twice.
          Sign in to explore the memory graph.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => go("guest")}
            disabled={pending !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-btnp bg-btnp px-5 py-3 text-[14px] font-semibold text-btnp-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending === "guest" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Continue as guest
          </button>

          {githubEnabled && (
            <button
              onClick={() => go("github")}
              disabled={pending !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-bg px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              {pending === "github" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GithubMark className="h-4 w-4" />
              )}
              Continue with GitHub
            </button>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-3">
          <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            Guests can browse and recall memory. Write operations
            (improve / forget) stay gated behind the admin secret.
          </span>
        </div>
      </div>
    </div>
  );
}
