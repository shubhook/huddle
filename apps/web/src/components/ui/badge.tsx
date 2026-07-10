import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Huddle badge — used for the hero status pill and the channel-online pill.
 *
 *   pill  : bordered surface-2 chip with mono label, e.g. "v0.1 · WebSocket layer live"
 *   plain : inline mono label with leading dot, e.g. "# engineering-deployments"
 */
const badgeVariants = cva(
  "inline-flex items-center gap-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        pill: [
          "rounded-xl border border-hairline bg-surface-2",
          "px-[13px] py-[7px]",
          "font-mono-label text-text-muted normal-case tracking-[0.24px]",
        ].join(" "),
        plain: "font-mono-label text-text-muted normal-case tracking-[0.24px]",
        signal: [
          "rounded-xl border border-hairline bg-surface-2",
          "px-[13px] py-[7px]",
        ].join(" "),
      },
    },
    defaultVariants: { variant: "pill" },
  },
);

interface BadgeProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof badgeVariants> {
  /** Optional leading signal dot. Color defaults to --signal. */
  dot?: boolean;
  dotClassName?: string;
}

function Badge({
  className,
  variant,
  dot = false,
  dotClassName,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "inline-block size-1.5 shrink-0 rounded-full bg-signal",
            dotClassName,
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
