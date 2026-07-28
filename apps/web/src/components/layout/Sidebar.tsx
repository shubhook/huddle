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
  onWorkspaceClick,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex w-[240px] shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <WorkspaceSwitcher
        workspaceName={workspaceName}
        onClick={onWorkspaceClick}
      />

      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        <p className="px-4 pb-2 font-mono-label text-sidebar-muted">
          Channels
        </p>

        <ul className="flex flex-col gap-0.5 px-2">
          {channels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => onChannelSelect?.(channel.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left font-mono text-sm leading-5 transition-colors",
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
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-3">
          <span className="truncate text-sm text-sidebar-muted">{username}</span>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 text-sm text-sidebar-muted transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
