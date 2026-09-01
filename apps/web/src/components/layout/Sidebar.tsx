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
        "flex w-[220px] shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <WorkspaceSwitcher
        workspaceName={workspaceName}
        onClick={onWorkspaceClick}
      />

      <div className="flex flex-1 flex-col overflow-y-auto py-2.5">
        <p className="px-3 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-sidebar-muted">
          Channels
        </p>

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
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-3 py-2.5">
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
