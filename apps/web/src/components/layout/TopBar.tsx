import type { ReactNode } from "react";
import { Info, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  isOnline = true,
  endContent,
  className,
  onSearch,
  onInfo,
}: TopBarProps) {
  const displayName = channelName.startsWith("#")
    ? channelName
    : `# ${channelName}`;

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between",
        "border-b border-hairline bg-surface-2",
        "px-4 pb-[17px] pt-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            isOnline ? "bg-signal" : "bg-text-placeholder",
          )}
        />
        <h1 className="text-base font-medium leading-6 text-ink">
          {displayName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {endContent}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search channel"
          onClick={onSearch}
        >
          <Search className="size-5" strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Channel details"
          onClick={onInfo}
        >
          <Info className="size-5" strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}