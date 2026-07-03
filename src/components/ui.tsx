import * as React from "react";
import type { Severity } from "@/lib/config";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  const variants = {
    primary: "bg-btnp text-btnp-ink border border-btnp hover:opacity-90 shadow-soft",
    ghost: "bg-panel text-ink border border-line hover:border-accent/40 hover:bg-accent-soft",
    danger: "bg-panel text-sev1 border border-sev1/25 hover:bg-sev1/10",
  } as const;
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

const SEV_COLOR: Record<Severity, string> = {
  SEV1: "bg-sev1",
  SEV2: "bg-sev2",
  SEV3: "bg-sev3",
};

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", SEV_COLOR[severity])} />
      <span className="text-xs font-medium text-muted">{severity}</span>
    </span>
  );
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
