import { ChatLayout } from "@/components/app/ChatLayout";
import { MessageSkeleton } from "@/components/app/MessageFeed";
import { useTheme } from "@/components/app/useTheme";

/** Channel name widths, fixed so the placeholder does not jump between renders. */
const CHANNEL_WIDTHS = [96, 72, 120, 84];

/**
 * The app's outline, shown while the session and workspace are still being
 * fetched. Drawn at the same size as the real layout so nothing shifts when
 * the data arrives.
 */
export function AppShell() {
  const [theme] = useTheme();

  return (
    <ChatLayout
      theme={theme}
      rail={
        <nav className="rail" aria-hidden>
          <span className="skel__bone skel__bone--tile" />
        </nav>
      }
      sidebar={
        <aside className="side" aria-hidden>
          <div className="side__head">
            <span className="skel__bone" style={{ width: 120, height: 14 }} />
          </div>
          <div className="side__scroll skel skel--side">
            {CHANNEL_WIDTHS.map((width, index) => (
              <span className="skel__bone" key={index} style={{ width }} />
            ))}
          </div>
        </aside>
      }
    >
      <header className="main__head" aria-hidden>
        <span className="skel__bone" style={{ width: 140, height: 14 }} />
      </header>
      <MessageSkeleton label="Loading Huddle" />
    </ChatLayout>
  );
}
