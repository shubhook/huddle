import { useMemo } from "react";

import { MessageFrame } from "@/components/chat/MessageFrame";
import { EmptyChannelState } from "@/components/chat/EmptyChannelState";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface MessageListProps {
  messages: ChatMessage[];
  channelName: string;
  className?: string;
}

function shouldGroupWithPrevious(
  current: ChatMessage,
  previous: ChatMessage | undefined,
): boolean {
  if (!previous) return false;
  return (
    current.sender === previous.sender &&
    current.channel === previous.channel &&
    !current.dateLabel &&
    !previous.dateLabel
  );
}

export function MessageList({
  messages,
  channelName,
  className,
}: MessageListProps) {
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => ({
      message,
      isGrouped: shouldGroupWithPrevious(message, messages[index - 1]),
    }));
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyChannelState channelName={channelName} className={className} />;
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-y-auto px-5 pb-4 pt-6",
        className,
      )}
    >
      {renderedMessages.map(({ message, isGrouped }, index) => (
        <div
          key={message.id}
          className={cn(index > 0 && (isGrouped ? "mt-1" : "mt-4"))}
        >
          {message.dateLabel && (
            <div className="mb-4 flex items-center justify-center">
              <span className="font-mono text-[10px] uppercase tracking-wide text-text-placeholder">
                {message.dateLabel}
              </span>
            </div>
          )}

          <MessageFrame
            sender={message.sender}
            channel={message.channel}
            timestamp={message.timestamp}
            content={message.content}
            codeBlock={message.codeBlock}
            avatarTone={message.avatarTone}
            isGrouped={isGrouped}
          />
        </div>
      ))}
    </div>
  );
}
