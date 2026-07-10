import * as React from "react";

import { cn } from "@/lib/utils";

interface SeparatorProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
}

/**
 * 1px hairline divider used in the chat header, sidebar, and dashboard panels.
 * Color = --hairline (#E2E2E2 in light).
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-hairline",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps };
