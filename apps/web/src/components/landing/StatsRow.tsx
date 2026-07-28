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
        "rounded-lg border border-hairline bg-paper p-[25px]",
        "shadow-[0px_1px_2px_0px_rgba(15,23,42,0.04)]",
      )}
    >
      <div className="flex items-center gap-2 pb-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-brand-50">
          <Icon className="size-5 text-brand-600" strokeWidth={1.75} />
        </div>
        <span className="font-mono text-xs font-medium uppercase tracking-[0.6px] text-text-muted">
          {label}
        </span>
      </div>

      <div>
        <p className="font-display text-[48px] font-semibold leading-[60px] tracking-[-1.92px] text-brand-900">
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
