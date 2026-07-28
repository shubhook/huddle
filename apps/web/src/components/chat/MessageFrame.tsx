import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AvatarTone = "default" | "muted" | "subtle";

interface MessageFrameProps {
  sender: string;
  timestamp: string;
  channel: string;
  content: string;
  isGrouped: boolean;
  /** Optional mono log line shown above body copy (system messages). */
  codeBlock?: string;
  avatarTone?: AvatarTone;
  className?: string;
}

const AVATAR_TONE_CLASSES: Record<AvatarTone, string> = {
  default: "bg-brand-100 text-brand-800",
  muted: "bg-brand-100 text-brand-800",
  subtle: "bg-surface-2 text-text-muted",
};

function deriveInitials(sender: string): string {
  const parts = sender.replace(/_/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function MetadataPart({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs font-medium leading-3 tracking-[0.24px] text-text-muted">
      {children}
    </span>
  );
}

interface MetadataStripProps {
  sender: string;
  channel: string;
  timestamp: string;
}

function MetadataStrip({ sender, channel, timestamp }: MetadataStripProps) {
  const channelLabel = channel.startsWith("#") ? channel : `#${channel}`;

  return (
    <div className="flex items-center">
      <span className="font-mono text-xs font-semibold leading-3 tracking-[0.24px] text-brand-800">
        {sender}
      </span>
      <span className="pl-1">
        <MetadataPart>·</MetadataPart>
      </span>
      <span className="pl-1">
        <MetadataPart>{channelLabel}</MetadataPart>
      </span>
      <span className="pl-1">
        <MetadataPart>·</MetadataPart>
      </span>
      <span className="pl-1">
        <MetadataPart>{timestamp}</MetadataPart>
      </span>
    </div>
  );
}

interface MessageAvatarProps {
  sender: string;
  tone: AvatarTone;
}

function MessageAvatar({ sender, tone }: MessageAvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl",
        "text-sm font-bold leading-5",
        AVATAR_TONE_CLASSES[tone],
      )}
    >
      {deriveInitials(sender)}
    </div>
  );
}

export function MessageFrame({
  sender,
  timestamp,
  channel,
  content,
  isGrouped,
  codeBlock,
  avatarTone = "muted",
  className,
}: MessageFrameProps) {
  return (
    <article
      className={cn("flex w-full items-start", className)}
      aria-label={isGrouped ? `Message from ${sender}` : undefined}
    >
      <div
        className={cn(
          "w-8 shrink-0",
          isGrouped ? "h-0 overflow-hidden" : "h-14 pt-6",
        )}
      >
        {!isGrouped && <MessageAvatar sender={sender} tone={avatarTone} />}
      </div>

      <div className="min-w-0 flex-1 pl-4">
        <div className="flex flex-col gap-1">
          {!isGrouped && (
            <MetadataStrip
              sender={sender}
              channel={channel}
              timestamp={timestamp}
            />
          )}

          <div
            className={cn(
              "flex w-full flex-col gap-2",
              "rounded-md border border-hairline bg-paper p-[17px]",
              "shadow-[0px_1px_2px_0px_rgba(15,23,42,0.04)]",
            )}
          >
            {codeBlock && (
              <div className="rounded-[2px] border border-hairline bg-surface-lowest p-[5px]">
                <p className="font-mono text-[13px] leading-[19.5px] text-text-muted">
                  {codeBlock}
                </p>
              </div>
            )}
            <p className="text-sm leading-[21px] text-ink">{content}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export type { MessageFrameProps, AvatarTone };
