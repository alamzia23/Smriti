"use client";
import { useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "./ui";

export function Toast({
  message,
  kind,
  onDone,
}: {
  message: string;
  kind: "ok" | "err";
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone, message]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 smriti-spring-in"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-white/90 px-4 py-2.5 text-sm shadow-lg backdrop-blur",
          kind === "ok" ? "border-line text-ink" : "border-sev1/30 text-sev1",
        )}
      >
        {kind === "ok" ? (
          <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
        ) : (
          <AlertCircle className="h-4 w-4" aria-hidden />
        )}
        {message}
      </div>
    </div>
  );
}
