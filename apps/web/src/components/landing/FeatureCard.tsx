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
        "flex w-full max-w-[373px] flex-col gap-4 rounded-lg border border-hairline bg-paper p-6",
        "shadow-[0px_1px_2px_0px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-md border border-brand-100 bg-brand-50">
        <Icon className="size-6 text-brand-600" strokeWidth={1.75} />
      </div>

      <h3 className="font-display text-2xl font-semibold leading-[30px] tracking-[-0.96px] text-ink">
        {title}
      </h3>

      <p className="text-base leading-[26px] text-text-muted">{description}</p>
    </article>
  );
}
