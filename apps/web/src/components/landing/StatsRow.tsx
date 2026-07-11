import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

interface StatsRowProps {
  stats: StatCardProps[];
  className?: string;
}

function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex h-[192px] flex-1 flex-col justify-between",
        "rounded border border-hairline bg-surface-lowest p-[25px]",
      )}
    >
      <div className="flex items-center gap-2 pb-4">
        <Icon className="size-6 text-ink" strokeWidth={1.75} />
        <span className="font-mono text-xs font-medium uppercase tracking-[0.6px] text-ink">
          {label}
        </span>
      </div>

      <div>
        <p className="font-display text-[48px] font-semibold leading-[60px] tracking-[-1.92px] text-ink">
          {value}
        </p>
        <p className="text-base leading-6 text-text-muted">{description}</p>
      </div>
    </div>
  );
}

export function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={cn("flex w-full max-w-[1216px] gap-4", className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export type { StatsRowProps, StatCardProps };