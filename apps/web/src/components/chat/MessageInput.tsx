import { Bold, Code, Italic, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  channelName: string;
  className?: string;
  disabled?: boolean;
  onSend?: (message: string) => void;
}

const TOOLBAR_ACTIONS = [
  { label: "Bold", icon: Bold },
  { label: "Italic", icon: Italic },
  { label: "Code", icon: Code },
] as const;

export function MessageInput({
  channelName,
  className,
  disabled = false,
  onSend,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const channelLabel = channelName.startsWith("#")
    ? channelName
    : `#${channelName}`;

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

  return (
    <div className={cn("shrink-0 px-6 pb-6", className)}>
      <div className="overflow-hidden rounded border border-[#e5e7eb] bg-surface-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center border-b border-[#e5e7eb] px-1 py-1">
          {TOOLBAR_ACTIONS.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={label}
              className="size-8 rounded-[2px]"
              disabled={disabled}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
            </Button>
          ))}
        </div>

        <div className="flex items-end gap-2 px-3 py-3">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={`Message ${channelLabel}`}
            className={cn(
              "min-h-[24px] flex-1 resize-none bg-transparent text-sm leading-[21px] text-ink outline-none",
              "placeholder:text-text-placeholder disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Send message"
            className="mb-0.5 size-8 shrink-0"
            disabled={disabled || !value.trim()}
            onClick={handleSubmit}
          >
            <Send className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}