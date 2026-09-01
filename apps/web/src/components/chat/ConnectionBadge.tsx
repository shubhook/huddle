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
        "inline-flex items-center gap-1.5 rounded-md border border-hairline bg-paper px-2 py-1",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", STATUS_DOT_CLASSES[status])}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-text-muted">
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}
