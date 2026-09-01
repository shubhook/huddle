import { Button } from "@/components/ui/button";

interface HeroProps {
  onQuickStart?: () => void;
}

export function Hero({ onQuickStart }: HeroProps) {
  return (
    <section
      id="preview"
      className="relative isolate flex min-h-[100svh] w-full flex-col items-center overflow-hidden"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-paper" />
      <div
        aria-hidden
        className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-[58%]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#d7e3ee]" />
        <div className="absolute -inset-x-[8%] -bottom-[20%] top-0 blur-2xl">
          <div className="absolute inset-y-[8%] left-[10%] w-[20%] rounded-3xl bg-[#2a3a4a]/80" />
          <div className="absolute left-[34%] top-[16%] h-16 w-[40%] rounded-2xl bg-white/70" />
          <div className="absolute left-[34%] top-[38%] h-24 w-[44%] rounded-2xl bg-white/55" />
          <div className="absolute left-[38%] top-[62%] h-14 w-[30%] rounded-2xl bg-white/45" />
          <div className="absolute right-[12%] top-[24%] h-20 w-[24%] rounded-2xl bg-white/50" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#243040]/25 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-5 pb-10 pt-28 sm:pt-32">
        <div className="hero-rise flex w-full max-w-2xl flex-col items-center text-center">
          <h1 className="font-sans text-balance text-[2.15rem] font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-[3.15rem] sm:leading-[1.08]">
            <span className="block sm:inline">Team chat that</span>{" "}
            <em className="mt-1 block font-display text-[1.05em] font-medium italic tracking-[-0.03em] text-brand-800 sm:mt-0 sm:inline">
              arrives as it&apos;s sent.
            </em>
          </h1>

          <p className="mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-text-muted sm:text-base">
            Join a workspace, open a channel, and watch messages land over a
            WebSocket — built to learn the hard parts of live chat.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="ink" size="hero" onClick={onQuickStart}>
              Get started free
            </Button>
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-text-subtle transition-colors hover:text-ink"
            >
              <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full border border-hairline bg-paper/80"
              >
                <span className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-ink" />
              </span>
              See how it works
            </button>
          </div>
        </div>

        <div className="hero-float relative mt-12 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/70 bg-paper shadow-[0_28px_80px_-28px_rgba(36,48,64,0.45),0_1px_0_rgba(255,255,255,0.8)_inset] sm:mt-14">
          <div className="flex h-[min(52vh,420px)] min-h-[300px] w-full sm:h-[440px]">
            <aside className="hidden w-[200px] shrink-0 flex-col bg-sidebar text-sidebar-foreground sm:flex">
              <div className="flex items-center gap-2 border-b border-sidebar-border px-3.5 py-3">
                <span
                  aria-hidden
                  className="flex size-5 items-center justify-center rounded-[5px] bg-sidebar-active"
                >
                  <span className="grid grid-cols-2 gap-0.5">
                    <span className="size-1 rounded-[1px] bg-white/90" />
                    <span className="size-1 rounded-[1px] bg-white/90" />
                    <span className="size-1 rounded-[1px] bg-white/90" />
                    <span className="size-1 rounded-[1px] bg-white/90" />
                  </span>
                </span>
                <span className="font-display text-sm font-medium tracking-tight">
                  Huddle
                </span>
              </div>
              <div className="px-3 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-sidebar-muted">
                  Channels
                </p>
                <ul className="mt-2 space-y-0.5 text-[13px]">
                  <li className="rounded-md bg-sidebar-active/90 px-2 py-1.5 text-white">
                    <span className="text-sidebar-muted">#</span> general
                  </li>
                  <li className="rounded-md px-2 py-1.5 text-sidebar-muted">
                    <span className="text-sidebar-muted">#</span> shipping
                  </li>
                  <li className="rounded-md px-2 py-1.5 text-sidebar-muted">
                    <span className="text-sidebar-muted">#</span> random
                  </li>
                </ul>
              </div>
              <div className="mt-auto border-t border-sidebar-border px-3.5 py-3">
                <p className="truncate text-xs text-sidebar-muted">you · online</p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-surface/40">
              <header className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-paper/90 px-4">
                <span aria-hidden className="size-1.5 rounded-full bg-signal" />
                <span className="text-sm font-medium text-ink"># general</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-text-placeholder">
                  live
                </span>
              </header>

              <div className="flex-1 space-y-5 overflow-hidden px-4 py-5 sm:px-5">
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] text-text-placeholder">
                    maya · 2m
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    Anyone on the socket path for join?
                  </p>
                </div>
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] text-text-placeholder">
                    you · 1m
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    Cookie rides the upgrade. Room is just a Map of sockets.
                  </p>
                </div>
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] text-text-placeholder">
                    huddle · just now
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    Write to Postgres first. Then fan out. That order is the
                    whole lesson.
                  </p>
                </div>
              </div>

              <div className="shrink-0 border-t border-hairline bg-paper px-4 py-3">
                <div className="rounded-lg border border-hairline bg-surface/60 px-3 py-2.5 text-sm text-text-placeholder">
                  Message #general
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
