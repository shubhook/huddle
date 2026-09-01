import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TopBarProps {
  channelName: string;
  isOnline?: boolean;
  endContent?: ReactNode;
  className?: string;
  onSearch?: () => void;
  onInfo?: () => void;
}

export function TopBar({
  channelName,
  endContent,
  className,
}: TopBarProps) {
  const displayName = channelName
    ? channelName.startsWith("#")
      ? channelName
      : `# ${channelName}`
    : "#";

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between",
        "border-b border-hairline bg-paper/80",
        "px-4 py-2.5",
        className,
      )}
    >
      <h1 className="text-sm font-medium text-ink">{displayName}</h1>

      <div className="flex items-center gap-2">{endContent}</div>
    </header>
  );
}
