import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";

interface ChannelHeaderProps {
  /** Channel name without "#", or a plain title such as "Profile". */
  title: string;
  isChannel?: boolean;
  topic?: string;
  /** Right-hand side, e.g. the member count. */
  actions?: ReactNode;
  onMenu?: () => void;
}

export function ChannelHeader({
  title,
  isChannel = true,
  topic,
  actions,
  onMenu,
}: ChannelHeaderProps) {
  return (
    <header className="main__head">
      <button
        type="button"
        className="icon-btn only-narrow"
        title="Channels"
        aria-label="Show channels"
        onClick={onMenu}
      >
        <Icon name="menu" />
      </button>
      <div className="main__title">
        <h1>
          {isChannel && <span>#</span>}
          {title}
        </h1>
        {topic && <span className="main__topic">{topic}</span>}
      </div>
      {actions && <div className="main__actions">{actions}</div>}
    </header>
  );
}
