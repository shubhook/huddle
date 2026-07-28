import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Huddle buttons — brand-blue primary with quiet secondaries.
 * - `ink`     : solid brand CTA (kept name for call-site compatibility)
 * - `outline` : hairline-bordered transparent button
 * - `ghost`   : icon-only / text actions
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-normal leading-6",
    "transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid brand — primary action (Quick Start, Get started, Sign in)
        ink:
          "bg-brand text-text-on-brand hover:bg-brand-700 active:bg-brand-800 shadow-[0_1px_2px_rgba(37,99,235,0.2)]",
        // Hairline border — secondary (Documentation)
        outline:
          "bg-paper text-ink border border-hairline hover:border-brand-200 hover:bg-brand-50",
        // Text-only — chat header / message input icon buttons
        ghost:
          "bg-transparent text-text-subtle hover:text-brand-700 hover:bg-brand-50",
        default:
          "bg-brand text-text-on-brand hover:bg-brand-700 shadow-[0_1px_2px_rgba(37,99,235,0.2)]",
        secondary:
          "bg-surface-2 text-ink hover:bg-brand-50 border border-hairline",
        link:
          "text-brand-700 underline-offset-4 hover:underline hover:text-brand-800",
        destructive:
          "bg-destructive text-text-on-brand hover:bg-destructive/90",
      },
      size: {
        hero: "h-[50px] px-6 py-[13px] rounded-md text-base font-medium",
        nav: "h-10 px-4 py-2 rounded-md text-base font-medium",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-sm",
        icon: "h-[26px] w-5 p-0 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "ink",
      size: "nav",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
