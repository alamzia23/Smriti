import {
  APP_NAME,
  HERO_TAGLINE_BOLD,
  HERO_TAGLINE_SERIF,
  HERO_SUBLINE,
  HERO_MICRO_LABEL,
} from "@/lib/config";

export function Hero() {
  return (
    <header className="mx-auto max-w-3xl px-6 pt-20 pb-10 text-center">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        {APP_NAME}
      </div>
      <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
        {HERO_TAGLINE_BOLD}{" "}
        <span className="font-serif italic font-normal text-accent">
          {HERO_TAGLINE_SERIF}
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
        {HERO_SUBLINE}
      </p>
      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted/80">
        {HERO_MICRO_LABEL}
      </p>
    </header>
  );
}
