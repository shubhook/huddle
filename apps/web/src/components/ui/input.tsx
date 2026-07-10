import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Huddle input — matches the Figma chat input:
 * - bg surface-2 (#F3F3F3), border hairline (#E2E2E2), radius 6
 * - focus swaps border to ink/40 (no glowing ring)
 * - placeholder text uses --text-placeholder
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full min-w-0 rounded-md border border-hairline bg-surface-2",
        "px-[13px] py-[9px] text-base text-ink",
        "placeholder:text-text-placeholder",
        "transition-colors outline-none",
        "focus-visible:border-ink/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
