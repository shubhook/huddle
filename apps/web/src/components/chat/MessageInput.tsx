import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  channelName: string;
  className?: string;
  disabled?: boolean;
  onSend?: (message: string) => void;
}

export function MessageInput({
  channelName,
  className,
  disabled = false,
  onSend,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const channelLabel = channelName
    ? channelName.startsWith("#")
      ? channelName
      : `#${channelName}`
    : "#channel";

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setValue("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className={cn("shrink-0 px-4 pb-4", className)}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border border-hairline bg-paper/90 px-3 py-2",
          "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10",
        )}
      >
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={`Message ${channelLabel}`}
          className={cn(
            "min-h-[28px] flex-1 resize-none bg-transparent py-1 text-sm leading-5 text-ink outline-none",
            "placeholder:text-text-placeholder disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <Button
          type="button"
          variant={canSend ? "ink" : "ghost"}
          size="icon"
          aria-label="Send message"
          className="mb-0.5 shrink-0"
          disabled={!canSend}
          onClick={handleSubmit}
        >
          <Send className="size-3.5" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
