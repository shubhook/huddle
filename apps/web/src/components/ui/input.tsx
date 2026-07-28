import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Huddle input — cool surface fill, brand focus border.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full min-w-0 rounded-md border border-hairline bg-paper",
        "px-[13px] py-[9px] text-base text-ink",
        "placeholder:text-text-placeholder",
        "transition-colors outline-none",
        "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
