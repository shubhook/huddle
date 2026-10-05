const STEPS = [
  ["Create an account", "Email or GitHub. That’s the form."],
  ["Name the workspace", "Studio, cohort, side project. Short is better."],
  ["Send the invite", "One link. They land in the same channels."],
  ["Say hello", "Open #general. It shows up as you send it."],
];

interface StartProps {
  onGetStarted?: () => void;
}

export function Start({ onGetStarted }: StartProps) {
  return (
    <section className="section wrap" id="start">
      <div className="section__head reveal">
        <span className="eyebrow">Start</span>
        <h2>From an empty tab to a conversation.</h2>
        <p>Four steps. Most of them are a single field.</p>
      </div>
      <ol className="steps">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="reveal">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <div className="hero__cta steps__cta">
        <button type="button" className="btn btn--primary" onClick={onGetStarted}>
          Get started free
        </button>
      </div>
    </section>
  );
}
