const THREAD = [
  { initials: "MA", color: "#b4552d", name: "maya", text: "shipping the homepage today. who has the copy?" },
  { initials: "RV", color: "#2f8f5b", name: "ravi", text: "i do. dropping it in #design" },
  { initials: "KH", color: "#3b5bdb", name: "you", text: "perfect. i’ll send the invite.", you: true },
];

const POINTS = [
  ["Workspaces", "A separate room for each team, class, or project. Switch from the rail."],
  ["Channels", "#general for everyone, and a new channel when a topic needs its own place."],
  ["Sign in your way", "Email and a password, or GitHub if that’s already how your team gets in."],
  ["Grows with you", "Run more than one server and every channel still stays in sync."],
];

export function Features() {
  return (
    <section className="section wrap" id="features">
      <div className="section__head reveal">
        <span className="eyebrow">Features</span>
        <h2>A place to talk, and nothing you have to learn.</h2>
        <p>
          Channels for the work, a link for the people, and messages that show
          up while you’re still looking at the screen.
        </p>
      </div>

      <div className="spots">
        <article className="spot spot--lead reveal">
          <div>
            <h3>It arrives while you’re still looking</h3>
            <p>
              Send something in a channel and everyone there has it. Your own
              message goes from sending to delivered, so you know it landed.
            </p>
          </div>
          <div className="thread" aria-hidden>
            {THREAD.map((row) => (
              <div key={row.name} className={row.you ? "thread__row thread__row--you" : "thread__row"}>
                <span className="thread__av" style={{ background: row.color }}>
                  {row.initials}
                </span>
                <div>
                  <b>{row.name}</b>
                  {row.you && <em>Delivered</em>}
                  <span>{row.text}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="spot reveal">
          <h3>One link, and they’re in</h3>
          <p>
            Share an invite. New people join the workspace and every channel in
            it. The link lasts 7 days.
          </p>
          <div className="chip">huddle.app/join/studio</div>
        </article>

        <article className="spot reveal">
          <h3>Leave, and come back</h3>
          <p>
            Close the laptop. Open it tomorrow. The channel is where you left
            it, including whatever you missed.
          </p>
          <p className="missed">
            <b>14 new</b> in #general since yesterday
          </p>
        </article>
      </div>

      <ul className="points reveal">
        {POINTS.map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
