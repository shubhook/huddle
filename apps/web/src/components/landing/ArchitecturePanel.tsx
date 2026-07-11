import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STACK_ITEMS = [
  "Golang Core (Goroutines for concurrency)",
  "PostgreSQL (Durable storage)",
  "Redis (Ephemeral routing & presence)",
] as const;

const CODE_SNIPPET = `// Initialize core services
db, err := postgres.NewConnection(config.DB)
if err != nil {
    log.Fatal("DB Init Failed:", err)
}

redisClient := redis.NewClient(config.Redis)
hub := websocket.NewHub(db, redisClient)

// Start message ingestion pipeline
go hub.Run()

log.Info("Huddle WebSocket layer live on :8080")`;

interface ArchitecturePanelProps {
  className?: string;
}

export function ArchitecturePanel({ className }: ArchitecturePanelProps) {
  return (
    <section
      id="architecture"
      className={cn("w-full px-8 md:px-[352px]", className)}
    >
      <div className="mx-auto flex w-full max-w-[1216px] flex-col gap-12 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-display text-[32px] font-semibold leading-[38.4px] tracking-[-1.28px] text-ink">
            Transparent Stack
          </h2>
          <p className="max-w-[576px] text-base leading-6 text-text-muted">
            We don&apos;t hide behind proprietary magic. Huddle is composed of
            battle-tested open-source primitives orchestrated for maximum
            efficiency.
          </p>

          <ul className="flex flex-col gap-4 pt-2">
            {STACK_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check
                  className="size-6 shrink-0 text-ink"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="text-base leading-6 text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-1 justify-center lg:justify-end">
          <div className="w-full max-w-[576px] overflow-hidden rounded-md bg-ink p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="size-3 rounded-full bg-destructive" />
              <div className="size-3 rounded-full bg-[#fbbf24]" />
              <div className="size-3 rounded-full bg-signal" />
            </div>
            <pre className="overflow-x-auto font-code text-[13px] leading-[19.5px] text-surface-lowest">
              <code>{CODE_SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}