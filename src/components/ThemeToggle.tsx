"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      title="Toggle theme"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-[38px] w-[42px] items-center justify-center rounded-full border border-line bg-panel text-[15px] transition-colors hover:bg-accent-soft"
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      <span suppressHydrationWarning>{mounted ? (isDark ? "☀️" : "🌙") : "🌙"}</span>
    </button>
  );
}
