import type { LucideIcon } from "lucide-react";

import { FeatureCard } from "@/components/landing/FeatureCard";
import { cn } from "@/lib/utils";

interface FeatureGridItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface FeatureGridProps {
  features: FeatureGridItem[];
  className?: string;
}

export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <section
      id="features"
      className={cn(
        "w-full border-y border-hairline bg-paper px-8 py-[97px] md:px-20",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 px-8">
        <div className="flex max-w-[672px] flex-col gap-4">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.6px] text-brand-600">
            Features
          </p>
          <h2 className="font-display text-[32px] font-semibold leading-[38.4px] tracking-[-1.28px] text-ink">
            Engineered for Scale
          </h2>
          <p className="text-base leading-6 text-text-muted">
            Core features designed to support massive throughput without
            compromising on data integrity or operational simplicity.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:justify-center">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export type { FeatureGridProps, FeatureGridItem };
