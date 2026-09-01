import { Hash } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyChannelStateProps {
  channelName: string;
  className?: string;
}

export function EmptyChannelState({
  channelName,
  className,
}: EmptyChannelStateProps) {
  const label = channelName
    ? channelName.startsWith("#")
      ? channelName
      : `#${channelName}`
    : "this channel";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        className,
      )}
    >
      <Hash className="size-5 text-brand-500" strokeWidth={1.5} />
      <h2 className="text-sm font-medium text-ink">Start of {label}</h2>
      <p className="max-w-xs text-xs leading-relaxed text-text-muted">
        Send a message when you are ready. It will stick around in Postgres and
        show up live for anyone joined here.
      </p>
    </div>
  );
}
