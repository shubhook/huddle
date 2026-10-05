import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/landing/Icon";

const FEATURES: { icon: IconName; title: string; body: ReactNode }[] = [
  { icon: "grid", title: "Workspaces", body: "One per team, project, or friend group. Switch from the rail." },
  { icon: "link", title: "Invite links", body: "Share a link, teammates land straight in the workspace." },
  { icon: "hash", title: "Channels", body: "History over REST, new messages over the socket, merged in order." },
  { icon: "bolt", title: "Acked sends", body: "Each message carries a client id. You see when it is confirmed." },
  { icon: "refresh", title: "Auto reconnect", body: "Backs off, rejoins your channel, and fills missed messages." },
  {
    icon: "layers",
    title: "Scale out",
    body: (
      <>
        Set <code>REDIS_URL</code> and several API processes share channels.
      </>
    ),
  },
  { icon: "heart", title: "Heartbeats", body: "Silent sockets are pinged, then closed. No ghosts in the room." },
  { icon: "shield", title: "GitHub sign-in", body: "Email and password by default, GitHub OAuth when you add keys." },
];

export function Features() {
  return (
    <section className="section wrap" id="features">
      <div className="section__head reveal">
        <span className="eyebrow">What&apos;s inside</span>
        <h2>Small surface. Real parts.</h2>
        <p>
          Everything a team needs to talk in real time, and nothing pretending
          to be more than it is.
        </p>
      </div>
      <div className="tiles">
        {FEATURES.map((f) => (
          <article key={f.title} className="tile reveal">
            <span className="tile__icon">
              <Icon name={f.icon} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
            <span className="tile__tag">● working</span>
          </article>
        ))}
      </div>
    </section>
  );
}
