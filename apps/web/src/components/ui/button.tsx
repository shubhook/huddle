import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
    "text-sm font-medium leading-5",
    "transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
  ].join(" "),
  {
    variants: {
      variant: {
        ink: "bg-brand text-text-on-brand hover:bg-brand-700 active:bg-brand-800",
        outline:
          "bg-paper/80 text-ink border border-hairline hover:bg-paper hover:border-hairline-strong",
        ghost:
          "bg-transparent text-text-subtle hover:text-ink hover:bg-surface-2/80",
        default: "bg-brand text-text-on-brand hover:bg-brand-700",
        secondary:
          "bg-surface-2 text-ink hover:bg-brand-50 border border-hairline",
        link: "text-brand-700 underline-offset-4 hover:underline hover:text-brand-800",
        destructive:
          "bg-destructive text-text-on-brand hover:bg-destructive/90",
      },
      size: {
        hero: "h-10 px-5 rounded-lg text-sm font-semibold",
        nav: "h-8 px-3 rounded-md text-sm",
        default: "h-8 px-3.5",
        sm: "h-7 rounded-md px-2.5 text-xs",
        icon: "size-7 p-0 rounded-md",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-8 rounded-md",
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
