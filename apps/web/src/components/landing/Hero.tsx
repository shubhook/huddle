import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { GITHUB_URL } from "@/components/landing/links";

const INSTALL_CMD = "bun install && bun run dev";

interface HeroProps {
  onGetStarted?: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  const [copied, setCopied] = useState(false);

  return (
    <section className="hero wrap">
      <span className="pill">
        <span className="pill__tag">New</span>
        Redis pub/sub across API processes
      </span>
      <h1>
        Team chat that
        <br />
        <em>arrives as it&apos;s sent</em>
      </h1>
      <p>
        Join a workspace, open a channel, and watch messages land over a
        WebSocket. Saved to Postgres first, then delivered to everyone in the
        room.
      </p>
      <div className="hero__cta">
        <button type="button" className="btn btn--primary" onClick={onGetStarted}>
          Get started free
        </button>
        <a className="btn btn--ghost" href={GITHUB_URL}>
          <Icon name="github" />
          View on GitHub
        </a>
      </div>
      <div className="cmd">
        <b>$</b> {INSTALL_CMD}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(INSTALL_CMD);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
