import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  workspaceName: string;
  className?: string;
  onClick?: () => void;
}

export function WorkspaceSwitcher({
  workspaceName,
  className,
  onClick,
}: WorkspaceSwitcherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2",
        "border-b border-sidebar-border px-3 py-2.5 text-left",
        "transition-colors hover:bg-sidebar-hover",
        className,
      )}
    >
      <span className="truncate font-display text-sm font-medium text-sidebar-foreground">
        {workspaceName}
      </span>
      <ChevronDown
        aria-hidden
        className="size-3.5 shrink-0 text-sidebar-muted"
        strokeWidth={1.75}
      />
    </button>
  );
}
