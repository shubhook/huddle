import { GITHUB_URL } from "@/components/landing/links";

const PRINCIPLES = [
  {
    title: "Write, then fan out",
    body: "Postgres gets the message first. If it is not saved, nobody sees it. That order is the whole lesson.",
  },
  {
    title: "Every send is acked",
    body: "Your message shows as sending until the server confirms it. No ack in ten seconds and you are told.",
  },
  {
    title: "Reconnects fill the gap",
    body: "Drop off and come back. The client rejoins, refetches history, and merges by id so nothing doubles.",
  },
];

const PATH = [
  { tag: "01 · browser", title: "Upgrade", body: "Cookie JWT rides the handshake. No special headers." },
  { tag: "02 · server", title: "Authorize", body: "Membership checked on join, then again every minute." },
  { tag: "03 · postgres", title: "Persist", body: "Durable first. The insert returns the id everyone will see." },
  { tag: "04 · redis → sockets", title: "Fan out", body: "Published once, delivered to every socket joined to the channel." },
];

interface HowItWorksProps {
  onGetStarted?: () => void;
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  return (
    <section className="section wrap" id="wire">
      <div className="split">
        <div className="section__head reveal">
          <span className="eyebrow">Under the hood</span>
          <h2>Every message takes the same honest path</h2>
          <p>
            No polling, no magic. The browser opens one socket, the server
            checks who you are, writes the message down, and only then tells
            the room.
          </p>
          <div className="hero__cta">
            <button type="button" className="btn btn--primary" onClick={onGetStarted}>
              Try it
            </button>
            <a className="btn btn--ghost" href={`${GITHUB_URL}#readme`}>
              Read the docs
            </a>
          </div>
        </div>
        <div className="feature-list">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="feature reveal">
              <h3>
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                {p.title}
              </h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="path reveal">
        <div className="path__row">
          <span className="packet" aria-hidden />
          {PATH.map((step, i) => (
            <div
              key={step.title}
              className={i === PATH.length - 1 ? "path__step path__step--hot" : "path__step"}
            >
              <code>{step.tag}</code>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
