import { Icon } from "@/components/landing/Icon";
import { GITHUB_URL } from "@/components/landing/links";

const WORKS = [
  "Email, password, and GitHub sign-in",
  "Workspaces and invite links",
  "Live channel chat with acked sends",
  "Reconnect with history gap-fill",
  "Multi-process fan-out over Redis",
];

const NOT_YET = [
  "Presence and typing indicators",
  "Direct messages in the UI",
  "Scrollback past the newest 50",
  "Per-user message rate limits",
  "Threads and reactions",
];

interface ShipStatusProps {
  onGetStarted?: () => void;
}

export function ShipStatus({ onGetStarted }: ShipStatusProps) {
  return (
    <section className="section wrap" id="status">
      <div className="section__head section__head--center reveal">
        <span className="eyebrow">Status</span>
        <h2>No roadmap theatre. Just what ships.</h2>
        <p>
          Huddle says what works and what does not. When a feature lands, it
          moves left.
        </p>
      </div>
      <div className="plans">
        <div className="plan reveal">
          <div className="plan__top">
            <h3>Works today</h3>
            <span className="badge badge--green">Live</span>
          </div>
          <p className="plan__lead">Everything in the demo above.</p>
          <ul>
            {WORKS.map((item) => (
              <li key={item}>
                <Icon name="check" />
                {item}
              </li>
            ))}
          </ul>
          <div className="hero__cta">
            <button type="button" className="btn btn--primary" onClick={onGetStarted}>
              Get started
            </button>
          </div>
        </div>
        <div className="plan plan--dark reveal">
          <div className="plan__top">
            <h3>Not yet</h3>
            <span className="badge badge--dim">In progress</span>
          </div>
          <p className="plan__lead">Designed, partly built, not shipped.</p>
          <ul>
            {NOT_YET.map((item) => (
              <li key={item}>
                <Icon name="dash" />
                {item}
              </li>
            ))}
          </ul>
          <div className="hero__cta">
            <a className="btn btn--cream" href={`${GITHUB_URL}/issues`}>
              Follow on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
