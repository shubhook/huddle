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
        "border-b border-hairline px-4 py-3 text-left",
        "transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <span className="truncate font-display text-base font-bold leading-6 text-ink">
        {workspaceName}
      </span>
      <ChevronDown
        aria-hidden
        className="size-4 shrink-0 text-text-muted"
        strokeWidth={1.75}
      />
    </button>
  );
}