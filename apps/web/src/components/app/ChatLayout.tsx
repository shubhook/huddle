import type { ReactNode } from "react";

import type { Theme } from "@/components/app/useTheme";
import "@/components/app/app.css";

interface ChatLayoutProps {
  theme: Theme;
  /** Landing demo: no workspace rail, sized by its frame instead of the viewport. */
  embed?: boolean;
  /** Narrow screens: channels are shown over the conversation. */
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
  rail?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  /** Dialogs, rendered over the whole app. */
  overlay?: ReactNode;
}

export function ChatLayout({
  theme,
  embed = false,
  drawerOpen = false,
  onCloseDrawer,
  rail,
  sidebar,
  children,
  overlay,
}: ChatLayoutProps) {
  return (
    <div className={embed ? "app-frame app-frame--embed" : "app-frame"}>
      <div
        className="app"
        data-theme={theme}
        data-embed={embed ? "" : undefined}
        data-drawer={drawerOpen ? "" : undefined}
      >
        {rail}
        {sidebar}
        <main className="main">{children}</main>
        <div className="scrim" onClick={onCloseDrawer} aria-hidden />
        {overlay}
      </div>
    </div>
  );
}
