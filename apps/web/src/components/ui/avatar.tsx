import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Initials-based avatar — no photos in the Figma design.
 * Sizes: sm 24, md 32, lg 40, xl 48.
 */
const avatarVariants = cva(
  [
    "relative flex shrink-0 items-center justify-center overflow-hidden",
    "rounded-full bg-surface-2 text-ink",
    "font-medium select-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "size-6 text-[10px]",
        md: "size-8 text-xs",
        lg: "size-10 text-sm",
        xl: "size-12 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface AvatarProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof avatarVariants> {
  /** Full name — will be reduced to up to two initials. */
  name: string;
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function Avatar({ name, size, className, ...props }: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      aria-label={name}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {deriveInitials(name)}
    </div>
  );
}

export { Avatar, avatarVariants };
export type { AvatarProps };
