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
  const label = channelName.startsWith("#")
    ? channelName
    : `#${channelName}`;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
        <Hash className="size-6 text-brand-600" strokeWidth={1.75} />
      </div>
      <h2 className="text-base font-medium leading-6 text-ink">
        Welcome to {label}
      </h2>
      <p className="max-w-sm text-sm leading-[21px] text-text-muted">
        This is the start of the channel. Send a message to kick off the
        conversation.
      </p>
    </div>
  );
}
