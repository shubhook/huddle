import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-hairline bg-paper",
        "px-[13px] py-2 text-base text-ink",
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

export { Textarea };
