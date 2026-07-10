import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Huddle buttons — two shapes pulled from Figma:
 * - `ink`     : solid ink button (50px hero / 40px nav)
 * - `outline` : hairline-bordered transparent button (50px hero "Documentation")
 * - `ghost`   : icon-only text-graphite (chat header)
 *
 * Sizes match Figma: `hero` = 50h, `nav` = 40h, `default` = 36h, `sm` = 32h, `icon` = 26h.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-normal leading-6",
    "transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid ink — primary action (Quick Start, Get started)
        ink:
          "bg-ink text-text-on-ink hover:bg-ink/90 active:bg-ink/95",
        // Hairline border on transparent — secondary (Documentation)
        outline:
          "bg-transparent text-ink border border-hairline hover:bg-surface-2",
        // Text-only — chat header / message input icon buttons
        ghost:
          "bg-transparent text-text-subtle hover:text-ink",
        // shadcn-style fallbacks so the rest of the design system still works
        default:
          "bg-ink text-text-on-ink hover:bg-ink/90",
        secondary:
          "bg-surface-2 text-ink hover:bg-surface-2/80 border border-hairline",
        link:
          "text-ink underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-text-on-ink hover:bg-destructive/90",
      },
      size: {
        // Hero CTA — 50px tall, 24/13 padding
        hero: "h-[50px] px-6 py-[13px] rounded-md text-base",
        // Top nav CTA — 40px tall, 16/8 padding
        nav: "h-10 px-4 py-2 rounded-md text-base",
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
