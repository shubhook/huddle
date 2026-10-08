import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { Icon } from "@/components/ui/Icon";

export interface SidebarChannel {
  id: string;
  name: string;
  /** New messages arrived since the channel was last open. */
  unread?: boolean;
  /** Shown before the server has finished creating it. */
  pending?: boolean;
}

export type Presence = "online" | "connecting" | "offline";

interface ChannelSidebarProps {
  workspaceName: string;
  channels: SidebarChannel[];
  activeId?: string;
  username: string;
  avatarUrl?: string;
  presence: Presence;
  /** Shown when the presence pill is hovered, e.g. "Reconnecting…". */
  statusLabel: string;
  /** Bind Cmd/Ctrl+K to the channel filter. Off for the landing demo. */
  shortcut?: boolean;
  onSelect?: (channelId: string) => void;
  onInvite?: () => void;
  onNewChannel?: () => void;
  onProfile?: () => void;
}

export function ChannelSidebar({
  workspaceName,
  channels,
  activeId,
  username,
  avatarUrl,
  presence,
  statusLabel,
  shortcut = false,
  onSelect,
  onInvite,
  onNewChannel,
  onProfile,
}: ChannelSidebarProps) {
  const [filter, setFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const query = filter.trim().replace(/^#/, "").toLowerCase();
  const visible = query
    ? channels.filter((channel) => channel.name.toLowerCase().includes(query))
    : channels;

  return (
    <aside className="side">
      <div className="side__head">
        <h2 className="side__ws">{workspaceName}</h2>
        <button
          type="button"
          className="icon-btn"
          title="Invite people"
          aria-label="Invite people"
          onClick={onInvite}
        >
          <Icon name="userPlus" />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--boxed"
          title="New channel"
          aria-label="New channel"
          onClick={onNewChannel}
        >
          <Icon name="edit" />
        </button>
      </div>

      <label className="search">
        <Icon name="search" />
        <input
          ref={searchRef}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFilter("");
            if (event.key === "Enter" && visible[0]) {
              onSelect?.(visible[0].id);
              setFilter("");
              event.currentTarget.blur();
            }
          }}
          placeholder="Jump to a channel"
          aria-label="Jump to a channel"
        />
        {shortcut && <span className="kbd">⌘K</span>}
      </label>

      <div className="side__scroll">
        <div className="side__label">
          Channels
          <button
            type="button"
            title="New channel"
            aria-label="New channel"
            onClick={onNewChannel}
          >
            +
          </button>
        </div>

        {visible.map((channel) => (
          <button
            key={channel.id}
            type="button"
            className={[
              "chan",
              channel.id === activeId && "is-active",
              channel.pending && "is-pending",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={channel.id === activeId ? "true" : undefined}
            aria-label={
              channel.pending
                ? `${channel.name}, being created`
                : channel.unread
                  ? `${channel.name}, new messages`
                  : undefined
            }
            onClick={() => onSelect?.(channel.id)}
          >
            <span className="chan__icon">
              #
              {channel.unread && <span className="chan__dot" />}
            </span>
            <span className="chan__name">{channel.name}</span>
          </button>
        ))}
        {query && visible.length === 0 && (
          <p className="side__none">No channel matches “{filter.trim()}”.</p>
        )}

        <div className="side__label">Direct messages</div>
        <div className="soon">
          Direct messages are coming. The API is there; the socket and UI are
          not yet.
        </div>
      </div>

      <div className="side__foot">
        <span className="me-avatar" tabIndex={0}>
          <Avatar name={username} tone={1} src={avatarUrl} />
          <span className={`presence presence--${presence}`} role="status">
            <span className="presence__dot" />
            <span className="presence__label">{statusLabel}</span>
          </span>
        </span>
        <div className="side__me">
          <strong>{username}</strong>
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Profile"
          aria-label="Profile"
          onClick={onProfile}
        >
          <Icon name="more" />
        </button>
      </div>
    </aside>
  );
}
