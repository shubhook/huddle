import { BookOpen, Paperclip, Rocket, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

interface HeroMockMessage {
  meta: string;
  content: string;
  variant: "paper" | "surface";
  mono?: boolean;
}

const HERO_MESSAGES: HeroMockMessage[] = [
  {
    meta: "system · 10:42:01 UTC",
    content:
      "Deployed commit 8f9a2b to production cluster. All health checks passing.",
    variant: "paper",
    mono: true,
  },
  {
    meta: "alice_dev · 10:45:12 UTC",
    content:
      "Latency metrics looking good post-deploy. Seeing consistent <15ms on the WebSocket layer.",
    variant: "surface",
  },
  {
    meta: "bob_ops · 10:47:33 UTC",
    content:
      "Confirmed. Redis pub/sub fan-out is handling the load spike smoothly. Zero dropped messages.",
    variant: "paper",
  },
];

interface HeroProps {
  className?: string;
  onQuickStart?: () => void;
  onDocumentation?: () => void;
}

function HeroMockMessage({ meta, content, variant, mono }: HeroMockMessage) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="px-1 font-mono text-xs font-medium tracking-[0.24px] text-text-muted">
        {meta}
      </p>
      <div
        className={cn(
          "max-w-[768px] rounded-md border border-hairline p-[9px]",
          variant === "paper" ? "bg-paper" : "bg-brand-50/80",
        )}
      >
        <p
          className={cn(
            mono
              ? "font-mono text-[13px] leading-[19.5px] text-ink"
              : "text-base leading-6 text-ink",
          )}
        >
          {content}
        </p>
      </div>
    </div>
  );
}

export function Hero({ className, onQuickStart, onDocumentation }: HeroProps) {
  return (
    <section
      id="preview"
      className={cn(
        "relative flex w-full flex-col items-center overflow-hidden px-8 pb-24 pt-[96px]",
        className,
      )}
    >
      {/* Soft brand wash — restrained, not gradient slop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.08),transparent_65%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col items-center px-8">
        <div className="mb-8 rounded-xl border border-brand-100 bg-brand-50 px-[13px] py-[7px]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-1.5 rounded-[3px] bg-signal shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
            />
            <span className="font-mono text-xs font-medium tracking-[0.24px] text-brand-800">
              v0.1 · WebSocket layer live
            </span>
          </div>
        </div>

        <h1 className="max-w-[896px] text-center font-display text-[64px] font-semibold leading-[70.4px] tracking-[-3.2px] text-ink">
          Real-time infrastructure, built
          <br />
          for builders.
        </h1>

        <p className="mt-6 max-w-[672px] text-center text-base font-medium leading-6 text-text-muted">
          A self-hosted, high-performance messaging layer for teams who value
          technical honesty. No fluff, just raw throughput and transparent
          architecture.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Button variant="ink" size="hero" onClick={onQuickStart}>
            <Rocket className="size-5" strokeWidth={1.75} />
            Quick Start
          </Button>
          <Button variant="outline" size="hero" onClick={onDocumentation}>
            <BookOpen className="size-5" strokeWidth={1.75} />
            Documentation
          </Button>
        </div>

        <div className="mt-24 w-full px-6 md:px-24">
          <div className="mx-auto flex h-[500px] w-full max-w-[1024px] flex-col overflow-hidden rounded-lg border border-hairline bg-paper shadow-[0_8px_30px_rgba(30,58,95,0.08),0_1px_2px_rgba(15,23,42,0.04)]">
            <TopBar channelName="engineering-deployments" className="bg-paper" />

            <div className="flex flex-1 flex-col gap-6 overflow-auto bg-surface-lowest p-6">
              {HERO_MESSAGES.map((message) => (
                <HeroMockMessage key={message.meta} {...message} />
              ))}
            </div>

            <div className="border-t border-hairline bg-paper px-4 pb-4 pt-[17px]">
              <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface-2 px-[13px] py-[9px]">
                <Paperclip
                  className="size-5 shrink-0 text-text-subtle"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  readOnly
                  aria-label="Message input preview"
                  placeholder="Message #engineering-deployments"
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-placeholder outline-none"
                />
                <Button variant="ghost" size="icon" aria-label="Search">
                  <Search className="size-5" strokeWidth={1.75} />
                </Button>
                <Button
                  variant="ink"
                  size="icon"
                  aria-label="Send message"
                  className="size-8 shrink-0 rounded-md shadow-none"
                >
                  <Send className="size-4" strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
