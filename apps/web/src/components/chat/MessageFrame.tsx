import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AvatarTone = "default" | "muted" | "subtle";

interface MessageFrameProps {
  sender: string;
  timestamp: string;
  channel: string;
  content: string;
  isGrouped: boolean;
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
    <span className="font-mono text-[11px] font-medium text-text-placeholder">
      {children}
    </span>
  );
}

export function MessageFrame({
  sender,
  timestamp,
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
          "w-7 shrink-0",
          isGrouped ? "h-0 overflow-hidden" : "pt-0.5",
        )}
      >
        {!isGrouped && (
          <div
            aria-hidden
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-[11px] font-semibold",
              AVATAR_TONE_CLASSES[avatarTone],
            )}
          >
            {deriveInitials(sender)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pl-3">
        {!isGrouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-medium text-ink">{sender}</span>
            <MetadataPart>{timestamp}</MetadataPart>
          </div>
        )}

        {codeBlock && (
          <div className="mb-1 rounded-md border border-hairline bg-surface/80 px-2 py-1">
            <p className="font-mono text-xs text-text-muted">{codeBlock}</p>
          </div>
        )}
        <p className="text-sm leading-relaxed text-ink">{content}</p>
      </div>
    </article>
  );
}

export type { MessageFrameProps, AvatarTone };
