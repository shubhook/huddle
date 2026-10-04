import { useState } from "react";

import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

interface SidebarChannel {
  id: string;
  name: string;
}

interface SidebarProps {
  workspaceName: string;
  channels: SidebarChannel[];
  activeChannelId?: string;
  username?: string;
  className?: string;
  onChannelSelect?: (channelId: string) => void;
  onCreateChannel?: (name: string) => Promise<boolean> | boolean;
  onWorkspaceClick?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  workspaceName,
  channels,
  activeChannelId,
  username,
  className,
  onChannelSelect,
  onCreateChannel,
  onWorkspaceClick,
  onLogout,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function cancelCreate() {
    setCreating(false);
    setName("");
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      // The parent reports success so the draft is kept on failure.
      const ok = await onCreateChannel?.(trimmed);
      if (ok !== false) cancelCreate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside
      className={cn(
        "flex w-[220px] shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <WorkspaceSwitcher
        workspaceName={workspaceName}
        onClick={onWorkspaceClick}
      />

      <div className="flex flex-1 flex-col overflow-y-auto py-2.5">
        <div className="flex items-center justify-between px-4 pb-1.5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-sidebar-muted">
            Channels
          </p>
          {onCreateChannel && (
            <button
              type="button"
              aria-label="Create channel"
              title="Create channel"
              onClick={() => setCreating((open) => !open)}
              className="flex size-4 items-center justify-center rounded text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              +
            </button>
          )}
        </div>

        {creating && (
          <form onSubmit={submitCreate} className="px-1.5 pb-1.5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") cancelCreate();
              }}
              onBlur={() => {
                if (!name.trim()) cancelCreate();
              }}
              disabled={submitting}
              placeholder="new-channel"
              maxLength={80}
              className="w-full rounded-md bg-sidebar-hover px-2.5 py-1.5 text-sm leading-5 text-sidebar-foreground placeholder:text-sidebar-muted focus:outline-none focus:ring-1 focus:ring-sidebar-active disabled:opacity-50"
            />
          </form>
        )}

        <ul className="flex flex-col gap-0.5 px-1.5">
          {channels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => onChannelSelect?.(channel.id)}
                  className={cn(
                    "w-full rounded-md px-2.5 py-1.5 text-left text-sm leading-5 transition-colors",
                    isActive
                      ? "bg-sidebar-active font-medium text-white"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                  )}
                >
                  # {channel.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {username && (
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-2.5">
          <span className="truncate text-xs text-sidebar-muted">{username}</span>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 text-xs text-sidebar-muted transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
