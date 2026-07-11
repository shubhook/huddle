import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "flex w-full max-w-[373px] flex-col gap-4",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded border border-hairline bg-surface-2 p-px">
        <Icon className="size-6 text-ink" strokeWidth={1.75} />
      </div>

      <h3 className="font-display text-2xl font-semibold leading-[30px] tracking-[-0.96px] text-ink">
        {title}
      </h3>

      <p className="text-base leading-[26px] text-text-muted">{description}</p>
    </article>
  );
}