import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Disconnected",
};

const STATUS_DOT_CLASSES: Record<ConnectionStatus, string> = {
  connected: "bg-signal",
  connecting: "bg-warning",
  disconnected: "bg-text-placeholder",
};

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-hairline bg-paper px-[9px] py-[5px]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-xl", STATUS_DOT_CLASSES[status])}
      />
      <span className="pl-1 font-mono text-[10px] uppercase leading-[15px] tracking-[0.5px] text-ink">
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}
